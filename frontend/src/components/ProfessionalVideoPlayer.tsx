import React, { useRef, useState, useEffect, useCallback } from 'react';
import Hls from 'hls.js';
import { Video, videoService } from '../lib/videoService';
import { api } from '../lib/api';

// Preview duration limit for non-authenticated users (in seconds)
const PREVIEW_LIMIT_SECONDS = 10;

interface ProfessionalVideoPlayerProps {
  video: Video;
  isAuthenticated: boolean;
  onTimeUpdate?: (currentTime: number) => void;
  onEnded?: () => void;
  onClose?: () => void;
  className?: string;
  autoPlay?: boolean;
  initialTime?: number;
  initialResolution?: string;
}

interface QualityLevel {
  index: number;
  height: number;
  width: number;
  bitrate: number;
  name: string;
}

const ProfessionalVideoPlayer: React.FC<ProfessionalVideoPlayerProps> = ({
  video,
  isAuthenticated,
  onTimeUpdate,
  onEnded,
  onClose,
  className = '',
  autoPlay = false,
  initialTime = 0,
  initialResolution
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const progressSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);

  console.log(`🎬 ProfessionalVideoPlayer props: video=${video.title}, initialTime=${initialTime}, initialResolution=${initialResolution}, isAuthenticated=${isAuthenticated}`);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Quality/Resolution state
  const [qualityLevels, setQualityLevels] = useState<QualityLevel[]>([]);
  const [currentQualityIndex, setCurrentQualityIndex] = useState(-1); // -1 = auto
  const [currentResolutionLabel, setCurrentResolutionLabel] = useState('Auto');

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  console.log(`🎬 Professional Video Player initialized for: ${video.title}`);

  // Save video progress to backend
  const saveProgress = useCallback(async (time: number, videoDuration: number, completed: boolean = false) => {
    if (!isAuthenticated || !video.id) {
      console.log('📊 Progress save skipped - not authenticated or no video ID');
      return;
    }
    
    try {
      console.log(`📊 Saving progress: video=${video.id}, time=${time.toFixed(1)}s, duration=${videoDuration.toFixed(1)}s`);
      await api.post('/video-progress', {
        videoId: video.id,
        currentTime: time,
        duration: videoDuration,
        resolution: currentResolutionLabel !== 'Auto' ? currentResolutionLabel : null,
        completed
      });
      console.log('📊 Progress saved successfully');
    } catch (error) {
      console.warn('❌ Failed to save video progress:', error);
    }
  }, [isAuthenticated, video.id, currentResolutionLabel]);

  // Set up progress save interval (every 10 seconds while playing)
  useEffect(() => {
    if (isPlaying && isAuthenticated) {
      progressSaveIntervalRef.current = setInterval(() => {
        if (videoRef.current) {
          saveProgress(videoRef.current.currentTime, videoRef.current.duration);
        }
      }, 10000);
    }
    
    return () => {
      if (progressSaveIntervalRef.current) {
        clearInterval(progressSaveIntervalRef.current);
      }
    };
  }, [isPlaying, isAuthenticated, saveProgress]);

  // Save progress on unmount
  useEffect(() => {
    const videoElement = videoRef.current;
    return () => {
      if (videoElement && isAuthenticated) {
        saveProgress(videoElement.currentTime, videoElement.duration);
      }
    };
  }, [isAuthenticated, saveProgress]);

  // ✅ FIXED: Disable right-click context menu
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    const container = containerRef.current;
    
    if (container) {
      container.addEventListener('contextmenu', handleContextMenu);
      return () => container.removeEventListener('contextmenu', handleContextMenu);
    }
    // ✅ FIXED: Return statement for all code paths
    return undefined;
  }, []);

  // Disable text selection and drag
  useEffect(() => {
    const handleSelectStart = (e: Event) => e.preventDefault();
    const handleDragStart = (e: Event) => e.preventDefault();
    
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('dragstart', handleDragStart);
    
    return () => {
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('dragstart', handleDragStart);
    };
  }, []);

  // Auto-hide controls
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    
    if (isPlaying && !isDragging) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isPlaying, isDragging]);

  // Format time
  const formatTime = (time: number): string => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Video event handlers
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      console.log(`📺 Video metadata loaded: ${formatTime(videoRef.current.duration)} - Azizkh07`);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current && !isDragging) {
      const current = videoRef.current.currentTime;
      setCurrentTime(current);
      onTimeUpdate?.(current);
      
      // Enforce preview limit for non-authenticated users
      if (!isAuthenticated && current >= PREVIEW_LIMIT_SECONDS) {
        videoRef.current.pause();
        setIsPlaying(false);
        console.log(`⏹️ Preview limit reached (${PREVIEW_LIMIT_SECONDS} seconds)`);
      }
    }
  };

  const handlePlay = () => {
    setIsPlaying(true);
    setIsBuffering(false);
    resetControlsTimeout();
    // Save initial progress when video starts playing
    if (videoRef.current && isAuthenticated) {
      saveProgress(videoRef.current.currentTime, videoRef.current.duration);
    }
    console.log('▶️ Video playback started');
  };

  const handlePause = () => {
    setIsPlaying(false);
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    // Save progress on pause
    if (videoRef.current && isAuthenticated) {
      saveProgress(videoRef.current.currentTime, videoRef.current.duration);
    }
    console.log('⏸️ Video playback paused');
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setShowControls(true);
    // Save progress as complete
    if (videoRef.current && isAuthenticated) {
      saveProgress(videoRef.current.duration, videoRef.current.duration, true);
    }
    onEnded?.();
    console.log('🏁 Video playback ended');
  };

  const handleWaiting = () => {
    setIsBuffering(true);
    console.log('⏳ Video buffering... - Azizkh07');
  };

  const handleCanPlay = () => {
    setIsBuffering(false);
    console.log('✅ Video ready to play - Azizkh07');
  };

  // Control handlers
  const togglePlayPause = useCallback(() => {
    if (videoRef.current) {
      if (!isAuthenticated && currentTime >= PREVIEW_LIMIT_SECONDS) {
        console.log('🔒 Login required to continue watching');
        return;
      }
      
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  }, [isAuthenticated, currentTime, isPlaying]);

  const handleProgressMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    handleProgressClick(e);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current && progressRef.current) {
      const rect = progressRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const newTime = (clickX / rect.width) * duration;
      
      if (!isAuthenticated && newTime > PREVIEW_LIMIT_SECONDS) {
        return;
      }
      
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = useCallback((newVolume: number) => {
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      const newMuted = !isMuted;
      videoRef.current.muted = newMuted;
      setIsMuted(newMuted);
      
      if (newMuted) {
        videoRef.current.volume = 0;
      } else {
        videoRef.current.volume = volume;
      }
    }
  }, [isMuted, volume]);

  const changePlaybackRate = (rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
      setShowSpeedMenu(false);
      console.log(`⚡ Playback speed changed to ${rate}x`);
    }
  };

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  // ✅ FIXED: Mouse move handlers
  useEffect(() => {
    const handleMouseMove = () => resetControlsTimeout();
    const handleMouseUp = () => setIsDragging(false);
    
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
    // ✅ FIXED: Return statement for all code paths
    return undefined;
  }, [isDragging, resetControlsTimeout]);

  // Keyboard shortcuts
  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!videoRef.current) return;

    // Prevent default browser behavior
    e.preventDefault();

    switch (e.code) {
      case 'Space':
        togglePlayPause();
        break;
      case 'KeyF':
        toggleFullscreen();
        break;
      case 'KeyM':
        toggleMute();
        break;
      case 'Escape':
        if (isFullscreen) {
          document.exitFullscreen();
        } else {
          onClose?.();
        }
        break;
      case 'ArrowLeft':
        if (isAuthenticated || currentTime - 10 >= 0) {
          videoRef.current.currentTime = Math.max(0, currentTime - 10);
        }
        break;
      case 'ArrowRight':
        if (isAuthenticated || currentTime + 10 <= 10) {
          videoRef.current.currentTime = Math.min(duration, currentTime + 10);
        }
        break;
      case 'ArrowUp':
        handleVolumeChange(Math.min(1, volume + 0.1));
        break;
      case 'ArrowDown':
        handleVolumeChange(Math.max(0, volume - 0.1));
        break;
    }
  }, [currentTime, duration, volume, isAuthenticated, isFullscreen, onClose, togglePlayPause, toggleFullscreen, toggleMute, handleVolumeChange]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Fullscreen change handler
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Auto-play handling
  useEffect(() => {
    if (autoPlay && videoRef.current) {
      videoRef.current.play().catch(console.error);
    }
  }, [autoPlay]);

  // Available resolutions from video object
  const availableResolutions = video.available_resolutions || ['1080', '720', '480', '360'];
  const defaultResolution = video.default_resolution || '720';

  // Get HLS video URL from video object with optional resolution
  const getVideoUrl = useCallback((resolution?: string) => {
    const res = resolution || currentResolutionLabel.replace('p', '') || defaultResolution;
    return videoService.getVideoPlaybackUrl(video, res);
  }, [video, currentResolutionLabel, defaultResolution]);

  // Load video with specific resolution
  const loadVideoWithResolution = useCallback((resolution: string, preserveTime: boolean = true) => {
    const videoElement = videoRef.current;
    if (!videoElement) return;
    
    const currentTimeValue = preserveTime ? videoElement.currentTime : 0;
    const wasPlaying = !videoElement.paused;
    
    // Destroy existing HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    
    const hlsUrl = getVideoUrl(resolution);
    if (!hlsUrl) {
      console.error('❌ No HLS URL available for resolution:', resolution);
      return;
    }
    
    console.log(`🎬 Loading video with ${resolution}p resolution: ${hlsUrl}`);
    
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
        xhrSetup: function(xhr, url) {
          xhr.withCredentials = false;
        },
        debug: false,
      });

      hlsRef.current = hls;
      hls.loadSource(hlsUrl);
      hls.attachMedia(videoElement);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log(`✅ HLS manifest parsed for ${resolution}p`);
        setIsBuffering(false);
        
        // Restore playback position
        if (currentTimeValue > 0) {
          videoElement.currentTime = currentTimeValue;
        }
        
        // Resume playback if it was playing
        if (wasPlaying) {
          videoElement.play().catch(err => {
            console.warn('⚠️ Autoplay prevented:', err);
          });
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('❌ HLS error:', data);
        setIsBuffering(false);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('Fatal network error, trying to recover');
              setTimeout(() => {
                if (hlsRef.current) {
                  hlsRef.current.startLoad();
                }
              }, 1000);
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('Fatal media error, trying to recover');
              hls.recoverMediaError();
              break;
            default:
              console.error('Fatal error, cannot recover');
              hls.destroy();
              break;
          }
        }
      });
    } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari, iOS)
      videoElement.src = hlsUrl;
      if (currentTimeValue > 0) {
        videoElement.currentTime = currentTimeValue;
      }
    }
  }, [getVideoUrl]);

  // Initialize HLS.js for video playback
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    // Use initial resolution or default
    const startResolution = initialResolution?.replace('p', '') || defaultResolution;
    setCurrentResolutionLabel(`${startResolution}p`);
    
    // Build quality levels from available resolutions
    const levels: QualityLevel[] = availableResolutions.map((res, index) => ({
      index,
      height: parseInt(res),
      width: Math.round(parseInt(res) * 16 / 9),
      bitrate: 0,
      name: `${res}p`
    }));
    levels.sort((a, b) => b.height - a.height);
    setQualityLevels(levels);

    const hlsUrl = getVideoUrl(startResolution);
    if (!hlsUrl) {
      console.error('❌ No HLS URL available');
      return;
    }

    console.log('🎬 Initializing HLS for ProfessionalVideoPlayer:', hlsUrl);

    // Check if HLS.js is supported
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
        xhrSetup: function(xhr, url) {
          // Set proper CORS headers for cross-origin requests
          xhr.withCredentials = false;
        },
        debug: false,
      });

      hlsRef.current = hls;
      hls.loadSource(hlsUrl);
      hls.attachMedia(videoElement);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('✅ HLS manifest parsed in ProfessionalVideoPlayer');
        
        setIsBuffering(false);
        
        // Set initial time if provided (for resume functionality)
        if (initialTime > 0) {
          videoElement.currentTime = initialTime;
        }
        
        if (autoPlay) {
          videoElement.play().catch(err => {
            console.warn('⚠️ Autoplay prevented:', err);
          });
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('❌ HLS error in ProfessionalVideoPlayer:', data);
        setIsBuffering(false);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('Fatal network error, trying to recover', data);
              // Try to recover
              setTimeout(() => {
                if (hlsRef.current) {
                  hlsRef.current.startLoad();
                }
              }, 1000);
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('Fatal media error, trying to recover');
              hls.recoverMediaError();
              break;
            default:
              console.error('Fatal error, cannot recover');
              hls.destroy();
              break;
          }
        }
      });

    } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari, iOS)
      console.log('✅ Using native HLS support in ProfessionalVideoPlayer');
      videoElement.src = hlsUrl;
      
      // Set initial time for native HLS
      if (initialTime > 0) {
        videoElement.currentTime = initialTime;
      }
    } else {
      console.error('❌ HLS not supported in this browser');
    }

    // Cleanup
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video, autoPlay, initialTime, initialResolution]);

  // Change quality level by switching to different resolution URL
  const changeQuality = useCallback((resolution: string) => {
    setIsBuffering(true);
    setCurrentResolutionLabel(`${resolution}p`);
    loadVideoWithResolution(resolution, true);
    setShowQualityMenu(false);
    console.log(`🎬 Quality changed to ${resolution}p`);
  }, [loadVideoWithResolution]);

  return (
    <div 
      ref={containerRef}
      className={`relative bg-black overflow-hidden select-none ${className}`}
      onMouseMove={resetControlsTimeout}
      onMouseLeave={() => {
        if (!isDragging) {
          setShowControls(false);
        }
      }}
      style={{ 
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none'
      }}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full"
        autoPlay={autoPlay}
        playsInline
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        onWaiting={handleWaiting}
        onCanPlay={handleCanPlay}
        crossOrigin="anonymous"
        controlsList="nodownload noremoteplayback"
        disablePictureInPicture
        disableRemotePlayback
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Loading Spinner */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
            <p className="text-white text-sm mt-2">Chargement...</p>
          </div>
        </div>
      )}

      {/* Center Play Button */}
      {!isPlaying && !isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={togglePlayPause}
            className="bg-green-600 hover:bg-green-700 text-white rounded-full p-6 transition-all duration-200 transform hover:scale-110 shadow-lg"
          >
            <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </button>
        </div>
      )}

      {/* Preview Warning */}
      {!isAuthenticated && (
        <div className="absolute top-4 left-4 bg-orange-600 bg-opacity-95 text-white px-4 py-2 rounded-lg shadow-lg">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">Aperçu - {Math.max(0, PREVIEW_LIMIT_SECONDS - Math.floor(currentTime))}s restantes</span>
          </div>
        </div>
      )}

      {/* User Badge */}
   

      {/* Close Button */}
   

      {/* Custom Controls */}
      <div 
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Progress Bar */}
        <div className="px-4 pb-4">
          <div 
            ref={progressRef}
            className="group relative w-full h-1 bg-gray-600 rounded cursor-pointer hover:h-2 transition-all duration-200"
            onMouseDown={handleProgressMouseDown}
            onClick={handleProgressClick}
          >
            {/* Progress */}
            <div 
              className="h-full bg-green-600 rounded transition-all duration-100"
              style={{ 
                width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                maxWidth: !isAuthenticated && duration > 0 ? `${(PREVIEW_LIMIT_SECONDS / duration) * 100}%` : '100%'
              }}
            />
            
            {/* Preview limit indicator */}
            {!isAuthenticated && duration > 0 && (
              <div 
                className="absolute top-0 h-full w-1 bg-green-500 rounded"
                style={{ left: `${Math.min((PREVIEW_LIMIT_SECONDS / duration) * 100, 100)}%` }}
              />
            )}
            
            {/* Scrubber */}
            <div 
              className="absolute top-1/2 w-4 h-4 bg-green-600 rounded-full transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
              style={{ 
                left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                marginLeft: '-8px'
              }}
            />
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between px-4 pb-4">
          <div className="flex items-center space-x-4">
            {/* Skip Back 5 seconds */}
            <button
              onClick={() => {
                if (videoRef.current) {
                  const newTime = Math.max(0, videoRef.current.currentTime - 5);
                  videoRef.current.currentTime = newTime;
                  setCurrentTime(newTime);
                }
              }}
              className="text-white hover:text-green-400 transition-colors duration-200"
              title="Reculer 5s"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
                <text x="9" y="15" fontSize="6" fontWeight="bold" fill="currentColor">5</text>
              </svg>
            </button>

            {/* Play/Pause */}
            <button
              onClick={togglePlayPause}
              className="text-white hover:text-green-400 transition-colors duration-200"
            >
              {isPlaying ? (
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                </svg>
              ) : (
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              )}
            </button>

            {/* Skip Forward 5 seconds */}
            <button
              onClick={() => {
                if (videoRef.current) {
                  const newTime = Math.min(duration, videoRef.current.currentTime + 5);
                  if (!isAuthenticated && newTime > PREVIEW_LIMIT_SECONDS) return;
                  videoRef.current.currentTime = newTime;
                  setCurrentTime(newTime);
                }
              }}
              className="text-white hover:text-green-400 transition-colors duration-200"
              title="Avancer 5s"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/>
                <text x="9" y="15" fontSize="6" fontWeight="bold" fill="currentColor">5</text>
              </svg>
            </button>

            {/* Volume */}
            <div 
              className="flex items-center space-x-2 group"
              onMouseEnter={() => setShowVolumeSlider(true)}
              onMouseLeave={() => setShowVolumeSlider(false)}
            >
              <button
                onClick={toggleMute}
                className="text-white hover:text-green-400 transition-colors duration-200"
              >
                {isMuted || volume === 0 ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3.63 3.63a.996.996 0 000 1.41L7.29 8.7 7 9H4c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1h3l3.29 3.29c.63.63 1.71.18 1.71-.71v-4.17l4.18 4.18c-.49.37-1.02.68-1.6.91-.36.15-.58.53-.58.92 0 .72.73 1.18 1.39.91.8-.33 1.55-.77 2.22-1.31l2.01 2.01a.996.996 0 101.41-1.41L5.05 3.63c-.39-.39-1.02-.39-1.42 0zM19 12c0 .82-.15 1.61-.41 2.34l1.53 1.53c.56-1.17.88-2.48.88-3.87 0-3.83-2.4-7.11-5.78-8.4-.59-.23-1.22.23-1.22.86v.19c0 .38.25.71.61.85C17.18 6.54 19 9.06 19 12zm-8.71-6.29l-.17.17L12 7.76V6.41c0-.89-1.08-1.33-1.71-.7zM16.5 12c0-1.77-1.02-3.29-2.5-4.03v1.79l2.48 2.48c.01-.08.02-.16.02-.24z"/>
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm7-.17v6.34L7.83 13H5v-2h2.83L10 8.83zM16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77 0-4.28-2.99-7.86-7-8.77z"/>
                  </svg>
                )}
              </button>

              {/* Volume Slider */}
              <div className={`transition-all duration-200 overflow-hidden ${
                showVolumeSlider ? 'w-20 opacity-100' : 'w-0 opacity-0'
              }`}>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            {/* Time Display */}
            <div className="text-white text-sm font-mono">
              {formatTime(currentTime)} / {formatTime(duration)}
              {!isAuthenticated && (
                <span className="text-orange-400 ml-2">(Aperçu)</span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Speed Control */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowSpeedMenu(!showSpeedMenu);
                  setShowQualityMenu(false);
                }}
                className="text-white hover:text-green-400 transition-colors duration-200 text-sm font-medium px-2 py-1 rounded hover:bg-black hover:bg-opacity-30"
              >
                {playbackRate}x
              </button>

              {showSpeedMenu && (
                <div className="absolute bottom-full right-0 mb-2 bg-black bg-opacity-95 rounded-lg p-2 min-w-20 shadow-lg z-50">
                  <div className="text-xs text-gray-300 mb-2 px-2">Vitesse</div>
                  {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(rate => (
                    <button
                      key={rate}
                      onClick={() => changePlaybackRate(rate)}
                      className={`block w-full text-left px-2 py-1 text-sm hover:bg-green-600 rounded transition-colors ${
                        playbackRate === rate ? 'text-green-400 bg-green-600 bg-opacity-30' : 'text-white'
                      }`}
                    >
                      {rate}x {rate === 1 && '(Normal)'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quality/Resolution Control */}
            {availableResolutions.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => {
                    setShowQualityMenu(!showQualityMenu);
                    setShowSpeedMenu(false);
                  }}
                  className="text-white hover:text-green-400 transition-colors duration-200 text-sm font-medium px-2 py-1 rounded hover:bg-black hover:bg-opacity-30 flex items-center"
                >
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
                  </svg>
                  {currentResolutionLabel}
                </button>

                {showQualityMenu && (
                  <div className="absolute bottom-full right-0 mb-2 bg-black bg-opacity-95 rounded-lg p-2 min-w-32 shadow-lg z-50">
                    <div className="text-xs text-gray-300 mb-2 px-2">Qualité</div>
                    {availableResolutions.map(res => (
                      <button
                        key={res}
                        onClick={() => changeQuality(res)}
                        className={`block w-full text-left px-2 py-1 text-sm hover:bg-green-600 rounded transition-colors ${
                          currentResolutionLabel === `${res}p` ? 'text-green-400 bg-green-600 bg-opacity-30' : 'text-white'
                        }`}
                      >
                        {res}p
                        {res === defaultResolution && ' (Défaut)'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="text-white hover:text-green-400 transition-colors duration-200"
            >
              {isFullscreen ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Keyboard Shortcuts Info */}
        <div className="text-xs text-gray-400 px-4 pb-2 opacity-70">
          Espace: Lecture/Pause • F: Plein écran • M: Muet • ←→: Navigation • ↑↓: Volume • Échap: Fermer
        </div>
      </div>
    </div>
  );
};

export default ProfessionalVideoPlayer;