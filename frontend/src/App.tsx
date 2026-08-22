import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { NotificationProvider } from './lib/NotificationContext';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence } from 'framer-motion';

// Components
import Loading from './components/Loading';
import { PageTransition } from './components/ui/PageTransition';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import PhoneVerificationPage from './pages/PhoneVerificationPage';
import BlogPage from './pages/BlogPage';
import BlogDetailPage from './pages/BlogDetailPage';
import CoursesPage from './pages/CoursesPage';
import CoursePage from './pages/CoursePage';
import MyLearningPage from './pages/MyLearningPage';
import ContactPage from './pages/ContactPage';
import AdminDashboard from './pages/AdminDashboard';
import DraftsPage from './pages/DraftPage';
import InboxPage from './pages/InboxPage';
import InboxDetailPage from './pages/InboxDetailPage';
import InboxViewerPage from './pages/InboxViewerPage';
import ProfilePage from './pages/ProfilePage';
import LiveSessionPage from './pages/LiveSessionPage';


// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { loading, isAuthenticated } = useAuth();
  const { t } = useTranslation();

  if (loading) {
    return <Loading fullScreen text={t('auth.checking_auth', 'Checking authentication...')} />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Admin Route Component
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { loading, isAuthenticated, user } = useAuth();
  const { t } = useTranslation();

  if (loading) {
    return <Loading fullScreen text={t('auth.checking_admin', 'Checking admin rights...')} />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!user?.is_admin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            {t('user.access_denied', 'Access Denied')}
          </h1>
          <p className="text-gray-600 mb-6">
            {t('user.no_permission', 'You don\'t have permission to access this page.')}
          </p>
          <button 
            onClick={() => window.location.href = '/'} 
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded transition"
          >
            {t('user.return_home', 'Return to Home')}
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// Guest Route Component
const GuestRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { loading, isAuthenticated, user } = useAuth();

  if (loading) {
    return <Loading fullScreen />;
  }

  if (isAuthenticated) {
    if (user?.is_admin) {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

function App() {
  const location = useLocation();
  return (
    <AuthProvider>
      <NotificationProvider>
        <Toaster position="bottom-left" reverseOrder={false} />
        <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
        {/* Public Routes */}
        <Route path="/" element={<PageTransition><HomePage /></PageTransition>} />
        <Route path="/courses" element={<PageTransition><CoursesPage /></PageTransition>} />
        <Route path="/course/:id" element={<PageTransition><CoursePage /></PageTransition>} />
        <Route path="/blog" element={<PageTransition><BlogPage /></PageTransition>} />
        <Route path="/blog/:slug" element={<PageTransition><BlogDetailPage /></PageTransition>} />
        <Route path="/blog/drafts" element={<PageTransition><DraftsPage /></PageTransition>} />
        <Route path="/contact" element={<PageTransition><ContactPage /></PageTransition>} />

        {/* Guest Routes */}
        <Route path="/login" element={<PageTransition><GuestRoute><LoginPage /></GuestRoute></PageTransition>} />
        <Route path="/signup" element={<PageTransition><GuestRoute><SignupPage /></GuestRoute></PageTransition>} />

        {/* Protected Routes */}
        <Route path="/add-phone" element={<PageTransition><ProtectedRoute><PhoneVerificationPage /></ProtectedRoute></PageTransition>} />
        <Route path="/my-learning" element={<PageTransition><ProtectedRoute><MyLearningPage /></ProtectedRoute></PageTransition>} />
        <Route path="/inbox" element={<PageTransition><ProtectedRoute><InboxPage /></ProtectedRoute></PageTransition>} />
        <Route path="/inbox/:id" element={<PageTransition><ProtectedRoute><InboxDetailPage /></ProtectedRoute></PageTransition>} />
        <Route path="/inbox/:id/pdf" element={<PageTransition><ProtectedRoute><InboxViewerPage /></ProtectedRoute></PageTransition>} />
        <Route path="/profile" element={<PageTransition><ProtectedRoute><ProfilePage /></ProtectedRoute></PageTransition>} />
        <Route path="/live" element={<PageTransition><ProtectedRoute><LiveSessionPage /></ProtectedRoute></PageTransition>} />
        <Route path="/live/:sessionId" element={<PageTransition><ProtectedRoute><LiveSessionPage /></ProtectedRoute></PageTransition>} />


        {/* Admin Routes */}
        <Route path="/admin/*" element={<PageTransition><AdminRoute><AdminDashboard /></AdminRoute></PageTransition>} />
      </Routes>
        </AnimatePresence>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;