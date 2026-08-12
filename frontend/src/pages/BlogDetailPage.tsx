import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { blogService, BlogPost, BlogComment } from '../lib/blog';
import { useAuth } from '../lib/AuthContext';
import { api, getAvatarUrl } from '../lib/api';
import Header from '../components/Header';
import Footer from '../components/Footer';
import DOMPurify from 'dompurify';
import toast from 'react-hot-toast';

const DEFAULT_BLOG_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiMyMmM1NWUiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiMxNmEzNGEiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0idXJsKCNnKSIvPjx0ZXh0IHg9IjQwMCIgeT0iMjAwIiBmb250LWZhbWlseT0iSW50ZXIiIGZvbnQtc2l6ZT0iMzQiIGZpbGw9IiNmZmZmZmYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGFsaWdubWVudC1iYXNlbGluZT0ibWlkZGxlIiBmb250LXdlaWdodD0iNzAwIj7wn5OSKSBBY3R1YWxpdMOpcyBKdXJpZGlxdWVzPC90ZXh0Pjwvc3ZnPg==';

const containsRTL = (text?: string) => {
  if (!text) return false;
  const rtlRegex = /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/;
  return rtlRegex.test(text);
};

const looksLikeHtml = (s?: string) => {
  if (!s) return false;
  return /<\s*[a-zA-Z][^>]*>/.test(s);
};

const BlogDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isRtl, setIsRtl] = useState<boolean>(false);
  const [isVisible, setIsVisible] = useState(false);
  
  // Comment state
  const [commentContent, setCommentContent] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  useEffect(() => {
    const fetchBlogPost = async () => {
      setLoading(true);
      setErrorMsg(null);

      if (!slug) {
        setErrorMsg(t('blog.detail_invalid_url', 'Invalid blog URL'));
        setLoading(false);
        return;
      }

      try {
        const found = await blogService.getBlogBySlug(slug);
        if (!found) {
          setErrorMsg(t('blog.detail_not_found', 'Article not found.'));
          setLoading(false);
          return;
        }

        setPost(found);
        setIsRtl(containsRTL(`${found.title || ''}\n${found.excerpt || ''}\n${found.content || ''}`));
        
        // Fetch comments if authenticated
        if (isAuthenticated) {
          const fetchedComments = await blogService.getComments(found.id);
          setComments(fetchedComments);
        }

        setLoading(false);
        setTimeout(() => setIsVisible(true), 150);
      } catch (err: any) {
        setErrorMsg(t('blog.detail_load_failed', 'Failed to load blog post.'));
        setLoading(false);
      }
    };

    fetchBlogPost();
  }, [slug, t, isAuthenticated]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!post || !commentContent.trim()) return;

    try {
      setPostingComment(true);
      const newComment = await blogService.postComment(post.id, commentContent);
      if (newComment) {
        setComments(prev => [newComment, ...prev]);
        setCommentContent('');
        toast.success(t('blog.comment_posted', 'Comment posted successfully!'));
      } else {
        toast.error(t('blog.comment_failed', 'Failed to post comment.'));
      }
    } catch (error) {
       toast.error(t('blog.comment_error', 'An error occurred.'));
    } finally {
      setPostingComment(false);
    }
  };

  const renderChunk = (chunk: string, idx: number) => {
    const s = chunk.trim();
    if (!s) return null;
    if (looksLikeHtml(s)) {
      const sanitized = DOMPurify.sanitize(s);
      return <div key={idx} dangerouslySetInnerHTML={{ __html: sanitized }} className="my-6 prose prose-slate prose-lg max-w-none text-slate-700 blog-content-html" />;
    }
    return <p key={idx} className="my-6 text-slate-700 leading-relaxed text-lg">{s}</p>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <Header />
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium animate-pulse">{t('common.loading', 'Chargement...')}</p>
        </div>
      </div>
    );
  }

  if (errorMsg || !post) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans">
        <Header />
        <div className="flex-1 flex items-center justify-center pt-32 px-4 pb-16">
          <div className="bg-white rounded-2xl shadow-soft border border-red-100 p-10 max-w-lg text-center animate-fade-in">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">⚠️</div>
            <h1 className="text-2xl font-bold text-slate-900 mb-4">{t('blog.detail_unavailable_title', 'Article indisponible')}</h1>
            <p className="text-red-600 mb-8 font-medium">{errorMsg || t('blog.detail_unavailable_message', 'Cet article n\'est plus disponible.')}</p>
            <Link to="/blog" className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all inline-flex items-center gap-2">
              <span>←</span> {t('blog.back_to_list', 'Retour aux articles')}
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white relative font-sans" dir={isRtl ? 'rtl' : 'ltr'} lang={isRtl ? 'ar' : undefined}>
      <Header />

      <main className="pt-20">
        {/* Full Size Hero Section */}
        <section className={`relative w-full h-[70vh] sm:h-[80vh] overflow-hidden transition-all duration-1000 transform ${isVisible ? 'scale-100 opacity-100' : 'scale-105 opacity-0'}`}>
          <img
            src={post.cover_image || DEFAULT_BLOG_IMAGE}
            alt={post.title}
            className="w-full h-full object-cover"
            onError={(e: any) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_BLOG_IMAGE; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
          
          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-12 lg:p-20 max-w-7xl mx-auto">
            <div className={`max-w-4xl ${isRtl ? 'mr-0 ml-auto text-right' : 'ml-0 mr-auto text-left'}`}>
              <div className="flex flex-wrap gap-3 mb-6">
                 <span className="px-4 py-1.5 bg-teal-500 text-white text-xs font-bold rounded-full uppercase tracking-wider shadow-lg">Blog</span>
                 <span className="px-4 py-1.5 bg-white/20 backdrop-blur-md text-white text-xs font-bold rounded-full uppercase tracking-wider">{new Date(post.created_at).getFullYear()}</span>
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white mb-8 leading-tight drop-shadow-2xl">
                {post.title}
              </h1>
              
              <div className={`flex items-center gap-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
                <div className="w-12 h-12 rounded-full border-2 border-white/50 overflow-hidden bg-white/10 backdrop-blur-sm">
                   <img src={post.author_avatar ? getAvatarUrl(post.author_avatar, post.author_name || '') : `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author_name || 'CJ')}&background=0D9488&color=fff`} className="w-full h-full object-cover" alt="" />
                </div>
                <div className="text-white">
                  <div className="font-bold text-lg">{post.author_name || 'Clinique des Juristes'}</div>
                  <div className="text-white/70 text-sm">{new Date(post.created_at).toLocaleDateString(isRtl ? 'ar-TN' : 'fr-FR', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Article Body */}
        <article className="max-w-4xl mx-auto px-6 py-16 sm:py-24 relative">
          <div className={`text-slate-800 text-xl leading-relaxed space-y-8 mb-20 ${isRtl ? 'text-right' : 'text-left'}`}>
             {post.content.split(/\n\n+/).map((c, i) => renderChunk(c, i))}
          </div>

          <div className="h-px bg-slate-100 w-full mb-16"></div>

          {/* Social Proof / Navigation */}
          <div className={`flex flex-col sm:flex-row gap-6 items-center justify-between py-10 border-y border-slate-100 mb-20 ${isRtl ? 'sm:flex-row-reverse' : ''}`}>
             <div className="flex items-center gap-4">
                <p className="text-slate-500 font-medium">Partager cet article:</p>
                <div className="flex gap-2">
                   {['facebook', 'twitter', 'linkedin'].map(social => (
                      <button key={social} className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:border-teal-500 hover:text-teal-500 transition-all">
                         <span className="sr-only">{social}</span>
                         <i className={`fab fa-${social}`}></i>
                      </button>
                   ))}
                </div>
             </div>
             <Link to="/blog" className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl active:scale-95">
                {t('blog.back_to_list', 'Explorer d\'autres articles')}
             </Link>
          </div>

          {/* Comment Section */}
          <section id="comments" className="mt-20 animate-fade-in">
             <div className={`flex items-center gap-3 mb-10 ${isRtl ? 'flex-row-reverse' : ''}`}>
                <h2 className="text-3xl font-black text-slate-900">{t('blog.comments_title', 'Commentaires')}</h2>
                <span className="px-3 py-1 bg-slate-100 text-slate-600 font-bold rounded-lg text-sm">{comments.length}</span>
             </div>

             {isAuthenticated ? (
                <div className="bg-slate-50 rounded-3xl p-6 sm:p-8 mb-12 border border-slate-100 shadow-inner">
                   <form onSubmit={handlePostComment} className="flex flex-col gap-4">
                      <div className="flex gap-4">
                         <img 
                           src={user?.profile_picture ? getAvatarUrl(user.profile_picture, user.name || '') : `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=random`} 
                           className="w-10 h-10 rounded-full border border-white shadow-sm flex-shrink-0" 
                           alt={user?.name}
                         />
                         <div className="flex-1">
                            <textarea
                              value={commentContent}
                              onChange={(e) => setCommentContent(e.target.value)}
                              placeholder={t('blog.comment_placeholder', 'Laissez un commentaire constructif...')}
                              className={`w-full p-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-teal-500/20 focus:border-teal-500 transition-all outline-none min-h-[120px] ${isRtl ? 'text-right' : 'text-left'}`}
                            ></textarea>
                         </div>
                      </div>
                      <div className={`flex ${isRtl ? 'justify-start' : 'justify-end'}`}>
                         <button 
                           type="submit" 
                           disabled={postingComment || !commentContent.trim()}
                           className="px-8 py-3 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 transition-all disabled:opacity-50 disabled:scale-100 active:scale-95 shadow-lg shadow-teal-600/20"
                         >
                            {postingComment ? t('common.sending', 'Envoi...') : t('blog.post_comment', 'Publier')}
                         </button>
                      </div>
                   </form>
                </div>
             ) : (
                <div className="bg-amber-50 border border-amber-100 rounded-3xl p-8 mb-12 text-center">
                   <p className="text-amber-800 font-bold mb-4">{t('blog.login_to_comment', 'Connectez-vous pour rejoindre la discussion')}</p>
                   <Link to="/login" className="inline-block px-8 py-3 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 transition-all shadow-lg shadow-amber-600/20">
                      {t('nav.login', 'Connexion')}
                   </Link>
                </div>
             )}

             <div className="space-y-8">
                {comments.length > 0 ? (
                   comments.map((comment, idx) => (
                      <div key={comment.id} className={`flex gap-4 animate-fade-in ${isRtl ? 'flex-row-reverse text-right' : 'text-left'}`} style={{ animationDelay: `${idx * 100}ms` }}>
                         <img 
                           src={comment.user_avatar ? getAvatarUrl(comment.user_avatar, comment.user_name || '') : `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.user_name || 'U')}&background=random`} 
                           className="w-12 h-12 rounded-full border border-slate-100 shadow-sm flex-shrink-0" 
                           alt={comment.user_name}
                         />
                         <div className="flex-1 bg-white border border-slate-100 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                            <div className={`flex flex-wrap items-center gap-x-3 mb-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                               <span className="font-bold text-slate-900">{comment.user_name}</span>
                               <span className="text-slate-400 text-xs">{new Date(comment.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            </div>
                            <p className="text-slate-700 leading-relaxed">
                               {comment.content}
                            </p>
                         </div>
                      </div>
                   ))
                ) : (
                   <div className="py-12 text-center border-2 border-dashed border-slate-100 rounded-3xl text-slate-400 font-medium">
                      {t('blog.no_comments', 'Soyez le premier à commenter cet article !')}
                   </div>
                )}
             </div>
          </section>
        </article>
      </main>

      <Footer />
      
      {/* Scroll indicator for longer posts */}
      <div className="fixed bottom-8 right-8 z-40 hidden lg:block">
         <button 
           onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
           className="w-12 h-12 bg-white/80 backdrop-blur-md border border-slate-200 rounded-full shadow-lg flex items-center justify-center text-slate-400 hover:text-teal-600 hover:border-teal-500 transition-all active:scale-90"
         >
            <span className="text-xl">↑</span>
         </button>
      </div>
    </div>
  );
};

export default BlogDetailPage;