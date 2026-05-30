import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send, MoreVertical, Paperclip, Video, Mic, Smile,
  Phone, File, X, Image, Link2, FileText, Ban,
  StopCircle, Loader2, ChevronRight, Play, Pause
} from 'lucide-react';
import {
  collection, addDoc, serverTimestamp, query, onSnapshot,
  orderBy, doc, updateDoc, arrayUnion
} from 'firebase/firestore';
import { db } from '../../firebase-config';
import { uploadFile } from '../utils/upload';
import CallModal from './CallModal';
import MediaDrawer from './MediaDrawer';

/* ── helpers ──────────────────────────────────────────────────────────────── */
const AVATAR = [
  'linear-gradient(135deg,#6366f1,#8b5cf6)',
  'linear-gradient(135deg,#06b6d4,#3b82f6)',
  'linear-gradient(135deg,#f59e0b,#f97316)',
  'linear-gradient(135deg,#10b981,#059669)',
  'linear-gradient(135deg,#ec4899,#f43f5e)',
];
const avatarBg = n => AVATAR[(n?.charCodeAt(0) || 0) % AVATAR.length];

function fmt(ts) {
  if (!ts?.toDate) return 'Now';
  return ts.toDate().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/* ── Audio player for voice messages ─────────────────────────────────────── */
function VoicePlayer({ url }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); }
    else { audioRef.current.play(); }
    setPlaying(!playing);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 180 }}>
      <audio
        ref={audioRef}
        src={url}
        onLoadedMetadata={e => setDuration(e.target.duration)}
        onTimeUpdate={e => setProgress(e.target.currentTime / (e.target.duration || 1))}
        onEnded={() => setPlaying(false)}
      />
      <button
        onClick={toggle}
        style={{
          width: 34, height: 34, borderRadius: '50%', border: 'none',
          background: 'rgba(255,255,255,.25)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}
      >
        {playing ? <Pause size={14} color="#fff" /> : <Play size={14} color="#fff" />}
      </button>
      <div style={{ flex: 1 }}>
        <div style={{ height: 4, background: 'rgba(255,255,255,.3)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress * 100}%`, background: '#fff', borderRadius: 99, transition: 'width .1s' }} />
        </div>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,.7)', marginTop: 3, display: 'block' }}>
          {duration ? `${Math.round(duration)}s` : '🎤 Voice'}
        </span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
export default function ChatWindow({ chat, currentUserId, currentUserData, fontSize }) {
  const [inputText, setInputText]     = useState('');
  const [messages, setMessages]       = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl]   = useState(null);
  const [chatError, setChatError]     = useState(null);

  // Voice recording
  const [recording, setRecording]     = useState(false);
  const [recSeconds, setRecSeconds]   = useState(0);
  const mediaRecRef  = useRef(null);
  const audioChunks  = useRef([]);
  const recTimerRef  = useRef(null);

  // Call
  const [callType, setCallType]       = useState(null); // null | 'audio' | 'video'

  // Drawer
  const [showDrawer, setShowDrawer]   = useState(false);
  const [showMenu, setShowMenu]       = useState(false);
  const menuRef = useRef(null);

  const messagesEndRef = useRef(null);
  const fileInputRef   = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!chat?.id || !currentUserId) return;
    setChatError(null);
    const q = query(
      collection(db, 'chats', chat.id, 'messages'),
      orderBy('timestamp', 'asc')
    );
    const unsub = onSnapshot(q, snap => {
      const fetched = snap.docs.map(docSnap => {
        const data = docSnap.data();
        if (data.sender !== currentUserId && !data.readBy?.includes(currentUserId)) {
          updateDoc(doc(db, 'chats', chat.id, 'messages', docSnap.id), {
            readBy: arrayUnion(currentUserId),
          }).catch(() => {});
        }
        return { id: docSnap.id, ...data };
      });
      setMessages(fetched);
    }, err => setChatError(err.message));
    return unsub;
  }, [chat?.id, currentUserId]);

  // Close 3-dot menu on outside click
  useEffect(() => {
    const h = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  /* ── File select & preview ── */
  const handleFileChange = e => {
    const f = e.target.files[0];
    if (!f) return;
    setSelectedFile(f);
    if (f.type.startsWith('image/')) setPreviewUrl(URL.createObjectURL(f));
    else setPreviewUrl(null);
    e.target.value = '';
  };

  /* ── Voice record ── */
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      audioChunks.current = [];
      rec.ondataavailable = e => {
        if (e.data && e.data.size > 0) {
          audioChunks.current.push(e.data);
        }
      };
      rec.onstop = async () => {
        try {
          if (audioChunks.current.length === 0) return;
          const mimeType = rec.mimeType || 'audio/webm';
          const extension = mimeType.split('/')[1]?.split(';')[0] || 'webm';
          const blob = new Blob(audioChunks.current, { type: mimeType });
          const file = new window.File([blob], `voice_${Date.now()}.${extension}`, { type: mimeType });
          await sendMessage('', file);
        } catch (err) {
          console.error('[Voice] Failed to send voice message:', err);
          setChatError(err.message);
        } finally {
          stream.getTracks().forEach(t => t.stop());
        }
      };
      // request data every 250ms to ensure chunks are recorded continuously
      rec.start(250);
      mediaRecRef.current = rec;
      setRecording(true);
      setRecSeconds(0);
      recTimerRef.current = setInterval(() => setRecSeconds(s => s + 1), 1000);
    } catch (err) {
      alert('Microphone access denied: ' + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecRef.current && mediaRecRef.current.state !== 'inactive') {
      mediaRecRef.current.stop();
    }
    clearInterval(recTimerRef.current);
    setRecording(false);
    setRecSeconds(0);
  };

  /* ── Send ── */
  const sendMessage = useCallback(async (text = '', file = null) => {
    if (!text.trim() && !file) return;
    try {
      setIsUploading(true);
      setChatError(null);
      let fileUrl = null, fileName = null, fileType = null;
      if (file) {
        fileUrl  = await uploadFile(file);
        fileName = file.name;
        fileType = file.type;
      }
      const msgData = {
        sender:    currentUserId,
        senderName: currentUserData?.name || currentUserId,
        timestamp: serverTimestamp(),
        readBy:    [currentUserId],
      };
      if (text.trim()) msgData.text = text.trim();
      if (fileUrl) { msgData.fileUrl = fileUrl; msgData.fileName = fileName; msgData.type = fileType; }

      await addDoc(collection(db, 'chats', chat.id, 'messages'), msgData);
      await updateDoc(doc(db, 'chats', chat.id), {
        updatedAt:   serverTimestamp(),
        lastMessage: text.trim() || (fileType?.startsWith('audio') ? '🎤 Voice message' : '📎 File'),
        lastSender:  currentUserId,
      }).catch(() => {});
    } catch (err) {
      setChatError(err.message);
    } finally {
      setIsUploading(false);
    }
  }, [chat?.id, currentUserId, currentUserData?.name]);

  const handleSend = async e => {
    e.preventDefault();
    if (!inputText.trim() && !selectedFile) return;
    const t = inputText, f = selectedFile;
    setInputText(''); setSelectedFile(null); setPreviewUrl(null);
    await sendMessage(t, f);
  };

  const senderName = id => {
    if (id === currentUserId) return currentUserData?.name || 'You';
    return chat.participantNames?.[id] || chat.name || id;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff', position: 'relative', overflow: 'hidden' }}>

      {/* ── 1. HEADER ─────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 24px', borderBottom: '1px solid #f1f5f9',
        background: '#fff', zIndex: 10, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            background: avatarBg(chat.name),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: 14,
            boxShadow: '0 4px 14px rgba(99,102,241,.3)',
          }}>
            {chat.initials}
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#1e293b' }}>{chat.name}</h2>
            <p style={{ margin: 0, fontSize: 12, color: '#10b981', fontWeight: 600 }}>● Active now</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Audio call */}
          <button
            onClick={() => {
              sendMessage('📞 Started a voice call.');
              setCallType('audio');
            }}
            style={headerBtn('#eef2ff','#6366f1')}
            title="Voice Call"
          >
            <Phone size={17} color="#6366f1" />
          </button>
          {/* Video call */}
          <button
            onClick={() => {
              sendMessage('📹 Started a video call.');
              setCallType('video');
            }}
            style={headerBtn('#eef2ff','#6366f1')}
            title="Video Call"
          >
            <Video size={17} color="#6366f1" />
          </button>
          {/* Three-dot menu */}
          <div style={{ position: 'relative' }} ref={menuRef}>
            <button
              onClick={() => setShowMenu(p => !p)}
              style={headerBtn(showMenu ? '#e0e7ff' : '#f8fafc', '#6366f1')}
            >
              <MoreVertical size={17} color="#6366f1" />
            </button>
            {showMenu && (
              <div style={{
                position: 'absolute', top: '110%', right: 0,
                background: '#fff', borderRadius: 14, border: '1px solid #f1f5f9',
                boxShadow: '0 12px 40px rgba(0,0,0,.14)',
                overflow: 'hidden', minWidth: 180, zIndex: 200,
                animation: 'slideDown .15s ease',
              }}>
                <style>{`@keyframes slideDown{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}`}</style>
                {[
                  { icon: Image,    label: 'Media',  action: () => { setShowDrawer(true); setShowMenu(false); } },
                  { icon: Link2,    label: 'Links',  action: () => { setShowDrawer(true); setShowMenu(false); } },
                  { icon: FileText, label: 'Docs',   action: () => { setShowDrawer(true); setShowMenu(false); } },
                  { icon: Ban,      label: 'Block',  action: () => { setShowDrawer(true); setShowMenu(false); }, danger: true },
                ].map(item => (
                  <button
                    key={item.label}
                    onClick={item.action}
                    style={{
                      width: '100%', padding: '11px 16px', border: 'none',
                      background: 'transparent', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
                      color: item.danger ? '#ef4444' : '#334155',
                      fontSize: 13, fontWeight: 600,
                      transition: 'background .1s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = item.danger ? '#fff5f5' : '#f8f7ff'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <item.icon size={15} />
                    {item.label}
                    <ChevronRight size={12} style={{ marginLeft: 'auto', opacity: 0.4 }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. MESSAGES ───────────────────────────────────────────────── */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '24px 28px',
        background: 'linear-gradient(180deg,#fafbff 0%,#fff 100%)',
        display: 'flex', flexDirection: 'column', gap: 4,
      }}>
        {chatError && (
          <div style={{ textAlign: 'center', fontSize: 12, color: '#ef4444', background: '#fff5f5', padding: '8px 12px', borderRadius: 8, marginBottom: 8 }}>
            {chatError}
          </div>
        )}

        {messages.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '8px 0 16px' }}>
            <div style={{ height: 1, background: '#e2e8f0', flex: 1 }} />
            <span style={{ padding: '0 12px', fontSize: 11, fontWeight: 600, color: '#94a3b8' }}>Today</span>
            <div style={{ height: 1, background: '#e2e8f0', flex: 1 }} />
          </div>
        )}

        {messages.map(msg => {
          const isMe = msg.sender === currentUserId;
          const time = fmt(msg.timestamp);
          const name = senderName(msg.sender);
          const isAudio = msg.type?.startsWith('audio');
          const isImage = msg.type?.startsWith('image/');

          return (
            <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: 6 }}>
              <div style={{ display: 'flex', gap: 10, maxWidth: '70%', flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end' }}>
                {/* Avatar */}
                <div style={{
                  width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                  background: isMe ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : avatarBg(name),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 800, fontSize: 11,
                  boxShadow: '0 2px 8px rgba(0,0,0,.1)',
                }}>
                  {name.slice(0, 2).toUpperCase()}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexDirection: isMe ? 'row-reverse' : 'row' }}>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b' }}>{name}</span>
                    <span style={{ fontSize: 10, color: '#94a3b8' }}>{time}</span>
                  </div>

                  {/* Bubble */}
                  <div style={{
                    padding: isAudio ? '10px 14px' : isImage ? '4px' : '11px 16px',
                    borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: isMe
                      ? 'linear-gradient(135deg,#6366f1,#8b5cf6)'
                      : '#f1f5f9',
                    color: isMe ? '#fff' : '#1e293b',
                    boxShadow: isMe
                      ? '0 4px 16px rgba(99,102,241,.3)'
                      : '0 2px 8px rgba(0,0,0,.06)',
                    maxWidth: 340,
                  }}>
                    {msg.text && (
                      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, wordBreak: 'break-word' }}>
                        {msg.text}
                      </p>
                    )}
                    {isImage && (
                      <img
                        src={msg.fileUrl}
                        alt="sent"
                        style={{ maxWidth: 260, maxHeight: 260, borderRadius: 14, display: 'block' }}
                      />
                    )}
                    {isAudio && <VoicePlayer url={msg.fileUrl} />}
                    {msg.fileUrl && !isImage && !isAudio && (
                      <a
                        href={msg.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: 8, color: isMe ? '#fff' : '#6366f1', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}
                      >
                        <File size={16} />
                        {msg.fileName || 'Download file'}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {messages.length === 0 && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: '#94a3b8', fontSize: 13, fontWeight: 500 }}>No messages yet. Say hello! 👋</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── 3. FILE PREVIEW ───────────────────────────────────────────── */}
      {selectedFile && (
        <div style={{
          padding: '10px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          {previewUrl
            ? <img src={previewUrl} alt="preview" style={{ height: 56, width: 56, objectFit: 'cover', borderRadius: 10 }} />
            : <div style={{ width: 56, height: 56, background: '#e0e7ff', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><File size={22} color="#6366f1" /></div>
          }
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedFile.name}</p>
            <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>{(selectedFile.size / 1024).toFixed(1)} KB</p>
          </div>
          <button onClick={() => { setSelectedFile(null); setPreviewUrl(null); }} style={{ background: '#fee2e2', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer' }}>
            <X size={14} color="#ef4444" />
          </button>
        </div>
      )}

      {/* ── 4. INPUT BAR ──────────────────────────────────────────────── */}
      <div style={{
        padding: '14px 24px 24px',
        borderTop: '1px solid #f1f5f9',
        background: '#fff',
        flexShrink: 0,
      }}>
        <form onSubmit={handleSend} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Attach */}
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: 'none' }}
            onChange={handleFileChange}
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.zip"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Attach file"
            style={iconBtn()}
          >
            <Paperclip size={18} color="#94a3b8" />
          </button>

          {/* Text input */}
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center',
            background: '#f8fafc', border: '1.5px solid #e2e8f0',
            borderRadius: 14, padding: '0 14px',
            transition: 'border-color .2s, box-shadow .2s',
          }}
            onFocusCapture={e => { e.currentTarget.style.borderColor = '#a5b4fc'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,.1)'; }}
            onBlurCapture={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <input
              type="text"
              placeholder={recording ? `Recording… ${recSeconds}s` : 'Type your message…'}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              disabled={recording}
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                fontSize: 14, fontWeight: 500, color: '#334155',
                padding: '11px 0',
              }}
            />
            <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <Smile size={18} color="#94a3b8" />
            </button>
          </div>

          {/* Voice / Send */}
          {inputText.trim() || selectedFile ? (
            <button
              type="submit"
              disabled={isUploading}
              style={{
                width: 44, height: 44, borderRadius: 14, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(99,102,241,.4)',
                transition: 'transform .15s',
              }}
            >
              {isUploading
                ? <Loader2 size={18} color="#fff" style={{ animation: 'spin 1s linear infinite' }} />
                : <Send size={18} color="#fff" />}
              <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
            </button>
          ) : (
            <button
              type="button"
              onClick={recording ? stopRecording : startRecording}
              disabled={isUploading}
              title={isUploading ? "Uploading voice message..." : recording ? "Click to send voice message" : "Click to record voice message"}
              style={{
                width: 44, height: 44, borderRadius: 14, border: 'none', cursor: isUploading ? 'not-allowed' : 'pointer',
                background: recording
                  ? 'linear-gradient(135deg,#ef4444,#dc2626)'
                  : 'linear-gradient(135deg,#f1f5f9,#e2e8f0)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: recording ? '0 4px 14px rgba(239,68,68,.4)' : 'none',
                transition: 'all .2s',
                opacity: isUploading ? 0.7 : 1,
              }}
            >
              {isUploading ? (
                <Loader2 size={18} color={recording ? "#fff" : "#94a3b8"} style={{ animation: 'spin 1s linear infinite' }} />
              ) : recording ? (
                <StopCircle size={18} color="#fff" />
              ) : (
                <Mic size={18} color="#94a3b8" />
              )}
            </button>
          )}
        </form>
      </div>

      {/* ── Info Drawer ───────────────────────────────────────────────── */}
      {showDrawer && (
        <MediaDrawer
          chat={chat}
          onClose={() => setShowDrawer(false)}
          onBlock={() => { alert(`${chat.name} has been blocked.`); setShowDrawer(false); }}
        />
      )}

      {/* ── Call Modal ────────────────────────────────────────────────── */}
      {callType && (
        <CallModal
          type={callType}
          chat={chat}
          currentUserId={currentUserId}
          onClose={() => setCallType(null)}
        />
      )}
    </div>
  );
}

/* shared small helpers */
const headerBtn = (bg, color) => ({
  width: 38, height: 38, borderRadius: 11, border: 'none',
  background: bg, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'all .15s',
});
const iconBtn = () => ({
  width: 38, height: 38, borderRadius: 11, border: 'none',
  background: '#f8fafc', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0,
});
