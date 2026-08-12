/**
 * liveStreamService.ts
 * Step 3 + 5: Handles browser-side recording chunks, stitches them into a
 * temporary file, then triggers the FFmpeg → HLS → Hetzner upload pipeline.
 *
 * The teacher's browser sends 5-second chunks via Socket.io 'recording-chunk'.
 * When the session ends ('end-stream') we run FFmpeg on the .tmp file.
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Ensure temp recordings dir exists
const TEMP_DIR = path.join(__dirname, '../../uploads/live-recordings');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// ─── In-memory map of active recording write-streams ─────────────────────
// keyed by sessionId
const activeStreams = new Map<string, { writeStream: fs.WriteStream; filePath: string }>();

/**
 * Start accumulating recording data for a new live session.
 */
export function startRecording(sessionId: string): string {
  if (activeStreams.has(sessionId)) {
    console.warn(`⚠️  Recording already active for session ${sessionId}`);
    return activeStreams.get(sessionId)!.filePath;
  }

  const filePath = path.join(TEMP_DIR, `session_${sessionId}.tmp`);
  const writeStream = fs.createWriteStream(filePath, { flags: 'a' });

  writeStream.on('error', (err) => {
    console.error(`❌ Write stream error for session ${sessionId}:`, err);
  });

  activeStreams.set(sessionId, { writeStream, filePath });
  console.log(`🔴 Recording started: ${filePath}`);
  return filePath;
}

/**
 * Append a chunk of binary data to the recording file.
 */
export function appendChunk(sessionId: string, chunk: Buffer): void {
  const entry = activeStreams.get(sessionId);
  if (!entry) {
    console.warn(`⚠️  No active recording for session ${sessionId} – chunk dropped`);
    return;
  }
  entry.writeStream.write(chunk);
}

/**
 * Finalise recording: close the write stream, run FFmpeg, upload to Hetzner.
 */
export async function finaliseRecording(sessionId: string): Promise<string | null> {
  const entry = activeStreams.get(sessionId);
  if (!entry) {
    console.warn(`⚠️  No active recording to finalise for session ${sessionId}`);
    return null;
  }

  const { writeStream, filePath } = entry;

  // Close the write stream
  await new Promise<void>((resolve, reject) => {
    writeStream.end((err: any) => (err ? reject(err) : resolve()));
  });
  activeStreams.delete(sessionId);

  // Check the file has content
  const stat = fs.statSync(filePath);
  if (stat.size < 1024) {
    console.warn(`⚠️  Recording file too small (${stat.size} bytes) – skipping FFmpeg`);
    fs.unlinkSync(filePath);
    return null;
  }

  console.log(`🎬 Starting FFmpeg conversion for session ${sessionId} (${stat.size} bytes)...`);

  // ── HLS output directory ─────────────────────────────────────────────────
  const hlsOutputDir = path.join(TEMP_DIR, `session_${sessionId}_hls`);
  fs.mkdirSync(hlsOutputDir, { recursive: true });

  const m3u8Path  = path.join(hlsOutputDir, 'output.m3u8');
  const tsPattern = path.join(hlsOutputDir, 'segment%03d.ts');

  const ffmpegCmd = [
    'ffmpeg',
    `-i "${filePath}"`,
    '-c:v libx264',
    '-preset fast',
    '-crf 23',
    '-c:a aac',
    '-b:a 128k',
    '-f hls',
    '-hls_time 6',
    '-hls_list_size 0',
    `-hls_segment_filename "${tsPattern}"`,
    `"${m3u8Path}"`,
  ].join(' ');

  try {
    await execAsync(ffmpegCmd);
    console.log(`✅ FFmpeg HLS conversion complete for session ${sessionId}`);
  } catch (err: any) {
    console.error(`❌ FFmpeg failed for session ${sessionId}:`, err.message || err);
    // Don't delete temp file so we can retry manually
    return null;
  }

  // ── Upload to Hetzner ────────────────────────────────────────────────────
  const hetznerBasePath = `live-recordings/session_${sessionId}`;
  let uploadedPath: string | null = null;

  try {
    uploadedPath = await uploadHlsToHetzner(hlsOutputDir, hetznerBasePath);
    console.log(`✅ Uploaded HLS to Hetzner: ${uploadedPath}`);
  } catch (err: any) {
    console.error(`❌ Hetzner upload failed:`, err.message || err);
  }

  // ── Cleanup temp files ────────────────────────────────────────────────────
  try {
    fs.unlinkSync(filePath); // delete .tmp
    fs.rmSync(hlsOutputDir, { recursive: true, force: true }); // delete HLS folder
  } catch {
    // Non-fatal
  }

  return uploadedPath;
}

// ─── Hetzner S3 upload helper ─────────────────────────────────────────────

/**
 * Upload all files in the HLS output directory to Hetzner Object Storage.
 * Uses the AWS SDK v3 which is the standard S3-compatible approach.
 *
 * Returns the base Hetzner URL for the uploaded session.
 */
async function uploadHlsToHetzner(localDir: string, hetznerPath: string): Promise<string> {
  const endpoint = process.env.HETZNER_ENDPOINT;
  const bucket   = process.env.HETZNER_BUCKET;
  const accessKeyId     = process.env.HETZNER_ACCESS_KEY_ID;
  const secretAccessKey = process.env.HETZNER_SECRET_ACCESS_KEY;

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error('Hetzner credentials not fully configured in .env');
  }

  // Dynamic import so the package isn't required at startup if not installed
  let S3Client: any, PutObjectCommand: any;
  try {
    const sdk = await import('@aws-sdk/client-s3');
    S3Client       = sdk.S3Client;
    PutObjectCommand = sdk.PutObjectCommand;
  } catch {
    throw new Error('@aws-sdk/client-s3 is not installed. Run: npm install @aws-sdk/client-s3 in the backend.');
  }

  const s3 = new S3Client({
    endpoint,
    region: 'eu-central',
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: false,
  });

  const files = fs.readdirSync(localDir);
  for (const file of files) {
    const filePath = path.join(localDir, file);
    const key      = `${hetznerPath}/${file}`;
    const body     = fs.readFileSync(filePath);
    const contentType = file.endsWith('.m3u8')
      ? 'application/vnd.apple.mpegurl'
      : 'video/mp2t';

    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      ACL: 'public-read',
    }));
  }

  return `${endpoint}/${bucket}/${hetznerPath}/output.m3u8`;
}

/**
 * Abort a recording without processing (e.g. teacher disconnected without ending session).
 */
export function abortRecording(sessionId: string): void {
  const entry = activeStreams.get(sessionId);
  if (!entry) return;
  entry.writeStream.destroy();
  try { fs.unlinkSync(entry.filePath); } catch { /* ignore */ }
  activeStreams.delete(sessionId);
  console.log(`🗑️  Aborted recording for session ${sessionId}`);
}
