import os

def fix_mylearning():
    path = "src/pages/MyLearningPage.tsx"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Add imports
    imports_to_add = """
import { Skeleton } from '../components/ui/Skeleton';
import { CourseCard } from '../components/education/CourseCard';
import { EmptyState } from '../components/ui/EmptyState';
import { BookOpen, AlertTriangle } from 'lucide-react';
"""
    if "CourseCard" not in content:
        content = content.replace(
            "import Footer from '../components/Footer';",
            "import Footer from '../components/Footer';\n" + imports_to_add
        )

    # 2. Replace loading block
    old_loading = """  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <Header />
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-10 w-10 text-teal-600" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-slate-600 font-medium">{t('my_learning.loading', 'Loading your courses...')}</p>
        </div>
      </div>
    );
  }"""
    
    new_loading = """  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 relative font-sans flex flex-col">
        <Header />
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20 w-full">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4 flex flex-col items-center">
            <Skeleton className="h-12 w-64 rounded-xl" />
            <Skeleton className="h-6 w-96 rounded-lg" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-soft flex flex-col">
                <Skeleton className="h-48 w-full rounded-none" />
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
  }"""
    
    if old_loading in content:
        content = content.replace(old_loading, new_loading)
    else:
        # Maybe it was replaced with <Spinner /> by the global script? Wait, I restored from git, so it should be the SVG.
        pass

    # 3. Replace error block
    old_error = """  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans">
        <Header />
        <div className="pt-32 pb-16 px-4">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center max-w-lg mx-auto shadow-sm">
            <div className="text-4xl mb-4">⚠️</div>"""
            
    new_error = """  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans">
        <Header />
        <div className="pt-32 pb-16 px-4">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center max-w-lg mx-auto shadow-sm">
            <div className="flex justify-center mb-4"><AlertTriangle className="w-12 h-12 text-red-500" /></div>"""
            
    content = content.replace(old_error, new_error)
    
    # 4. Replace empty state
    old_empty = """        {/* Courses Grid */}
        {filteredCourses.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-2xl mx-auto shadow-sm">
            <div className="text-5xl mb-6">📚</div>
            <h2 className="text-2xl font-bold text-slate-800 mb-4">{t('my_learning.no_enrolled_title', 'No enrolled courses')}</h2>
            <p className="text-slate-500 mb-8">
              {selectedCategory === 'all'
                ? t('my_learning.no_enrolled_message', 'You are not enrolled in any courses yet. Browse our catalog to find the right course for you.')
                : t('my_learning.no_enrolled_category', 'You are not enrolled in any courses in the "{{category}}" category.', { category: selectedCategory })
              }
            </p>
            <button 
              onClick={() => navigate('/courses')}
              className="bg-teal-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-teal-700 transition-colors shadow-soft"
            >
              {t('my_learning.browse_catalog', 'Browse Catalog')}
            </button>
          </div>
        ) : ("""
        
    new_empty = """        {/* Courses Grid */}
        {filteredCourses.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={t('my_learning.no_enrolled_title', 'No enrolled courses')}
            description={selectedCategory === 'all'
                ? t('my_learning.no_enrolled_message', 'You are not enrolled in any courses yet. Browse our catalog to find the right course for you.')
                : t('my_learning.no_enrolled_category', 'You are not enrolled in any courses in the "{{category}}" category.', { category: selectedCategory })
            }
            action={
              <button 
                onClick={() => navigate('/courses')}
                className="bg-teal-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-teal-700 transition-colors shadow-soft"
              >
                {t('my_learning.browse_catalog', 'Browse Catalog')}
              </button>
            }
          />
        ) : ("""
        
    content = content.replace(old_empty, new_empty)
    
    # 5. Replace grid with CourseCard
    old_grid = """          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredCourses.map((course, index) => {
              const progress = courseProgress.get(course.id) || 0;
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
                    onClick={() => navigate(`/course/${course.id}`)}
                  >
                    {course.firstVideo && isHoveringThisVideo ? (
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
                    
                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-md text-xs font-bold text-teal-800 shadow-sm">
                      {course.category || 'Général'}
                    </div>

                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <div className="w-14 h-14 bg-white/95 rounded-full flex items-center justify-center shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                        <svg className="w-6 h-6 text-teal-600 ml-1" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4l12 6-12 6z"/></svg>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 flex flex-col flex-grow">
                    <h3 className="text-xl font-bold text-slate-800 mb-2 line-clamp-2">
                      {course.title}
                    </h3>
                    
                    <p className="text-sm text-slate-500 mb-4 flex-grow font-medium">
                      {course.professors.length > 0 ? course.professors.join(', ') : t('my_learning.instructor_placeholder', 'Instructor')}
                    </p>

                    <div className="mt-auto">
                      <div className="flex justify-between text-xs font-medium text-slate-500 mb-2">
                        <span>{t('my_learning.progress', 'Progress')}</span>
                        <span className="text-teal-600 font-bold">{progress}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-4">
                        <div 
                          className="bg-teal-500 h-2 rounded-full transition-all duration-1000 ease-out" 
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            {formatTotalDuration(course.totalHours * 3600)}
                          </span>
                        </div>

                        <button
                          className="bg-teal-50 text-teal-700 hover:bg-teal-100 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                          onClick={() => navigate(`/course/${course.id}`)}
                        >
                          {progress === 0 
                            ? t('my_learning.start_course', 'Start Course') 
                            : progress === 100 
                              ? t('my_learning.review_course', 'Review Course')
                              : t('my_learning.continue', 'Continue')
                          }
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>"""
          
    new_grid = """          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredCourses.map((course, index) => {
              const progress = courseProgress.get(course.id) || 0;
              const isHoveringThisVideo = hoveredVideo?.id === course.firstVideo?.id;
              
              const handleActionClick = () => navigate(`/course/${course.id}`);

              return (
                <CourseCard
                  key={course.id}
                  course={{...course, totalDurationSeconds: course.totalHours * 3600}}
                  isEnrolled={true}
                  isAuthenticated={isAuthenticated}
                  isVisible={isVisible}
                  index={index}
                  isHoveringVideo={isHoveringThisVideo}
                  onMouseEnter={() => course.firstVideo && handleVideoHover(course.firstVideo, true)}
                  onMouseLeave={() => course.firstVideo && handleVideoHover(course.firstVideo, false)}
                  onClick={handleActionClick}
                  onActionClick={handleActionClick}
                  formatDuration={() => formatTotalDuration(course.totalHours * 3600)}
                  t={t}
                />
              );
            })}
          </div>"""
          
    content = content.replace(old_grid, new_grid)

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

if __name__ == "__main__":
    fix_mylearning()
