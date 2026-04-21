import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import Header from '../components/Header';
import Loading from '../components/Loading';
import '../styles/InboxDetailPage.css';

interface InboxMessage {
  id: number;
  title: string;
  description?: string;
  sender_name?: string;
  has_pdf?: boolean;
  pdf_path?: string;
  is_read: boolean;
  created_at: string;
}

const InboxDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  const [message, setMessage] = useState<InboxMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { returnTo: `/inbox/${id}` } });
      return;
    }
    
    fetchMessage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isAuthenticated, navigate]);

  const fetchMessage = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response: any = await api.get(`/inbox/${id}`);
      
      if (response && response.id) {
        setMessage(response);
      } else if (response && response.success && response.message) {
        setMessage(response.message);
      } else if (response && response.data) {
        setMessage(response.data);
      } else {
        setError(t('inbox.message_not_found', 'Message not found'));
      }
    } catch (err: any) {
      console.error('Error fetching message:', err);
      setError(t('inbox.error_loading_message', 'Failed to load message'));
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
    return <Loading fullScreen text={t('inbox.loading_message', 'Loading message...')} />;
  }

  if (error || !message) {
    return (
      <div className="inbox-detail-page">
        <Header />
        <div className="inbox-detail-container">
          <div className="inbox-detail-error">
            <div className="error-icon">!</div>
            <h2>{t('inbox.error', 'Error')}</h2>
            <p>{error || t('inbox.message_not_found', 'Message not found')}</p>
            <Link to="/inbox" className="back-link">
              {t('inbox.back_to_inbox', 'Back to Inbox')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="inbox-detail-page">
      <Header />
      
      <div className="inbox-detail-container">
        <div className="inbox-detail-nav">
          <Link to="/inbox" className="back-button">
            <span className="back-arrow">←</span>
            <span>{t('inbox.back_to_inbox', 'Back to Inbox')}</span>
          </Link>
        </div>

        <div className="inbox-detail-card">
          <div className="inbox-detail-header">
            <h1 className="inbox-detail-title">{message.title}</h1>
            <div className="inbox-detail-meta">
              {message.sender_name && (
                <span className="inbox-detail-sender">
                  {t('inbox.from', 'From')}: <strong>{message.sender_name}</strong>
                </span>
              )}
              <span className="inbox-detail-date">{formatDate(message.created_at)}</span>
            </div>
          </div>

          <div className="inbox-detail-content">
            {message.description ? (
              <p className="inbox-detail-description">{message.description}</p>
            ) : (
              <p className="inbox-detail-no-content">{t('inbox.no_description', 'No description provided.')}</p>
            )}
          </div>

          {message.has_pdf && (
            <div className="inbox-detail-actions">
              <Link to={`/inbox/${message.id}/pdf`} className="view-pdf-button">
                <svg className="pdf-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                {t('inbox.view_pdf', 'View PDF')}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InboxDetailPage;
