import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import Loading from '../components/Loading';
import '../styles/InboxViewerPage.css';

// We'll use PDF.js from CDN via script tag
declare global {
  interface Window {
    pdfjsLib: any;
  }
}

interface InboxMessage {
  id: number;
  title: string;
  description?: string;
  sender_name?: string;
  is_read: boolean;
  created_at: string;
}

const InboxViewerPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  const [message, setMessage] = useState<InboxMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale] = useState(1.5); // Fixed scale, no zoom controls
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Disable right-click
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };
    
    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  // Disable keyboard shortcuts for print/save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 's' || e.key === 'P' || e.key === 'S')) {
        e.preventDefault();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load PDF.js library first
  useEffect(() => {
    const loadPdfJs = () => {
      return new Promise<void>((resolve) => {
        if (window.pdfjsLib) {
          resolve();
          return;
        }
        
        // Load PDF.js from CDN
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.async = true;
        
        script.onload = () => {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          console.log('PDF.js loaded');
          resolve();
        };
        
        script.onerror = () => {
          console.error('Failed to load PDF.js');
          resolve(); // Resolve anyway to not block
        };
        
        document.head.appendChild(script);
      });
    };
    
    loadPdfJs();
  }, []);

  // Fetch message details after auth check
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
      console.log('📬 Message response:', response);
      
      // The API extracts data, so response is the message object directly
      // It could be {id, title, ...} or {success: true, message: {...}}
      if (response && response.id) {
        // Direct message object from extractData
        setMessage(response);
        loadPdf();
      } else if (response && response.success && response.message) {
        // Full response with success wrapper
        setMessage(response.message);
        loadPdf();
      } else if (response && response.data) {
        // Response with data property
        setMessage(response.data);
        loadPdf();
      } else {
        setError(t('inbox.message_not_found', 'Message not found'));
      }
    } catch (err: any) {
      console.error('❌ Error fetching message:', err);
      setError(t('inbox.error_loading_message', 'Failed to load message'));
    } finally {
      setLoading(false);
    }
  };

  const loadPdf = async () => {
    try {
      setPdfLoading(true);
      
      // Wait for PDF.js to load with longer timeout
      let attempts = 0;
      while (!window.pdfjsLib && attempts < 100) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      if (!window.pdfjsLib) {
        throw new Error('PDF.js failed to load');
      }

      // Small delay to ensure PDF.js is fully initialized
      await new Promise(resolve => setTimeout(resolve, 200));

      // Get auth token
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      
      // Fetch PDF with authentication
      const pdfUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/inbox/${id}/pdf`;
      
      const response = await fetch(pdfUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch PDF');
      }
      
      const pdfData = await response.arrayBuffer();
      
      // Load PDF document
      const loadingTask = window.pdfjsLib.getDocument({ data: pdfData });
      const pdf = await loadingTask.promise;
      
      pdfDocRef.current = pdf;
      setTotalPages(pdf.numPages);
      
      // Render first page
      await renderPage(1);
      
    } catch (err: any) {
      console.error('Error loading PDF:', err);
      setError(t('inbox.error_loading_pdf', 'Failed to load PDF'));
    } finally {
      setPdfLoading(false);
    }
  };

  const renderPage = async (pageNum: number) => {
    if (!pdfDocRef.current || !canvasRef.current) return;
    
    try {
      const page = await pdfDocRef.current.getPage(pageNum);
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (!context) return;
      
      const viewport = page.getViewport({ scale });
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      
      await page.render(renderContext).promise;
      setCurrentPage(pageNum);
      
    } catch (err) {
      console.error('Error rendering page:', err);
    }
  };

  const goToPage = (pageNum: number) => {
    if (pageNum >= 1 && pageNum <= totalPages) {
      renderPage(pageNum);
    }
  };

  // Re-render page when scale changes (kept for future use)
  useEffect(() => {
    if (pdfDocRef.current && currentPage) {
      renderPage(currentPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale]);

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

  if (error) {
    return (
      <div className="inbox-viewer-error">
        <div className="error-content">
          <span className="error-icon">⚠️</span>
          <h2>{t('inbox.error', 'Error')}</h2>
          <p>{error}</p>
          <Link to="/inbox" className="back-link">
            ← {t('inbox.back_to_inbox', 'Back to Inbox')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="inbox-viewer-page" 
      onContextMenu={(e) => e.preventDefault()}
      style={{ userSelect: 'none' }}
    >
      {/* Simple Header - Back button and title */}
      <div className="inbox-viewer-header">
        <div className="inbox-viewer-header-left">
          <Link to={`/inbox/${id}`} className="back-button">
            <span>←</span>
            <span>{t('inbox.back', 'Retour')}</span>
          </Link>
          <div className="message-info">
            <h1 className="message-title">{message?.title}</h1>
          </div>
        </div>
      </div>

      {/* Simple PDF Toolbar - Just page navigation */}
      <div className="pdf-toolbar">
        <div className="pdf-toolbar-center">
          <button 
            onClick={() => goToPage(currentPage - 1)} 
            disabled={currentPage <= 1}
            className="toolbar-btn"
            title={t('inbox.previous_page', 'Page précédente')}
          >
            ◀
          </button>
          <span className="page-info">
            {currentPage} / {totalPages}
          </span>
          <button 
            onClick={() => goToPage(currentPage + 1)} 
            disabled={currentPage >= totalPages}
            className="toolbar-btn"
            title={t('inbox.next_page', 'Page suivante')}
          >
            ▶
          </button>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="pdf-container" ref={containerRef}>
        {pdfLoading ? (
          <div className="pdf-loading">
            <div className="loading-spinner"></div>
            <p>{t('inbox.loading_pdf', 'Chargement du PDF...')}</p>
          </div>
        ) : (
          <canvas 
            ref={canvasRef} 
            className="pdf-canvas"
            style={{ userSelect: 'none' }}
          />
        )}
      </div>

      {/* Security overlay to prevent screenshots */}
      <div className="security-overlay" />
    </div>
  );
};

export default InboxViewerPage;
