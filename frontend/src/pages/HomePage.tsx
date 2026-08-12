import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { profileApi, getAvatarUrl } from '../lib/api';

const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);

  const HERO_IMAGE_PATH = '/assets/graduate.png';

  const [stats, setStats] = useState<{ totalUsers: number, recentAvatars: any[] }>({ totalUsers: 0, recentAvatars: [] });

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 150);
    
    // Fetch stats
    const fetchStats = async () => {
      try {
        const data = await profileApi.getPublicStats();
        if (data.success) {
          setStats({
            totalUsers: data.totalUsers,
            recentAvatars: data.recentAvatars
          });
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };
    
    fetchStats();
    
    return () => clearTimeout(timer);
  }, []);

  const buildHeroImgSrc = (rawPath: string, placeholder = '/api/placeholder/600/600') => {
    if (!rawPath) return placeholder;
    if (rawPath.startsWith('/assets/')) return rawPath;
    if (rawPath.startsWith('http://') || rawPath.startsWith('https://')) return rawPath;
    return rawPath;
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 overflow-x-hidden">
      <Header />

      <main className="pt-24 lg:pt-32 pb-16 lg:pb-24 relative">
        {/* Background Decorative Element */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-[600px] h-[600px] bg-teal-50 rounded-full blur-3xl opacity-60 animate-pulse pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-[400px] h-[400px] bg-blue-50 rounded-full blur-3xl opacity-60 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            
            {/* Text Content */}
            <div className={`space-y-8 transition-all duration-1000 transform ${isVisible ? 'translate-x-0 opacity-100' : '-translate-x-10 opacity-0'}`}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow-soft border border-slate-100 text-sm font-medium text-teal-700">
                <span>{t('hero.badge_icon', '⚖️')}</span>
                <span>{t('hero.badge_text', "L'éducation Juridique Premium")}</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
                <span className="block mb-2">{t('hero.title_part1', "L'éducation")} </span>
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-blue-600 mb-2">
                  {t('hero.title_highlight', "Juridique")}
                </span>
                <span className="block">{t('hero.title_part3', "Moderne,")}</span>
                <span className="block text-slate-600 font-bold">{t('hero.title_accent', "À Portée De Main")}</span>
              </h1>

              <p className="text-lg text-slate-600 max-w-xl leading-relaxed">
                {t('hero.description', "Clinique des juristes - Toutes les disciplines juridiques. Formations expertes modernes, pour réussir votre parcours professionnel sans compromis.")}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link to="/courses" className="btn-primary text-lg px-8 py-4 w-full sm:w-auto shadow-elegant">
                  {t('buttons.cta_more', 'Découvrir nos Formations')}
                </Link>
                <Link to="/contact" className="btn-secondary text-lg px-8 py-4 w-full sm:w-auto">
                  {t('buttons.contact_us', 'Nous contacter')}
                </Link>
              </div>
              
              <div className="flex items-center gap-4 pt-8 border-t border-slate-200 mt-8">
                <div className="flex -space-x-3">
                  {stats.recentAvatars.length > 0 ? (
                    stats.recentAvatars.map((user) => (
                      <div key={user.id} className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-xs font-bold text-slate-500 overflow-hidden shadow-sm">
                        <img 
                          src={getAvatarUrl(user.profile_picture, user.name)} 
                          alt={user.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))
                  ) : (
                    // Fallback to placeholders if no users have uploaded avatars yet
                    [1, 2, 3].map((i) => (
                      <div key={i} className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-xs font-bold text-slate-500 overflow-hidden">
                        <img src={`https://ui-avatars.com/api/?name=User+${i}&background=random`} alt="User" />
                      </div>
                    ))
                  )}
                  <div className="w-10 h-10 rounded-full bg-teal-100 border-2 border-white flex items-center justify-center text-xs font-bold text-teal-700 shadow-sm">
                    {stats.totalUsers > 0 ? `+${stats.totalUsers}` : '+1k'}
                  </div>
                </div>
                <p className="text-sm text-slate-500 font-medium tracking-wide">
                  {t('hero.social_proof_trust', { count: stats.totalUsers || 1000 })}
                </p>
              </div>
            </div>

            {/* Visual Content */}
            <div className={`relative transition-all duration-1000 delay-300 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
              <div className="relative w-full max-w-lg mx-auto aspect-square">
                {/* Decorative Ring */}
                <div className="absolute inset-0 rounded-full border-2 border-teal-100 scale-95 opacity-50"></div>
                <div className="absolute inset-0 rounded-full border border-teal-50 scale-105 opacity-50"></div>
                
                {/* Main Illustration Container */}
                <div className="absolute inset-4 rounded-full bg-gradient-to-tr from-teal-50 to-white shadow-elegant overflow-hidden flex items-center justify-center border border-white">
                  <img
                    src={buildHeroImgSrc(HERO_IMAGE_PATH, 'https://raw.githubusercontent.com/antygravity/cliniquedesjuristes-main/main/frontend/public/assets/graduate.png')}
                    alt={t('hero.image_alt', 'Graduate Student')}
                    className="w-full h-full object-cover object-top drop-shadow-2xl z-10"
                    onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = 'https://ui-avatars.com/api/?name=Law+Student&size=512&background=0D8ABC&color=fff';
                    }}
                  />
                  {/* Inner glowing effect */}
                  <div className="absolute inset-0 bg-gradient-to-t from-teal-200/20 to-transparent pointer-events-none"></div>
                </div>

                {/* Floating Elements */}
                <div className="absolute top-1/4 -right-4 w-16 h-16 bg-white rounded-2xl shadow-glass flex items-center justify-center text-3xl transform rotate-12 animate-float">
                  ⚖️
                </div>
                <div className="absolute bottom-1/4 -left-4 w-16 h-16 bg-white rounded-2xl shadow-glass flex items-center justify-center text-3xl transform -rotate-6 animate-float-slow">
                  📚
                </div>
                <div className="absolute -top-4 left-1/4 w-12 h-12 bg-white rounded-full shadow-glass flex items-center justify-center text-2xl animate-pulse">
                  ✨
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default HomePage;