import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, getErrorMessage } from '../lib/api';
import { videoService, Video } from '../lib/videoService';
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

interface SubjectWithVideos extends Subject {
  videos: Video[];
}

interface CourseWithData extends Course {
  subjects: SubjectWithVideos[];
  totalVideos: number;
  totalHours: number;
  professors: string[];
}

interface EnrollmentData {
  courseId: number;
  hasFullAccess: boolean;
  allowedSubjectIds: Set<number>;
}

interface VideoProgress {
  currentTime: number;
  duration: number;
  resolution: string | null;
  completed: boolean;
}

interface LessonProgress {
  [videoId: number]: VideoProgress;
}

const CoursePage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [course, setCourse] = useState<CourseWithData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [initialVideoTime, setInitialVideoTime] = useState(0);
  const [initialResolution, setInitialResolution] = useState<string | undefined>(undefined);

  const [enrollmentData, setEnrollmentData] = useState<EnrollmentData | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);

  const [lessonProgress, setLessonProgress] = useState<LessonProgress>({});
  const [lastWatchedVideoId, setLastWatchedVideoId] = useState<number | null>(null);

  const allVideosRef = useRef<Video[]>([]);

  const getAllVideos = useCallback((): Video[] => {
    if (!course) return [];
    return course.subjects.flatMap(subject => subject.videos);
  }, [course]);

  const loadCourseData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError('');
      const courseId = parseInt(id);

      const [coursesRes, subjectsRes, videosRes] = await Promise.all([
        api.get<Course[]>('/courses'),
        api.get<Subject[]>('/subjects'),
        videoService.getAllVideosWithSubjects()
      ]);

      const courseData = coursesRes.find(c => c.id === courseId);
      if (!courseData) {
        setError(t('course.not_found', 'Course not found'));
        return;
      }

      const courseSubjects = subjectsRes.filter(s => s.course_id === courseId && s.is_active);

      const subjectsWithVideos: SubjectWithVideos[] = courseSubjects.map(subject => {
        const subjectVideos = videosRes
          .filter(v => v.subject_id === subject.id)
          .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
        return { ...subject, videos: subjectVideos };
      });

      const totalVideos = subjectsWithVideos.reduce((sum, s) => sum + s.videos.length, 0);
      const totalHours = subjectsWithVideos.reduce((sum, s) => sum + s.hours, 0);
      const professors = Array.from(new Set(subjectsWithVideos.map(s => s.professor_name)));

      const courseWithData: CourseWithData = {
        ...courseData,
        subjects: subjectsWithVideos,
        totalVideos,
        totalHours,
        professors
      };

      setCourse(courseWithData);
      allVideosRef.current = subjectsWithVideos.flatMap(s => s.videos);
    } catch (err) {
      console.error('Error loading course:', err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  const loadEnrollmentData = useCallback(async () => {
    if (!isAuthenticated || !id) return;
    try {
      const res: any = await api.get('/user-courses/me');
      const courseId = parseInt(id);

      if (res && res.success && Array.isArray(res.courses)) {
        const enrolledCourse = res.courses.find((c: any) => c.id === courseId);
        if (enrolledCourse) {
          setIsEnrolled(true);
          const subjectIds = enrolledCourse.subjects ? enrolledCourse.subjects.map((s: any) => s.id) : [];
          setEnrollmentData({
            courseId: enrolledCourse.id,
            hasFullAccess: enrolledCourse.hasFullAccess || false,
            allowedSubjectIds: new Set(subjectIds)
          });
        } else {
          setIsEnrolled(false);
          setEnrollmentData(null);
        }
      } else if (Array.isArray(res)) {
        const enrolledCourse = res.find((c: any) => c.id === courseId);
        if (enrolledCourse) {
          setIsEnrolled(true);
          setEnrollmentData({
            courseId: enrolledCourse.id,
            hasFullAccess: true,
            allowedSubjectIds: new Set()
          });
        } else {
          setIsEnrolled(false);
          setEnrollmentData(null);
        }
      }
    } catch (err) {
      console.warn('Could not fetch enrollment data:', err);
    }
  }, [isAuthenticated, id]);

  const loadAllProgress = useCallback(async () => {
    if (!isAuthenticated || !course) return;
    try {
      const response = await api.get('/video-progress/continue-watching/list?limit=100');
      if (response && response.success && Array.isArray(response.data)) {
        const progressMap: LessonProgress = {};
        let mostRecentVideoId: number | null = null;
        let mostRecentTime: Date | null = null;

        const courseVideoIds = new Set(
          course.subjects.flatMap(s => s.videos.map(v => v.id))
        );

        response.data.forEach((item: any) => {
          const belongsToThisCourse = 
            courseVideoIds.has(item.videoId) ||
            (item.video && item.video.course_id === course.id);

          if (belongsToThisCourse) {
            progressMap[item.videoId] = {
              currentTime: item.currentTime || 0,
              duration: item.duration || 0,
              resolution: item.resolution,
              completed: item.completed || false
            };
            const watchedAt = new Date(item.lastWatchedAt);
            if (!mostRecentTime || watchedAt > mostRecentTime) {
              mostRecentTime = watchedAt;
              mostRecentVideoId = item.videoId;
            }
          }
        });

        setLessonProgress(progressMap);
        if (mostRecentVideoId) setLastWatchedVideoId(mostRecentVideoId);
      }
    } catch (err) {
      console.warn('Could not load video progress:', err);
    }
  }, [isAuthenticated, course]);

  const hasVideoAccess = useCallback((video: Video): boolean => {
    if (!enrollmentData) return false;
    if (enrollmentData.hasFullAccess) return true;
    if (video.subject_id && enrollmentData.allowedSubjectIds.has(video.subject_id)) return true;
    return false;
  }, [enrollmentData]);

  const fetchVideoProgress = useCallback(async (videoId: number): Promise<{ currentTime: number; resolution: string | null }> => {
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

  const handleVideoSelect = useCallback(async (video: Video) => {
    if (!isAuthenticated) {
      navigate('/login', {
        state: { returnTo: `/course/${id}`, message: t('courses.login_required_message', 'Please log in to watch this course') }
      });
      return;
    }
    if (!isEnrolled) {
      alert(t('courses.alert_not_enrolled', "You are not enrolled in this course. Contact admin to request access."));
      return;
    }
    if (!hasVideoAccess(video)) {
      alert(t('courses.alert_subject_restricted', "You don't have access to this subject. Contact admin to request access."));
      return;
    }

    let progressTime = 0;
    let progressResolution: string | undefined = undefined;
    
    if (lessonProgress[video.id]) {
      progressTime = lessonProgress[video.id].currentTime;
      progressResolution = lessonProgress[video.id].resolution || undefined;
    } else {
      const progress = await fetchVideoProgress(video.id);
      progressTime = progress.currentTime;
      progressResolution = progress.resolution || undefined;
    }
    
    setCurrentVideo(video);
    setInitialVideoTime(progressTime);
    setInitialResolution(progressResolution);
  }, [isAuthenticated, isEnrolled, hasVideoAccess, fetchVideoProgress, navigate, id, t, lessonProgress]);

  const handleVideoEnd = useCallback(() => {
    if (!currentVideo || !course) return;
    const allVideos = getAllVideos();
    const currentIndex = allVideos.findIndex(v => v.id === currentVideo.id);

    if (currentIndex >= 0 && currentIndex < allVideos.length - 1) {
      for (let i = currentIndex + 1; i < allVideos.length; i++) {
        const nextVideo = allVideos[i];
        if (hasVideoAccess(nextVideo)) {
          setCurrentVideo(nextVideo);
          setInitialVideoTime(0);
          setInitialResolution(undefined);
          break;
        }
      }
    }
  }, [currentVideo, course, getAllVideos, hasVideoAccess]);

  const getProgressPercent = (videoId: number): number => {
    const progress = lessonProgress[videoId];
    if (!progress || !progress.duration || progress.duration === 0) return 0;
    return Math.min(100, Math.round((progress.currentTime / progress.duration) * 100));
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds || seconds === 0) return '0:00';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hours > 0) return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    loadCourseData();
  }, [loadCourseData]);

  useEffect(() => {
    if (isAuthenticated) loadEnrollmentData();
  }, [isAuthenticated, loadEnrollmentData]);

  useEffect(() => {
    if (course && isAuthenticated) loadAllProgress();
  }, [course, isAuthenticated, loadAllProgress]);

  useEffect(() => {
    if (!course || currentVideo || !isEnrolled) return;
    const allVideos = getAllVideos();
    if (allVideos.length === 0) return;

    if (lastWatchedVideoId) {
      const lastVideo = allVideos.find(v => v.id === lastWatchedVideoId);
      if (lastVideo && hasVideoAccess(lastVideo)) {
        const progress = lessonProgress[lastVideo.id];
        setCurrentVideo(lastVideo);
        setInitialVideoTime(progress?.currentTime || 0);
        setInitialResolution(progress?.resolution || undefined);
        return;
      }
    }

    const firstAccessibleVideo = allVideos.find(v => hasVideoAccess(v));
    if (firstAccessibleVideo) {
      const progress = lessonProgress[firstAccessibleVideo.id];
      setCurrentVideo(firstAccessibleVideo);
      setInitialVideoTime(progress?.currentTime || 0);
      setInitialResolution(progress?.resolution || undefined);
    }
  }, [course, currentVideo, isEnrolled, lastWatchedVideoId, lessonProgress, getAllVideos, hasVideoAccess]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <Header />
        <svg className="animate-spin h-10 w-10 text-teal-600 mb-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-slate-600 font-medium">{t('course.loading', 'Loading course...')}</p>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <Header />
        <div className="flex-1 flex items-center justify-center pt-24 px-4">
          <div className="bg-white border border-red-100 shadow-soft p-10 rounded-2xl text-center max-w-lg">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">{t('course.error_title', 'Error loading course')}</h2>
            <p className="text-slate-600 mb-6">{error || t('course.not_found', 'Course not found')}</p>
            <button onClick={() => navigate('/courses')} className="btn-secondary">
              {t('course.back_to_courses', 'Back to Courses')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isEnrolled) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <Header />
        <div className="flex-1 max-w-4xl mx-auto w-full px-4 pt-28 pb-16">
          <div className="bg-white rounded-3xl shadow-soft border border-slate-100 overflow-hidden">
            <div className="h-64 sm:h-80 w-full bg-slate-200 relative">
              {course.cover_image ? (
                <img src={course.cover_image} alt={course.title} className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-50">📚</div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent"></div>
              <div className="absolute bottom-6 left-6 right-6">
                <span className="inline-block px-3 py-1 bg-teal-500/90 text-white text-xs font-bold rounded-lg mb-3 uppercase tracking-wider backdrop-blur-sm">
                  {course.category}
                </span>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">{course.title}</h1>
              </div>
            </div>
            
            <div className="p-8 sm:p-12 text-center">
              <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">{course.description}</p>
              
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 sm:p-8 max-w-lg mx-auto">
                <div className="text-4xl mb-4">🔒</div>
                {isAuthenticated ? (
                  <>
                    <p className="text-slate-700 font-medium mb-6">
                      {t('course.not_enrolled_message', 'You are not enrolled in this course. Please contact the administrator to request access.')}
                    </p>
                    <button onClick={() => navigate('/contact')} className="btn-primary w-full shadow-md">
                      {t('course.contact_admin', 'Contact Admin')}
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-slate-700 font-medium mb-6">
                      {t('course.login_to_watch', 'Please log in to watch this course')}
                    </p>
                    <button onClick={() => navigate('/login', { state: { returnTo: `/course/${id}` } })} className="btn-primary w-full shadow-md">
                      {t('course.login', 'Log In')}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      <Header />

      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-24 sm:py-28 flex flex-col lg:flex-row gap-6">
        
        {/* Left Side: Video Player & Details */}
        <div className="w-full lg:w-[70%] xl:w-[75%] flex flex-col gap-6">
          <div className="bg-black rounded-2xl shadow-elegant overflow-hidden aspect-video relative">
            {currentVideo ? (
              <ProfessionalVideoPlayer
                video={currentVideo}
                isAuthenticated={isAuthenticated}
                onClose={() => {}}
                className="w-full h-full object-cover"
                autoPlay={true}
                initialTime={initialVideoTime}
                initialResolution={initialResolution}
                onEnded={handleVideoEnd}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 bg-slate-900">
                <span className="text-6xl mb-4">🎬</span>
                <p className="text-lg font-medium">{t('course.select_lesson', 'Select a lesson from the sidebar to start watching')}</p>
              </div>
            )}
          </div>

          {currentVideo && (
            <div className="bg-white rounded-2xl p-6 shadow-soft border border-slate-100">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">{currentVideo.title}</h2>
              <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-500">
                <span className="px-3 py-1 bg-slate-100 rounded-lg text-slate-700">{currentVideo.subject_title}</span>
                {currentVideo.duration && (
                  <span className="flex items-center gap-1.5 object-cover">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {formatDuration(currentVideo.duration)}
                  </span>
                )}
                {currentVideo.professor_name && (
                  <span className="flex items-center gap-1.5">
                    <span className="text-lg">👨‍🏫</span> {currentVideo.professor_name}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Details Tabs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div className="bg-white rounded-2xl p-6 shadow-soft border border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 mb-3">{t('course.about_course', 'About this course')}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{course.description}</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-soft border border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 mb-4">{t('course.instructors', 'Instructors')}</h3>
              <div className="flex flex-col gap-3">
                {course.professors.map((professor, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center text-xl shadow-sm border border-teal-100">
                      👨‍🏫
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{professor}</p>
                      <p className="text-xs text-slate-500 font-medium">{t('course.instructor', 'Instructor')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Lessons Sidebar */}
        <div className="w-full lg:w-[30%] xl:w-[25%] flex flex-col">
          <div className="bg-white rounded-2xl shadow-soft border border-slate-100 overflow-hidden flex flex-col h-full max-h-[85vh] sticky top-28">
            
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900">{t('course.lessons', 'Lessons')}</h3>
              <p className="text-sm font-medium text-slate-500 mt-1">{course.totalVideos} {t('course.videos', 'videos')} • {course.totalHours}h</p>
            </div>

            <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-slate-200">
              {course.subjects.map(subject => (
                <div key={subject.id} className="mb-4">
                  <div className="px-3 py-2 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
                    <h4 className="text-sm font-bold text-slate-800 line-clamp-1">{subject.title}</h4>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">{subject.videos.length} {t('course.videos_short', 'videos')}</p>
                  </div>

                  <div className="flex flex-col gap-1 px-2">
                    {subject.videos.map((video, videoIndex) => {
                      const hasAccess = hasVideoAccess(video);
                      const isActive = currentVideo?.id === video.id;
                      const progress = getProgressPercent(video.id);
                      const isCompleted = lessonProgress[video.id]?.completed;

                      return (
                        <div
                          key={video.id}
                          onClick={() => hasAccess && handleVideoSelect(video)}
                          className={`group relative flex gap-3 p-2.5 rounded-xl transition-all cursor-pointer border ${
                            isActive 
                              ? 'bg-teal-50 border-teal-200' 
                              : !hasAccess 
                                ? 'bg-slate-50 border-transparent opacity-70 cursor-not-allowed' 
                                : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'
                          }`}
                        >
                          <div className="w-24 h-16 sm:w-28 sm:h-20 lg:w-24 lg:h-16 flex-shrink-0 bg-slate-200 rounded-lg overflow-hidden relative border border-slate-200 shadow-sm">
                            {video.thumbnail_url ? (
                              <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center bg-slate-800 text-white font-medium">
                                {hasAccess ? '▶' : '🔒'}
                              </div>
                            )}
                            
                            {/* Overlays */}
                            {isActive && (
                              <div className="absolute bottom-1.5 right-1.5 flex gap-0.5">
                                <span className="w-1 h-3 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-1 h-3 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-1 h-3 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                              </div>
                            )}
                            {isCompleted && (
                              <div className="absolute top-1.5 left-1.5 w-5 h-5 bg-teal-500 text-white rounded-full flex items-center justify-center text-xs shadow-sm">
                                ✓
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0 py-0.5 flex flex-col justify-between">
                            <h5 className={`text-sm font-semibold line-clamp-2 leading-snug ${isActive ? 'text-teal-800' : 'text-slate-700 group-hover:text-teal-700'}`}>
                              {videoIndex + 1}. {video.title}
                            </h5>
                            
                            <div className="flex items-center justify-between mt-2 text-xs font-medium">
                              <span className="text-slate-500">{formatDuration(video.duration)}</span>
                              {!hasAccess && <span className="text-slate-400">🔒 Locked</span>}
                            </div>
                            
                            {/* Progress bar line */}
                            {hasAccess && progress > 0 && !isCompleted && (
                              <div className="w-full h-1 bg-slate-200 rounded-full mt-2 overflow-hidden">
                                <div className="h-full bg-teal-500" style={{ width: `${progress}%` }} />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            
          </div>
        </div>

      </main>
      <Footer />
    </div>
  );
};

export default CoursePage;
