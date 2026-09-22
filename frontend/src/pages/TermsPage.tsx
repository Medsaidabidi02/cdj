import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import Header from '../components/Header';
import Footer from '../components/Footer';

const TransCmp = Trans as any;

const TermsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const dir = i18n.language === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col" dir={dir}>
      <Header />
      
      <main className="flex-grow pt-24 lg:pt-32 pb-16 lg:pb-24">
        <div className="max-w-4xl mx-auto bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-slate-100">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-8 text-center tracking-tight">
            {t('legal_terms.title')}
          </h1>

          <div className="space-y-8 text-slate-600 leading-relaxed text-lg">
            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-3">{t('legal_terms.art1_title')}</h2>
              <p>
                <TransCmp i18nKey="legal_terms.art1_p1" components={{ 1: <strong />, 3: <strong /> }} />
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li><TransCmp i18nKey="legal_terms.art1_li1" components={{ 1: <strong /> }} /></li>
                <li><TransCmp i18nKey="legal_terms.art1_li2" components={{ 1: <strong /> }} /></li>
                <li><TransCmp i18nKey="legal_terms.art1_li3" components={{ 1: <strong /> }} /></li>
                <li><TransCmp i18nKey="legal_terms.art1_li4" components={{ 1: <strong /> }} /></li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-3">{t('legal_terms.art2_title')}</h2>
              <p>{t('legal_terms.art2_p1')}</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-3">{t('legal_terms.art3_title')}</h2>
              <p>{t('legal_terms.art3_p1')}</p>
              <p className="mt-2">{t('legal_terms.art3_p2')}</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-3">{t('legal_terms.art4_title')}</h2>
              <p>{t('legal_terms.art4_p1')}</p>
              <p className="mt-2">
                <TransCmp i18nKey="legal_terms.art4_p2" components={{ 1: <strong />, 3: <strong /> }} />
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-3">{t('legal_terms.art5_title')}</h2>
              <p>
                <TransCmp i18nKey="legal_terms.art5_p1" components={{ 1: <strong /> }} />
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-3">{t('legal_terms.art6_title')}</h2>
              <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-4 text-amber-900 text-sm">
                <strong>{t('legal_terms.art6_alert')}</strong>
              </div>
              <p>
                <TransCmp i18nKey="legal_terms.art6_p1" components={{ 1: <strong /> }} />
              </p>
              <p className="mt-2">
                <TransCmp i18nKey="legal_terms.art6_p2" components={{ 1: <strong /> }} />
              </p>
              <p className="mt-2 text-rose-600 font-medium bg-rose-50 p-3 rounded-lg border border-rose-100">
                <TransCmp i18nKey="legal_terms.art6_p3" components={{ 1: <strong /> }} />
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-3">{t('legal_terms.art7_title')}</h2>
              <p>{t('legal_terms.art7_p1')}</p>
              <p className="mt-2">{t('legal_terms.art7_p2')}</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-3">{t('legal_terms.art8_title')}</h2>
              <p>{t('legal_terms.art8_p1')}</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-3">{t('legal_terms.art9_title')}</h2>
              <p>
                <TransCmp i18nKey="legal_terms.art9_p1" components={{ 1: <strong /> }} />
              </p>
              <p className="mt-2">{t('legal_terms.art9_p2')}</p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-slate-200 text-center flex flex-col items-center">
            <p className="text-sm text-slate-500 mb-4">
              {t('legal_terms.last_updated', { date: new Date().toLocaleDateString(i18n.language) })}
            </p>
            <Link to="/" className="inline-flex items-center justify-center px-6 py-2.5 bg-teal-50 text-teal-700 font-medium rounded-xl hover:bg-teal-100 transition-colors">
              {t('legal_terms.back_home')}
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default TermsPage;
