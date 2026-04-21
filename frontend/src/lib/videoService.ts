import { api } from './api';

export interface Video {
  id: number;
  title: string;
  description?: string;
  subject_id?: number;
  course_id?: number;
  course_title?: string;
  subject_title?: string;
  professor_name?: string;
  video_path: string;
  hls_url?: string;
  playback_url?: string;
  thumbnail_path?: string;
  thumbnail_url?: string;  // Public URL from Hetzner
  file_size?: number;
  duration?: number;
  mime_type?: string;
  is_active: boolean;
  is_free?: boolean;
  order_index?: number;
  created_at: string;
  updated_at: string;
  views_count?: number;
  likes_count?: number;
  // Multi-resolution support
  resolution_urls?: Record<string, string>;
  available_resolutions?: string[];
  default_resolution?: string;
}

export interface VideoStats {
  total_videos: number;
  active_videos: number;
  subjects_with_videos: number;
  total_size: number;
}

export class VideoService {
  /**
   * Get all videos with public HLS URLs
   */
  async getAllVideosWithSubjects(): Promise<Video[]> {
    try {
      console.log('🎬 Fetching all videos with HLS URLs...');
      
      const response = await api.get<Video[]>('/api/videos');
      
      const videos = Array.isArray(response) ? response.map(video => ({
        ...video,
        course_title: video.course_title || 'Aucun cours',
        subject_title: video.subject_title || 'Aucune matière',
        professor_name: video.professor_name || 'Aucun professeur',
        file_size: video.file_size || 0,
        duration: video.duration || 0,
        order_index: video.order_index || 0,
        views_count: video.views_count || 0,
        likes_count: video.likes_count || 0
      })) : [];
      
      console.log(`✅ Fetched ${videos.length} videos`);
      return videos;
    } catch (error) {
      console.error('❌ Error fetching videos:', error);
      return [];
    }
  }

  /**
   * Get video statistics
   */
  async getVideoStats(): Promise<VideoStats> {
    try {
      console.log('📊 Fetching video statistics...');
      
      const response = await api.get<VideoStats>('/api/videos/admin/stats');
      
      const stats: VideoStats = {
        total_videos: response.total_videos || 0,
        active_videos: response.active_videos || 0,
        subjects_with_videos: response.subjects_with_videos || 0,
        total_size: response.total_size || 0
      };
      
      console.log('✅ Video stats fetched:', stats);
      return stats;
    } catch (error) {
      console.error('❌ Error fetching video stats:', error);
      
      // Fallback: calculate stats from video list
      try {
        console.log('🔄 Calculating stats from video list as fallback...');
        const videos = await this.getAllVideosWithSubjects();
        
        const fallbackStats: VideoStats = {
          total_videos: videos.length,
          active_videos: videos.filter(v => v.is_active).length,
          subjects_with_videos: new Set(videos.map(v => v.subject_id).filter(Boolean)).size,
          total_size: videos.reduce((sum, v) => sum + (v.file_size || 0), 0)
        };
        
        console.log('✅ Fallback stats calculated:', fallbackStats);
        return fallbackStats;
      } catch (fallbackError) {
        console.error('❌ Fallback stats calculation failed:', fallbackError);
        return {
          total_videos: 0,
          active_videos: 0,
          subjects_with_videos: 0,
          total_size: 0
        };
      }
    }
  }

  /**
   * Get videos by subject
   */
  async getVideosBySubject(subjectId: number): Promise<Video[]> {
    try {
      console.log(`🎬 Fetching videos for subject ${subjectId}...`);
      
      const allVideos = await this.getAllVideosWithSubjects();
      const subjectVideos = allVideos.filter(video => video.subject_id === subjectId);
      
      console.log(`✅ Found ${subjectVideos.length} videos for subject ${subjectId}`);
      return subjectVideos;
    } catch (error) {
      console.error(`❌ Error fetching videos by subject ${subjectId}:`, error);
      return [];
    }
  }

