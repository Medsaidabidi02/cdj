import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import ManageUserCourses from './ManageUserCourses';
import ConfirmDialog from '../ui/ConfirmDialog';
import { api, getErrorMessage } from '../../lib/api';

interface Course {
  id: number;
  title: string;
}

interface UserManagementProps {
  users: User[];
  onCreateUser: (user: Omit<User, 'id' | 'created_at' | 'updated_at'>) => void;
  onApproveUser: (userId: number) => void;
  onEditUser: (userId: number, updates: Partial<User>) => void;
  onDeleteUser: (userId: number) => void;
  onRefresh?: () => void;
}

const UserManagement: React.FC<UserManagementProps> = ({
  users = [], // ✅ FIXED: Add default empty array
  onCreateUser,
  onApproveUser,
  onEditUser,
  onDeleteUser,
  onRefresh
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'approved' | 'pending'>('all');
  const [filterLoginStatus, setFilterLoginStatus] = useState<'all' | 'logged_in' | 'logged_out'>('all');

  // Course filter state
  const [courses, setCourses] = useState<Course[]>([]);
  const [filterCourseId, setFilterCourseId] = useState<number | 'all'>('all');
  const [courseEnrolledUserIds, setCourseEnrolledUserIds] = useState<number[]>([]);

  const [manageCoursesOpen, setManageCoursesOpen] = useState(false);
  const [manageUserId, setManageUserId] = useState<number | null>(null);

  // confirmation modal state for delete
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteUserId, setPendingDeleteUserId] = useState<number | null>(null);

  // User details modal state
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsUser, setDetailsUser] = useState<User | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Change password modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordUser, setPasswordUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Force logout confirmation state
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [pendingLogoutUserId, setPendingLogoutUserId] = useState<number | null>(null);
  const [logoutLoading, setLogoutLoading] = useState(false);

  // Logout all users confirmation state
  const [showLogoutAllConfirm, setShowLogoutAllConfirm] = useState(false);
  const [logoutAllLoading, setLogoutAllLoading] = useState(false);

  // Fetch courses on mount
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await api.get('/courses');
        if (Array.isArray(res)) {
          setCourses(res.map((c: { id: number; title: string }) => ({ id: c.id, title: c.title })));
        }
      } catch (error) {
        console.error('Error fetching courses:', error);
      }
    };
    fetchCourses();
  }, []);

  // Fetch enrolled users when course filter changes
  useEffect(() => {
    const fetchEnrolledUsers = async () => {
      if (filterCourseId === 'all') {
        setCourseEnrolledUserIds([]);
        return;
      }
      try {
        const res = await api.get(`/user-courses/course/${filterCourseId}`) as { success?: boolean; userIds?: number[] };
        if (res && res.success && Array.isArray(res.userIds)) {
          setCourseEnrolledUserIds(res.userIds);
        } else {
          setCourseEnrolledUserIds([]);
        }
      } catch (error) {
        console.error('Error fetching enrolled users:', error);
        setCourseEnrolledUserIds([]);
      }
    };
    fetchEnrolledUsers();
  }, [filterCourseId]);

  // Create User Form State
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    is_admin: false,
    is_approved: true
  });

  // Edit User Form State
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    is_admin: false,
    is_approved: true
  });

  // ✅ FIXED: Add safety checks for users array and user properties
  const safeUsers = Array.isArray(users) ? users : [];
  
  const filteredUsers = safeUsers.filter(user => {
    // ✅ FIXED: Add safety checks for user properties
    if (!user || typeof user !== 'object') return false;
    
    const userName = user.name || '';
    const userEmail = user.email || '';
    const userIsApproved = user.is_approved !== undefined ? user.is_approved : false;
    const userIsLoggedIn = user.is_logged_in !== undefined ? user.is_logged_in : false;
    
    const matchesSearch = userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         userEmail.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' ||
                         (filterStatus === 'approved' && userIsApproved) ||
                         (filterStatus === 'pending' && !userIsApproved);

    const matchesLoginStatus = filterLoginStatus === 'all' ||
                              (filterLoginStatus === 'logged_in' && userIsLoggedIn) ||
                              (filterLoginStatus === 'logged_out' && !userIsLoggedIn);

    // Course filter: if a course is selected, only show users enrolled in that course
    const matchesCourse = filterCourseId === 'all' || courseEnrolledUserIds.includes(user.id);

    return matchesSearch && matchesStatus && matchesLoginStatus && matchesCourse;
  });

  // ✅ FIXED: Add safety check for pendingUsers
  const pendingUsers = safeUsers.filter(user => 
    user && typeof user === 'object' && user.is_approved === false
  );

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      onCreateUser(createForm);
      setCreateForm({ name: '', email: '', password: '', is_admin: false, is_approved: true });
      setShowCreateModal(false);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('❌ Error creating user for Medsaidabidi02:', error);
      alert('Erreur lors de la création de l\'utilisateur');
    }
  };

  const handleEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedUser && selectedUser.id) {
        onEditUser(selectedUser.id, editForm);
        setShowEditModal(false);
        setSelectedUser(null);
        if (onRefresh) onRefresh();
      }
    } catch (error) {
      console.error('❌ Error editing user for Medsaidabidi02:', error);
      alert('Erreur lors de la modification de l\'utilisateur');
    }
  };

  const openEditModal = (user: User) => {
    // ✅ FIXED: Add safety checks for user properties
    if (!user || typeof user !== 'object') {
      console.error('❌ Invalid user object for editing:', user);
      return;
    }
    
    setSelectedUser(user);
    setEditForm({
      name: user.name || '',
      email: user.email || '',
      is_admin: user.is_admin || false,
      is_approved: user.is_approved !== undefined ? user.is_approved : false
    });
    setShowEditModal(true);
  };

  const openManageCourses = (userId: number) => {
    setManageUserId(userId);
    setManageCoursesOpen(true);
  };

  const requestDelete = (userId: number) => {
    setPendingDeleteUserId(userId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    try {
      if (pendingDeleteUserId !== null) {
        onDeleteUser(pendingDeleteUserId);
        if (onRefresh) onRefresh();
      }
    } catch (error) {
      console.error('❌ Error deleting user for Medsaidabidi02:', error);
      alert('Erreur lors de la suppression de l\'utilisateur');
    } finally {
      setShowDeleteConfirm(false);
      setPendingDeleteUserId(null);
    }
  };

  // View user details handler
  const openUserDetails = async (userId: number) => {
    try {
      setDetailsLoading(true);
      console.log(`🔍 Fetching details for user ${userId}`);
      
      const res: any = await api.get(`/users/${userId}/details`);
      
      if (res && res.success && res.user) {
        setDetailsUser(res.user);
        setShowDetailsModal(true);
      } else {
        alert('Erreur lors de la récupération des détails utilisateur');
      }
    } catch (error) {
      console.error('❌ Error fetching user details:', error);
      alert(getErrorMessage(error));
    } finally {
      setDetailsLoading(false);
    }
  };

  // Open change password modal
  const openPasswordModal = (user: User) => {
    setPasswordUser(user);
    setNewPassword('');
    setShowPasswordModal(true);
  };

  // Handle password update
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordUser || !newPassword) return;

    try {
      setPasswordLoading(true);
      console.log(`🔑 Updating password for user ${passwordUser.id}`);
      
      const res: any = await api.post(`/users/${passwordUser.id}/update-password`, { newPassword });
      
      if (res && res.success) {
        alert('✅ Mot de passe mis à jour avec succès');
        setShowPasswordModal(false);
        setPasswordUser(null);
        setNewPassword('');
        if (onRefresh) onRefresh();
      } else {
        alert('Erreur lors de la mise à jour du mot de passe');
      }
    } catch (error) {
      console.error('❌ Error updating password:', error);
      alert(getErrorMessage(error));
    } finally {
      setPasswordLoading(false);
    }
  };

  // Request force logout
  const requestForceLogout = (userId: number) => {
    setPendingLogoutUserId(userId);
    setShowLogoutConfirm(true);
  };

  // Confirm force logout (single user)
  const confirmForceLogout = async () => {
    if (pendingLogoutUserId === null) return;

    try {
      setLogoutLoading(true);
      console.log(`🚪 Forcing logout for user ${pendingLogoutUserId}`);
      
      const res: any = await api.post(`/users/${pendingLogoutUserId}/force-logout`, {});
      
      if (res && res.success) {
        alert('✅ Utilisateur déconnecté avec succès');
        if (onRefresh) onRefresh();
      } else {
        alert('Erreur lors de la déconnexion de l\'utilisateur');
      }
    } catch (error) {
      console.error('❌ Error forcing logout:', error);
      alert(getErrorMessage(error));
    } finally {
      setLogoutLoading(false);
      setShowLogoutConfirm(false);
      setPendingLogoutUserId(null);
    }
  };

  // Confirm logout ALL users
  const confirmLogoutAll = async () => {
    try {
      setLogoutAllLoading(true);
      console.log('🚪 Forcing logout for ALL users');

      const res: any = await api.post('/users/logout-all', {});

      if (res && res.success) {
        alert(`✅ ${res.message}`);
        if (onRefresh) onRefresh();
      } else {
        alert('Erreur lors de la déconnexion de tous les utilisateurs');
      }
    } catch (error) {
      console.error('❌ Error forcing logout-all:', error);
      alert(getErrorMessage(error));
    } finally {
      setLogoutAllLoading(false);
      setShowLogoutAllConfirm(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return 'Date inconnue';
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('❌ Error formatting date for Medsaidabidi02:', error);
      return 'Date invalide';
    }
  };

  // ✅ FIXED: Add loading state for when users is undefined
  if (!Array.isArray(users)) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des utilisateurs...</p>
        </div>
      </div>
    );
  }

  console.log('👥 UserManagement rendered for Medsaidabidi02 at 2025-09-09 17:57:00', {
    totalUsers: safeUsers.length,
    filteredUsers: filteredUsers.length,
    pendingUsers: pendingUsers.length
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestion des Utilisateurs</h2>
          <p className="text-gray-600">Créez, approuvez et gérez les comptes utilisateurs</p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setShowLogoutAllConfirm(true)}
            className="flex items-center px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
            title="Déconnecter tous les utilisateurs connectés"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Déconnecter tous
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Créer Utilisateur
          </button>
        </div>
      </div>

      {/* Pending Approvals Alert */}
      {pendingUsers.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <h3 className="text-yellow-800 font-medium">
                {pendingUsers.length} utilisateur{pendingUsers.length > 1 ? 's' : ''} en attente d'approbation
              </h3>
              <p className="text-yellow-700 text-sm">
                Vérifiez et approuvez les nouveaux comptes ci-dessous.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              placeholder="Rechercher un utilisateur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
        
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">Tous les statuts</option>
          <option value="approved">Approuvés</option>
          <option value="pending">En attente</option>
        </select>

        <select
          value={filterLoginStatus}
          onChange={(e) => setFilterLoginStatus(e.target.value as 'all' | 'logged_in' | 'logged_out')}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">Toutes connexions</option>
          <option value="logged_in">Connectés</option>
          <option value="logged_out">Déconnectés</option>
        </select>

        <select
          value={filterCourseId}
          onChange={(e) => setFilterCourseId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">Tous les cours</option>
          {courses.map(course => (
            <option key={course.id} value={course.id}>{course.title}</option>
          ))}
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilisateur</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Connexion</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inscription</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* ✅ FIXED: Use filteredUsers and filter out admin users safely */}
              {filteredUsers.filter(u => u && typeof u === 'object' && !u.is_admin).map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium text-sm">
                          {(user.name || 'U').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name || 'Nom inconnu'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email || 'Email inconnu'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.is_approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {user.is_approved ? 'Approuvé' : 'En attente'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.is_logged_in ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {user.is_logged_in ? 'Connecté' : 'Déconnecté'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(user.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2 flex-wrap gap-1">
                      {!user.is_approved && (
                        <button
                          onClick={() => onApproveUser(user.id)}
                          className="text-green-600 hover:text-green-900 px-3 py-1 border border-green-300 rounded hover:bg-green-50 transition-colors"
                        >
                          Approuver
                        </button>
                      )}
                      <button
                        onClick={() => openUserDetails(user.id)}
                        className="text-gray-600 hover:text-gray-900 px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                        disabled={detailsLoading}
                      >
                        Détails
                      </button>
                      <button
                        onClick={() => openEditModal(user)}
                        className="text-primary-600 hover:text-primary-900 px-3 py-1 border border-primary-300 rounded hover:bg-primary-50 transition-colors"
                      >
                        Modifier
                      </button>

                      <button
                        onClick={() => openManageCourses(user.id)}
                        className="text-indigo-600 hover:text-indigo-900 px-3 py-1 border border-indigo-300 rounded hover:bg-indigo-50 transition-colors"
                      >
                        Gérer Cours
                      </button>

                      <button
                        onClick={() => requestDelete(user.id)}
                        className="text-red-600 hover:text-red-900 px-3 py-1 border border-red-300 rounded hover:bg-red-50 transition-colors"
                      >
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-1">Aucun utilisateur trouvé</h3>
            <p className="text-gray-500">Essayez de modifier vos critères de recherche.</p>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Créer un Utilisateur</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nom complet *</label>
                <input 
                  type="text" 
                  required 
                  value={createForm.name} 
                  onChange={(e) => setCreateForm({...createForm, name: e.target.value})} 
                  className="input-field" 
                  placeholder="Nom de l'utilisateur" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                <input 
                  type="email" 
                  required 
                  value={createForm.email} 
                  onChange={(e) => setCreateForm({...createForm, email: e.target.value})} 
                  className="input-field" 
                  placeholder="email@exemple.com" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mot de passe *</label>
                <input 
                  type="password" 
                  required 
                  value={createForm.password} 
                  onChange={(e) => setCreateForm({...createForm, password: e.target.value})} 
                  className="input-field" 
                  placeholder="Mot de passe" 
                />
              </div>

              <div className="space-y-3">
                <label className="flex items-center">
                  <input 
                    type="checkbox" 
                    checked={createForm.is_approved} 
                    onChange={(e) => setCreateForm({...createForm, is_approved: e.target.checked})} 
                    className="w-4 h-4" 
                  />
                  <span className="ml-2 text-sm text-gray-900">Compte approuvé</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)} 
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button type="submit" className="flex-1 btn-primary">Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Modifier Utilisateur</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={handleEditUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nom complet *</label>
                <input 
                  type="text" 
                  required 
                  value={editForm.name} 
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})} 
                  className="input-field" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                <input 
                  type="email" 
                  required 
                  value={editForm.email} 
                  onChange={(e) => setEditForm({...editForm, email: e.target.value})} 
                  className="input-field" 
                />
              </div>

              <div className="space-y-3">
                <label className="flex items-center">
                  <input 
                    type="checkbox" 
                    checked={editForm.is_approved} 
                    onChange={(e) => setEditForm({...editForm, is_approved: e.target.checked})} 
                    className="w-4 h-4" 
                  />
                  <span className="ml-2 text-sm text-gray-900">Compte approuvé</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowEditModal(false)} 
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button type="submit" className="flex-1 btn-primary">Sauvegarder</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage courses modal */}
      <ManageUserCourses 
        open={manageCoursesOpen} 
        userId={manageUserId ?? 0} 
        onClose={() => { 
          setManageCoursesOpen(false); 
          if (onRefresh) onRefresh(); 
        }} 
        onUpdated={() => { 
          if (onRefresh) onRefresh(); 
        }} 
      />

      {/* Delete confirmation modal */}
      <ConfirmDialog
        open={showDeleteConfirm}
        title="Supprimer l'utilisateur"
        message="Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible."
        onCancel={() => { 
          setShowDeleteConfirm(false); 
          setPendingDeleteUserId(null); 
        }}
        onConfirm={confirmDelete}
      />

      {/* User Details Modal */}
      {showDetailsModal && detailsUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Détails de l'utilisateur</h3>
              <button onClick={() => { setShowDetailsModal(false); setDetailsUser(null); }} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-4 pb-4 border-b">
                <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-2xl">
                    {(detailsUser.name || 'U').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">{detailsUser.name || 'Nom inconnu'}</h4>
                  <p className="text-gray-600">{detailsUser.email || 'Email inconnu'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">ID</label>
                  <p className="text-gray-900">{detailsUser.id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Statut de connexion</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${detailsUser.is_logged_in ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {detailsUser.is_logged_in ? 'Connecté' : 'Déconnecté'}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Rôle</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${detailsUser.is_admin ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                    {detailsUser.is_admin ? 'Admin' : 'Utilisateur'}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Approbation</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${detailsUser.is_approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {detailsUser.is_approved ? 'Approuvé' : 'En attente'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Date de création</label>
                  <p className="text-gray-900 text-sm">{formatDate(detailsUser.created_at)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Dernière mise à jour</label>
                  <p className="text-gray-900 text-sm">{detailsUser.updated_at ? formatDate(detailsUser.updated_at) : 'N/A'}</p>
                </div>
              </div>

              {/* Last 2 Login Devices */}
              <div className="pt-2">
                <label className="block text-sm font-medium text-gray-500 mb-2">
                  Derniers appareils utilisés
                </label>
                {detailsUser.last_devices && detailsUser.last_devices.length > 0 ? (
                  <div className="space-y-2">
                    {detailsUser.last_devices.map((device, idx) => (
                      <div
                        key={idx}
                        className={`flex items-start gap-3 p-3 rounded-xl border ${idx === 0 ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}
                      >
                        {/* Device icon based on OS */}
                        <div className={`mt-0.5 text-xl leading-none ${idx === 0 ? 'text-green-600' : 'text-gray-400'}`}>
                          {device.os_name === 'iOS' || device.os_name === 'Android' ? '📱' : '💻'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-gray-800">
                              {device.browser_name || 'Navigateur inconnu'}
                            </span>
                            <span className="text-xs text-gray-500">·</span>
                            <span className="text-sm text-gray-600">{device.os_name || 'OS inconnu'}</span>
                            {idx === 0 && (
                              <span className="ml-auto text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                Actuel
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 truncate">
                            IP : {device.ip_address}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {formatDate(device.logged_in_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">Aucun appareil enregistré</p>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button 
                  onClick={() => { openPasswordModal(detailsUser); setShowDetailsModal(false); }}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  Changer mot de passe
                </button>
                <button 
                  onClick={() => { requestForceLogout(detailsUser.id); setShowDetailsModal(false); }}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  disabled={!detailsUser.is_logged_in}
                >
                  Déconnecter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && passwordUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Changer le mot de passe</h3>
              <button onClick={() => { setShowPasswordModal(false); setPasswordUser(null); setNewPassword(''); }} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Utilisateur: <span className="font-semibold">{passwordUser.name}</span></p>
              <p className="text-sm text-gray-600">Email: <span className="font-semibold">{passwordUser.email}</span></p>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nouveau mot de passe *</label>
                <input 
                  type="password" 
                  required 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Entrez le nouveau mot de passe" 
                  minLength={6}
                />
                <p className="text-xs text-gray-500 mt-1">Le mot de passe sera haché automatiquement.</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => { setShowPasswordModal(false); setPasswordUser(null); setNewPassword(''); }} 
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  disabled={passwordLoading}
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                  disabled={passwordLoading || !newPassword}
                >
                  {passwordLoading ? 'Mise à jour...' : 'Mettre à jour'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Force Logout Confirmation Modal */}
      <ConfirmDialog
        open={showLogoutConfirm}
        title="Déconnecter l'utilisateur"
        message="Êtes-vous sûr de vouloir déconnecter cet utilisateur ? Il sera immédiatement déconnecté de toutes ses sessions."
        onCancel={() => { 
          setShowLogoutConfirm(false); 
          setPendingLogoutUserId(null); 
        }}
        onConfirm={confirmForceLogout}
      />

      {/* Logout ALL Users Confirmation Modal */}
      <ConfirmDialog
        open={showLogoutAllConfirm}
        title="Déconnecter tous les utilisateurs"
        message="Êtes-vous sûr de vouloir déconnecter TOUS les utilisateurs actuellement connectés ? Leurs sessions seront immédiatement terminées."
        onCancel={() => setShowLogoutAllConfirm(false)}
        onConfirm={confirmLogoutAll}
      />
    </div>
  );
};

export default UserManagement;