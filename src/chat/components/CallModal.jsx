import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';
import { db } from '../../firebase-config';
import {
  doc, collection, setDoc, addDoc,
  onSnapshot, updateDoc, getDoc,
} from 'firebase/firestore';

/* ── avatar helpers ─────────────────────────────────────────────────────── */
const AVATAR = [
  'linear-gradient(135deg,#6366f1,#8b5cf6)',
  'linear-gradient(135deg,#06b6d4,#3b82f6)',
  'linear-gradient(135deg,#f59e0b,#f97316)',
  'linear-gradient(135deg,#10b981,#059669)',
  'linear-gradient(135deg,#ec4899,#f43f5e)',
];
const avatarBg = n => AVATAR[(n?.charCodeAt(0) || 0) % AVATAR.length];

/* ── STUN servers (Google public) ───────────────────────────────────────── */
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

/* ══════════════════════════════════════════════════════════════════════════ */
export default function CallModal({
  type,
  chat,
  currentUserId,
  isReceiver     = false,
  incomingCallId = null,
  onClose,
}) {
  const [muted,    setMuted]    = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [elapsed,  setElapsed]  = useState(0);
  const [status,   setStatus]   = useState(isReceiver ? 'Connecting…' : 'Calling…');

  /* plain DOM refs — we set .srcObject imperatively */
  const localVideoEl  = useRef(null);
  const remoteVideoEl = useRef(null);
  const remoteAudioEl = useRef(null);

  /* WebRTC / call state */
  const pcRef          = useRef(null);
  const localStreamRef = useRef(null);
  const callDocRef     = useRef(null);
  const unsubs         = useRef([]);
  const timerRef       = useRef(null);
  const hangingUp      = useRef(false);

  /* ── cleanup ──────────────────────────────────────────────────────────── */
  const cleanup = useCallback(() => {
    unsubs.current.forEach(u => { try { u(); } catch (_) {} });
    unsubs.current = [];
    clearInterval(timerRef.current);
    timerRef.current = null;
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    pcRef.current?.close();
    pcRef.current         = null;
    localStreamRef.current = null;
  }, []);

  /* ── hangup ───────────────────────────────────────────────────────────── */
  const handleHangup = useCallback(async () => {
    if (hangingUp.current) return;
    hangingUp.current = true;
    cleanup();
    if (callDocRef.current) {
      try { await updateDoc(callDocRef.current, { status: 'ended' }); } catch (_) {}
    }
    onClose();
  }, [cleanup, onClose]);

  /* ── WebRTC setup ─────────────────────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    // Keep a stable reference to handleHangup inside effect
    const doHangup = () => handleHangup();

    const run = async () => {
      try {
        /* ── 1. Grab local mic (+ camera for video calls) ── */
        const localStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: type === 'video',
        });
        if (cancelled) { localStream.getTracks().forEach(t => t.stop()); return; }
        localStreamRef.current = localStream;

        /* Show my own camera in the PiP box */
        if (localVideoEl.current) localVideoEl.current.srcObject = localStream;

        /* ── 2. Create RTCPeerConnection ── */
        const pc = new RTCPeerConnection(ICE_SERVERS);
        pcRef.current = pc;

        /* ── 3. Add my tracks so the remote peer receives them ── */
        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

        /* ── 4. Handle incoming remote tracks ── */
        const remoteStream = new MediaStream();
        const iceQueue = [];

        const processIceQueue = () => {
          if (!pcRef.current || !pcRef.current.remoteDescription) return;
          console.log(`[CallModal] Applying ${iceQueue.length} queued ICE candidates`);
          while (iceQueue.length > 0) {
            const candidate = iceQueue.shift();
            pcRef.current.addIceCandidate(candidate).catch(err => {
              console.warn('[CallModal] addIceCandidate from queue failed:', err);
            });
          }
        };

        pc.ontrack = (event) => {
          // event.track is always present; event.streams may be empty
          remoteStream.addTrack(event.track);

          // (re-)assign srcObject every time so the elements definitely play
          if (remoteAudioEl.current) {
            remoteAudioEl.current.srcObject = remoteStream;
            remoteAudioEl.current.play().catch(err => {
              console.warn('[CallModal] remoteAudioEl.play() failed:', err);
            });
          }
          if (type === 'video' && remoteVideoEl.current) {
            remoteVideoEl.current.srcObject = remoteStream;
            remoteVideoEl.current.play().catch(err => {
              console.warn('[CallModal] remoteVideoEl.play() failed:', err);
            });
          }

          setStatus('Connected');
          if (!timerRef.current) {
            timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
          }
        };

        /* ── ICE helpers ── */
        const startSendingICE = (col) => {
          pc.onicecandidate = (e) => {
            if (e.candidate) {
              addDoc(col, e.candidate.toJSON()).catch(() => {});
            }
          };
        };

        const startReceivingICE = (col) => {
          const unsub = onSnapshot(col, (snap) => {
            snap.docChanges().forEach((change) => {
              if (change.type === 'added') {
                const candidate = new RTCIceCandidate(change.doc.data());
                if (pc.remoteDescription) {
                  pc.addIceCandidate(candidate).catch(err => {
                    console.warn('[CallModal] addIceCandidate failed:', err);
                  });
                } else {
                  console.log('[CallModal] Queueing remote ICE candidate');
                  iceQueue.push(candidate);
                }
              }
            });
          });
          unsubs.current.push(unsub);
        };

        /* ═══════════════ CALLER side ═══════════════ */
        if (!isReceiver) {
          const callDoc      = doc(collection(db, 'calls'));
          callDocRef.current = callDoc;

          const offerCandidates  = collection(callDoc, 'offerCandidates');
          const answerCandidates = collection(callDoc, 'answerCandidates');

          /* Send my ICE candidates */
          startSendingICE(offerCandidates);

          /* Create & send offer */
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          const receiverId =
            (chat.participants || []).find(id => id !== currentUserId) || 'unknown';

          await setDoc(callDoc, {
            chatId:     chat.id,
            callerId:   currentUserId,
            receiverId,
            type,
            status:     'calling',
            offer:      { type: offer.type, sdp: offer.sdp },
          });

          /* Listen for the answer */
          const unsubDoc = onSnapshot(callDoc, async (snap) => {
            if (cancelled) return;
            const data = snap.data();
            if (!data) return;
            if (data.status === 'ended' || data.status === 'declined') {
              doHangup(); return;
            }
            if (data.answer && !pc.currentRemoteDescription) {
              try {
                await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
                processIceQueue();
              } catch (_) {}
            }
          });
          unsubs.current.push(unsubDoc);

          /* Receive the receiver's ICE candidates */
          startReceivingICE(answerCandidates);

        /* ═══════════════ RECEIVER side ═══════════════ */
        } else {
          const callDoc      = doc(db, 'calls', incomingCallId);
          callDocRef.current = callDoc;

          const offerCandidates  = collection(callDoc, 'offerCandidates');
          const answerCandidates = collection(callDoc, 'answerCandidates');

          /* Send my ICE candidates */
          startSendingICE(answerCandidates);

          /* Read the offer */
          const snap = await getDoc(callDoc);
          if (!snap.exists() || cancelled) { doHangup(); return; }

          const { offer } = snap.data();
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          processIceQueue();

          /* Create & send answer */
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          await updateDoc(callDoc, {
            status: 'answered',
            answer: { type: answer.type, sdp: answer.sdp },
          });

          /* Receive the caller's ICE candidates */
          startReceivingICE(offerCandidates);

          /* Watch for caller's hangup */
          const unsubDoc = onSnapshot(callDoc, (snap2) => {
            if (cancelled) return;
            const d = snap2.data();
            if (!d || d.status === 'ended') doHangup();
          });
          unsubs.current.push(unsubDoc);
        }

      } catch (err) {
        if (!cancelled) {
          console.error('[CallModal] error:', err);
          setStatus('Error: ' + err.message);
        }
      }
    };

    run();
    return () => { cancelled = true; cleanup(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── mic / camera toggles ─────────────────────────────────────────────── */
  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = muted; });
    setMuted(m => !m);
  };
  const toggleVideo = () => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = videoOff; });
    setVideoOff(v => !v);
  };

  const fmtTime = s =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  /* ── render ───────────────────────────────────────────────────────────── */
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(10,12,28,.93)', backdropFilter: 'blur(16px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>

      {/*
        CRITICAL: <audio> element for remote audio stream.
        - Must be always in DOM (no conditional render)
        - autoPlay + playsInline
        - srcObject set imperatively inside pc.ontrack (NOT via a callback ref)
        - position: fixed with very small size instead of display:none,
          because some browsers won't play audio on display:none elements
      */}
      <audio
        ref={remoteAudioEl}
        autoPlay
        playsInline
        style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}
      />

      <div style={{
        width:  type === 'video' ? 860 : 360,
        height: type === 'video' ? 580 : 'auto',
        background: 'linear-gradient(160deg,#1e1b4b,#312e81)',
        borderRadius: 28, overflow: 'hidden',
        boxShadow: '0 32px 80px rgba(0,0,0,.65)',
        display: 'flex', flexDirection: 'column', position: 'relative',
      }}>

        {/* ── VIDEO CALL UI ─────────────────────────────────────────────── */}
        {type === 'video' && (
          <div style={{ flex: 1, position: 'relative', background: '#080810', minHeight: 0 }}>

            {/* Remote video — full frame */}
            <video
              ref={remoteVideoEl}
              autoPlay playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />

            {/* Waiting overlay */}
            {status !== 'Connected' && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                background: 'rgba(8,8,16,0.8)',
              }}>
                <div style={{
                  width: 82, height: 82, borderRadius: '50%',
                  background: avatarBg(chat.name),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 30, fontWeight: 800, color: '#fff', marginBottom: 18,
                  animation: 'ringPulse 2s ease-in-out infinite',
                }}>{chat.initials}</div>
                <p style={{ color: '#c7d2fe', fontWeight: 700, fontSize: 15, margin: 0 }}>{status}</p>
              </div>
            )}

            {/* My camera — picture-in-picture */}
            <div style={{
              position: 'absolute', right: 18, bottom: 90,
              width: 138, height: 184,
              background: '#000', borderRadius: 16, overflow: 'hidden',
              border: '2px solid rgba(255,255,255,0.2)',
              boxShadow: '0 8px 28px rgba(0,0,0,0.55)',
            }}>
              <video
                ref={localVideoEl}
                autoPlay muted playsInline
                style={{
                  width: '100%', height: '100%', objectFit: 'cover',
                  opacity: videoOff ? 0 : 1, transition: 'opacity .25s',
                }}
              />
              {videoOff && (
                <div style={{
                  position: 'absolute', inset: 0, background: '#1e293b',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <VideoOff size={28} color="#64748b" />
                </div>
              )}
              <span style={{
                position: 'absolute', bottom: 6, left: 0, right: 0,
                textAlign: 'center', fontSize: 10,
                color: 'rgba(255,255,255,0.55)', fontWeight: 600,
              }}>You</span>
            </div>
          </div>
        )}

        {/* ── VOICE CALL INFO (avatar + name) ───────────────────────────── */}
        <div style={{
          padding: type === 'video' ? '14px 24px 10px' : '38px 24px 18px',
          textAlign: 'center',
          background: type === 'video' ? '#1e1b4b' : 'transparent',
        }}>
          {type === 'audio' && (
            <div style={{
              width: 90, height: 90, borderRadius: '50%',
              background: avatarBg(chat.name),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 32, fontWeight: 800, color: '#fff',
              margin: '0 auto 22px',
              animation: 'ringPulse 2s ease-in-out infinite',
            }}>{chat.initials}</div>
          )}
          <p style={{
            color: '#a5b4fc', fontSize: 11, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.14em', margin: '0 0 6px',
          }}>
            {type === 'video' ? '📹 Video Call' : '📞 Voice Call'}
          </p>
          <h3 style={{ color: '#fff', fontSize: 20, fontWeight: 800, margin: '0 0 4px' }}>
            {chat.name}
          </h3>
          <p style={{ color: '#818cf8', fontSize: 13, margin: 0 }}>
            {status === 'Connected' ? fmtTime(elapsed) : status}
          </p>
        </div>

        {/* ── CONTROLS ──────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 18,
          padding: '14px 24px 28px',
          background: type === 'video' ? '#1e1b4b' : 'transparent',
        }}>
          <button onClick={toggleMute} title={muted ? 'Unmute' : 'Mute'} style={ctrlBtn(muted ? '#ef4444' : 'rgba(255,255,255,.15)')}>
            {muted ? <MicOff size={20} color="#fff" /> : <Mic size={20} color="#fff" />}
          </button>
          {type === 'video' && (
            <button onClick={toggleVideo} title={videoOff ? 'Turn on camera' : 'Turn off camera'} style={ctrlBtn(videoOff ? '#ef4444' : 'rgba(255,255,255,.15)')}>
              {videoOff ? <VideoOff size={20} color="#fff" /> : <Video size={20} color="#fff" />}
            </button>
          )}
          <button onClick={handleHangup} title="Hang up" style={ctrlBtn('#ef4444')}>
            <PhoneOff size={20} color="#fff" />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes ringPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0); }
          50%       { box-shadow: 0 0 0 20px rgba(99,102,241,0.22); }
        }
      `}</style>
    </div>
  );
}

const ctrlBtn = bg => ({
  width: 54, height: 54, borderRadius: '50%', border: 'none',
  background: bg, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'transform .15s, background .2s',
  boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
});
