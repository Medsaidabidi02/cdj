import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { useTranslation } from 'react-i18next';
import { api, getAvatarUrl } from '../lib/api';
import { useNotifications } from '../lib/NotificationContext';
import LanguageSwitcher from './LanguageSwitcher';

const Header: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    
    // Check for iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Global notification unread count is now handled by NotificationContext

  const handleLogout = async () => {
    if (isLoggingOut) return; 
    setIsLoggingOut(true);
    
    try {
      await logout(); 
      navigate('/'); 
    } catch (err) {
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
      localStorage.removeItem('sessionToken');
      navigate('/login');
    } finally {
      setIsLoggingOut(false);
      setIsMenuOpen(false); 
      setDropdownOpen(false);
    }
  };

  const isActive = (path: string) => location.pathname === path;
  const toggleMobileMenu = () => setIsMenuOpen(p => !p);

  const isRtl = i18n.language && i18n.language.startsWith('ar');

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${
        isScrolled 
          ? 'bg-white/90 backdrop-blur-md border-slate-200 shadow-sm py-3' 
          : 'bg-white border-transparent py-5'
      }`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-0 items-center justify-between">
        
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <img src="/images/logoo.png" alt={t('logo_alt', 'Clinique Juriste Logo')} className="w-10 h-10 object-contain group-hover:scale-105 transition-transform" />
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 hidden md:inline-block">
            {t('site_title', 'Clinique des Juristes')}
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          <Link to="/" className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/') ? 'text-teal-600 bg-teal-50' : 'text-slate-600 hover:text-teal-600 hover:bg-slate-50'}`}>{t('nav.home', 'Accueil')}</Link>
          <Link to="/courses" className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/courses') ? 'text-teal-600 bg-teal-50' : 'text-slate-600 hover:text-teal-600 hover:bg-slate-50'}`}>{t('nav.courses', 'Formations')}</Link>
          <Link to="/blog" className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/blog') ? 'text-teal-600 bg-teal-50' : 'text-slate-600 hover:text-teal-600 hover:bg-slate-50'}`}>{t('nav.blog', 'Articles')}</Link>
          <Link to="/contact" className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/contact') ? 'text-teal-600 bg-teal-50' : 'text-slate-600 hover:text-teal-600 hover:bg-slate-50'}`}>{t('nav.contact', 'Contact')}</Link>

          <div className="px-2 border-l border-slate-200 ml-2 animate-fade-in">
            <LanguageSwitcher />
          </div>

          {isAuthenticated && user ? (
            <div className="relative ml-2">
              <div className="flex items-center gap-2">
                {/* 🔔 Notifications Bell */}
                <div className="relative">
                  <button
                    onClick={() => setIsNotifOpen(!isNotifOpen)}
                    className="p-2 text-slate-500 hover:text-teal-600 hover:bg-slate-50 rounded-full transition-colors relative"
                    aria-label="Toggle notifications"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center rounded-full border-2 border-white shadow-sm ring-1 ring-rose-500/20">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notifications Dropdown */}
                  {isNotifOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setIsNotifOpen(false)}></div>
                      <div className={`absolute ${isRtl ? 'left-0' : 'right-0'} mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-100 z-20 py-2 transform origin-top-right transition-all animate-slide-up`}>
                        <div className="px-4 py-2 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                          <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
                          {unreadCount > 0 && (
                            <button onClick={markAllAsRead} className="text-xs text-teal-600 hover:text-teal-700 font-medium">
                              {t('header.mark_all_read', 'Tout marquer comme lu')}
                            </button>
                          )}
                        </div>
                        <div className="max-h-[380px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
                          {notifications.length > 0 ? (
                            notifications.map((notif) => (
                              <div 
                                key={notif.id}
                                onClick={() => {
                                  markAsRead(notif.id);
                                  setIsNotifOpen(false);
                                  if (notif.rel_id) {
                                    if (notif.type === 'blog') navigate(`/blog/${notif.rel_id}`);
                                    else if (notif.type === 'inbox') navigate('/inbox');
                                    else if (notif.type === 'video') navigate(`/course/${notif.rel_id}`);
                                  }
                                }}
                                className={`px-4 py-3 hover:bg-teal-50/50 cursor-pointer border-b border-slate-50 last:border-0 transition-all duration-200 ${!notif.is_read ? 'bg-teal-50/30' : ''}`}
                              >
                                <div className="flex gap-3">
                                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                                    notif.type === 'blog' ? 'bg-amber-100 text-amber-600' :
                                    notif.type === 'video' ? 'bg-blue-100 text-blue-600' :
                                    notif.type === 'inbox' ? 'bg-teal-100 text-teal-600' :
                                    'bg-slate-100 text-slate-600'
                                  }`}>
                                    {notif.type === 'blog' ? '📝' : notif.type === 'video' ? '📽️' : notif.type === 'inbox' ? '✉️' : '🔔'}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start gap-2">
                                      <p className={`text-sm font-bold truncate ${!notif.is_read ? 'text-slate-900' : 'text-slate-600'}`}>{notif.title}</p>
                                      <span className="text-[10px] text-slate-400 whitespace-nowrap mt-0.5">
                                        {new Date(notif.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">{notif.message}</p>
                                  </div>
                                  {!notif.is_read && (
                                    <div className="w-2 h-2 bg-teal-500 rounded-full mt-2 flex-shrink-0 animate-pulse"></div>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="py-12 text-center">
                              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                <span className="text-2xl text-slate-300">🔔</span>
                              </div>
                              <p className="text-sm text-slate-400 font-medium">Aucune notification pour le moment</p>
                            </div>
                          )}
                        </div>

                        {/* iOS Tip */}
                        {isIOS && (
                          <div className="px-4 py-3 bg-amber-50 border-t border-amber-100">
                             <div className="flex gap-2">
                                <span className="text-amber-500 text-lg">💡</span>
                                <p className="text-[11px] text-amber-800 leading-tight">
                                   <strong>Utilisateurs iOS:</strong> Pour recevoir les notifications, appuyez sur "Partager" puis "Sur l'écran d'accueil".
                                </p>
                             </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <div className="h-8 w-px bg-slate-200 mx-1"></div>

                <button 
                  onClick={() => setDropdownOpen(!dropdownOpen)} 
                  className="flex items-center gap-2 hover:bg-slate-100 p-1.5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <div className="relative">
                    {user?.profile_picture ? (
                      <img 
                        src={getAvatarUrl(user.profile_picture, user.name)} 
                        alt={user.name} 
                        className="w-9 h-9 rounded-full object-cover border border-slate-200 shadow-sm"
                      />
                    ) : (
                      <div className="w-9 h-9 flex items-center justify-center bg-teal-100 text-teal-700 rounded-full font-bold shadow-sm">
                        {user?.name ? String(user.name).charAt(0).toUpperCase() : 'U'}
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-medium text-slate-700 hidden lg:inline-block max-w-[100px] truncate">{user?.name}</span>
                  <svg className="w-4 h-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-elegant border border-slate-100 overflow-hidden z-50 animate-slide-up">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                    <p className="text-xs text-slate-500 mb-0.5">{t('user.logged_in_as', 'Signed in as')}</p>
                    <p className="text-sm font-bold text-slate-900 truncate">{user.email}</p>
                  </div>
                  
                  <div className="p-2 space-y-1">
                    {user?.is_admin && (
                      <Link to="/admin" onClick={() => setDropdownOpen(false)} className="block px-3 py-2 text-sm text-slate-700 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">
                        {t('header.admin', 'Administration')}
                      </Link>
                    )}
                    <Link to="/profile" onClick={() => setDropdownOpen(false)} className="block px-3 py-2 text-sm text-slate-700 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">
                      {t('header.profile', 'Mon Profil')}
                    </Link>
                    <Link to="/my-learning" onClick={() => setDropdownOpen(false)} className="block px-3 py-2 text-sm text-slate-700 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">
                      {t('header.my_learning', 'My Learning')}
                    </Link>
                    <Link to="/inbox" onClick={() => setDropdownOpen(false)} className="flex items-center justify-between px-3 py-2 text-sm text-slate-700 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">
                      <span>{t('header.inbox', 'Inbox')}</span>
                      {unreadCount > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{unreadCount}</span>}
                    </Link>
                  </div>
                  
                  <div className="p-2 border-t border-slate-100">
                    <button 
                      onClick={handleLogout} 
                      disabled={isLoggingOut}
                      className="w-full text-left px-3 py-2 text-sm text-red-600 flex items-center hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isLoggingOut ? t('auth.logging_out', 'Logging out...') : t('auth.logout', 'Logout')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 ml-4">
              {location.pathname === '/signup' ? (
                <>
                  <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-teal-600 transition-colors px-2">
                    {t('auth.login.submit', 'Sign in')}
                  </Link>
                  <Link to="/signup" className="text-sm font-medium bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg transition-all active:scale-95 shadow-soft hover:shadow-md">
                    {t('auth.signup.button', "S'inscrire")}
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/login" className="text-sm font-medium bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg transition-all active:scale-95 shadow-soft hover:shadow-md">
                    {t('auth.login.submit', 'Sign in')}
                  </Link>
                  <Link to="/signup" className="text-sm font-medium text-slate-600 hover:text-teal-600 transition-colors px-2">
                    {t('auth.signup.button', "S'inscrire")}
                  </Link>
                </>
              )}
            </div>
          )}
        </nav>

        {/* Mobile Menu Toggle */}
        <button 
          onClick={toggleMobileMenu} 
          className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none"
          aria-label={t('menu.open', 'Toggle menu')}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white border-t border-slate-100 shadow-glass animate-fade-in p-4 overflow-y-auto max-h-[85vh]">
          <div className="flex flex-col space-y-2">
            <Link to="/" onClick={() => setIsMenuOpen(false)} className={`px-4 py-3 rounded-lg font-medium transition-colors ${isActive('/') ? 'bg-teal-50 text-teal-600' : 'text-slate-700 hover:bg-slate-50'}`}>{t('nav.home', 'Accueil')}</Link>
            <Link to="/courses" onClick={() => setIsMenuOpen(false)} className={`px-4 py-3 rounded-lg font-medium transition-colors ${isActive('/courses') ? 'bg-teal-50 text-teal-600' : 'text-slate-700 hover:bg-slate-50'}`}>{t('nav.courses', 'Formations')}</Link>
            <Link to="/blog" onClick={() => setIsMenuOpen(false)} className={`px-4 py-3 rounded-lg font-medium transition-colors ${isActive('/blog') ? 'bg-teal-50 text-teal-600' : 'text-slate-700 hover:bg-slate-50'}`}>{t('nav.blog', 'Articles')}</Link>
            <Link to="/contact" onClick={() => setIsMenuOpen(false)} className={`px-4 py-3 rounded-lg font-medium transition-colors ${isActive('/contact') ? 'bg-teal-50 text-teal-600' : 'text-slate-700 hover:bg-slate-50'}`}>{t('nav.contact', 'Contact')}</Link>
            
            <div className="py-3 px-4 shadow-sm rounded-lg bg-slate-50 border border-slate-100 mt-2">
              <LanguageSwitcher />
            </div>
            
            <div className="h-px bg-slate-200 my-4" />
            
            {isAuthenticated && user ? (
              <>
                <div className="flex items-center gap-3 px-4 py-3 mb-2 bg-white rounded-lg border border-slate-100">
                  {user?.profile_picture ? (
                    <img src={getAvatarUrl(user.profile_picture, user.name)} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 flex items-center justify-center bg-teal-100 text-teal-700 rounded-full font-bold text-lg">
                      {user?.name ? String(user.name).charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-900">{user.name}</span>
                    <span className="text-xs text-slate-500 truncate max-w-[200px]">{user.email}</span>
                  </div>
                </div>

                <Link to="/profile" onClick={() => setIsMenuOpen(false)} className="px-4 py-3 text-slate-700 font-medium hover:bg-slate-50 rounded-lg transition-colors">{t('header.profile', 'Mon Profil')}</Link>
                <Link to="/my-learning" onClick={() => setIsMenuOpen(false)} className="px-4 py-3 text-slate-700 font-medium hover:bg-slate-50 rounded-lg transition-colors">{t('header.my_learning', 'My Learning')}</Link>
                <Link to="/inbox" onClick={() => setIsMenuOpen(false)} className="px-4 py-3 text-slate-700 font-medium flex justify-between hover:bg-slate-50 rounded-lg transition-colors">
                  {t('header.inbox', 'Inbox')}
                  {unreadCount > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full flex items-center">{unreadCount}</span>}
                </Link>
                {user?.is_admin && (
                  <Link to="/admin" onClick={() => setIsMenuOpen(false)} className="px-4 py-3 text-slate-700 font-medium hover:bg-slate-50 rounded-lg transition-colors">{t('header.admin', 'Administration')}</Link>
                )}
                <button 
                  onClick={() => { handleLogout(); }} 
                  disabled={isLoggingOut}
                  className="w-full text-left px-4 py-3 mt-2 text-red-600 font-medium hover:bg-red-50 rounded-lg transition-colors"
                >
                  {isLoggingOut ? t('auth.logging_out', 'Logging out...') : t('auth.logout', 'Logout')}
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-3 mt-4">
                <Link to="/login" onClick={() => setIsMenuOpen(false)} className="w-full py-3 text-center rounded-xl font-medium bg-teal-600 text-white hover:bg-teal-700 shadow-soft transition-colors">{t('auth.login.submit', 'Sign in')}</Link>
                <Link to="/signup" onClick={() => setIsMenuOpen(false)} className="w-full py-3 text-center rounded-xl font-medium border border-teal-200 text-teal-700 hover:bg-teal-50 transition-colors">{t('auth.signup.button', "S'inscrire")}</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;