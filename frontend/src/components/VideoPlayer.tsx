import React, { useRef, useEffect, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { Video, videoService } from '../lib/videoService';

interface VideoPlayerProps {
  video: Video;
  isAuthenticated: boolean;
  onTimeUpdate?: (currentTime: number) => void;
  maxPreviewTime?: number;
  className?: string;
  autoPlay?: boolean;
}

// Format seconds as mm:ss
const formatTime = (seconds: number): string => {
  if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  video,
  isAuthenticated,
  onTimeUpdate,
  maxPreviewTime = 10,
  className = '',
  autoPlay = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isPreviewMode] = useState(!isAuthenticated);
  const [previewLimitHit, setPreviewLimitHit] = useState(false);
  const [buffered, setBuffered] = useState(0);

  // ─── HLS Setup ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const hlsUrl = videoService.getVideoPlaybackUrl(video);
    if (!hlsUrl) { setError('Video URL not available'); setIsLoading(false); return; }

    const onLoaded = () => { setIsLoading(false); if (autoPlay) el.play().catch(() => {}); };

    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: false, backBufferLength: 90, debug: false });
      hlsRef.current = hls;
      hls.loadSource(hlsUrl);
      hls.attachMedia(el);
      hls.on(Hls.Events.MANIFEST_PARSED, onLoaded);
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.MEDIA_ERROR) { hls.recoverMediaError(); }
          else { setError('Error loading video. Please try again.'); hls.destroy(); }
          setIsLoading(false);
        }
      });
    } else if (el.canPlayType('application/vnd.apple.mpegurl')) {
      el.src = hlsUrl;
      el.addEventListener('loadedmetadata', onLoaded, { once: true });
      el.addEventListener('error', () => setError('Error loading video.'), { once: true });
    } else {
      setError('HLS not supported in this browser.');
      setIsLoading(false);
    }

    return () => { hlsRef.current?.destroy(); hlsRef.current = null; };
  }, [video, autoPlay]);

  // ─── Controls Auto-Hide ────────────────────────────────────────────────────
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  }, [isPlaying]);

  useEffect(() => { resetControlsTimer(); }, [isPlaying, resetControlsTimer]);

  // ─── Fullscreen change listener ────────────────────────────────────────────
  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  // ─── Video Event Handlers ──────────────────────────────────────────────────
  const handleTimeUpdate = () => {
    const el = videoRef.current;
    if (!el) return;
    const ct = el.currentTime;
    setCurrentTime(ct);
    onTimeUpdate?.(ct);

    // Update buffered
    if (el.buffered.length > 0) {
      setBuffered((el.buffered.end(el.buffered.length - 1) / el.duration) * 100);
    }

    if (isPreviewMode && ct >= maxPreviewTime) {
      el.pause();
      el.currentTime = 0;
      setPreviewLimitHit(true);
    }
  };

  const handleLoadedMetadata = () => {
    const el = videoRef.current;
    if (el) setDuration(el.duration);
  };

  // ─── Control Actions ───────────────────────────────────────────────────────
  const togglePlayPause = () => {
    const el = videoRef.current;
    if (!el) return;
    if (isPlaying) { el.pause(); setIsPlaying(false); }
    else { el.play().then(() => setIsPlaying(true)).catch(() => {}); }
    resetControlsTimer();
  };

  const toggleMute = () => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setIsMuted(el.muted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (videoRef.current) { videoRef.current.volume = v; videoRef.current.muted = v === 0; }
    setIsMuted(v === 0);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = videoRef.current;
    const bar = progressRef.current;
    if (!el || !bar || !isFinite(duration)) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    el.currentTime = ratio * duration;
    setCurrentTime(el.currentTime);
  };

  const handleProgressTouch = (e: React.TouchEvent<HTMLDivElement>) => {
    const el = videoRef.current;
    const bar = progressRef.current;
    if (!el || !bar || !isFinite(duration)) return;
    const touch = e.touches[0];
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
    el.currentTime = ratio * duration;
    setCurrentTime(el.currentTime);
  };

  const toggleFullscreen = () => {
    const cont = containerRef.current;
    if (!cont) return;
    if (!document.fullscreenElement) { cont.requestFullscreen?.(); }
    else { document.exitFullscreen?.(); }
  };

  const skip = (secs: number) => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = Math.max(0, Math.min(duration, el.currentTime + secs));
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const securityStyles: React.CSSProperties = {
    userSelect: 'none', WebkitUserSelect: 'none',
    MozUserSelect: 'none', msUserSelect: 'none',
    WebkitTouchCallout: 'none',
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full bg-black rounded-2xl overflow-hidden group select-none ${className}`}
      style={{ ...securityStyles, aspectRatio: '16/9' }}
      onMouseMove={resetControlsTimer}
      onTouchStart={resetControlsTimer}
      onClick={togglePlayPause}
    >
      {/* VIDEO ELEMENT */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        controlsList="nodownload"
        disablePictureInPicture
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onError={() => setError('Error playing video. Please try again.')}
        onContextMenu={(e) => e.preventDefault()}
        style={securityStyles}
        crossOrigin="anonymous"
        preload="metadata"
        playsInline
        draggable={false}
      />

      {/* LOADING OVERLAY */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-30">
          <div className="flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full border-4 border-white/20 border-t-green-400 animate-spin" />
            <span className="text-white/70 text-sm font-medium tracking-wide">Loading video…</span>
          </div>
        </div>
      )}

      {/* BIG PLAY BUTTON (center — shown when paused and not loading) */}
      {!isPlaying && !isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 shadow-2xl">
            <svg className="w-9 h-9 text-white ml-1" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}

      {/* PREVIEW LIMIT OVERLAY */}
      {previewLimitHit && (
        <div className="absolute inset-0 bg-black/85 flex items-center justify-center z-40 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
          <div className="text-center px-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 border border-green-400/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
            </div>
            <h3 className="text-white text-xl font-bold mb-2">Preview Ended</h3>
            <p className="text-white/60 text-sm mb-6">Sign in to watch the full video</p>
            <a href="/login" className="inline-block bg-green-500 hover:bg-green-600 text-white font-semibold px-8 py-3 rounded-xl transition-colors shadow-lg" onClick={(e) => e.stopPropagation()}>
              Sign In to Continue
            </a>
          </div>
        </div>
      )}

      {/* ERROR OVERLAY */}
      {error && !previewLimitHit && (
        <div className="absolute inset-0 bg-black/85 flex items-center justify-center z-40" onClick={(e) => e.stopPropagation()}>
          <div className="text-center px-6">
            <div className="text-4xl mb-4">⚠️</div>
            <p className="text-white/80 text-sm mb-4 max-w-xs">{error}</p>
            <button
              onClick={() => { setError(''); videoRef.current && (videoRef.current.currentTime = 0); }}
              className="bg-white/10 hover:bg-white/20 text-white text-sm font-medium px-6 py-2 rounded-lg border border-white/20 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* CONTROLS BAR */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-20 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* gradient scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none rounded-b-2xl" />

        <div className="relative px-4 pb-4 pt-10">
          {/* PROGRESS BAR */}
          <div
            ref={progressRef}
            className="relative h-1.5 bg-white/20 rounded-full mb-4 cursor-pointer group/bar hover:h-2.5 transition-all duration-150"
            onClick={handleProgressClick}
            onTouchMove={handleProgressTouch}
          >
            {/* buffered */}
            <div className="absolute inset-y-0 left-0 bg-white/30 rounded-full" style={{ width: `${buffered}%` }} />
            {/* played */}
            <div className="absolute inset-y-0 left-0 bg-green-400 rounded-full transition-all" style={{ width: `${progress}%` }}>
              {/* thumb */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md opacity-0 group-hover/bar:opacity-100 transition-opacity -mr-1.5" />
            </div>
          </div>

          {/* BOTTOM ROW */}
          <div className="flex items-center justify-between gap-3">
            {/* Left: Play, Skip, Volume */}
            <div className="flex items-center gap-2">
              {/* Play/Pause */}
              <button
                onClick={togglePlayPause}
                className="w-9 h-9 flex items-center justify-center text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                )}
              </button>

              {/* Skip back */}
              <button
                onClick={() => skip(-10)}
                className="w-9 h-9 hidden sm:flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Back 10s"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/><text x="7.5" y="16" fontSize="6" fill="currentColor" fontWeight="bold">10</text></svg>
              </button>

              {/* Skip forward */}
              <button
                onClick={() => skip(10)}
                className="w-9 h-9 hidden sm:flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Forward 10s"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18 13c0 3.31-2.69 6-6 6s-6-2.69-6-6 2.69-6 6-6v4l5-5-5-5v4c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8h-2z"/></svg>
              </button>

              {/* Volume */}
              <div className="flex items-center gap-1.5 group/vol">
                <button
                  onClick={toggleMute}
                  className="w-9 h-9 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted || volume === 0 ? (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
                  ) : volume > 0.5 ? (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/></svg>
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="hidden sm:block w-20 accent-green-400 cursor-pointer"
                  title="Volume"
                />
              </div>

              {/* Time */}
              <span className="text-white/70 text-xs font-mono whitespace-nowrap">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            {/* Right: Fullscreen */}
            <div className="flex items-center gap-2">
              {isPreviewMode && (
                <span className="hidden sm:flex items-center gap-1 text-xs text-amber-300 font-medium bg-amber-400/10 border border-amber-400/20 px-2.5 py-1 rounded-full">
                  🔒 Preview ({maxPreviewTime}s)
                </span>
              )}
              <button
                onClick={toggleFullscreen}
                className="w-9 h-9 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Fullscreen"
              >
                {isFullscreen ? (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
