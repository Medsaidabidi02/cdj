import React, { useState, useEffect } from 'react';
import { api, getErrorMessage } from '../../lib/api';

interface User {
  id: number;
  name: string;
  email: string;
  is_admin: boolean;
}

interface Course {
  id: number;
  title: string;
  enrolled_count: number;
}

interface InboxMessage {
  id: number;
  title: string;
  description?: string;
  sender_name?: string;
  sender_email?: string;
  recipient_name?: string;
  recipient_email?: string;
  has_pdf?: boolean;
  is_read: boolean;
  created_at: string;
}

const InboxManagement: React.FC = () => {
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [sending, setSending] = useState(false);
  
  // Form state - now supports multiple recipients and courses
  const [formData, setFormData] = useState({
    selectedCourses: [] as number[],
    selectedUsers: [] as number[],
    title: '',
    description: '',
    pdf: null as File | null
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch users, courses, and messages in parallel
      const [usersRes, coursesRes, messagesRes] = await Promise.all([
        api.get('/users'),
        api.get('/inbox/admin/courses'),
        api.get('/inbox/admin/all')
      ]);

      // Handle users
      if (usersRes && usersRes.success && Array.isArray(usersRes.users)) {
        const studentUsers = usersRes.users.filter((u: User) => !u.is_admin);
        setUsers(studentUsers);
      } else if (Array.isArray(usersRes)) {
        setUsers(usersRes.filter((u: User) => !u.is_admin));
      }

      // Handle courses
      if (coursesRes && coursesRes.success && Array.isArray(coursesRes.courses)) {
        setCourses(coursesRes.courses);
      } else if (Array.isArray(coursesRes)) {
        setCourses(coursesRes);
      }

      // Handle messages
      if (messagesRes && messagesRes.success && Array.isArray(messagesRes.messages)) {
        setMessages(messagesRes.messages);
      } else if (Array.isArray(messagesRes)) {
        setMessages(messagesRes);
      }

    } catch (error) {
      console.error('Error fetching inbox data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCourse = (courseId: number) => {
    setFormData(prev => ({
      ...prev,
      selectedCourses: prev.selectedCourses.includes(courseId)
        ? prev.selectedCourses.filter(id => id !== courseId)
        : [...prev.selectedCourses, courseId]
    }));
  };

  const toggleUser = (userId: number) => {
    setFormData(prev => ({
      ...prev,
      selectedUsers: prev.selectedUsers.includes(userId)
        ? prev.selectedUsers.filter(id => id !== userId)
        : [...prev.selectedUsers, userId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.selectedCourses.length === 0 && formData.selectedUsers.length === 0) {
      alert('Veuillez sélectionner au moins un cours ou un utilisateur.');
      return;
    }

    if (!formData.title) {
      alert('Veuillez remplir le titre du message.');
      return;
    }

    try {
      setSending(true);
      
      const data = new FormData();
      data.append('recipient_ids', JSON.stringify(formData.selectedUsers));
      data.append('course_ids', JSON.stringify(formData.selectedCourses));
      data.append('title', formData.title);
      if (formData.description) {
        data.append('description', formData.description);
      }
      if (formData.pdf) {
        data.append('pdf', formData.pdf);
      }

      const result: any = await api.upload('/inbox/send', data);
      console.log('📬 Send result:', result);

      // Check for success in various response formats
      // The API returns: { success: true, data: { recipients_count, ... } } or after extraction: { recipients_count, ... }
      // Also check for 'message' field which indicates success
      const recipientsCount = result?.recipients_count || result?.data?.recipients_count;
      const hasMessage = result?.message && typeof result.message === 'string' && result.message.includes('sent');
      const isSuccess = recipientsCount > 0 || result?.success === true || hasMessage || (result?.data && result.data.recipients_count > 0);
      
      if (isSuccess) {
        const count = recipientsCount || 1;
        alert(`Message envoyé à ${count} destinataire(s)!`);
        setFormData({ selectedCourses: [], selectedUsers: [], title: '', description: '', pdf: null });
        setShowForm(false);
        fetchData();
      } else {
        console.error('Send result:', result);
        alert('Erreur lors de l\'envoi du message');
      }

    } catch (error) {
      console.error('Error sending inbox message:', error);
      alert(`Erreur: ${getErrorMessage(error)}`);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (messageId: number) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce message?')) {
      return;
    }

    try {
      const result: any = await api.delete(`/inbox/admin/${messageId}`);
      
      if (result && result.success) {
        setMessages(prev => prev.filter(m => m.id !== messageId));
      } else {
        alert('Erreur lors de la suppression');
      }

    } catch (error) {
      console.error('Error deleting inbox message:', error);
      alert(`Erreur: ${getErrorMessage(error)}`);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestion de la Boîte de Réception</h2>
          <p className="text-gray-600">Envoyez des messages privés avec documents PDF aux étudiants</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-green-700 transition-all duration-200 transform hover:scale-105"
        >
          {showForm ? 'Annuler' : 'Nouveau Message'}
        </button>
      </div>

      {/* Send Message Form */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Envoyer un nouveau message</h3>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Courses Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Envoyer aux cours (tous les inscrits)
              </label>
              <div className="border border-gray-200 rounded-xl p-4 max-h-48 overflow-y-auto">
                {courses.length === 0 ? (
                  <p className="text-gray-500 text-sm">Aucun cours disponible</p>
                ) : (
                  <div className="space-y-2">
                    {courses.map((course) => (
                      <label key={course.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.selectedCourses.includes(course.id)}
                          onChange={() => toggleCourse(course.id)}
                          className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                        />
                        <span className="flex-1 text-gray-700">{course.title}</span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {course.enrolled_count} inscrit(s)
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              {formData.selectedCourses.length > 0 && (
                <p className="text-sm text-green-600 mt-2">
                  {formData.selectedCourses.length} cours sélectionné(s)
                </p>
              )}
            </div>

            {/* Individual Users Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Ajouter des utilisateurs individuels
              </label>
              <div className="border border-gray-200 rounded-xl p-4 max-h-48 overflow-y-auto">
                {users.length === 0 ? (
                  <p className="text-gray-500 text-sm">Aucun utilisateur disponible</p>
                ) : (
                  <div className="space-y-2">
                    {users.map((user) => (
                      <label key={user.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.selectedUsers.includes(user.id)}
                          onChange={() => toggleUser(user.id)}
                          className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                        />
                        <span className="flex-1 text-gray-700">{user.name}</span>
                        <span className="text-xs text-gray-500">{user.email}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              {formData.selectedUsers.length > 0 && (
                <p className="text-sm text-green-600 mt-2">
                  {formData.selectedUsers.length} utilisateur(s) sélectionné(s)
                </p>
              )}
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Titre du message *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Votre relevé de notes"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            {/* Description/Content */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Contenu du message
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={8}
                placeholder="Écrivez le contenu de votre message ici..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Le contenu complet de votre message (jusqu'à 10000 caractères).
              </p>
            </div>

            {/* PDF Upload - Optional */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Fichier PDF (optionnel)
              </label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setFormData({ ...formData, pdf: e.target.files?.[0] || null })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Optionnel. Seuls les fichiers PDF sont acceptés (max 50MB).
              </p>
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-3 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-xl hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={sending || (formData.selectedCourses.length === 0 && formData.selectedUsers.length === 0)}
                className="px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? 'Envoi en cours...' : 'Envoyer le message'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <p className="text-gray-600 text-sm font-medium">Total Messages</p>
          <p className="text-3xl font-bold text-green-600 mt-2">{messages.length}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <p className="text-gray-600 text-sm font-medium">Non lus</p>
          <p className="text-3xl font-bold text-orange-600 mt-2">
            {messages.filter(m => !m.is_read).length}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <p className="text-gray-600 text-sm font-medium">Étudiants</p>
          <p className="text-3xl font-bold text-green-600 mt-2">{users.length}</p>
        </div>
      </div>

      {/* Messages List */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Messages envoyés</h3>
        </div>

        {messages.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-600">Aucun message envoyé pour le moment.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {messages.map((message) => (
              <div key={message.id} className="p-6 hover:bg-gray-50 transition-colors duration-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-gray-900">{message.title}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        message.is_read 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {message.is_read ? 'Lu' : 'Non lu'}
                      </span>
                    </div>
                    
                    {message.description && (
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{message.description}</p>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>De: {message.sender_name || 'Admin'}</span>
                      <span>→</span>
                      <span>À: {message.recipient_name || message.recipient_email}</span>
                      <span>{formatDate(message.created_at)}</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleDelete(message.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200 ml-4"
                    title="Supprimer"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InboxManagement;
