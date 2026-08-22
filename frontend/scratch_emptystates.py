import os
import re

def update_file(path, replacements, add_imports=None):
    if not os.path.exists(path): return
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    original = content
    for old, new in replacements:
        content = content.replace(old, new)
        
    if content != original:
        if add_imports:
            # check if imports exist
            for imp in add_imports:
                if imp not in content:
                    last_import = content.rfind("import ")
                    end_last_import = content.find("\n", last_import)
                    content = content[:end_last_import+1] + imp + "\n" + content[end_last_import+1:]
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Updated {path}")

# 1. MyLearningPage - No courses
mylearning_old_empty = """<div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-2xl mx-auto shadow-sm">
            <div className="text-5xl mb-6"><BookOpen className="w-12 h-12 text-slate-400" /></div>
            <h2 className="text-2xl font-bold text-slate-800 mb-4">{t('my_learning.no_enrolled_title', 'No enrolled courses')}</h2>
            <p className="text-slate-500 mb-8">
              {t('my_learning.no_enrolled_message', 'Visit the Courses page to explore and enroll in courses.')}
            </p>
            <button
              onClick={() => navigate('/courses')}
              className="btn-primary inline-flex items-center gap-2"
            >
              {t('my_learning.browse_courses', 'Browse Courses')}
            </button>
          </div>"""

mylearning_new_empty = """<EmptyState 
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
          />"""

update_file("src/pages/MyLearningPage.tsx", [(mylearning_old_empty, mylearning_new_empty)], ["import { EmptyState } from '../components/ui/EmptyState';"])


# 2. CoursesPage - No courses
courses_old_empty = """<div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-2xl mx-auto shadow-sm">
            <div className="text-5xl mb-6"><BookOpen className="w-12 h-12 text-slate-400" /></div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">{t('courses.no_courses_title', 'No courses available')}</h2>
            <p className="text-slate-500">
              {selectedCategory === 'all'
                ? t('courses.no_courses_message_all', 'Our courses are coming soon. Please check back later.')
                : t('courses.no_courses_message_category', 'No courses available in the "{{category}}" category.', { category: selectedCategory })
              }
            </p>
          </div>"""

courses_new_empty = """<EmptyState 
            icon={BookOpen}
            title={t('courses.no_courses_title', 'No courses available')}
            description={selectedCategory === 'all'
                ? t('courses.no_courses_message_all', 'Our courses are coming soon. Please check back later.')
                : t('courses.no_courses_message_category', 'No courses available in the "{{category}}" category.', { category: selectedCategory })
            }
          />"""

update_file("src/pages/CoursesPage.tsx", [(courses_old_empty, courses_new_empty)], ["import { EmptyState } from '../components/ui/EmptyState';"])


# 3. InboxPage - No messages
inbox_old_empty = """<div className="inbox-empty">
            <h2>{t('inbox.empty_title', 'No messages yet')}</h2>
            <p>{t('inbox.empty_description', 'Your inbox is empty. New messages will appear here.')}</p>
          </div>"""

inbox_new_empty = """<div className="p-12">
            <EmptyState 
              icon={Mail}
              title={t('inbox.empty_title', 'Nothing here yet')}
              description={t('inbox.empty_description', 'Your inbox is empty. New messages will appear here.')}
            />
          </div>"""

update_file("src/pages/InboxPage.tsx", [(inbox_old_empty, inbox_new_empty)], ["import { EmptyState } from '../components/ui/EmptyState';", "import { Mail } from 'lucide-react';"])


# 4. Header - No notifications
header_old_empty = """<div className="py-8 px-4 text-center">
                              <p className="text-sm text-slate-400 font-medium">Aucune notification pour le moment</p>
                            </div>"""

header_new_empty = """<div className="py-12 px-4 text-center flex flex-col items-center">
                              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                                <Bell className="w-6 h-6 text-slate-300" />
                              </div>
                              <h4 className="text-sm font-bold text-slate-800 mb-1">Nothing here yet</h4>
                              <p className="text-xs text-slate-400 font-medium">You have no new notifications.</p>
                            </div>"""

update_file("src/components/Header.tsx", [(header_old_empty, header_new_empty)])

