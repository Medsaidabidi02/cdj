import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const Footer: React.FC = () => {
  const { t, i18n } = useTranslation();
  const currentYear = new Date().getFullYear();
  const isArabic = i18n.language === 'ar';

  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-8 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          
          {/* Logo & Description */}
          <div className="space-y-6">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/20">
                <span className="text-white text-xl font-bold">C</span>
              </div>
              <span className="text-xl font-bold text-white tracking-tight">
                {t('site_title', 'Clinique des Juristes')}
              </span>
            </Link>
            <p className="text-slate-400 leading-relaxed text-sm">
              {t('footer.description', "Clinique des Juristes - L'excellence juridique moderne à votre portée. Découvrez nos formations expertes.")}
            </p>
            <div className="flex items-center gap-4">
              {/* Social Icons Placeholder */}
              {['facebook', 'twitter', 'linkedin', 'instagram'].map((social) => (
                <a 
                  key={social} 
                  href={`#${social}`} 
                  className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center hover:bg-teal-500 hover:text-white transition-all transform hover:-translate-y-1"
                >
                  <span className="sr-only">{social}</span>
                  <div className="w-4 h-4 rounded-full border border-current opacity-50"></div>
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-6">
            <h3 className="text-white font-bold text-lg">{t('footer.quick_links', 'Quick Links')}</h3>
            <ul className="space-y-3">
              <li><Link to="/" className="hover:text-teal-400 transition-colors">{t('nav.home')}</Link></li>
              <li><Link to="/courses" className="hover:text-teal-400 transition-colors">{t('nav.courses')}</Link></li>
              <li><Link to="/blog" className="hover:text-teal-400 transition-colors">{t('nav.articles')}</Link></li>
              <li><Link to="/contact" className="hover:text-teal-400 transition-colors">{t('nav.contact')}</Link></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-6">
            <h3 className="text-white font-bold text-lg">{t('footer.contact', 'Contact')}</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-teal-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-sm leading-relaxed">
                  {t('contact.method_address.detail', '5 rue 20 mars, Tunis 1006, Tunisia')}
                </span>
              </li>
              <li className="flex items-center gap-3">
                <svg className="w-5 h-5 text-teal-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span className="text-sm" dir="ltr">+216 56 614 717</span>
              </li>
              <li className="flex items-center gap-3">
                <svg className="w-5 h-5 text-teal-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="text-sm truncate">cliniquedesjuristes@gmail.com</span>
              </li>
            </ul>
          </div>

          {/* Newsletter / CTA */}
          <div className="space-y-6">
            <h3 className="text-white font-bold text-lg">{t('auth.signup.badge_text', 'Join Our Community')}</h3>
            <p className="text-sm text-slate-400">
              {t('auth.signup.subtitle', 'Join us to access premium legal education courses')}
            </p>
            <Link 
              to="/signup" 
              className="inline-block px-6 py-2 bg-teal-500 text-white rounded-lg font-semibold hover:bg-teal-600 transition-colors shadow-lg shadow-teal-500/10"
            >
              {t('auth.signup.button')}
            </Link>
          </div>
          
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-500">
          <p>© {currentYear} {t('site_title', 'Clinique des Juristes')}. {t('footer.all_rights_reserved', 'All rights reserved.')}</p>
          <div className="flex items-center gap-6">
            <a href="#privacy" className="hover:text-slate-300 transition-colors">Privacy Policy</a>
            <a href="#terms" className="hover:text-slate-300 transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
