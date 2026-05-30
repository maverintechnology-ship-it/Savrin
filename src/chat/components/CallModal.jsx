import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';
import { db } from '../../firebase-config';
import { doc, collection, setDoc, addDoc, onSnapshot, updateDoc, getDoc, deleteDoc } from 'firebase/firestore';

const AVATAR = [
  'linear-gradient(135deg,#6366f1,#8b5cf6)',
  'linear-gradient(135deg,#06b6d4,#3b82f6)',
  'linear-gradient(135deg,#f59e0b,#f97316)',
  'linear-gradient(135deg,#10b981,#059669)',
  'linear-gradient(135deg,#ec4899,#f43f5e)',
];
const avatarBg = n => AVATAR[(n?.charCodeAt(0) || 0) % AVATAR.length];

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

export default function CallModal({ type, chat, currentUserId, isReceiver = false, incomingCallId = null, onClose }) {
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [status, setStatus] = useState(isReceiver ? 'Connecting...' : 'Calling...');
  
  const localRef = useRef(null);
  const remoteRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const callDocRef = useRef(null);
  const unsubs = useRef([]);

  useEffect(() => {
    let timer;
    const setupWebRTC = async () => {
      try {
        // 1. Get Local Media
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: type === 'video',
        });
        localStreamRef.current = stream;
        if (localRef.current) localRef.current.srcObject = stream;

        // 2. Initialize Peer Connection
        const pc = new RTCPeerConnection(servers);
        pcRef.current = pc;

        // 3. Setup Remote Stream
        remoteStreamRef.current = new MediaStream();
        if (remoteRef.current) remoteRef.current.srcObject = remoteStreamRef.current;

        // 4. Push local tracks to Peer Connection
        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream);
        });

        // 5. Pull remote tracks from Peer Connection
        pc.ontrack = event => {
          setStatus('Connected');
          event.streams[0].getTracks().forEach(track => {
            remoteStreamRef.current.addTrack(track);
          });
        };

        const receiverId = chat.participants?.find(id => id !== currentUserId) || 'unknown';

        if (!isReceiver) {
          // --- CALLER LOGIC ---
          // Create call document
          const newCallDoc = doc(collection(db, 'calls'));
          callDocRef.current = newCallDoc;
          
          const offerCandidates = collection(newCallDoc, 'offerCandidates');
          const answerCandidates = collection(newCallDoc, 'answerCandidates');

          // Handle ICE Candidates
          pc.onicecandidate = event => {
            if (event.candidate) {
              addDoc(offerCandidates, event.candidate.toJSON());
            }
          };

          // Create Offer
          const offerDescription = await pc.createOffer();
          await pc.setLocalDescription(offerDescription);

          const callData = {
            chatId: chat.id,
            callerId: currentUserId,
            receiverId: receiverId,
            type: type,
            status: 'calling',
            offer: {
              type: offerDescription.type,
              sdp: offerDescription.sdp,
            },
          };
          await setDoc(newCallDoc, callData);

          // Listen for Answer
          const unsubCall = onSnapshot(newCallDoc, (snapshot) => {
            const data = snapshot.data();
            if (!data) return; // doc deleted
            if (pc.currentRemoteDescription && data?.answer) return;
            if (data.status === 'ended' || data.status === 'declined') {
               handleHangup();
               return;
            }
            if (data.answer) {
              const answerDescription = new RTCSessionDescription(data.answer);
              pc.setRemoteDescription(answerDescription);
            }
          });
          unsubs.current.push(unsubCall);

          // Listen for remote ICE Candidates
          const unsubAnsCands = onSnapshot(answerCandidates, snapshot => {
            snapshot.docChanges().forEach(change => {
              if (change.type === 'added') {
                const candidate = new RTCIceCandidate(change.doc.data());
                pc.addIceCandidate(candidate);
              }
            });
          });
          unsubs.current.push(unsubAnsCands);

        } else {
          // --- RECEIVER LOGIC ---
          const callDoc = doc(db, 'calls', incomingCallId);
          callDocRef.current = callDoc;
          const offerCandidates = collection(callDoc, 'offerCandidates');
          const answerCandidates = collection(callDoc, 'answerCandidates');

          pc.onicecandidate = event => {
            if (event.candidate) {
              addDoc(answerCandidates, event.candidate.toJSON());
            }
          };

          const callData = (await getDoc(callDoc)).data();
          if (!callData) {
            handleHangup();
            return;
          }

          const offerDescription = callData.offer;
          await pc.setRemoteDescription(new RTCSessionDescription(offerDescription));

          const answerDescription = await pc.createAnswer();
          await pc.setLocalDescription(answerDescription);

          await updateDoc(callDoc, {
            status: 'answered',
            answer: {
              type: answerDescription.type,
              sdp: answerDescription.sdp,
            }
          });

          // Listen for remote ICE Candidates
          const unsubOfferCands = onSnapshot(offerCandidates, snapshot => {
            snapshot.docChanges().forEach(change => {
              if (change.type === 'added') {
                pc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
              }
            });
          });
          unsubs.current.push(unsubOfferCands);

          // Listen for Hangup
          const unsubCall = onSnapshot(callDoc, snapshot => {
            const data = snapshot.data();
            if (!data || data.status === 'ended') {
               handleHangup();
            }
          });
          unsubs.current.push(unsubCall);
        }

        timer = setInterval(() => setElapsed(s => s + 1), 1000);
      } catch (e) {
        console.warn('Media/WebRTC error:', e);
        setStatus('Error: ' + e.message);
      }
    };
    
    setupWebRTC();

    return () => {
      handleCleanup();
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, isReceiver, incomingCallId]);

  const handleCleanup = () => {
    unsubs.current.forEach(u => u());
    if (pcRef.current) {
      pcRef.current.close();
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach(t => t.stop());
    }
  };

  const handleHangup = async () => {
    handleCleanup();
    if (callDocRef.current) {
      try {
        await updateDoc(callDocRef.current, { status: 'ended' });
      } catch (e) {
        // Ignored
      }
    }
    onClose();
  };

  const fmtTime = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => {
        t.enabled = muted;
      });
      setMuted(!muted);
    }
  };
  
  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(t => {
        t.enabled = videoOff;
      });
      setVideoOff(!videoOff);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(15,23,42,.85)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: type === 'video' ? 800 : 340,
        height: type === 'video' ? 550 : 'auto',
        background: 'linear-gradient(160deg,#1e1b4b,#312e81)',
        borderRadius: 28, overflow: 'hidden',
        boxShadow: '0 32px 80px rgba(0,0,0,.5)',
        display: 'flex', flexDirection: 'column', position: 'relative'
      }}>
        {/* Remote Video Area (Big) */}
        {type === 'video' && (
          <div style={{ flex: 1, position: 'relative', background: '#0f0f1a' }}>
            <video ref={remoteRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            {status !== 'Connected' && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: avatarBg(chat.name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 16 }}>
                  {chat.initials}
                </div>
                <div style={{ color: '#fff', fontWeight: 600 }}>{status}</div>
              </div>
            )}
            
            {/* Local Video Area (Small PiP) */}
            <div style={{ position: 'absolute', right: 20, bottom: 20, width: 140, height: 200, background: '#000', borderRadius: 16, overflow: 'hidden', border: '2px solid rgba(255,255,255,0.2)', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
               <video ref={localRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: videoOff ? 0 : 1 }} />
               {videoOff && (
                 <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1e293b' }}>
                    <VideoOff size={32} color="#94a3b8" />
                 </div>
               )}
            </div>
          </div>
        )}

        {/* Info Area */}
        <div style={{ padding: '28px 24px 20px', textAlign: 'center', zIndex: 10, background: type === 'video' ? 'linear-gradient(0deg, #1e1b4b, transparent)' : 'none', position: type === 'video' ? 'absolute' : 'relative', bottom: type === 'video' ? 80 : 'auto', left: 0, right: 0 }}>
          {type === 'audio' && (
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: avatarBg(chat.name),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, fontWeight: 800, color: '#fff',
              margin: '0 auto 16px',
              boxShadow: '0 0 0 12px rgba(99,102,241,.2), 0 0 0 24px rgba(99,102,241,.1)',
            }}>
              {chat.initials}
            </div>
          )}
          <p style={{ color: '#a5b4fc', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 6px', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
            {type === 'video' ? '📹 Video Call' : '📞 Voice Call'}
          </p>
          <h3 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: '0 0 6px', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{chat.name}</h3>
          <p style={{ color: '#818cf8', fontSize: 14, margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{status === 'Connected' ? fmtTime(elapsed) : status}</p>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, padding: '0 24px 28px', zIndex: 10, position: type === 'video' ? 'absolute' : 'relative', bottom: 0, left: 0, right: 0, background: type === 'video' ? '#1e1b4b' : 'none', paddingTop: type === 'video' ? 24 : 0 }}>
          <button onClick={toggleMute} style={ctrlBtn(muted ? '#ef4444' : 'rgba(255,255,255,.12)')}>
            {muted ? <MicOff size={20} color="#fff" /> : <Mic size={20} color="#fff" />}
          </button>
          {type === 'video' && (
            <button onClick={toggleVideo} style={ctrlBtn(videoOff ? '#ef4444' : 'rgba(255,255,255,.12)')}>
              {videoOff ? <VideoOff size={20} color="#fff" /> : <Video size={20} color="#fff" />}
            </button>
          )}
          <button onClick={handleHangup} style={ctrlBtn('#ef4444')}>
            <PhoneOff size={20} color="#fff" />
          </button>
        </div>
      </div>
    </div>
  );
}

const ctrlBtn = bg => ({
  width: 52, height: 52, borderRadius: '50%', border: 'none',
  background: bg, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'transform .15s, opacity .15s',
});
