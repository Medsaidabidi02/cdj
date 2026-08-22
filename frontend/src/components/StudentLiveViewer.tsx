/**
 * StudentLiveViewer.tsx
 *
 * Step 4: Mediasoup consumer for students.
 *
 * Responsibilities:
 *  - Connect to Mediasoup SFU via Socket.io
 *  - Fetch the list of active producers from the server
 *  - Consume Teacher's video + audio tracks
 *  - Show a "Speak" button: grabs student's mic and produces an audio track
 *    back to the SFU so everyone (including teacher) hears them
 *  - Handle 'newProducer' events so latecomers see future tracks automatically
 *  - Handle 'stream-ended' to show a "Session has ended" message
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import * as mediasoupClient from 'mediasoup-client';
import type { Device } from 'mediasoup-client';
import type { Transport } from 'mediasoup-client/lib/Transport';
import { Play, GraduationCap, Users } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────

interface Props {
  sessionId: string;
  onStreamEnded?: () => void;
}

type ViewerState = 'idle' | 'connecting' | 'watching' | 'speaking' | 'ended';

// ─── Component ────────────────────────────────────────────────────────────

const StudentLiveViewer: React.FC<Props> = ({ sessionId, onStreamEnded }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const deviceRef = useRef<Device | null>(null);
  const recvTransportRef = useRef<Transport | null>(null);
  const sendTransportRef = useRef<Transport | null>(null);  // for speaking
  const micStreamRef = useRef<MediaStream | null>(null);

  const [state, setState] = useState<ViewerState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [speakerActive, setSpeakerActive] = useState(false);
  const [participantCount, setParticipantCount] = useState<number | null>(null);

  const SOCKET_URL =
    process.env.REACT_APP_SOCKET_URL || 'http://localhost:5005';

  // ─── Join Stream ──────────────────────────────────────────────────────────

  const joinStream = useCallback(async () => {
    setError(null);
    setState('connecting');

    try {
      const token = localStorage.getItem('token');
      const socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket'],
      });
      socketRef.current = socket;

      // Listen for 'stream-ended' from backend
      socket.on('stream-ended', ({ sessionId: sid }: { sessionId: string }) => {
        if (sid === sessionId) {
          setState('ended');
          onStreamEnded?.();
        }
      });

      // Listen for new producers (e.g. student speaks after we joined)
      socket.on('newProducer', async ({ producerId, kind }: { producerId: string; kind: string }) => {
        if (kind === 'video' || kind === 'audio') {
          await consumeProducer(producerId, socket, deviceRef.current!);
        }
      });

      await new Promise<void>((resolve, reject) => {
        socket.on('connect_error', (err) => reject(err));
        socket.on('connect', () => resolve());
      });

      // 1. Load Device
      const device = new mediasoupClient.Device();
      deviceRef.current = device;

      await new Promise<void>((resolve, reject) => {
        socket.emit('getRouterRtpCapabilities', async (rtpCapabilities: any) => {
          if (rtpCapabilities?.error) return reject(new Error(rtpCapabilities.error));
          try {
            await device.load({ routerRtpCapabilities: rtpCapabilities });
            resolve();
          } catch (e: any) {
            reject(e);
          }
        });
      });

      // 2. Create Receive Transport
      const recvParams = await new Promise<any>((resolve) => {
        socket.emit('createWebRtcTransport', resolve);
      });

      if (recvParams?.error) throw new Error(recvParams.error);

      const recvTransport = device.createRecvTransport(recvParams);
      recvTransportRef.current = recvTransport;

      recvTransport.on('connect', ({ dtlsParameters }, callback, errback) => {
        socket.emit(
          'connectTransport',
          { transportId: recvTransport.id, dtlsParameters },
          (res: any) => (res?.error ? errback(new Error(res.error)) : callback()),
        );
      });

      // 3. Fetch and consume all active producers
      const producers: Array<{ id: string; kind: string }> = await new Promise(
        (resolve) => socket.emit('getActiveProducers', resolve),
      );
      setParticipantCount(producers.filter(p => p.kind === 'audio').length);

      for (const producer of producers) {
        await consumeProducer(producer.id, socket, device);
      }

      setState('watching');
    } catch (e: any) {
      setError(`Failed to join: ${e.message}`);
      setState('idle');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [SOCKET_URL, sessionId]);

  // ─── Consume a single producer ────────────────────────────────────────────

  const consumeProducer = async (
    producerId: string,
    socket: Socket,
    device: Device,
  ) => {
    const recvTransport = recvTransportRef.current;
    if (!recvTransport) return;

    const consumerInfo = await new Promise<any>((resolve) => {
      socket.emit(
        'consume',
        {
          transportId: recvTransport.id,
          producerId,
          rtpCapabilities: device.rtpCapabilities,
        },
        resolve,
      );
    });

    if (consumerInfo?.error) {
      console.warn('consume error:', consumerInfo.error);
      return;
    }

    const consumer = await recvTransport.consume(consumerInfo);

    if (consumer.kind === 'video' && videoRef.current) {
      // Attach video to the <video> element
      const stream = new MediaStream([consumer.track]);
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    } else if (consumer.kind === 'audio') {
      // Audio consumers: attach to a new Audio element so it auto-plays
      const audio = new Audio();
      audio.srcObject = new MediaStream([consumer.track]);
      audio.play().catch(() => {});
    }
  };

  // ─── Speak (Student Mic) ──────────────────────────────────────────────────

  const toggleSpeaking = async () => {
    if (speakerActive) {
      // Stop speaking
      micStreamRef.current?.getTracks().forEach(t => t.stop());
      sendTransportRef.current?.close();
      setSpeakerActive(false);
      setState('watching');
      return;
    }

    // Start speaking
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = micStream;

      const socket = socketRef.current!;
      const device = deviceRef.current!;

      // Create Send Transport for student's mic
      const sendParams = await new Promise<any>((resolve) => {
        socket.emit('createWebRtcTransport', resolve);
      });

      if (sendParams?.error) throw new Error(sendParams.error);

      const sendTransport = device.createSendTransport(sendParams);
      sendTransportRef.current = sendTransport;

      sendTransport.on('connect', ({ dtlsParameters }, callback, errback) => {
        socket.emit(
          'connectTransport',
          { transportId: sendTransport.id, dtlsParameters },
          (res: any) => (res?.error ? errback(new Error(res.error)) : callback()),
        );
      });

      sendTransport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
        socket.emit(
          'produce',
          { transportId: sendTransport.id, kind, rtpParameters },
          (res: any) =>
            res?.error ? errback(new Error(res.error)) : callback({ id: res.id }),
        );
      });

      const audioTrack = micStream.getAudioTracks()[0];
      await sendTransport.produce({ track: audioTrack });

      setSpeakerActive(true);
      setState('speaking');
    } catch (e: any) {
      setError(`Could not start microphone: ${e.message}`);
    }
  };

  // ─── Cleanup ──────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      micStreamRef.current?.getTracks().forEach(t => t.stop());
      socketRef.current?.disconnect();
    };
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────────

  if (state === 'ended') {
    return (
      <div style={styles.container}>
        <div style={styles.ended}>
          <span style={{ fontSize: '3rem' }}><span className="inline-flex items-center justify-center"><GraduationCap className="w-4 h-4" /></span></span>
          <h2 style={{ margin: '0.5rem 0 0.25rem', color: '#f8fafc' }}>Session Ended</h2>
          <p style={{ color: '#94a3b8', margin: 0 }}>
            The teacher has ended this live session.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Video */}
      <div style={styles.videoWrapper}>
        <video ref={videoRef} autoPlay playsInline style={styles.video} />

        {(state === 'idle' || state === 'connecting') && (
          <div style={styles.overlay}>
            {state === 'idle' ? 'Ready to join' : 'Connecting…'}
          </div>
        )}

        {state === 'watching' && participantCount !== null && (
          <div style={styles.participantBadge}>
            <span className="inline-flex items-center justify-center"><Users className="w-4 h-4" /></span> {participantCount + 1} watching
          </div>
        )}

        {state === 'speaking' && (
          <div style={styles.speakingBadge}>
            🎙️ You are speaking
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={styles.controls}>
        {error && <p style={styles.error}>{error}</p>}

        {state === 'idle' && (
          <button id="student-join-btn" style={styles.joinBtn} onClick={joinStream}>
            <span className="inline-flex items-center justify-center"><Play className="w-4 h-4" /></span> Join Live Session
          </button>
        )}

        {(state === 'watching' || state === 'speaking') && (
          <button
            id="student-speak-btn"
            style={speakerActive ? styles.muteBtn : styles.speakBtn}
            onClick={toggleSpeaking}
          >
            {speakerActive ? '🔇 Mute' : '🎙️ Speak'}
          </button>
        )}

        {state === 'connecting' && (
          <button disabled style={{ ...styles.joinBtn, opacity: 0.6 }}>
            Connecting…
          </button>
        )}
      </div>

      <p style={styles.hint}>
        {state === 'idle'
          ? 'Click "Join Live Session" to watch the teacher\'s broadcast.'
          : state === 'watching'
          ? 'Watching live. Click "Speak" to ask a question.'
          : state === 'speaking'
          ? 'You are speaking. Everyone can hear you.'
          : ''}
      </p>
    </div>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
    padding: '1.5rem',
    background: '#0f172a',
    borderRadius: '1rem',
    color: '#f8fafc',
    fontFamily: 'Inter, system-ui, sans-serif',
    maxWidth: '860px',
    margin: '0 auto',
  },
  videoWrapper: {
    position: 'relative',
    width: '100%',
    maxWidth: '720px',
    aspectRatio: '16/9',
    background: '#1e293b',
    borderRadius: '0.75rem',
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0,0,0,0.6)',
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#fff',
  },
  participantBadge: {
    position: 'absolute',
    top: '0.75rem',
    right: '0.75rem',
    background: 'rgba(15,23,42,0.8)',
    color: '#f8fafc',
    padding: '0.3rem 0.75rem',
    borderRadius: '9999px',
    fontSize: '0.8rem',
    fontWeight: 600,
  },
  speakingBadge: {
    position: 'absolute',
    top: '0.75rem',
    left: '0.75rem',
    background: 'rgba(34,197,94,0.9)',
    color: '#fff',
    padding: '0.3rem 0.75rem',
    borderRadius: '9999px',
    fontSize: '0.8rem',
    fontWeight: 700,
  },
  controls: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.75rem',
    width: '100%',
    maxWidth: '360px',
  },
  joinBtn: {
    width: '100%',
    padding: '0.85rem 1.5rem',
    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
    color: '#fff',
    border: 'none',
    borderRadius: '0.6rem',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
  speakBtn: {
    width: '100%',
    padding: '0.75rem 1.5rem',
    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
    color: '#fff',
    border: 'none',
    borderRadius: '0.6rem',
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  muteBtn: {
    width: '100%',
    padding: '0.75rem 1.5rem',
    background: 'linear-gradient(135deg, #6b7280, #374151)',
    color: '#fff',
    border: 'none',
    borderRadius: '0.6rem',
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  error: {
    color: '#f87171',
    fontSize: '0.875rem',
    textAlign: 'center',
    margin: 0,
  },
  hint: {
    color: '#94a3b8',
    fontSize: '0.8rem',
    textAlign: 'center',
    margin: 0,
    maxWidth: '560px',
  },
  ended: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '3rem 1.5rem',
    textAlign: 'center',
    gap: '0.5rem',
  },
};

export default StudentLiveViewer;
