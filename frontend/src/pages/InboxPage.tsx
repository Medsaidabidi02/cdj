import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import Header from '../components/Header';
import Loading from '../components/Loading';
import '../styles/InboxPage.css';

interface InboxMessage {
  id: number;
  title: string;
  description?: string;
  sender_name?: string;
  has_pdf?: boolean;
  is_read: boolean;
  created_at: string;
}

const InboxPage: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { returnTo: '/inbox' } });
      return;
    }
    fetchInboxMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, navigate]);

  const fetchInboxMessages = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response: any = await api.get('/inbox');
      console.log('📬 Inbox response:', response);
      
      if (response && response.success && Array.isArray(response.messages)) {
        setMessages(response.messages);
      } else if (Array.isArray(response)) {
        setMessages(response);
      } else {
        setMessages([]);
      }
    } catch (err: any) {
      console.error('❌ Error fetching inbox:', err);
      setError(t('inbox.error_loading', 'Failed to load inbox messages'));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (loading) {
    return <Loading fullScreen text={t('inbox.loading', 'Loading inbox...')} />;
  }

  return (
    <div className="inbox-page">
      <Header />
      
      <div className="inbox-container">
        <div className="inbox-header">
          <div className="inbox-title-section">
            <h1 className="inbox-title">
              {t('inbox.title', 'Inbox')}
            </h1>
            <p className="inbox-subtitle">
              {t('inbox.subtitle', 'Your private messages and documents')}
            </p>
          </div>
          
          {messages.length > 0 && (
            <div className="inbox-stats">
              <span className="inbox-count">
                {messages.length} {t('inbox.messages', 'message(s)')}
              </span>
              <span className="inbox-unread">
                {messages.filter(m => !m.is_read).length} {t('inbox.unread', 'unread')}
              </span>
            </div>
          )}
        </div>

        {error && (
          <div className="inbox-error">
            <span>{error}</span>
          </div>
        )}

        {messages.length === 0 && !error ? (
          <div className="inbox-empty">
            <h2>{t('inbox.empty_title', 'No messages yet')}</h2>
            <p>{t('inbox.empty_description', 'Your inbox is empty. New messages will appear here.')}</p>
          </div>
        ) : (
          <div className="inbox-list">
            {messages.map((message) => (
              <Link 
                to={`/inbox/${message.id}`} 
                key={message.id}
                className={`inbox-item ${!message.is_read ? 'unread' : ''}`}
              >
                <div className="inbox-item-indicator">
                  {!message.is_read && <span className="unread-dot"></span>}
                </div>
                
                <div className="inbox-item-content">
                  <div className="inbox-item-header">
                    <h3 className="inbox-item-title">{message.title}</h3>
                    <span className="inbox-item-date">{formatDate(message.created_at)}</span>
                  </div>
                  
                  {message.description && (
                    <p className="inbox-item-description">
                      {message.description.length > 150 
                        ? message.description.substring(0, 150) + '...' 
                        : message.description}
                    </p>
                  )}
                  
                  <div className="inbox-item-footer">
                    {message.sender_name && (
                      <span className="inbox-item-sender">
                        {message.sender_name}
                      </span>
                    )}
                    {message.has_pdf && (
                      <span className="inbox-item-pdf">
                        PDF
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="inbox-item-action">
                  <span className="open-icon">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InboxPage;
