import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { Video } from '../lib/videoService';
import { useAuth } from '../lib/AuthContext';

interface ContinueWatchingItem {
  videoId: number;
  currentTime: number;
  duration: number;
  resolution: string | null;
  completed: boolean;
  lastWatchedAt: string;
  video: Video & {
    course_id?: number;
    course_title?: string;
    subject_id?: number;
    subject_title?: string;
    professor_name?: string;
    cover_image?: string;
  };
}

interface ContinueWatchingProps {
  onVideoSelect: (video: Video, initialTime: number, resolution?: string) => void;
  className?: string;
}

const ContinueWatching: React.FC<ContinueWatchingProps> = ({ onVideoSelect, className = '' }) => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState<ContinueWatchingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const fetchContinueWatching = useCallback(async () => {
    // Only fetch if user is authenticated
    if (!isAuthenticated) {
      setItems([]);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const response = await api.get('/video-progress/continue-watching/list');
      
      if (response && response.success && Array.isArray(response.data)) {
        setItems(response.data);
      } else if (Array.isArray(response)) {
        setItems(response);
      } else {
        setItems([]);
      }
    } catch (err: any) {
      console.error('Error fetching continue watching:', err);
      setError(err.message || 'Failed to load continue watching');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchContinueWatching();
  }, [fetchContinueWatching]);

  // Check scroll state
  const checkScrollState = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  }, []);

  useEffect(() => {
    checkScrollState();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollState);
      window.addEventListener('resize', checkScrollState);
      return () => {
        container.removeEventListener('scroll', checkScrollState);
        window.removeEventListener('resize', checkScrollState);
      };
    }
    return undefined;
  }, [checkScrollState, items]);

  // Scroll handlers
  const scrollBy = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 320; // Card width + gap
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Mouse drag handlers for grab & scroll
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
    scrollContainerRef.current.style.cursor = 'grabbing';
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.style.cursor = 'grab';
    }
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false);
      if (scrollContainerRef.current) {
        scrollContainerRef.current.style.cursor = 'grab';
      }
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
      return t('continue_watching.minutes_ago', '{{count}} min ago', { count: diffMins });
    } else if (diffHours < 24) {
      return t('continue_watching.hours_ago', '{{count}}h ago', { count: diffHours });
    } else if (diffDays < 7) {
      return t('continue_watching.days_ago', '{{count}} day(s) ago', { count: diffDays });
    } else {
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    }
  };

  const getProgressPercent = (currentTime: number, duration: number): number => {
    if (!duration || duration === 0) return 0;
    return Math.min(100, Math.round((currentTime / duration) * 100));
  };

  const handleItemClick = (item: ContinueWatchingItem) => {
    if (!isDragging) {
      onVideoSelect(item.video, item.currentTime, item.resolution || undefined);
    }
  };

  if (loading) {
    return (
      <div className={`continue-watching-section ${className}`} style={{
        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.05), rgba(22, 163, 74, 0.08))',
        borderRadius: '20px',
        padding: '24px',
        marginBottom: '32px',
        border: '1px solid rgba(34, 197, 94, 0.15)'
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1f2937', margin: 0 }}>
          {t('continue_watching.title', 'Continue Watching')}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: '3px solid #22c55e',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
        </div>
      </div>
    );
  }

  if (error || items.length === 0) {
    return null;
  }

  return (
    <div className={`continue-watching-section ${className}`} style={{
      background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.05), rgba(22, 163, 74, 0.08))',
      borderRadius: '20px',
      padding: '24px',
      marginBottom: '32px',
      border: '1px solid rgba(34, 197, 94, 0.15)',
      position: 'relative'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px'
      }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: '700',
          color: '#1f2937',
          display: 'flex',
          alignItems: 'center',
          margin: 0
        }}>
          <span style={{
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '12px',
            fontSize: '16px'
          }}>
            ▶️
          </span>
          {t('continue_watching.title', 'Continue Watching')}
        </h2>
        <span style={{
          background: 'rgba(34, 197, 94, 0.15)',
          color: '#16a34a',
          padding: '6px 14px',
          borderRadius: '20px',
          fontSize: '13px',
          fontWeight: '600'
        }}>
          {items.length} {t('continue_watching.videos_count', 'video(s)', { count: items.length })}
        </span>
      </div>

      {/* Navigation Arrows - Desktop only */}
      {canScrollLeft && (
        <button
          onClick={() => scrollBy('left')}
          style={{
            position: 'absolute',
            left: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid rgba(34, 197, 94, 0.2)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#22c55e';
            e.currentTarget.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)';
            e.currentTarget.style.color = '#1f2937';
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      )}

      {canScrollRight && (
        <button
          onClick={() => scrollBy('right')}
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid rgba(34, 197, 94, 0.2)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#22c55e';
            e.currentTarget.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)';
            e.currentTarget.style.color = '#1f2937';
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      )}
      
      {/* Horizontal Scrollable Container */}
      <div
        ref={scrollContainerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{
          display: 'flex',
          gap: '20px',
          overflowX: 'auto',
          scrollBehavior: 'smooth',
          cursor: 'grab',
          paddingBottom: '8px',
          paddingLeft: '4px',
          paddingRight: '4px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch'
        }}
        className="hide-scrollbar"
      >
        {items.map((item) => (
          <div
            key={item.videoId}
            className="continue-watching-card"
            onClick={() => handleItemClick(item)}
            style={{
              flex: '0 0 300px',
              minWidth: '300px',
              maxWidth: '300px',
              background: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '16px',
              overflow: 'hidden',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
              border: '1px solid rgba(34, 197, 94, 0.1)',
              userSelect: 'none'
            }}
            onMouseEnter={(e) => {
              if (!isDragging) {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = '0 12px 30px rgba(0, 0, 0, 0.15)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.08)';
            }}
          >
            {/* Thumbnail */}
            <div style={{
              position: 'relative',
              width: '100%',
              height: '150px',
              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
              overflow: 'hidden'
            }}>
              {item.video.thumbnail_url ? (
                <img
                  src={item.video.thumbnail_url}
                  alt={item.video.title}
                  draggable={false}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                  onError={(e: any) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : item.video.cover_image ? (
                <img
                  src={item.video.cover_image}
                  alt={item.video.title}
                  draggable={false}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                  onError={(e: any) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '40px'
                }}>
                  📚
                </div>
              )}
              
              {/* Play overlay */}
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0,
                transition: 'opacity 0.3s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
              >
                <div style={{
                  width: '50px',
                  height: '50px',
                  background: 'white',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#22c55e',
                  fontSize: '20px'
                }}>
                  ▶
                </div>
              </div>
              
              {/* Progress bar */}
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: 'rgba(255, 255, 255, 0.3)'
              }}>
                <div style={{
                  height: '100%',
                  width: `${getProgressPercent(item.currentTime, item.duration)}%`,
                  background: '#22c55e',
                  transition: 'width 0.3s ease'
                }}></div>
              </div>
              
              {/* Time remaining badge */}
              <div style={{
                position: 'absolute',
                bottom: '10px',
                right: '10px',
                background: 'rgba(0, 0, 0, 0.8)',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: '600'
              }}>
                {formatTime(item.duration - item.currentTime)} {t('continue_watching.remaining', 'left')}
              </div>
            </div>
            
            {/* Content */}
            <div style={{ padding: '14px' }}>
              <h3 style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#1f2937',
                marginBottom: '6px',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                lineHeight: '1.3'
              }}>
                {item.video.title}
              </h3>
              
              <div style={{
                fontSize: '12px',
                color: '#6b7280',
                marginBottom: '8px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {item.video.course_title}
              </div>
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '11px',
                color: '#9ca3af'
              }}>
                <span>{formatRelativeTime(item.lastWatchedAt)}</span>
                <button style={{
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  color: 'white',
                  border: 'none',
                  padding: '5px 12px',
                  borderRadius: '16px',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}>
                  {t('continue_watching.resume', 'Resume')}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CSS for hiding scrollbar */}
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ContinueWatching;
