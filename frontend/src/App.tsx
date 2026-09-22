import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { NotificationProvider } from './lib/NotificationContext';
import { Toaster } from 'react-hot-toast';

// Components
import Loading from './components/Loading';

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
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import PricingPage from './pages/PricingPage';


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
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// Guest Route Component
const GuestRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return <Loading fullScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to="/my-learning" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Toaster position="bottom-left" reverseOrder={false} />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/cgv" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/course/:id" element={<CoursePage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/:slug" element={<BlogDetailPage />} />
          <Route path="/blog/drafts" element={<DraftsPage />} />
          <Route path="/contact" element={<ContactPage />} />

          {/* Guest Routes */}
          <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
          <Route path="/signup" element={<GuestRoute><SignupPage /></GuestRoute>} />

          {/* Protected Routes */}
          <Route path="/add-phone" element={<ProtectedRoute><PhoneVerificationPage /></ProtectedRoute>} />
          <Route path="/my-learning" element={<ProtectedRoute><MyLearningPage /></ProtectedRoute>} />
          <Route path="/inbox" element={<ProtectedRoute><InboxPage /></ProtectedRoute>} />
          <Route path="/inbox/:id" element={<ProtectedRoute><InboxDetailPage /></ProtectedRoute>} />
          <Route path="/inbox/:id/pdf" element={<ProtectedRoute><InboxViewerPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/live" element={<ProtectedRoute><LiveSessionPage /></ProtectedRoute>} />
          <Route path="/live/:sessionId" element={<ProtectedRoute><LiveSessionPage /></ProtectedRoute>} />

          {/* Admin Routes */}
          <Route path="/admin/*" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        </Routes>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;