  /**
   * Get single video by ID with public HLS URL
   */
  async getVideoById(videoId: number): Promise<Video | null> {
    try {
      console.log(`🎬 Fetching video ${videoId}...`);
      
      const response = await api.get<Video>(`/api/videos/${videoId}`);
      
      const video: Video = {
        ...response,
        course_title: response.course_title || 'Aucun cours',
        subject_title: response.subject_title || 'Aucune matière',
        professor_name: response.professor_name || 'Aucun professeur'
      };
      
      console.log(`✅ Fetched video ${videoId}`);
      return video;
    } catch (error) {
      console.error(`❌ Error fetching video ${videoId}:`, error);
      return null;
    }
  }

  /**
   * Get HLS playback URL for video (default resolution)
   * The backend now returns the complete public Hetzner HLS URL
   */
  getVideoPlaybackUrl(video: Video, resolution?: string): string {
    // If resolution is specified and we have resolution_urls, use them
    if (resolution && video.resolution_urls && video.resolution_urls[resolution]) {
      console.log(`🎬 Using ${resolution}p HLS URL for video ${video.id}`);
      return video.resolution_urls[resolution];
    }
    
    // Use hls_url or playback_url from backend (default resolution)
    const hlsUrl = video.hls_url || video.playback_url;
    
    if (hlsUrl) {
      console.log(`🎬 Using default HLS URL for video ${video.id}: ${hlsUrl}`);
      return hlsUrl;
    }
    
    console.warn(`⚠️ No HLS URL found for video ${video.id}`);
    return '';
  }

  /**
   * Get all available resolution URLs for a video
   */
  getResolutionUrls(video: Video): Record<string, string> {
    return video.resolution_urls || {};
  }

  /**
   * Get available resolutions for a video
   */
  getAvailableResolutions(video: Video): string[] {
    return video.available_resolutions || ['720'];
  }

  /**
   * Get default resolution for a video
   */
  getDefaultResolution(video: Video): string {
    return video.default_resolution || '720';
  }

  /**
   * Get thumbnail URL (if available)
   */
  getThumbnailUrl(video: Video): string {
    // Use thumbnail_url from API if available (Hetzner public URL)
    if (video.thumbnail_url) {
      return video.thumbnail_url;
    }
    
    // Fallback if old thumbnail_path exists
    if (video.thumbnail_path) {
      // If it's already a full URL, return as is
      if (video.thumbnail_path.startsWith('http')) {
        return video.thumbnail_path;
      }
      
      console.log(`🖼️ Thumbnail path for video ${video.id}: ${video.thumbnail_path}`);
      return video.thumbnail_path;
    }
    
    // Fallback to placeholder
    console.log(`⚠️ No thumbnail found for video ${video.id}, using placeholder`);
    return '/api/placeholder/320/180';
  }

  /**
   * Delete video (admin only)
   */
  async deleteVideo(id: number): Promise<boolean> {
    try {
      console.log(`🗑️ Deleting video ${id}...`);
      
      await api.delete(`/api/videos/${id}`);
      
      console.log(`✅ Video ${id} deleted successfully`);
      return true;
    } catch (error) {
      console.error(`❌ Error deleting video ${id}:`, error);
      return false;
    }
  }

  /**
   * Format file size to human readable format
   */
  formatFileSize(bytes?: number): string {
    if (!bytes || bytes === 0) return 'Inconnu';
    
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    const formatted = size.toFixed(unitIndex === 0 ? 0 : 1) + ' ' + units[unitIndex];
    return formatted;
  }

  /**
   * Format date to French locale
   */
  formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      const formatted = date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      return formatted;
    } catch (error) {
      console.error('❌ Error formatting date:', error);
      return 'Date invalide';
    }
  }

  /**
   * Format duration from seconds to readable format
   */
  formatDuration(seconds?: number): string {
    if (!seconds || seconds === 0) return 'Inconnu';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    let formatted: string;
    if (hours > 0) {
      formatted = `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
      formatted = `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    return formatted;
  }

  /**
   * Check if video has valid HLS URL
   */
  hasValidHlsUrl(video: Video): boolean {
    const hlsUrl = video.hls_url || video.playback_url;
    const isValid = !!hlsUrl && hlsUrl.endsWith('.m3u8');
    
    if (!isValid) {
      console.warn(`⚠️ Invalid or missing HLS URL for video ${video.id}`);
    }
    
    return isValid;
  }
}

// Export singleton instance
export const videoService = new VideoService();

console.log('🎬 VideoService initialized - Hetzner public HLS mode');
