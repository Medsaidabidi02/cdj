import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import Header from '../components/Header';
import { useTranslation } from 'react-i18next';

interface LoginCredentials {
  email: string;
  password: string;
}

const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, error: authError, loading: authLoading } = useAuth();
  const [credentials, setCredentials] = useState<LoginCredentials>({ email: '', password: '' });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);

  const searchParams = new URLSearchParams(location.search);
  const redirectPath = searchParams.get('redirect') || '/my-learning';

  useEffect(() => {
    const message = sessionStorage.getItem('loginMessage');
    if (message) {
      setSessionMessage(message);
      sessionStorage.removeItem('loginMessage');
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await login(credentials.email, credentials.password);
      if (result?.needsPhoneVerification && !result?.is_admin) {
        navigate('/add-phone');
        return;
      }
      if (result?.is_admin) {
        navigate('/admin');
        return;
      }
      navigate(redirectPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.login.error_default', 'Login failed. Please check your credentials.'));
    } finally {
      setLoading(false);
    }
  };

  const displayError = error || authError;
  const displayMessage = sessionMessage;

  return (
    <div className="min-h-screen bg-slate-50 relative flex flex-col font-sans">
      <Header />
      
      {/* Decorative Blob Backgrounds */}
      <div className="absolute top-1/4 left-10 w-96 h-96 bg-teal-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-pulse pointer-events-none"></div>
      <div className="absolute top-1/3 right-10 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-pulse delay-1000 pointer-events-none"></div>

      <main className="flex-1 flex items-center justify-center relative z-10 px-4 pt-20">
        <div className="w-full max-w-md animate-fade-in">
          
          <div className="bg-white rounded-2xl shadow-elegant border border-slate-100 p-8 sm:p-10">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {t('auth.login.welcome_line1', 'Welcome')} <span className="text-teal-600">{t('auth.login.welcome_line2', 'back')}</span>
              </h1>
              <p className="mt-3 text-slate-500 text-sm">
                {t('auth.login.subtitle', 'Sign in to access your courses and legal resources')}
              </p>
            </div>

            {displayMessage && (
              <div className="mb-6 p-4 rounded-xl bg-orange-50 border border-orange-200 text-orange-800 text-sm font-medium flex items-start gap-3">
                <span className="text-lg">⚠️</span>
                <span>{displayMessage}</span>
              </div>
            )}

            {displayError && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium flex items-start gap-3">
                <span className="text-lg">❌</span>
                <span>{displayError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700" htmlFor="email">
                  {t('auth.login.email_label', 'Email address')}
                </label>
                <div className="relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="input-field pl-11"
                    placeholder={t('auth.login.email_placeholder', 'your.email@example.com')}
                    value={credentials.email}
                    onChange={handleChange}
                    disabled={loading || authLoading}
                  />
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    ✉️
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700" htmlFor="password">
                  {t('auth.login.password_label', 'Password')}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="input-field pl-11"
                    placeholder="••••••••"
                    value={credentials.password}
                    onChange={handleChange}
                    disabled={loading || authLoading}
                  />
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    🔒
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || authLoading}
                className="w-full btn-primary"
              >
                {loading || authLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t('auth.login.connecting', 'Signing in...')}
                  </span>
                ) : (
                  t('auth.login.submit', 'Sign in')
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
              <div className="text-slate-500">
                {t('auth.login.new_here', 'New here?')}
              </div>
              <div className="flex gap-4 font-semibold">
                <Link to="/signup" className="text-teal-600 hover:text-teal-700 hover:underline">
                  {t('auth.login.sign_up', 'Sign up')}
                </Link>
                <span className="text-slate-300">|</span>
                <Link to="/contact" className="text-teal-600 hover:text-teal-700 hover:underline">
                  {t('auth.login.contact_us', 'Contact us')}
                </Link>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;