import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, getErrorMessage } from '../lib/api';
import { videoService, Video } from '../lib/videoService';
import VideoPreview from '../components/VideoPreview';
import ProfessionalVideoPlayer from '../components/ProfessionalVideoPlayer';
import { useAuth } from '../lib/AuthContext';
import Header from '../components/Header';
import Footer from '../components/Footer';

interface Course {
  id: number;
  title: string;
  description: string;
  category: string;
  cover_image: string;
  is_active: boolean;
}

interface Subject {
  id: number;
  title: string;
  description: string;
  professor_name: string;
  hours: number;
  course_id: number;
  is_active: boolean;
}

interface CourseWithData extends Course {
  subjects: (Subject & { videos: Video[] })[];
  totalVideos: number;
  totalHours: number;
  totalDurationSeconds: number; 
  professors: string[];
  firstVideo?: Video;
}

interface EnrollmentData {
  courseId: number;
  hasFullAccess: boolean;
  allowedSubjectIds: Set<number>;
}

const CoursesPage: React.FC = () => {
  const { t } = useTranslation();
  const [courses, setCourses] = useState<CourseWithData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<Set<number>>(new Set());
  const [enrollmentData, setEnrollmentData] = useState<Map<number, EnrollmentData>>(new Map());
  const [hoveredVideo, setHoveredVideo] = useState<Video | null>(null);
  const [previewTimeouts, setPreviewTimeouts] = useState<Map<number, NodeJS.Timeout>>(new Map());
  const [isVisible, setIsVisible] = useState(false);
  const [initialVideoTime, setInitialVideoTime] = useState(0);
  const [initialResolution, setInitialResolution] = useState<string | undefined>(undefined);

  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadCoursesData();
    setTimeout(() => setIsVisible(true), 150);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchMyEnrollments();
    } else {
      setEnrolledCourseIds(new Set());
      setEnrollmentData(new Map());
    }
  }, [isAuthenticated]);

  useEffect(() => {
    return () => {
      previewTimeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [previewTimeouts]);

  const fetchMyEnrollments = async () => {
    try {
      const res: any = await api.get('/user-courses/me');
      if (res && res.success && Array.isArray(res.courses)) {
        const ids: number[] = res.courseIds || res.courses.map((c: any) => c.id) || [];
        setEnrolledCourseIds(new Set(ids));
        
        const enrollMap = new Map<number, EnrollmentData>();
        res.courses.forEach((course: any) => {
          const subjectIds = course.subjects ? course.subjects.map((s: any) => s.id) : [];
          enrollMap.set(course.id, {
            courseId: course.id,
            hasFullAccess: course.hasFullAccess || false,
            allowedSubjectIds: new Set(subjectIds)
          });
        });
        setEnrollmentData(enrollMap);
      } else if (Array.isArray(res)) {
        const ids = res.map((c: any) => c.id);
        setEnrolledCourseIds(new Set(ids));
        const enrollMap = new Map<number, EnrollmentData>();
        res.forEach((course: any) => {
          enrollMap.set(course.id, {
            courseId: course.id,
            hasFullAccess: true,
            allowedSubjectIds: new Set()
          });
        });
        setEnrollmentData(enrollMap);
      }
    } catch (err) {
      console.warn('Could not fetch enrollments:', err);
    }
  };

  const hasVideoAccess = (video: Video): boolean => {
    if (!video.course_id) return false;
    const enrollment = enrollmentData.get(video.course_id);
    if (!enrollment) return false;
    if (enrollment.hasFullAccess) return true;
    if (video.subject_id && enrollment.allowedSubjectIds.has(video.subject_id)) {
      return true;
    }
    return false;
  };

  const loadCoursesData = async () => {
    try {
      setLoading(true);
      setError('');

      const [coursesRes, subjectsRes, videosRes] = await Promise.all([
        api.get<Course[]>('/courses'),
        api.get<Subject[]>('/subjects'),
        videoService.getAllVideosWithSubjects()
      ]);

      const coursesWithData: CourseWithData[] = coursesRes
        .filter(course => course.is_active)
        .map(course => {
          const courseSubjects = subjectsRes.filter(s => s.course_id === course.id && s.is_active);
          const subjectsWithVideos = courseSubjects.map(subject => {
            const subjectVideos = videosRes
              .filter(v => v.subject_id === subject.id)
              .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
            
            return {
              ...subject,
              videos: subjectVideos
            };
          });

          const totalVideos = subjectsWithVideos.reduce((sum, s) => sum + s.videos.length, 0);
          const totalDurationSeconds = subjectsWithVideos.reduce((sum, s) => 
            sum + s.videos.reduce((vSum, v) => vSum + (v.duration || 0), 0), 0);
          const totalHours = Math.round((totalDurationSeconds / 3600) * 10) / 10;
          const professorsSet: { [key: string]: boolean } = {};
          subjectsWithVideos.forEach(s => { professorsSet[s.professor_name] = true; });
          const professors = Object.keys(professorsSet);

          const firstVideo = subjectsWithVideos.find(s => s.videos.length > 0)?.videos[0];

          return {
            ...course,
            subjects: subjectsWithVideos,
            totalVideos,
            totalHours,
            totalDurationSeconds,
            professors,
            firstVideo
          };
        })
        .filter(course => course.totalVideos > 0);

      setCourses(coursesWithData);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const fetchVideoProgress = useCallback(async (videoId: number): Promise<{currentTime: number; resolution: string | null}> => {
    if (!isAuthenticated) return { currentTime: 0, resolution: null };
    try {
      const response = await api.get(`/video-progress/${videoId}`);
      if (response && response.success && response.data) {
        return {
          currentTime: response.data.currentTime || 0,
          resolution: response.data.resolution || null
        };
      }
    } catch (error) {}
    return { currentTime: 0, resolution: null };
  }, [isAuthenticated]);

  const handleVideoClick = async (video: Video) => {
    if (!isAuthenticated) {
      navigate('/login', {
        state: {
          returnTo: `/courses?video=${video.id}`,
          message: t('courses.login_required_message', 'Please log in to watch the full video')
        }
      });
      return;
    }

    const courseId = typeof video.course_id === 'number' ? video.course_id : undefined;
    const isEnrolled = typeof courseId === 'number' ? enrolledCourseIds.has(courseId) : false;

    if (!isEnrolled) {
      alert(t('courses.alert_not_enrolled', "You are not enrolled in this course. Contact admin to request access."));
      return;
    }

    if (!hasVideoAccess(video)) {
      alert(t('courses.alert_subject_restricted', "You don't have access to this subject. Contact admin to request access."));
      return;
    }

    const progress = await fetchVideoProgress(video.id);

    setSelectedVideo(video);
    setInitialVideoTime(progress.currentTime);
    setInitialResolution(progress.resolution || undefined);
    setShowVideoPlayer(true);
  };

  const handleVideoHover = (video: Video, isHovering: boolean) => {
    const courseId = typeof video.course_id === 'number' ? video.course_id : undefined;
    const isEnrolled = typeof courseId === 'number' ? enrolledCourseIds.has(courseId) : false;

    if (!isAuthenticated || !isEnrolled || !hasVideoAccess(video)) {
      return;
    }

    if (isHovering) {
      const existingTimeout = previewTimeouts.get(video.id);
      if (existingTimeout) clearTimeout(existingTimeout);

      const timeout = setTimeout(() => {
        setHoveredVideo(video);
      }, 500);

      setPreviewTimeouts(new Map(previewTimeouts.set(video.id, timeout)));
    } else {
      const existingTimeout = previewTimeouts.get(video.id);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        previewTimeouts.delete(video.id);
        setPreviewTimeouts(new Map(previewTimeouts));
      }
      setHoveredVideo(null);
    }
  };

  const closeVideoPlayer = () => {
    setShowVideoPlayer(false);
    setSelectedVideo(null);
    setInitialVideoTime(0);
    setInitialResolution(undefined);
  };

  const formatTotalDuration = (seconds: number): string => {
    if (!seconds || seconds === 0) return '0 min';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      if (mins > 0) return `${hours}h ${mins}m`;
      return `${hours}h`;
    }
    return `${mins} m`;
  };

  const getCategoriesArray = (): string[] => {
    const categoriesSet: { [key: string]: boolean } = { all: true };
    courses.forEach(c => {
      if (c.category) categoriesSet[c.category] = true;
    });
    return Object.keys(categoriesSet);
  };

  const categories = getCategoriesArray();
  const filteredCourses = selectedCategory === 'all' ? courses : courses.filter(c => c.category === selectedCategory);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-10 w-10 text-teal-600" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-slate-600 font-medium">{t('courses.loading', 'Loading courses...')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 pt-32 pb-16">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center max-w-lg mx-auto">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-red-800 mb-2">{t('courses.error_title', 'Loading error')}</h2>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 relative font-sans">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20 relative z-10">
        
        {/* Header Section */}
        <div className={`text-center max-w-3xl mx-auto mb-16 transition-all duration-700 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
          <h1 className="page-title mb-4 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
            {t('courses.page_title', 'Our Courses')}
          </h1>
          <p className="page-subtitle">
            {t('courses.choose_count', 'Choose from {{count}} courses to boost your career', { count: courses.length })}
          </p>

          {/* Category Filter */}
          {categories.length > 1 && (
            <div className="flex flex-wrap justify-center gap-2 mt-8">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                    selectedCategory === category
                      ? 'bg-teal-600 text-white shadow-soft'
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-teal-500 hover:text-teal-600 shadow-sm hover:shadow-soft'
                  }`}
                >
                  {category === 'all' ? t('courses.category_all', 'All courses') : category}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Courses Grid */}
        {filteredCourses.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-2xl mx-auto shadow-sm">
            <div className="text-5xl mb-6">📚</div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">{t('courses.no_courses_title', 'No courses available')}</h2>
            <p className="text-slate-500">
              {selectedCategory === 'all'
                ? t('courses.no_courses_message_all', 'Our courses are coming soon. Please check back later.')
                : t('courses.no_courses_message_category', 'No courses available in the "{{category}}" category.', { category: selectedCategory })
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredCourses.map((course, index) => {
              const isCourseEnrolled = enrolledCourseIds.has(course.id);
              const isHoveringThisVideo = hoveredVideo?.id === course.firstVideo?.id;

              return (
                <div
                  key={course.id}
                  className={`card group flex flex-col transition-all duration-700 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  <div
                    className="relative aspect-video overflow-hidden bg-slate-100 cursor-pointer"
                    onMouseEnter={() => course.firstVideo && handleVideoHover(course.firstVideo, true)}
                    onMouseLeave={() => course.firstVideo && handleVideoHover(course.firstVideo, false)}
                    onClick={() => {
                      if (!isAuthenticated) {
                        navigate('/login', { state: { returnTo: `/course/${course.id}` } });
                        return;
                      }
                      if (!isCourseEnrolled) {
                        alert(t('courses.alert_not_enrolled', "You are not enrolled in this course. Contact admin to request access."));
                        return;
                      }
                      navigate(`/course/${course.id}`);
                    }}
                  >
                    {course.firstVideo && isHoveringThisVideo && isCourseEnrolled && isAuthenticated ? (
                      <div className="absolute inset-0">
                        <VideoPreview
                          video={course.firstVideo}
                          maxDuration={15}
                          showPlayButton={false}
                          className="w-full h-full object-cover"
                          onPreviewClick={() => navigate(`/course/${course.id}`)}
                        />
                      </div>
                    ) : course.cover_image ? (
                      <img 
                        src={course.cover_image}
                        alt={course.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        onError={(e: any) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiMyMmM1NWUiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiMxNmEzNGEiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgZmlsbD0idXJsKCNnKSIvPjx0ZXh0IHg9IjQwMCIgeT0iMzAwIiBmb250LWZhbWlseT0iSW50ZXIiIGZvbnQtc2l6ZT0iMzQiIGZpbGw9IiNmZmZmZmYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGFsaWdubWVudC1iYXNlbGluZT0ibWlkZGxlIiBmb250LXdlaWdodD0iNzAwIj7wn5OCKSBGB3JtYXRpb248L3RleHQ+PC9zdmc+';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center text-5xl text-white opacity-90 transition-transform duration-700 group-hover:scale-105">
                        📚
                      </div>
                    )}
                    
                    {/* Course Category Badge overlay */}
                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-md text-xs font-bold text-teal-800 shadow-sm">
                      {course.category || 'Général'}
                    </div>

                    {/* Play Button Overlay */}
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <div className="w-14 h-14 bg-white/95 rounded-full flex items-center justify-center shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                        {isCourseEnrolled && isAuthenticated ? (
                          <svg className="w-6 h-6 text-teal-600 ml-1" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4l12 6-12 6z"/></svg>
                        ) : (
                          <span className="text-xl">🔒</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-6 flex flex-col flex-grow">
                    <h3 className="text-xl font-bold text-slate-800 mb-2 line-clamp-2">
                      {course.title}
                    </h3>
                    
                    <p className="text-sm text-slate-500 mb-6 flex-grow font-medium">
                      {course.professors.length > 0 ? course.professors.join(', ') : t('courses.instructor_placeholder', 'Instructor')}
                    </p>

                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          {formatTotalDuration(course.totalDurationSeconds)}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          {course.totalVideos} {t('courses.word_videos', 'videos')}
                        </span>
                      </div>

                      <button
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                          isCourseEnrolled 
                            ? 'bg-teal-50 text-teal-700 hover:bg-teal-100' 
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                        onClick={() => {
                          if (!isAuthenticated) {
                            navigate('/login', { state: { returnTo: `/course/${course.id}`, message: t('courses.login_required_message', 'Please log in to view this course') } });
                            return;
                          }
                          if (!isCourseEnrolled) {
                            alert(t('courses.alert_not_enrolled', "You are not enrolled in this course. Contact admin to request access."));
                            return;
                          }
                          navigate(`/course/${course.id}`);
                        }}
                      >
                        {isCourseEnrolled ? t('courses.view_content', 'View content') : t('courses.login_required', 'Login required 🔒')}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Video Modal retained globally */}
      {showVideoPlayer && selectedVideo && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex flex-col animate-fade-in">
          <div className="p-4 flex justify-end">
            <button 
              className="text-white hover:text-white/70 transition-colors w-10 h-10 flex flex-col items-center justify-center bg-white/10 hover:bg-white/20 rounded-full" 
              onClick={closeVideoPlayer}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="flex-1 w-full max-w-6xl mx-auto px-4 pb-12 flex items-center justify-center relative">
            <ProfessionalVideoPlayer
              video={selectedVideo}
              isAuthenticated={isAuthenticated}
              onClose={closeVideoPlayer}
              className="w-full shadow-2xl rounded-xl overflow-hidden"
              autoPlay={true}
              initialTime={initialVideoTime}
              initialResolution={initialResolution}
            />
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
};

export default CoursesPage;