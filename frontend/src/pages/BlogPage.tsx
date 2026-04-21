import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { blogService, BlogPost } from '../lib/blog';
import { resolveMediaUrl } from '../lib/media';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Loading from '../components/Loading';

const DEFAULT_BLOG_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiMyMmM1NWUiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiMxNmEzNGEiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgZmlsbD0idXJsKCNnKSIvPjx0ZXh0IHg9IjQwMCIgeT0iMzAwIiBmb250LWZhbWlseT0iSW50ZXIiIGZvbnQtc2l6ZT0iMzQiIGZpbGw9IiNmZmZmZmYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGFsaWdubWVudC1iYXNlbGluZT0ibWlkZGxlIiBmb250LXdlaWdodD0iNzAwIj7wn5OSKSBBY3R1YWxpdMOpcyBKdXJpZGlxdWVzPC90ZXh0Pjwvc3ZnPg==';

const containsRTL = (text?: string) => {
  if (!text) return false;
  const rtlRegex = /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/;
  return rtlRegex.test(text);
};

const BlogPage: React.FC = () => {
  const { t } = useTranslation();
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        setLoading(true);
        const fetchedBlogs = await blogService.getBlogPosts();
        setBlogs(fetchedBlogs);
      } catch (err) {
        console.error("Failed to fetch blogs:", err);
        setError(t('blog.error_loading', 'Failed to load blog posts. Please try again later.'));
      } finally {
        setLoading(false);
      }
    };

    fetchBlogs();
    setTimeout(() => setIsVisible(true), 150);
  }, [t]);

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const getExcerpt = (content: string, excerpt?: string) => {
    if (excerpt) return excerpt;
    return content.substring(0, 150) + (content.length > 150 ? '...' : '');
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <Loading />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 relative font-sans overflow-hidden flex flex-col">
      <Header />

      {/* Decorative Blur Backdrops */}
      <div className="absolute top-20 left-0 w-[500px] h-[500px] bg-teal-100 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 pointer-events-none"></div>
      <div className="absolute top-40 right-0 w-[500px] h-[500px] bg-blue-100 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 animate-pulse pointer-events-none"></div>

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 px-4 z-10" aria-label={t('blog.hero_section', 'Blog')}>
        <div className={`max-w-4xl mx-auto text-center transition-all duration-700 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-50 border border-teal-100 text-teal-700 font-semibold mb-6 shadow-sm">
            <span>✍️</span>
            <span>{t('blog.hero_badge', 'News & Legal Advice')}</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight mb-6">
            {t('blog.hero_title_prefix', 'Latest')} <span className="text-teal-600">{t('blog.hero_title_highlight', 'Articles')}</span>
          </h1>

          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            {t('blog.hero_description', "Discover expert tips, legal news and learning resources to stay up-to-date with the latest legal developments.")}
          </p>
        </div>
      </section>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 relative z-10">
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl mb-8 max-w-2xl mx-auto text-center font-medium shadow-sm">
            {error}
          </div>
        )}

        {blogs.length === 0 && !error ? (
          <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center max-w-2xl mx-auto shadow-sm">
            <div className="text-6xl mb-6">📝</div>
            <p className="text-xl font-medium text-slate-700">{t('blog.empty_text', 'Our articles are coming soon! Check back later for legal content.')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogs.map((blog, index) => {
              const rawSlug = (blog.slug ?? '').toString();
              const hasValidSlug = rawSlug && rawSlug !== '-1';
              const linkTarget = hasValidSlug
                ? `/blog/${encodeURIComponent(rawSlug)}`
                : (blog.id !== undefined && blog.id !== null) ? `/blog/${blog.id}` : null;

              const isRtl = containsRTL(`${blog.title || ''}\n${blog.excerpt || ''}\n${blog.content || ''}`);

              return (
                <article
                  key={blog.id ?? index}
                  className={`group bg-white rounded-2xl overflow-hidden shadow-soft border border-slate-100 flex flex-col transition-all duration-500 hover:shadow-elegant hover:-translate-y-2 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}
                  style={{ transitionDelay: `${index * 100}ms` }}
                  dir={isRtl ? 'rtl' : 'ltr'}
                  lang={isRtl ? 'ar' : undefined}
                >
                  <Link to={linkTarget || '#'} className="relative aspect-[16/10] overflow-hidden bg-slate-100 block">
                    <img
                      src={resolveMediaUrl(blog.cover_image, undefined) || DEFAULT_BLOG_IMAGE}
                      alt={blog.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      onError={(e: any) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = DEFAULT_BLOG_IMAGE;
                      }}
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors"></div>
                  </Link>

                  <div className="p-6 flex flex-col flex-grow">
                    <div className={`flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500 mb-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
                      <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md">
                        🗓 {formatDate(blog.created_at)}
                      </span>
                      {blog.author_name && (
                        <span className="flex items-center gap-1.5 text-teal-700 bg-teal-50 px-2 py-1 rounded-md">
                          ✍️ {blog.author_name}
                        </span>
                      )}
                    </div>

                    <h2 className="text-xl font-bold text-slate-900 mb-3 line-clamp-2 leading-snug group-hover:text-teal-600 transition-colors">
                      {linkTarget ? (
                        <Link to={linkTarget}>{blog.title}</Link>
                      ) : (
                        <span>{blog.title}</span>
                      )}
                    </h2>

                    <p className={`text-slate-600 mb-6 flex-grow text-sm leading-relaxed ${isRtl ? 'text-right' : 'text-left'}`}>
                      {getExcerpt(blog.content, blog.excerpt)}
                    </p>

                    <div className={`mt-auto pt-4 border-t border-slate-100 flex ${isRtl ? 'justify-start' : 'justify-end'}`}>
                      {linkTarget ? (
                        <Link
                          to={linkTarget}
                          className={`inline-flex items-center gap-2 text-sm font-bold text-teal-600 hover:text-teal-700 ${isRtl ? 'flex-row-reverse' : ''}`}
                        >
                          <span>{t('blog.read_more', 'Read more')}</span>
                          <span className="transition-transform group-hover:translate-x-1">
                            {isRtl ? '←' : '→'}
                          </span>
                        </Link>
                      ) : (
                        <span className="text-sm font-medium text-slate-400">
                          {t('blog.unavailable', 'Article unavailable')}
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default BlogPage;