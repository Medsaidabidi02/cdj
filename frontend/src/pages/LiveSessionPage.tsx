/**
 * LiveSessionPage.tsx
 *
 * A dedicated page that:
 *  - Shows TeacherLiveBroadcaster if the current user is a teacher/admin
 *  - Shows StudentLiveViewer otherwise
 *  - Lets the teacher create a new session or rejoin an existing one
 *  - Lists active/recent sessions for students to join
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import TeacherLiveBroadcaster from '../components/TeacherLiveBroadcaster';
import StudentLiveViewer from '../components/StudentLiveViewer';
import { API_CONFIG } from '../config';
import { PlaySquare, Play, Check } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────

interface LiveSession {
  id: string;
  title: string;
  status: 'scheduled' | 'live' | 'ended';
  host_name: string;
  started_at: string | null;
  ended_at: string | null;
  recording_path: string | null;
}

// ─── Component ────────────────────────────────────────────────────────────

const LiveSessionPage: React.FC = () => {
  const { user } = useAuth();
  // Teacher = user with is_teacher flag OR an admin
  const isTeacher = user?.is_teacher || user?.is_admin;


  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<LiveSession | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [streamEnded, setStreamEnded] = useState(false);

  const apiBase = API_CONFIG.BASE_URL;

  // ─── Fetch sessions ─────────────────────────────────────────────────────

  const fetchSessions = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiBase}/api/live/sessions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) setSessions(json.data);
    } catch (e) {
      console.error('Failed to fetch sessions:', e);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 15_000);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  // ─── Create session ─────────────────────────────────────────────────────

  const createSession = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiBase}/api/live/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchSessions();
        setSelectedSession(json.data as LiveSession);
        setNewTitle('');
      }
    } catch (e) {
      console.error('Create session error:', e);
    } finally {
      setCreating(false);
    }
  };

  // ─── Helpers ────────────────────────────────────────────────────────────

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; color: string }> = {
      live: { label: '🔴 LIVE', color: '#ef4444' },
      scheduled: { label: '🕐 Scheduled', color: '#f59e0b' },
      ended: { label: '<span className="inline-flex items-center justify-center"><Check className="w-4 h-4" /></span> Ended', color: '#6b7280' },
    };
    const cfg = map[status] ?? map.ended;
    return (
      <span
        style={{
          background: cfg.color,
          color: '#fff',
          padding: '0.15rem 0.6rem',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: 700,
        }}
      >
        {cfg.label}
      </span>
    );
  };

  // ─── Render: Broadcaster/Viewer ─────────────────────────────────────────

  if (selectedSession) {
    return (
      <div style={styles.page}>
        <button id="live-back-btn" style={styles.backBtn} onClick={() => { setSelectedSession(null); setStreamEnded(false); }}>
          ← Back to sessions
        </button>

        <h2 style={styles.sessionTitle}>{selectedSession.title}</h2>

        {isTeacher ? (
          <TeacherLiveBroadcaster
            sessionId={selectedSession.id}
            onStreamStarted={() => fetchSessions()}
            onStreamEnded={() => { setStreamEnded(true); fetchSessions(); }}
          />
        ) : (
          <StudentLiveViewer
            sessionId={selectedSession.id}
            onStreamEnded={() => { setStreamEnded(true); }}
          />
        )}

        {streamEnded && !isTeacher && (
          <p style={{ color: '#94a3b8', textAlign: 'center', marginTop: '1rem' }}>
            The recording will be available in the Courses section soon.
          </p>
        )}
      </div>
    );
  }

  // ─── Render: Session List ───────────────────────────────────────────────

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.heading}>🎙️ Live Sessions</h1>
          <p style={styles.subheading}>
            {isTeacher
              ? 'Start a new broadcast or manage existing sessions.'
              : 'Join an ongoing live session.'}
          </p>
        </div>
      </div>

      {/* Teacher: Create new session */}
      {isTeacher && (
        <div style={styles.createBox}>
          <h3 style={{ margin: '0 0 0.75rem', color: '#f8fafc', fontSize: '1rem' }}>
            Start a New Session
          </h3>
          <div style={styles.createRow}>
            <input
              id="live-session-title"
              style={styles.input}
              type="text"
              placeholder="Session title (e.g. Contract Law – Week 3)"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createSession()}
            />
            <button
              id="live-create-btn"
              style={styles.createBtn}
              onClick={createSession}
              disabled={creating || !newTitle.trim()}
            >
              {creating ? 'Creating…' : '+ Create'}
            </button>
          </div>
        </div>
      )}

      {/* Session list */}
      {loading ? (
        <p style={{ color: '#94a3b8', textAlign: 'center' }}>Loading sessions…</p>
      ) : sessions.length === 0 ? (
        <div style={styles.emptyState}>
          <span style={{ fontSize: '3rem' }}>📡</span>
          <p style={{ color: '#94a3b8', margin: '0.5rem 0 0' }}>
            {isTeacher
              ? 'No sessions yet. Create one above to go live!'
              : 'No live sessions available right now. Check back soon.'}
          </p>
        </div>
      ) : (
        <div style={styles.sessionGrid}>
          {sessions.map(session => (
            <div key={session.id} style={styles.card}>
              <div style={styles.cardHeader}>
                {statusBadge(session.status)}
                <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                  Host: {session.host_name}
                </span>
              </div>
              <h3 style={styles.cardTitle}>{session.title}</h3>
              {session.started_at && (
                <p style={styles.cardMeta}>
                  Started: {new Date(session.started_at).toLocaleTimeString()}
                </p>
              )}
              {session.recording_path && (
                <a
                  href={session.recording_path}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.recordingLink}
                >
                  <span className="inline-flex items-center justify-center"><Play className="w-4 h-4" /></span> Watch Recording
                </a>
              )}
              {session.status !== 'ended' && (
                <button
                  id={`live-join-${session.id}`}
                  style={session.status === 'live' ? styles.joinLiveBtn : styles.joinScheduledBtn}
                  onClick={() => setSelectedSession(session)}
                >
                  {isTeacher
                    ? session.status === 'live' ? '📡 Manage Live' : '<PlaySquare className="w-6 h-6 inline-block" /> Go Live'
                    : session.status === 'live' ? '<span className="inline-flex items-center justify-center"><Play className="w-4 h-4" /></span> Join Now' : '👁 Preview'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    padding: '2rem 1.5rem',
    fontFamily: 'Inter, system-ui, sans-serif',
    color: '#f8fafc',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1.5rem',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  heading: {
    margin: 0,
    fontSize: '2rem',
    fontWeight: 800,
    background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subheading: {
    margin: '0.25rem 0 0',
    color: '#94a3b8',
    fontSize: '0.9rem',
  },
  createBox: {
    background: '#1e293b',
    borderRadius: '0.75rem',
    padding: '1.25rem',
    marginBottom: '1.5rem',
    border: '1px solid #334155',
  },
  createRow: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap',
  },
  input: {
    flex: 1,
    minWidth: '220px',
    padding: '0.65rem 0.9rem',
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '0.5rem',
    color: '#f8fafc',
    fontSize: '0.9rem',
    outline: 'none',
  },
  createBtn: {
    padding: '0.65rem 1.25rem',
    background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
    color: '#fff',
    border: 'none',
    borderRadius: '0.5rem',
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: '0.9rem',
    whiteSpace: 'nowrap',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem 1rem',
    textAlign: 'center',
    gap: '0.5rem',
  },
  sessionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '1rem',
  },
  card: {
    background: '#1e293b',
    borderRadius: '0.75rem',
    padding: '1.25rem',
    border: '1px solid #334155',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
    transition: 'border-color 0.2s',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '0.4rem',
  },
  cardTitle: {
    margin: 0,
    fontSize: '1rem',
    fontWeight: 700,
    color: '#f1f5f9',
  },
  cardMeta: {
    margin: 0,
    fontSize: '0.75rem',
    color: '#64748b',
  },
  recordingLink: {
    color: '#38bdf8',
    fontSize: '0.85rem',
    textDecoration: 'none',
    fontWeight: 600,
  },
  joinLiveBtn: {
    padding: '0.6rem 1rem',
    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
    color: '#fff',
    border: 'none',
    borderRadius: '0.5rem',
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: '0.9rem',
    marginTop: 'auto',
  },
  joinScheduledBtn: {
    padding: '0.6rem 1rem',
    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
    color: '#fff',
    border: 'none',
    borderRadius: '0.5rem',
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: '0.9rem',
    marginTop: 'auto',
  },
  backBtn: {
    background: 'transparent',
    border: '1px solid #334155',
    color: '#94a3b8',
    padding: '0.5rem 0.9rem',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontSize: '0.85rem',
    marginBottom: '1rem',
  },
  sessionTitle: {
    fontSize: '1.5rem',
    fontWeight: 800,
    color: '#f1f5f9',
    margin: '0 0 1rem',
  },
};

export default LiveSessionPage;
