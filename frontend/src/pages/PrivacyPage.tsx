import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import Header from '../components/Header';
import Footer from '../components/Footer';

const TransCmp = Trans as any;

const PrivacyPage: React.FC = () => {
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
            {t('legal_privacy.title')}
          </h1>

          <div className="space-y-8 text-slate-600 leading-relaxed text-lg">
            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-3">{t('legal_privacy.sec1_title')}</h2>
              <p>
                <TransCmp i18nKey="legal_privacy.sec1_p1" components={{ 1: <strong /> }} />
              </p>
              <p className="mt-2">
                <TransCmp i18nKey="legal_privacy.sec1_p2" components={{ 1: <strong /> }} />
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-3">{t('legal_privacy.sec2_title')}</h2>
              <p>{t('legal_privacy.sec2_p1')}</p>
              <ul className="list-disc pl-6 mt-2 space-y-2">
                <li><TransCmp i18nKey="legal_privacy.sec2_li1" components={{ 1: <strong /> }} /></li>
                <li><TransCmp i18nKey="legal_privacy.sec2_li2" components={{ 1: <strong /> }} /></li>
              </ul>
              
              <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-5">
                <h3 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                  {t('legal_privacy.sec2_alert')}
                </h3>
                <p className="text-amber-800 text-sm">
                  <TransCmp i18nKey="legal_privacy.sec2_p2" components={{ 1: <strong /> }} />
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-3">{t('legal_privacy.sec3_title')}</h2>
              <p>{t('legal_privacy.sec3_p1')}</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>{t('legal_privacy.sec3_li1')}</li>
                <li>{t('legal_privacy.sec3_li2')}</li>
                <li>{t('legal_privacy.sec3_li3')}</li>
                <li>{t('legal_privacy.sec3_li4')}</li>
                <li>{t('legal_privacy.sec3_li5')}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-3">{t('legal_privacy.sec4_title')}</h2>
              <p>{t('legal_privacy.sec4_p1')}</p>
              <p className="mt-2">{t('legal_privacy.sec4_p2')}</p>
              <p className="mt-2">{t('legal_privacy.sec4_p3')}</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-3">{t('legal_privacy.sec5_title')}</h2>
              <p>{t('legal_privacy.sec5_p1')}</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>{t('legal_privacy.sec5_li1')}</li>
                <li>{t('legal_privacy.sec5_li2')}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-3">{t('legal_privacy.sec6_title')}</h2>
              <p>{t('legal_privacy.sec6_p1')}</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li><TransCmp i18nKey="legal_privacy.sec6_li1" components={{ 1: <strong /> }} /></li>
                <li><TransCmp i18nKey="legal_privacy.sec6_li2" components={{ 1: <strong /> }} /></li>
              </ul>
              <p className="mt-2 text-sm text-slate-500">
                {t('legal_privacy.sec6_p2')}
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-3">{t('legal_privacy.sec7_title')}</h2>
              <p>{t('legal_privacy.sec7_p1')}</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li><TransCmp i18nKey="legal_privacy.sec7_li1" components={{ 1: <strong /> }} /></li>
                <li><TransCmp i18nKey="legal_privacy.sec7_li2" components={{ 1: <strong /> }} /></li>
                <li><TransCmp i18nKey="legal_privacy.sec7_li3" components={{ 1: <strong /> }} /></li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-3">{t('legal_privacy.sec8_title')}</h2>
              <p>{t('legal_privacy.sec8_p1')}</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>{t('legal_privacy.sec8_li1')}</li>
                <li>{t('legal_privacy.sec8_li2')}</li>
              </ul>
              <p className="mt-4 font-medium text-slate-700">
                {t('legal_privacy.sec8_p2')}
              </p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-slate-200 text-center flex flex-col items-center">
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

export default PrivacyPage;
