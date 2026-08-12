import React, { useState, useRef } from 'react';
import { useAuth } from '../lib/AuthContext';
import { profileApi, getAvatarUrl } from '../lib/api';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useTranslation } from 'react-i18next';

const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { t } = useTranslation();
  
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);
    
    try {
      const res = await profileApi.updateProfile({ name, email, phone });
      if (res.success) {
        updateUser(res.user);
        setMessage({ type: 'success', text: 'Profil mis à jour avec succès' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erreur lors de la mise à jour' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Les nouveaux mots de passe ne correspondent pas' });
      return;
    }
    
    setIsLoading(true);
    setMessage(null);
    
    try {
      const res = await profileApi.changePassword({ currentPassword, newPassword });
      if (res.success) {
        setMessage({ type: 'success', text: 'Mot de passe modifié avec succès' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erreur lors du changement de mot de passe' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsLoading(true);
    setMessage(null);
    
    try {
      const res = await profileApi.updateProfilePicture(file);
      if (res.success) {
        updateUser({ profile_picture: res.profile_picture });
        setMessage({ type: 'success', text: 'Photo de profil mise à jour' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erreur lors de l\'upload' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      
      <main className="max-w-4xl mx-auto pt-24 pb-16 px-4">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">Mon Profil</h1>
        
        {message && (
          <div className={`mb-6 p-4 rounded-xl border ${
            message.type === 'success' ? 'bg-teal-50 border-teal-200 text-teal-800' : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {message.text}
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Avatar */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-2xl shadow-elegant border border-slate-100 text-center">
              <div className="relative inline-block mb-4 group">
                {user?.profile_picture ? (
                  <img 
                    src={getAvatarUrl(user.profile_picture, user.name)} 
                    alt={user.name} 
                    className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-md mx-auto"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-4xl font-bold border-4 border-white shadow-md mx-auto">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                )}
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-2 bg-teal-600 text-white rounded-full shadow-lg hover:bg-teal-700 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleAvatarUpload} 
                />
              </div>
              
              <h2 className="text-xl font-bold text-slate-900">{user?.name}</h2>
              <p className="text-sm text-slate-500 mb-4">{user?.email}</p>
              <div className="inline-block px-3 py-1 bg-teal-50 text-teal-700 text-xs font-bold rounded-full uppercase tracking-wider">
                {user?.is_admin ? 'Administrateur' : 'Membre'}
              </div>
            </div>
          </div>
          
          {/* Right Column: Forms */}
          <div className="lg:col-span-2 space-y-8">
            {/* General Info */}
            <div className="bg-white p-6 rounded-2xl shadow-elegant border border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Informations personnelles
              </h3>
              
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nom complet</label>
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Numéro de téléphone</label>
                  <input 
                    type="tel" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                    placeholder="+216 ..."
                  />
                </div>
                <div className="pt-4 border-t border-slate-50">
                  <button 
                    type="submit" 
                    disabled={isLoading}
                    className="px-6 py-2 bg-teal-600 text-white font-medium rounded-xl hover:bg-teal-700 transition-all disabled:opacity-50"
                  >
                    Sauvegarder les modifications
                  </button>
                </div>
              </form>
            </div>
            
            {/* Password Change */}
            <div className="bg-white p-6 rounded-2xl shadow-elegant border border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Sécurité
              </h3>
              
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mot de passe actuel</label>
                  <input 
                    type="password" 
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nouveau mot de passe</label>
                    <input 
                      type="password" 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Confirmer le mot de passe</label>
                    <input 
                      type="password" 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                      required
                    />
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-50">
                  <button 
                    type="submit" 
                    disabled={isLoading}
                    className="px-6 py-2 bg-slate-800 text-white font-medium rounded-xl hover:bg-slate-900 transition-all disabled:opacity-50"
                  >
                    Mettre à jour le mot de passe
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

export default ProfilePage;
