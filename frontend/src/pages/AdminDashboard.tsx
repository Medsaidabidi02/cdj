import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { api, getErrorMessage } from '../lib/api';
import BlogManagement from '../components/admin/BlogManagement';
import VideoManagement from '../components/admin/VideoManagement';
import CourseManagement from '../components/admin/CourseManagement';
import UserManagement from '../components/admin/UserManagement';
import InboxManagement from '../components/admin/InboxManagement';
import { User } from '../types';
import '../styles/AdminDashboard.css';

const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'courses' | 'blog' | 'videos' | 'users' | 'inbox' | 'settings'>('courses');
  const [loading, setLoading] = useState(true);

  // stats (keep local)
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPosts: 0,
    totalVideos: 0,
    totalCourses: 0,
    totalSubjects: 0,
    pendingApprovals: 0,
    activeUsers: 0
  });

  // users state
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
  }, [activeTab]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // attempt to fetch stats (safe)
      try {
        const videoData: any = await api.get('/videos/admin/stats');
        setStats(prev => ({ ...prev, totalVideos: videoData?.total_videos ?? prev.totalVideos }));
      } catch (e) { /* ignore */ }
      try {
        const blogData: any = await api.get('/blog/admin/stats');
        setStats(prev => ({ ...prev, totalPosts: blogData?.stats?.total_posts ?? prev.totalPosts }));
      } catch (e) { /* ignore */ }
      // courses
      try {
        const courseData: any = await api.get('/courses');
        if (Array.isArray(courseData)) setStats(prev => ({ ...prev, totalCourses: courseData.length }));
      } catch (e) { /* ignore */ }

      // placeholder minimal values when missing
      setStats(prev => ({ 
        ...prev, 
        totalUsers: prev.totalUsers || 156, 
        pendingApprovals: prev.pendingApprovals || 12, 
        activeUsers: prev.activeUsers || 89,
        totalSubjects: prev.totalSubjects || 18
      }));
    } catch (error) {
      console.error('Error fetching dashboard data', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      console.log('👥 Fetching users for Medsaidabidi02...');
      
      const res: any = await api.get('/users');
      console.log('✅ Users response for Medsaidabidi02:', res);
      
      if (res && res.success && Array.isArray(res.users)) {
        // ✅ FIXED: Ensure all users have required properties including is_logged_in
        const normalizedUsers = res.users.map((user: any) => ({
          id: user.id,
          name: user.name || 'Nom inconnu',
          email: user.email || 'Email inconnu',
          is_admin: user.is_admin !== undefined ? user.is_admin : false,
          is_approved: user.is_approved !== undefined ? user.is_approved : false,
          is_logged_in: user.is_logged_in !== undefined ? Boolean(user.is_logged_in) : false,
          created_at: user.created_at || new Date().toISOString(),
          updated_at: user.updated_at || new Date().toISOString()
        }));
        
        setUsers(normalizedUsers);
        const pending = normalizedUsers.filter((u: User) => !u.is_approved).length;
        setStats(prev => ({ 
          ...prev, 
          totalUsers: normalizedUsers.length, 
          pendingApprovals: pending 
        }));
        
        console.log(`✅ Loaded ${normalizedUsers.length} users for Medsaidabidi02`);
      } else if (Array.isArray(res)) {
        // Handle direct array response
        const normalizedUsers = res.map((user: any) => ({
          id: user.id,
          name: user.name || 'Nom inconnu',
          email: user.email || 'Email inconnu',
          is_admin: user.is_admin !== undefined ? user.is_admin : false,
          is_approved: user.is_approved !== undefined ? user.is_approved : false,
          is_logged_in: user.is_logged_in !== undefined ? Boolean(user.is_logged_in) : false,
          created_at: user.created_at || new Date().toISOString(),
          updated_at: user.updated_at || new Date().toISOString()
        }));
        
        setUsers(normalizedUsers);
        console.log(`✅ Loaded ${normalizedUsers.length} users (direct array) for Medsaidabidi02`);
      } else {
        console.warn('⚠️ Unexpected users response for Medsaidabidi02:', res);
        setUsers([]);
      }
    } catch (error) {
      console.error('❌ Error fetching users for Medsaidabidi02:', error);
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  // Helpers
  const generateEmailFromName = (name: string) => {
    const base = name.toLowerCase().trim().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
    const suffix = Math.floor(100 + Math.random() * 900);
    return `${base}.${suffix}@cliniquejuristes.com`;
  };
  const generatePassword = () => Math.random().toString(36).slice(-8) + 'A!';

  // Handlers
  const handleCreateUser = async (payload: Omit<User, 'id' | 'created_at' | 'updated_at'> & { password?: string }) => {
    try {
      const name = payload.name;
      const email = payload.email && payload.email.trim() !== '' ? payload.email : generateEmailFromName(name);
      const password = payload.password && payload.password.trim() !== '' ? payload.password : generatePassword();
      const body = { 
        name, 
        email, 
        password, 
        isAdmin: payload.is_admin ?? false, 
        isApproved: payload.is_approved ?? false 
      };
      
      console.log('➕ Creating user for Medsaidabidi02 at 2025-09-09 18:18:36:', body);
      
      const res: any = await api.post('/users/create', body);
      
      console.log('✅ User creation response for Medsaidabidi02:', res);
      
      if (res && res.success) {
        // Show success message immediately
        const credentials = res.credentials || { email, password };
        alert(`✅ Utilisateur créé avec succès \n\nNom: ${name}\nEmail: ${credentials.email}\nMot de passe: ${credentials.password}\nStatut: ${payload.is_approved ? 'Approuvé' : 'En attente'}\n\nL'utilisateur peut maintenant se connecter.`);
        
        // ✅ SIMPLIFIED APPROACH: Just refresh the users list instead of trying to add manually
        console.log('🔄 Refreshing users list after creation for Medsaidabidi02');
        await fetchUsers(); // This will fetch the updated list including the new user
        
      } else {
        console.error('❌ User creation failed for Medsaidabidi02:', res);
        alert('❌ Erreur lors de la création de l\'utilisateur');
      }
    } catch (error) {
      console.error('❌ Error creating user for Medsaidabidi02:', error);
      alert(`❌ Erreur: ${getErrorMessage(error)}`);
    }
  };

  const handleApproveUser = async (userId: number) => {
    try {
      const res: any = await api.put(`/users/${userId}/approve`, {});
      if (res && res.success) {
        setUsers(prev => prev.map(u => (u.id === userId ? { ...u, is_approved: true } : u)));
        setStats(prev => ({ ...prev, pendingApprovals: Math.max(0, prev.pendingApprovals - 1) }));
        alert('Utilisateur approuvé');
      } else {
        alert('Erreur lors de l\'approbation');
      }
    } catch (error) {
      console.error('Approve error:', error);
      alert(getErrorMessage(error));
    }
  };

  const handleEditUser = async (userId: number, updates: Partial<User>) => {
    try {
      const body: any = {};
      if (updates.name !== undefined) body.name = updates.name;
      if (updates.email !== undefined) body.email = updates.email;
      if ((updates as any).is_admin !== undefined) body.isAdmin = (updates as any).is_admin;
      if ((updates as any).is_approved !== undefined) body.isApproved = (updates as any).is_approved;

      const res: any = await api.put(`/users/${userId}`, body);
      if (res && res.success) {
        setUsers(prev => prev.map(u => (u.id === userId ? { ...u, ...res.user } : u)));
        alert('Utilisateur mis à jour');
      } else {
        alert('Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error('Update user error:', error);
      alert(getErrorMessage(error));
    }
  };

  const handleDeleteUser = async (userId: number) => {
    try {
      const res: any = await api.delete(`/users/${userId}`);
      if (res && res.success) {
        setUsers(prev => prev.filter(u => u.id !== userId));
        setStats(prev => ({ ...prev, totalUsers: Math.max(0, prev.totalUsers - 1) }));
        alert('Utilisateur supprimé');
      } else {
        alert('Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Delete user error:', error);
      alert(getErrorMessage(error));
    }
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="admin-loading-content">
          <div className="admin-loading-spinner"></div>
          <div className="admin-loading-text">Chargement du tableau de bord...</div>
        </div>
      </div>
    );
  }

  const tabItems = [
    { id: 'courses', label: 'Cours', icon: '📚' },
    { id: 'videos', label: 'Vidéos', icon: '🎥' },
    { id: 'blog', label: 'Blog', icon: '📝' },
    { id: 'users', label: 'Utilisateurs', icon: '👥' },
    { id: 'inbox', label: 'Inbox', icon: '📬' }
  ];

  return (
    <div className="admin-dashboard-container">
      {/* Professional Header */}
      <header className="admin-header">
        <div className="admin-header-content">
          <div className="admin-logo-section">
            <img 
              src="/images/logo.png" 
              alt="Clinique Juriste" 
              className="admin-logo"
            />
            <div className="admin-title-section">
              <h1>Administration</h1>
              <p>Clinique des Juristes</p>
            </div>
          </div>

          <div className="admin-user-section">
            <div className="admin-user-info">
              <p className="admin-user-name">{user?.name || 'Administrateur'}</p>
            </div>
            <button onClick={logout} className="admin-logout-btn">
              <span>↗</span>
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

      <div className="admin-main-content">
        {/* Professional Navigation */}
        <div className="admin-nav-container">
          <nav className="admin-nav-tabs">
            {tabItems.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`admin-nav-tab ${activeTab === tab.id ? 'active' : ''}`}
              >
                <span className="admin-nav-tab-icon">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Course Management */}
        {activeTab === 'courses' && (
          <div className="admin-content-section">
            <div className="admin-section-header">
              <h2 className="admin-section-title">Gestion des cours</h2>
              <p className="admin-section-subtitle">
                Créer, modifier et organiser le contenu pédagogique
              </p>
            </div>
            <div className="admin-section-content">
              <CourseManagement />
            </div>
          </div>
        )}

        {/* Blog Management */}
        {activeTab === 'blog' && (
          <div className="admin-content-section">
            <div className="admin-section-header">
              <h2 className="admin-section-title">Gestion du blog</h2>
              <p className="admin-section-subtitle">
                Publier et gérer les articles et actualités juridiques
              </p>
            </div>
            <div className="admin-section-content">
              <BlogManagement />
            </div>
          </div>
        )}

        {/* Video Management */}
        {activeTab === 'videos' && (
          <div className="admin-content-section">
            <div className="admin-section-header">
              <h2 className="admin-section-title">Gestion des vidéos</h2>
              <p className="admin-section-subtitle">
                Télécharger et organiser le contenu vidéo éducatif
              </p>
            </div>
            <div className="admin-section-content">
              <VideoManagement />
            </div>
          </div>
        )}

        {/* User Management */}
        {activeTab === 'users' && (
          <div className="admin-content-section">
            <div className="admin-section-header">
              <h2 className="admin-section-title">Gestion des utilisateurs</h2>
              <p className="admin-section-subtitle">
                Administrer les comptes étudiants et permissions
              </p>
            </div>
            <div className="admin-section-content">
              <UserManagement 
                users={users} 
                onCreateUser={handleCreateUser} 
                onApproveUser={handleApproveUser} 
                onEditUser={handleEditUser} 
                onDeleteUser={handleDeleteUser} 
              />
            </div>
          </div>
        )}

        {/* Inbox Management */}
        {activeTab === 'inbox' && (
          <div className="admin-content-section">
            <div className="admin-section-header">
              <h2 className="admin-section-title">Gestion de l'Inbox</h2>
              <p className="admin-section-subtitle">
                Envoyer des messages privés et documents PDF aux étudiants
              </p>
            </div>
            <div className="admin-section-content">
              <InboxManagement />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;