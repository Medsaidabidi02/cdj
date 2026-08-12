import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authService } from '../lib/auth';
import Header from '../components/Header';

interface SignupFormData {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

interface ValidationErrors {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
}

const SignupPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState<SignupFormData>({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (validationErrors[name as keyof ValidationErrors]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name as keyof ValidationErrors];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};
    
    if (!formData.name.trim()) {
      errors.name = t('auth.signup.error_name_required', 'Name is required');
    } else if (formData.name.trim().length < 2) {
      errors.name = t('auth.signup.error_name_too_short', 'Name must be at least 2 characters');
    }
    
    if (!formData.email.trim()) {
      errors.email = t('auth.signup.error_email_required', 'Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = t('auth.signup.error_email_invalid', 'Please enter a valid email address');
    }

    if (formData.phone.trim() && !/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/.test(formData.phone.trim())) {
      errors.phone = t('auth.signup.error_phone_invalid', 'Please enter a valid phone number');
    }
    
    if (!formData.password) {
      errors.password = t('auth.signup.error_password_required', 'Password is required');
    } else if (formData.password.length < 6) {
      errors.password = t('auth.signup.error_password_too_short', 'Password must be at least 6 characters');
    }
    
    if (!formData.confirmPassword) {
      errors.confirmPassword = t('auth.signup.error_confirm_password_required', 'Please confirm your password');
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = t('auth.signup.error_passwords_dont_match', 'Passwords do not match');
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!validateForm()) return;
    
    setLoading(true);

    try {
      const response = await authService.register({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        password: formData.password
      });

      if (response.success) {
        setSuccess(true);
        setTimeout(() => navigate('/login'), 3000);
      }
    } catch (err: any) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError(t('auth.signup.error_default', 'Registration failed. Please try again.'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 relative flex flex-col font-sans overflow-hidden">
      <Header />
      
      {/* Decorative Blob Backgrounds */}
      <div className="absolute top-1/4 left-10 w-96 h-96 bg-teal-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-pulse pointer-events-none"></div>
      <div className="absolute top-1/3 right-10 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-pulse delay-1000 pointer-events-none"></div>

      <main className="flex-1 flex items-center justify-center relative z-10 px-4 py-24">
        <div className="w-full max-w-lg animate-fade-in">
          
          <div className="bg-white rounded-2xl shadow-elegant border border-slate-100 p-8 sm:p-10">
            <div className="text-center mb-8">
              <span className="inline-block p-3 rounded-full bg-teal-50 text-teal-600 mb-4 text-2xl">📝</span>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {t('auth.signup.create_account_line1', 'Create your')} <span className="text-teal-600">{t('auth.signup.create_account_line2', 'account')}</span>
              </h1>
              <p className="mt-3 text-slate-500 text-sm">
                {t('auth.signup.subtitle', 'Join us to access premium legal education courses')}
              </p>
            </div>

            {success ? (
              <div className="text-center space-y-4 py-8">
                <div className="mx-auto w-16 h-16 bg-teal-100 text-teal-600 flex items-center justify-center rounded-full text-3xl mb-4">
                  ✓
                </div>
                <h3 className="text-xl font-bold text-slate-900">{t('auth.signup.success_title', 'Registration Successful!')}</h3>
                <p className="text-slate-600 px-4">{t('auth.signup.success_message', 'Your account has been created. Please wait for admin approval before logging in.')}</p>
                <p className="text-teal-600 font-medium animate-pulse">{t('auth.signup.redirecting', 'Redirecting to login page...')}</p>
              </div>
            ) : (
              <>
                {error && (
                  <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium flex items-start gap-3">
                    <span className="text-lg">❌</span>
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-slate-700" htmlFor="name">
                      {t('auth.signup.name_label', 'Full Name')}
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      className={`input-field ${validationErrors.name ? 'border-red-300 focus:ring-red-500' : ''}`}
                      placeholder={t('auth.signup.name_placeholder', 'Nom et Prénom')}
                      value={formData.name}
                      onChange={handleChange}
                      disabled={loading}
                    />
                    {validationErrors.name && <p className="text-red-500 text-xs mt-1">{validationErrors.name}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-slate-700" htmlFor="email">
                      {t('auth.signup.email_label', 'Email Address')}
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      className={`input-field ${validationErrors.email ? 'border-red-300 focus:ring-red-500' : ''}`}
                      value={formData.email}
                      onChange={handleChange}
                      disabled={loading}
                    />
                    {validationErrors.email && <p className="text-red-500 text-xs mt-1">{validationErrors.email}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-slate-700" htmlFor="phone">
                      {t('auth.signup.phone_label', 'Phone Number')}
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      className={`input-field ${validationErrors.phone ? 'border-red-300 focus:ring-red-500' : ''}`}
                      value={formData.phone}
                      onChange={handleChange}
                      disabled={loading}
                    />
                    {validationErrors.phone && <p className="text-red-500 text-xs mt-1">{validationErrors.phone}</p>}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-sm font-semibold text-slate-700" htmlFor="password">
                        {t('auth.signup.password_label', 'Password')}
                      </label>
                      <input
                        type="password"
                        id="password"
                        name="password"
                        className={`input-field ${validationErrors.password ? 'border-red-300 focus:ring-red-500' : ''}`}
                        value={formData.password}
                        onChange={handleChange}
                        disabled={loading}
                      />
                      {validationErrors.password && <p className="text-red-500 text-xs mt-1">{validationErrors.password}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-sm font-semibold text-slate-700" htmlFor="confirmPassword">
                        {t('auth.signup.confirm_password_label', 'Confirm Password')}
                      </label>
                      <input
                        type="password"
                        id="confirmPassword"
                        name="confirmPassword"
                        className={`input-field ${validationErrors.confirmPassword ? 'border-red-300 focus:ring-red-500' : ''}`}
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        disabled={loading}
                      />
                      {validationErrors.confirmPassword && <p className="text-red-500 text-xs mt-1">{validationErrors.confirmPassword}</p>}
                    </div>
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
                          {t('auth.signup.creating', 'Creating account...')}
                        </span>
                      ) : (
                        t('auth.signup.submit', 'Create Account')
                      )}
                    </button>
                  </div>
                </form>

                <div className="mt-8 pt-6 border-t border-slate-100 text-center text-sm">
                  <span className="text-slate-500">{t('auth.signup.have_account', 'Already have an account?')} </span>
                  <Link to="/login" className="text-teal-600 font-semibold hover:text-teal-700 hover:underline">
                    {t('auth.signup.sign_in', 'Sign in')}
                  </Link>
                </div>
              </>
            )}

          </div>
        </div>
      </main>
    </div>
  );
};

export default SignupPage;
