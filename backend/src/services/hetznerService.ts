import { config } from '../config';

/**
 * Hetzner Object Storage Service
 * Provides public HLS video URLs from Hetzner S3-compatible storage
 */

// Available video resolutions in order of preference
export const AVAILABLE_RESOLUTIONS = ['1080', '720', '480', '360'];
export const DEFAULT_RESOLUTION = '720';

/**
 * Generate a public video URL for HLS playback with resolution
 * @param videoBasePath - The base path without resolution (e.g., "videos/course_1/lesson_1")
 * @param resolution - Optional resolution (e.g., "720", "1080", "360"). Defaults to 720
 * @returns Public URL to the video file
 */
export const getPublicVideoUrl = (videoBasePath: string, resolution: string = DEFAULT_RESOLUTION): string => {
  if (!config.hetzner.enabled) {
    throw new Error('Hetzner storage is not enabled');
  }

  if (!config.hetzner.endpoint || !config.hetzner.bucket) {
    throw new Error('Hetzner endpoint and bucket must be configured');
  }

  // Remove leading/trailing slashes
  let cleanPath = videoBasePath.startsWith('/') ? videoBasePath.substring(1) : videoBasePath;
  cleanPath = cleanPath.endsWith('/') ? cleanPath.slice(0, -1) : cleanPath;
  
  // If the path already ends with output.m3u8, use it as-is (legacy support)
  if (cleanPath.endsWith('.m3u8')) {
    const publicUrl = `${config.hetzner.endpoint}/${config.hetzner.bucket}/${cleanPath}`;
    console.log(`🎬 Generated legacy HLS URL: ${publicUrl}`);
    return publicUrl;
  }

  // Build the URL with resolution: basePath/resolution/output.m3u8
  const publicUrl = `${config.hetzner.endpoint}/${config.hetzner.bucket}/${cleanPath}/${resolution}/output.m3u8`;

  console.log(`🎬 Generated public HLS URL (${resolution}p): ${publicUrl}`);
  return publicUrl;
};

/**
 * Get all available resolution URLs for a video
 * @param videoBasePath - The base path without resolution
 * @returns Object with resolution keys and URLs
 */
export const getAllResolutionUrls = (videoBasePath: string): Record<string, string> => {
  const urls: Record<string, string> = {};
  
  for (const resolution of AVAILABLE_RESOLUTIONS) {
    urls[resolution] = getPublicVideoUrl(videoBasePath, resolution);
  }
  
  return urls;
};

/**
 * Generate a public URL for any asset (thumbnails, images, etc.)
 * @param assetPath - The S3 object key (e.g., "thumbnails/video_1.jpg")
 * @returns Public URL to the asset
 */
export const getPublicAssetUrl = (assetPath: string): string => {
  if (!config.hetzner.enabled) {
    throw new Error('Hetzner storage is not enabled');
  }

  if (!config.hetzner.endpoint || !config.hetzner.bucket) {
    throw new Error('Hetzner endpoint and bucket must be configured');
  }

  // Remove leading slash if present
  const cleanPath = assetPath.startsWith('/') ? assetPath.substring(1) : assetPath;

  // Build the public URL
  const publicUrl = `${config.hetzner.endpoint}/${config.hetzner.bucket}/${cleanPath}`;

  console.log(`🖼️ Generated public asset URL: ${publicUrl}`);
  return publicUrl;
};

/**
 * Validate video path format
 * @param videoPath - The S3 object key to validate
 * @returns true if valid, false otherwise
 */
export const isValidVideoPath = (videoPath: string): boolean => {
  if (!videoPath || typeof videoPath !== 'string') {
    return false;
  }

  // Accept both old format (ending with .m3u8) and new format (base path without extension)
  // Old format: videos/subject1/720/output.m3u8
  // New format: videos/subject1
  return videoPath.length > 0;
};

/**
 * Get CORS headers for HLS streaming
 * These headers should be configured in Hetzner bucket settings
 */
export const getRequiredCorsHeaders = () => {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET',
    'Access-Control-Allow-Headers': 'Range',
  };
};

/**
 * Get Cloudflare caching recommendations
 * These are documentation strings for configuration
 */
export const getCloudflareConfig = () => {
  return {
    description: 'Cloudflare caching configuration for HLS streaming',
    pageRule: {
      url: 'cdn.yourdomain.com/*',
      settings: {
        cacheLevel: 'Cache Everything',
        edgeCacheTTL: '1 year',
        browserCacheTTL: 'Respect Existing Headers',
      }
    },
    notes: [
      'HLS files (.m3u8 and .ts) are cached at the edge',
      'Video files will not be fetched from Hetzner repeatedly',
      'The player loads from Cloudflare automatically',
      'No backend proxying required',
      'Supports Range HTTP headers for partial responses (206)',
    ]
  };
};
