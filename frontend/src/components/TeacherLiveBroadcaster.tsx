/**
 * TeacherLiveBroadcaster.tsx
 *
 * Step 4 + 5: Full Mediasoup producer + browser-side MediaRecorder.
 *
 * Responsibilities:
 *  - Connect to Mediasoup via Socket.io
 *  - Grab camera + mic (getUserMedia)
 *  - Produce Video + Audio tracks through the SFU
 *  - Record the stream in 5-second chunks via MediaRecorder
 *  - Send chunks to backend via Socket.io ('recording-chunk')
 *  - On stop: trigger local file download (backup) + emit 'end-stream'
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import * as mediasoupClient from 'mediasoup-client';
import type { Device } from 'mediasoup-client';
import type { Transport } from 'mediasoup-client/lib/Transport';

// ─── Types ────────────────────────────────────────────────────────────────

interface Props {
  sessionId: string;
  onStreamStarted?: () => void;
  onStreamEnded?: (localBackupUrl: string | null) => void;
}

type BroadcastState = 'idle' | 'connecting' | 'live' | 'ending';

// ─── Component ────────────────────────────────────────────────────────────

const TeacherLiveBroadcaster: React.FC<Props> = ({
  sessionId,
  onStreamStarted,
  onStreamEnded,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const deviceRef = useRef<Device | null>(null);
  const sendTransportRef = useRef<Transport | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef<string>('video/webm;codecs=vp8,opus');

  const [state, setState] = useState<BroadcastState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const SOCKET_URL =
    process.env.REACT_APP_SOCKET_URL || 'http://localhost:5005';

  // ─── Timer ───────────────────────────────────────────────────────────────

  const startTimer = () => {
    setElapsed(0);
    elapsedRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
  };

  const stopTimer = () => {
    if (elapsedRef.current) clearInterval(elapsedRef.current);
  };

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // ─── Connect to Mediasoup ────────────────────────────────────────────────

  const connectMediasoup = useCallback(async (): Promise<Device | null> => {
    return new Promise((resolve) => {
      const token = localStorage.getItem('token');
      const socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket'],
      });
      socketRef.current = socket;

      socket.on('connect_error', (err) => {
        setError(`Socket connection failed: ${err.message}`);
        resolve(null);
      });

      socket.on('connect', () => {
        socket.emit('getRouterRtpCapabilities', async (routerRtpCapabilities: any) => {
          if (routerRtpCapabilities?.error) {
            setError('Mediasoup not ready on server');
            return resolve(null);
          }
          try {
            const device = new mediasoupClient.Device();
            await device.load({ routerRtpCapabilities });
            deviceRef.current = device;
            resolve(device);
          } catch (e: any) {
            setError(`Device load failed: ${e.message}`);
            resolve(null);
          }
        });
      });
    });
  }, [SOCKET_URL]);

  // ─── Start Broadcasting ──────────────────────────────────────────────────

  const startBroadcasting = async () => {
    setError(null);
    setState('connecting');

    try {
      // 1. Get camera + mic
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, frameRate: 30 },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // 2. Connect Mediasoup Device
      const device = await connectMediasoup();
      if (!device) {
        stream.getTracks().forEach(t => t.stop());
        setState('idle');
        return;
      }

      // 3. Create Send Transport
      const socket = socketRef.current!;
      const transportParams = await new Promise<any>((resolve) => {
        socket.emit('createWebRtcTransport', resolve);
      });

      if (transportParams?.error) {
        setError(`Transport error: ${transportParams.error}`);
        setState('idle');
        return;
      }

      const sendTransport = device.createSendTransport(transportParams);
      sendTransportRef.current = sendTransport;

      // 4. Wire transport events
      sendTransport.on('connect', ({ dtlsParameters }, callback, errback) => {
        socket.emit(
          'connectTransport',
          { transportId: sendTransport.id, dtlsParameters },
          (result: any) => (result?.error ? errback(new Error(result.error)) : callback()),
        );
      });

      sendTransport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
        socket.emit(
          'produce',
          { transportId: sendTransport.id, kind, rtpParameters },
          (result: any) =>
            result?.error ? errback(new Error(result.error)) : callback({ id: result.id }),
        );
      });

      // 5. Produce Video + Audio
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];

      if (videoTrack) await sendTransport.produce({ track: videoTrack });
      if (audioTrack) await sendTransport.produce({ track: audioTrack });

      // 6. Tell backend we started
      socket.emit('start-stream', { sessionId });

      // 7. Start MediaRecorder (Step 5)
      initMediaRecorder(stream, socket);

      setState('live');
      startTimer();
      onStreamStarted?.();
    } catch (e: any) {
      setError(`Failed to start broadcast: ${e.message}`);
      setState('idle');
    }
  };

  // ─── MediaRecorder (Step 5) ──────────────────────────────────────────────

  const initMediaRecorder = (stream: MediaStream, socket: Socket) => {
    recordedChunksRef.current = [];

    // Prefer MP4 with H264 if supported; otherwise fall back to WebM
    const preferredMime = 'video/mp4;codecs=avc1';
    const fallbackMime  = 'video/webm;codecs=vp8,opus';
    const mimeType = MediaRecorder.isTypeSupported(preferredMime)
      ? preferredMime
      : fallbackMime;
    mimeTypeRef.current = mimeType;

    const recorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = recorder;

    // Every 5 seconds: send chunk to backend AND save locally
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        // Send to backend for server-side stitching → FFmpeg → Hetzner
        socket.emit('recording-chunk', event.data);
        // Keep locally for the teacher's backup download
        recordedChunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      // Trigger local backup download on teacher's machine
      const isMp4 = mimeType.includes('mp4');
      const extension = isMp4 ? 'mp4' : 'webm';
      const blob = new Blob(recordedChunksRef.current, {
        type: isMp4 ? 'video/mp4' : 'video/webm',
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `Live-Backup-${new Date().toISOString().replace(/[:.]/g, '-')}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      onStreamEnded?.(url);
    };

    recorder.start(5000); // 5-second chunks
  };

  // ─── Stop Broadcasting ───────────────────────────────────────────────────

  const stopBroadcasting = () => {
    setState('ending');
    stopTimer();

    // Stop MediaRecorder (triggers onstop → local download)
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop();
    }

    // Tell backend to finalise recording + run FFmpeg
    socketRef.current?.emit('end-stream');

    // Stop all media tracks
    mediaStreamRef.current?.getTracks().forEach(t => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;

    // Close Mediasoup transport
    sendTransportRef.current?.close();

    // Disconnect socket
    socketRef.current?.disconnect();

    setState('idle');
  };

  // ─── Cleanup on unmount ──────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      stopTimer();
      mediaStreamRef.current?.getTracks().forEach(t => t.stop());
      socketRef.current?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={styles.container}>
      {/* Preview */}
      <div style={styles.videoWrapper}>
        <video ref={videoRef} autoPlay playsInline muted style={styles.video} />
        {state === 'live' && (
          <div style={styles.liveBadge}>
            <span style={styles.liveDot} />
            LIVE · {formatTime(elapsed)}
          </div>
        )}
        {state === 'connecting' && (
          <div style={styles.overlay}>Connecting…</div>
        )}
        {state === 'ending' && (
          <div style={styles.overlay}>Ending stream…</div>
        )}
      </div>

      {/* Controls */}
      <div style={styles.controls}>
        {error && <p style={styles.error}>{error}</p>}

        {state === 'idle' && (
          <button id="teacher-start-btn" style={styles.startBtn} onClick={startBroadcasting}>
            🔴 Start Live Broadcast
          </button>
        )}

        {state === 'live' && (
          <button id="teacher-stop-btn" style={styles.stopBtn} onClick={stopBroadcasting}>
            ⏹ End Stream
          </button>
        )}

        {state !== 'idle' && state !== 'live' && (
          <button disabled style={{ ...styles.startBtn, opacity: 0.6 }}>
            {state === 'connecting' ? 'Connecting…' : 'Ending…'}
          </button>
        )}
      </div>

      <p style={styles.hint}>
        {state === 'idle'
          ? 'Click "Start Live Broadcast" to go live. A local backup will download automatically when you end the stream.'
          : state === 'live'
          ? 'You are LIVE. Students can now join. A backup is recording in your browser.'
          : ''}
      </p>
    </div>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
    padding: '1.5rem',
    background: '#0f172a',
    borderRadius: '1rem',
    color: '#f8fafc',
    fontFamily: 'Inter, system-ui, sans-serif',
    maxWidth: '860px',
    margin: '0 auto',
  },
  videoWrapper: {
    position: 'relative',
    width: '100%',
    maxWidth: '720px',
    aspectRatio: '16/9',
    background: '#1e293b',
    borderRadius: '0.75rem',
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transform: 'scaleX(-1)', // Mirror for teacher
  },
  liveBadge: {
    position: 'absolute',
    top: '0.75rem',
    left: '0.75rem',
    background: 'rgba(239,68,68,0.9)',
    color: '#fff',
    padding: '0.3rem 0.75rem',
    borderRadius: '9999px',
    fontSize: '0.8rem',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
  },
  liveDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#fff',
    animation: 'pulse 1.5s infinite',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0,0,0,0.6)',
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#fff',
  },
  controls: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.75rem',
    width: '100%',
    maxWidth: '360px',
  },
  startBtn: {
    width: '100%',
    padding: '0.85rem 1.5rem',
    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
    color: '#fff',
    border: 'none',
    borderRadius: '0.6rem',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  stopBtn: {
    width: '100%',
    padding: '0.85rem 1.5rem',
    background: 'linear-gradient(135deg, #6b7280, #374151)',
    color: '#fff',
    border: 'none',
    borderRadius: '0.6rem',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
  error: {
    color: '#f87171',
    fontSize: '0.875rem',
    textAlign: 'center',
    margin: 0,
  },
  hint: {
    color: '#94a3b8',
    fontSize: '0.8rem',
    textAlign: 'center',
    margin: 0,
    maxWidth: '560px',
  },
};

export default TeacherLiveBroadcaster;
