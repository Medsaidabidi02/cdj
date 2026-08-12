import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { api } from './api';
import toast from 'react-hot-toast'; // Assuming react-hot-toast is available or similar

interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'blog' | 'inbox' | 'video' | 'system';
  rel_id?: number;
  is_read: boolean;
  created_at: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  subscribeToPush: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res: any = await api.get('/notifications');
      if (res.success) {
        setNotifications(res.notifications);
        const count = res.notifications.filter((n: Notification) => !n.is_read).length;
        setUnreadCount(count);
      }
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchNotifications();

      // Initialize Socket.io
      const newSocket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
        auth: { token }
      });

      newSocket.on('notification', (notif: Notification) => {
        setNotifications(prev => [notif, ...prev]);
        setUnreadCount(prev => prev + 1);
      });

      newSocket.on('toast', (notif: Notification) => {
        toast.custom((t) => (
          <div
            className={`${
              t.visible ? 'animate-enter' : 'animate-leave'
            } max-w-sm w-full bg-white shadow-2xl rounded-2xl pointer-events-auto flex flex-col overflow-hidden border border-slate-100 relative group transition-all duration-300`}
          >
            {/* Header / Icon Area */}
            <div className="flex-1 p-3.5 flex items-start gap-3.5">
              <div className={`w-11 h-11 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform ${
                notif.type === 'blog' ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white' :
                notif.type === 'video' ? 'bg-gradient-to-br from-blue-400 to-indigo-600 text-white' :
                notif.type === 'inbox' ? 'bg-gradient-to-br from-teal-400 to-emerald-600 text-white' :
                'bg-gradient-to-br from-slate-400 to-slate-600 text-white'
              }`}>
                <span className="text-xl">
                  {notif.type === 'blog' ? '📋' : notif.type === 'video' ? '🎥' : notif.type === 'inbox' ? '✉️' : '🔔'}
                </span>
              </div>
              
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-teal-600 bg-teal-50 px-2 py-0.5 rounded-md">
                    {notif.type || 'SYSTEM'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Maintenant</span>
                </div>
                <h4 className="text-sm font-black text-slate-900 truncate leading-tight">
                  {notif.title}
                </h4>
                <p className="mt-1 text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed">
                  {notif.message}
                </p>
              </div>

              {/* Close Button "X" */}
              <button
                onClick={() => toast.dismiss(t.id)}
                className="absolute top-2 right-2 p-1.5 rounded-full text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-all focus:outline-none"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Action Bar (Optional depending on rel_id) */}
            {notif.rel_id && (
              <div className="bg-slate-50/50 p-2 border-t border-slate-50">
                <button 
                  onClick={() => {
                    toast.dismiss(t.id);
                    // Using internal navigation if needed, but toast.custom is static here
                    // Usually we'd trigger a navigate() provided to context
                    // Or provide the URL directly
                    if (notif.type === 'blog') window.location.href = `/blog/${notif.rel_id}`;
                    else if (notif.type === 'inbox') window.location.href = '/inbox';
                    else if (notif.type === 'video') window.location.href = `/course/${notif.rel_id}`;
                  }}
                  className="w-full py-1.5 px-3 text-[11px] font-bold text-teal-600 hover:bg-teal-600 hover:text-white rounded-lg transition-all"
                >
                  Voir les détails →
                </button>
              </div>
            )}
            
            {/* Animated Progress Bar */}
            <div className="h-1 bg-slate-100 w-full overflow-hidden">
               <div className="h-full bg-teal-500 animate-toast-progress origin-left"></div>
            </div>
          </div>
        ), { duration: 5000, position: 'bottom-left' });
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    } else {
      setNotifications([]);
      setUnreadCount(0);
      setSocket(null);
      // Consistent return for useEffect
      return undefined;
    }
  }, [token, fetchNotifications]);

  const markAsRead = async (id: number) => {
    try {
      await api.put(`/notifications/${id}/read`, {});
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all', {});
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read', error);
    }
  };

  const subscribeToPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications not supported');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Get public key from env
      const publicKey = process.env.REACT_APP_VAPID_PUBLIC_KEY || 'BGAja2MEqGvHXiqU6-0yWYVUtYk1eSNidDd2SAFudiv6CIY2fxBau4iLlCGFVU5tyB41KUj_2HCPFHpicPLYIwo';
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey
      });

      await api.post('/notifications/subscribe', {
        subscription,
        userAgent: navigator.userAgent
      });
      
      console.log('✅ Subscribed to push notifications');
    } catch (error) {
      console.error('❌ Failed to subscribe to push notifications', error);
    }
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, loading, markAsRead, markAllAsRead, subscribeToPush }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
