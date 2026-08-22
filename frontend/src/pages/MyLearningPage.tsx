import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, getErrorMessage } from '../lib/api';
import { videoService, Video } from '../lib/videoService';
import ProfessionalVideoPlayer from '../components/ProfessionalVideoPlayer';
import ContinueWatching from '../components/ContinueWatching';
import { useAuth } from '../lib/AuthContext';
import Header from '../components/Header';
import Footer from '../components/Footer';

import { Skeleton } from '../components/ui/Skeleton';
import { CourseCard } from '../components/education/CourseCard';
import { EmptyState } from '../components/ui/EmptyState';
import { BookOpen, AlertTriangle, Check, X } from 'lucide-react';

import { Spinner } from '../components/ui/Spinner';


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
  professors: string[];
  firstVideo?: Video;
}

interface EnrollmentData {
  courseId: number;
  hasFullAccess: boolean;
  allowedSubjectIds: Set<number>;
}

interface VideoProgressItem {
  videoId: number;
  currentTime: number;
  duration: number;
  completed: boolean;
}

const MyLearningPage: React.FC = () => {
  const { t } = useTranslation();
  const [courses, setCourses] = useState<CourseWithData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<Set<number>>(new Set());
  const [enrollmentData, setEnrollmentData] = useState<Map<number, EnrollmentData>>(new Map());
  const [isVisible, setIsVisible] = useState(false);
  const [initialVideoTime, setInitialVideoTime] = useState(0);
  const [initialResolution, setInitialResolution] = useState<string | undefined>(undefined);
  const [courseProgress, setCourseProgress] = useState<Map<number, number>>(new Map());

  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', {
        state: {
          returnTo: '/my-learning',
          message: t('my_learning.login_required', 'Please log in to access your learning dashboard')
        }
      });
      return;
    }
    
    loadEnrolledCourses();
    setTimeout(() => setIsVisible(true), 150);
  }, [isAuthenticated, navigate, t]);

  const loadEnrolledCourses = async () => {
    try {
      setLoading(true);
      setError('');

      const enrollmentRes: any = await api.get('/user-courses/me');
      
      let enrolledIds: number[] = [];
      const enrollMap = new Map<number, EnrollmentData>();
      
      if (enrollmentRes && enrollmentRes.success && Array.isArray(enrollmentRes.courses)) {
        enrolledIds = enrollmentRes.courseIds || enrollmentRes.courses.map((c: any) => c.id) || [];
        
        enrollmentRes.courses.forEach((course: any) => {
          const subjectIds = course.subjects ? course.subjects.map((s: any) => s.id) : [];
          enrollMap.set(course.id, {
            courseId: course.id,
            hasFullAccess: course.hasFullAccess || false,
            allowedSubjectIds: new Set(subjectIds)
          });
        });
      } else if (Array.isArray(enrollmentRes)) {
        enrolledIds = enrollmentRes.map((c: any) => c.id);
        enrollmentRes.forEach((course: any) => {
          enrollMap.set(course.id, {
            courseId: course.id,
            hasFullAccess: true,
            allowedSubjectIds: new Set()
          });
        });
      }
      
      setEnrolledCourseIds(new Set(enrolledIds));
      setEnrollmentData(enrollMap);

      if (enrolledIds.length === 0) {
        setCourses([]);
        setLoading(false);
        return;
      }

      const [coursesRes, subjectsRes, videosRes] = await Promise.all([
        api.get<Course[]>('/courses'),
        api.get<Subject[]>('/subjects'),
        videoService.getAllVideosWithSubjects()
      ]);

      const enrolledCoursesSet = new Set(enrolledIds);
      
      const coursesWithData: CourseWithData[] = coursesRes
        .filter(course => course.is_active && enrolledCoursesSet.has(course.id))
        .map(course => {
          const courseSubjects = subjectsRes.filter(s => s.course_id === course.id && s.is_active);
          const subjectsWithVideos = courseSubjects.map(subject => {
            const subjectVideos = videosRes
              .filter(v => v.subject_id === subject.id)
              .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
            return { ...subject, videos: subjectVideos };
          });

          const totalVideos = subjectsWithVideos.reduce((sum, s) => sum + s.videos.length, 0);
          const totalHours = subjectsWithVideos.reduce((sum, s) => sum + s.hours, 0);
          const professorsSet: { [key: string]: boolean } = {};
          subjectsWithVideos.forEach(s => { professorsSet[s.professor_name] = true; });
          const professors = Object.keys(professorsSet);
          const firstVideo = subjectsWithVideos.find(s => s.videos.length > 0)?.videos[0];

          return { ...course, subjects: subjectsWithVideos, totalVideos, totalHours, professors, firstVideo };
        })
        .filter(course => course.totalVideos > 0);

      setCourses(coursesWithData);
      loadCourseProgress(coursesWithData);
    } catch (err) {
      console.error('<span className="inline-flex items-center justify-center"><X className="w-4 h-4" /></span> Error loading enrolled courses:', err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const loadCourseProgress = async (coursesData: CourseWithData[]) => {
    if (!isAuthenticated) return;
    try {
      const response = await api.get('/video-progress/continue-watching/list?limit=100');
      if (response && response.success && Array.isArray(response.data)) {
        const progressMap = new Map<number, number>();
        coursesData.forEach(course => {
          const courseVideoIds = new Set(course.subjects.flatMap(s => s.videos.map(v => v.id)));
          let completedVideos = 0;
          let partialProgress = 0;
          response.data.forEach((item: VideoProgressItem) => {
            if (courseVideoIds.has(item.videoId)) {
              if (item.completed) completedVideos++;
              else if (item.duration > 0) partialProgress += item.currentTime / item.duration;
            }
          });
          const totalVideos = course.totalVideos;
          if (totalVideos > 0) {
            const progress = Math.round(((completedVideos + partialProgress) / totalVideos) * 100);
            progressMap.set(course.id, Math.min(100, progress));
          }
        });
        setCourseProgress(progressMap);
      }
    } catch (err) {}
  };

  const handleContinueWatchingSelect = (video: Video) => {
    if (video.course_id) {
      navigate(`/course/${video.course_id}`);
    } else {
      const course = courses.find(c => c.subjects.some(s => s.videos.some(v => v.id === video.id)));
      if (course) navigate(`/course/${course.id}`);
    }
  };

  const closeVideoPlayer = () => {
    setShowVideoPlayer(false);
    setSelectedVideo(null);
    setInitialVideoTime(0);
    setInitialResolution(undefined);
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
      <div className="min-h-screen bg-slate-50 font-sans">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20 relative z-10">
          <div className="mb-12">
            <Skeleton className="h-10 w-64 mb-4" />
            <Skeleton className="h-6 w-96" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex flex-col bg-white rounded-xl shadow-soft border border-slate-100 overflow-hidden h-[380px]">
                <Skeleton className="w-full h-48 rounded-none" />
                <div className="p-6 flex flex-col flex-1 gap-4">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="mt-auto pt-4 border-t border-slate-100 flex justify-between items-center">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                    <Skeleton className="h-10 w-28 rounded-lg" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans">
        <Header />
        <div className="pt-32 pb-16 px-4">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center max-w-lg mx-auto shadow-sm">
            <div className="text-4xl mb-4"><AlertTriangle className="w-12 h-12 text-amber-500" /></div>
            <h2 className="text-xl font-bold text-red-800 mb-2">{t('my_learning.error_title', 'Loading error')}</h2>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20 relative z-10">
        
        {/* Page Header */}
        <div className={`text-center max-w-3xl mx-auto mb-16 transition-all duration-700 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
            {t('my_learning.page_title', 'My Learning')}
          </h1>
          <p className="text-lg text-slate-600 mb-8">
            {courses.length > 0
              ? t('my_learning.enrolled_count', 'You are enrolled in {{count}} course(s)', { count: courses.length })
              : t('my_learning.no_courses', 'You are not enrolled in any courses yet')
            }
          </p>

          {/* Category Filter */}
          {categories.length > 1 && (
            <div className="flex flex-wrap justify-center gap-2">
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

        {/* Continue Watching Section */}
        {isAuthenticated && courses.length > 0 && (
          <div className="mb-16">
            <ContinueWatching onVideoSelect={handleContinueWatchingSelect} />
          </div>
        )}

        {/* Courses Grid */}
        {filteredCourses.length === 0 ? (
          <EmptyState 
            icon={BookOpen}
            title={t('my_learning.no_enrolled_title', 'No enrolled courses')}
            description={t('my_learning.no_enrolled_message', 'Your enrolled courses will appear here. Explore the catalog to start learning.')}
            action={
              <button
                onClick={() => navigate('/courses')}
                className="btn-primary"
              >
                {t('my_learning.browse_courses', 'Browse Courses')}
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredCourses.map((course, index) => {
              const progress = courseProgress.get(course.id) || 0;
              return (
                <div
                  key={course.id}
                  className={`card group flex flex-col transition-all duration-700 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  <div
                    className="relative aspect-video overflow-hidden bg-slate-100 cursor-pointer"
                    onClick={() => navigate(`/course/${course.id}`)}
                  >
                    {course.cover_image ? (
                      <img 
                        src={course.cover_image}
                        alt={course.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center text-5xl text-white opacity-90 transition-transform duration-700 group-hover:scale-105">
                        <BookOpen className="w-12 h-12 text-slate-400" />
                      </div>
                    )}
                    
                    {/* Progress Bar Over Thumbnail */}
                    {progress > 0 && (
                      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-800/50">
                        <div className="h-full bg-teal-500" style={{ width: `${progress}%` }} />
                      </div>
                    )}

                    {/* Play Overlay */}
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <div className="w-14 h-14 bg-white/95 rounded-full flex items-center justify-center shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                        <svg className="w-6 h-6 text-teal-600 ml-1" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4l12 6-12 6z"/></svg>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 flex flex-col flex-grow">
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <h3 className="text-xl font-bold text-slate-800 line-clamp-2 leading-snug">
                        {course.title}
                      </h3>
                      {progress === 100 && (
                        <span className="flex-shrink-0 bg-teal-100 text-teal-700 text-xs font-bold px-2 py-1 rounded-md">
                          <span className="inline-flex items-center justify-center"><Check className="w-4 h-4" /></span> Done
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-slate-500 mb-6 flex-grow font-medium">
                      {course.professors.length > 0 ? course.professors.join(', ') : t('courses.instructor_placeholder', 'Instructor')}
                    </p>

                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-teal-600">
                          {progress}% {t('course.completed', 'Completed')}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          {course.totalVideos} {t('courses.word_videos', 'videos')}
                        </span>
                      </div>

                      <button
                        className="px-4 py-2 bg-teal-50 text-teal-700 font-bold text-sm rounded-lg hover:bg-teal-100 transition-colors"
                        onClick={() => navigate(`/course/${course.id}`)}
                      >
                        {t('courses.view_content', 'Continue')}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Video Modal */}
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

export default MyLearningPage;
