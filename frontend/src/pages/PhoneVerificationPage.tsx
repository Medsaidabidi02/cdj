import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { api, getErrorMessage } from '../lib/api';
import Header from '../components/Header';
import { useTranslation } from 'react-i18next';

const ANIMATION_DELAY_MS = 300;
const SUCCESS_REDIRECT_DELAY_MS = 2000;
const MIN_PHONE_LENGTH = 8;

interface PhoneFormData {
  phone: string;
  phoneConfirm: string;
}

const PhoneVerificationPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState<PhoneFormData>({ phone: '', phoneConfirm: '' });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
      return;
    }
    setTimeout(() => setIsVisible(true), ANIMATION_DELAY_MS);
  }, [authLoading, isAuthenticated, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (formData.phone.trim() !== formData.phoneConfirm.trim()) {
      setError(t('phone_verification.error_mismatch', 'Phone numbers do not match'));
      setLoading(false);
      return;
    }

    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/;
    if (!phoneRegex.test(formData.phone.trim()) || formData.phone.trim().length < MIN_PHONE_LENGTH) {
      setError(t('phone_verification.error_invalid', 'Please enter a valid phone number'));
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/auth/update-phone', {
        phone: formData.phone.trim(),
        phoneConfirm: formData.phoneConfirm.trim()
      });

      if (response.success) {
        setSuccess(true);
        setTimeout(() => navigate('/my-learning'), SUCCESS_REDIRECT_DELAY_MS);
      } else {
        setError(response.message || t('phone_verification.error_default', 'Failed to update phone number'));
      }
    } catch (err) {
      console.error('Phone update error:', err);
      setError(getErrorMessage(err) || t('phone_verification.error_default', 'Failed to update phone number'));
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 relative flex flex-col font-sans">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <svg className="animate-spin h-12 w-12 text-teal-600" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 relative flex flex-col font-sans overflow-hidden">
      <Header />

      {/* Decorative Blur Backdrops */}
      <div className="absolute top-1/4 left-10 w-96 h-96 bg-teal-100 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 animate-pulse pointer-events-none"></div>
      <div className="absolute top-1/3 right-10 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 animate-pulse delay-1000 pointer-events-none"></div>

      <main className="flex-1 flex items-center justify-center relative z-10 px-4 py-24">
        <div className={`w-full max-w-md transition-all duration-700 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
          <div className="bg-white rounded-3xl shadow-elegant border border-slate-100 p-8 sm:p-10">
            
            {success ? (
              <div className="text-center py-8">
                <div className="text-6xl mb-6">✅</div>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">
                  {t('phone_verification.success_title', 'Phone Number Updated!')}
                </h2>
                <p className="text-slate-600 mb-8">
                  {t('phone_verification.success_message', 'Your phone number has been saved successfully. Redirecting...')}
                </p>
                <div className="flex justify-center">
                  <svg className="animate-spin h-8 w-8 text-teal-600" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              </div>
            ) : (
              <>
                <div className="text-center mb-10">
                  <span className="inline-block p-3 rounded-full bg-teal-50 text-teal-600 mb-4 text-3xl">📱</span>
                  <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
                    {t('phone_verification.title_line1', 'Add Your')} <span className="text-teal-600">{t('phone_verification.title_line2', 'Phone Number')}</span>
                  </h1>
                  <p className="text-slate-500 text-sm">
                    {t('phone_verification.subtitle', 'Please add your phone number to continue. Enter it twice to confirm.')}
                  </p>
                </div>

                {error && (
                  <div className="mb-6 p-4 rounded-xl bg-orange-50 border border-orange-200 text-orange-800 text-sm font-medium flex items-start gap-3 animate-shake">
                    <span className="text-lg">⚠️</span>
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} noValidate className="space-y-5">
                  <div className="space-y-1.5">
                    <label htmlFor="phone" className="block text-sm font-semibold text-slate-700">
                      {t('phone_verification.phone_label', 'Phone Number')}
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      className="input-field"
                      placeholder={t('phone_verification.phone_placeholder', '+216 XX XXX XXX')}
                      disabled={loading}
                      aria-required
                    />
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <label htmlFor="phoneConfirm" className="block text-sm font-semibold text-slate-700">
                      {t('phone_verification.phone_confirm_label', 'Confirm Phone Number')}
                    </label>
                    <input
                      type="tel"
                      id="phoneConfirm"
                      name="phoneConfirm"
                      value={formData.phoneConfirm}
                      onChange={handleChange}
                      required
                      className="input-field"
                      placeholder={t('phone_verification.phone_confirm_placeholder', '+216 XX XXX XXX')}
                      disabled={loading}
                      aria-required
                    />
                    <p className="text-xs text-slate-500 font-medium pt-1">
                      {t('phone_verification.hint', 'Please enter the same phone number in both fields')}
                    </p>
                  </div>

                  <div className="pt-4">
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
                          {t('phone_verification.saving', 'Saving...')}
                        </span>
                      ) : (
                        t('phone_verification.submit', 'Save Phone Number')
                      )}
                    </button>
                  </div>
                </form>

                <p className="mt-8 text-center text-xs font-semibold text-slate-400">
                  {t('phone_verification.why_needed', 'Your phone number is required for account security.')}
                </p>
              </>
            )}

          </div>
        </div>
      </main>
    </div>
  );
};

export default PhoneVerificationPage;
