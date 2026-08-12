import React, { useState } from 'react';
import { ContactForm } from '../types';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useTranslation } from 'react-i18next';

const ContactPage: React.FC = () => {
  const { t } = useTranslation();
  const [form, setForm] = useState<ContactForm>({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string>('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(t('contact.service_unavailable', 'Contact form is currently unavailable. Please contact us directly at cliniquedesjuristes@gmail.com'));
  };

  const handleChange = (field: keyof ContactForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans">
        <Header />
        <div className="flex-1 flex items-center justify-center pt-32 px-4 pb-16">
          <div className="bg-white rounded-2xl shadow-elegant border border-slate-100 p-10 max-w-lg text-center">
            <div className="w-20 h-20 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 mb-4">
              {t('contact.success_title', 'Message sent!')}
            </h2>
            <p className="text-slate-600 mb-8 max-w-sm mx-auto">
              {t('contact.success_message', 'Thank you for your message. Our team will reply as soon as possible.')}
            </p>
            <button
              onClick={() => setSuccess(false)}
              className="btn-primary w-full shadow-md"
            >
              {t('contact.success_send_another', 'Send another message')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 relative font-sans overflow-hidden">
      <Header />

      {/* Decorative Blob Backgrounds */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-teal-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse pointer-events-none"></div>
      <div className="absolute top-40 right-10 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse delay-1000 pointer-events-none"></div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20 relative z-10">
        
        <div className="text-center max-w-3xl mx-auto mb-16 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
            {t('contact.hero_title', 'Contact Us')}
          </h1>
          <p className="text-lg text-slate-600">
            {t('contact.hero_description', "Our team is here to support your legal learning journey. Don't hesitate to ask us anything.")}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-8 bg-white rounded-3xl shadow-elegant border border-slate-100 p-6 sm:p-10 animate-slide-up">
          
          {/* Left Side: Contact Information */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">
                {t('contact.info_title', 'Contact information')}
              </h2>
            </div>
            
            <div className="space-y-6">
              {/* Email */}
              <div className="group flex items-start p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-teal-200 hover:bg-teal-50 transition-colors">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-teal-600 shadow-sm mr-4 flex-shrink-0 group-hover:scale-110 transition-transform">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2"/>
                    <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{t('contact.method_email.title', 'Email')}</h3>
                  <p className="text-sm text-slate-500 mb-1">{t('contact.method_email.desc', 'Send us a message')}</p>
                  <p className="text-teal-700 font-semibold select-all">cliniquedesjuristes@gmail.com</p>
                </div>
              </div>

              {/* Phone */}
              <div className="group flex items-start p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-teal-200 hover:bg-teal-50 transition-colors">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-teal-600 shadow-sm mr-4 flex-shrink-0 group-hover:scale-110 transition-transform">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{t('contact.method_phone.title', 'Phone')}</h3>
                  <p className="text-sm text-slate-500 mb-1">{t('contact.method_phone.desc', 'Call us directly')}</p>
                  <p className="text-teal-700 font-semibold select-all" dir="ltr">+216 56 614 717</p>
                </div>
              </div>

              {/* Address */}
              <div className="group flex items-start p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-teal-200 hover:bg-teal-50 transition-colors">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-teal-600 shadow-sm mr-4 flex-shrink-0 group-hover:scale-110 transition-transform">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{t('contact.method_address.title', 'Address')}</h3>
                  <p className="text-sm text-slate-500 mb-1">{t('contact.method_address.desc', 'Visit our offices')}</p>
                  <p className="text-teal-700 font-semibold">{t('contact.method_address.detail', '5 rue 20 mars, Tunis 1006, Tunisie')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Contact Form */}
          <div className="lg:col-span-3">
            <div className="bg-slate-50/50 rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-sm h-full">
              <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                <h2 className="sr-only">{t('contact.form_heading', 'Contact form')}</h2>

                {error && (
                  <div className="p-4 rounded-xl bg-orange-50 border border-orange-200 text-orange-800 text-sm font-medium flex items-start gap-3">
                    <span className="text-lg mt-0.5">⚠️</span>
                    <span>{error}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label htmlFor="name" className="block text-sm font-semibold text-slate-700">
                      {t('contact.form.name_label', 'Full name')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      required
                      value={form.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      className="input-field"
                      placeholder={t('contact.form.name_placeholder', 'Your full name')}
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="email" className="block text-sm font-semibold text-slate-700">
                      {t('contact.form.email_label', 'Email address')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      required
                      value={form.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      className="input-field"
                      placeholder={t('contact.form.email_placeholder', 'your@email.com')}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="message" className="block text-sm font-semibold text-slate-700">
                    {t('contact.form.message_label', 'Your message')} <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="message"
                    required
                    rows={6}
                    value={form.message}
                    onChange={(e) => handleChange('message', e.target.value)}
                    className="input-field resize-none"
                    placeholder={t('contact.form.message_placeholder', 'Describe your request in detail...')}
                    disabled={loading}
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full btn-primary"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {t('contact.form.sending', 'Sending...')}
                      </span>
                    ) : (
                      t('contact.form.submit', 'Send message')
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ContactPage;