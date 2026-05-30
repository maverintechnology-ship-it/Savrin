import { useState, useEffect, useRef } from 'react';
import {
  Search, Plus, Archive, Settings, Users, MessageCircle, X, Hash, ChevronRight
} from 'lucide-react';
import {
  doc, setDoc, serverTimestamp, collection, query,
  where, onSnapshot, orderBy, limit, getDocs
} from 'firebase/firestore';
import { db } from '../../firebase-config';

/* ── Unread badge ─────────────────────────────────────────────────────────── */
function UnreadBadge({ chatId, currentUserId, isActive }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!chatId || !currentUserId || isActive) { setCount(0); return; }
    // Fetch all messages then filter client-side to avoid needing a composite index
    const unsub = onSnapshot(
      collection(db, 'chats', chatId, 'messages'),
      snap => {
        const unread = snap.docs.filter(d => {
          const data = d.data();
          return data.sender !== currentUserId && !data.readBy?.includes(currentUserId);
        });
        setCount(unread.length);
      },
      err => console.warn('[UnreadBadge]', err.message)
    );
    return unsub;
  }, [chatId, currentUserId, isActive]);

  if (!count) return null;
  return (
    <div style={{
      minWidth: 18, height: 18,
      background: 'linear-gradient(135deg,#f26430,#e91e8c)',
      color: '#fff', fontSize: 10, fontWeight: 800,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: 9, padding: '0 5px',
      boxShadow: '0 2px 6px rgba(242,100,48,.45)',
    }}>{count}</div>
  );
}

/* ── Last message preview ─────────────────────────────────────────────────── */
function LastMsg({ chat, activeId }) {
  const [msg, setMsg] = useState(chat.lastMessage || null);
  useEffect(() => {
    if (chat.lastMessage) { setMsg(chat.lastMessage); return; }
    const q = query(
      collection(db, 'chats', chat.id, 'messages'),
      orderBy('timestamp', 'desc'), limit(1)
    );
    const unsub = onSnapshot(q, s => {
      if (s.empty) { setMsg(null); return; }
      const d = s.docs[0].data();
      setMsg(d.type?.startsWith('audio') ? '🎤 Voice message' : d.fileUrl ? '📎 File' : d.text || null);
    }, e => console.error(e));
    return unsub;
  }, [chat.id, chat.lastMessage]);

  const active = activeId === chat.id;
  return (
    <p style={{
      fontSize: 11.5, fontWeight: active ? 700 : 500,
      color: active ? '#6366f1' : '#94a3b8',
      textTransform: 'uppercase', letterSpacing: '0.06em',
      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160,
    }}>
      {active ? '● CONNECTED' : (msg || 'Say hi…')}
    </p>
  );
}

/* ── Avatar colour ────────────────────────────────────────────────────────── */
const AVATAR_COLORS = [
  'linear-gradient(135deg,#6366f1,#8b5cf6)',
  'linear-gradient(135deg,#06b6d4,#3b82f6)',
  'linear-gradient(135deg,#f59e0b,#f97316)',
  'linear-gradient(135deg,#10b981,#059669)',
  'linear-gradient(135deg,#ec4899,#f43f5e)',
];
const avatarColor = name => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

const TABS = [
  { id: 'chats',    icon: MessageCircle, label: 'Chats' },
  { id: 'groups',   icon: Hash,          label: 'Groups' },
  { id: 'archive',  icon: Archive,       label: 'Archive' },
  { id: 'settings', icon: Settings,      label: 'Settings' },
];

/* ══════════════════════════════════════════════════════════════════════════ */
export default function ChatSidebar({
  activeId, list, onSelect, activeTab, setActiveTab,
  currentUserId, currentUserData,
}) {
  const [searchTerm, setSearchTerm]   = useState('');
  const [showPicker, setShowPicker]   = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [companyUsers, setCompanyUsers] = useState([]);
  const pickerRef = useRef(null);

  /* Load company users for people-picker */
  useEffect(() => {
    if (!currentUserData?.companyId) return;
    const q = query(
      collection(db, 'users'),
      where('companyId', '==', currentUserData.companyId)
    );
    const unsub = onSnapshot(q, snap => {
      setCompanyUsers(
        snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(u => u.id !== currentUserId)
      );
    });
    return unsub;
  }, [currentUserData?.companyId, currentUserId]);

  /* Close picker on outside click */
  useEffect(() => {
    const handler = e => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setShowPicker(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* Start or open a DM with another user */
  const startChat = async (otherUser) => {
    const chatId = [currentUserId, otherUser.id].sort().join('_');
    const participantNames = {
      [currentUserId]: currentUserData?.name || currentUserId,
      [otherUser.id]:  otherUser.name || otherUser.id,
    };
    await setDoc(doc(db, 'chats', chatId), {
      participants:     [currentUserId, otherUser.id],
      participantNames,
      updatedAt:        serverTimestamp(),
      isArchived:       false,
      isGroup:          false,
    }, { merge: true });
    setShowPicker(false);
    setPickerSearch('');
    onSelect(chatId);
  };

  const filtered = list.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pickerFiltered = companyUsers.filter(u =>
    u.name?.toLowerCase().includes(pickerSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(pickerSearch.toLowerCase())
  );

  return (
    <div style={{
      width: 310, height: '100%', display: 'flex', flexDirection: 'column',
      background: '#fff', borderRight: '1px solid #f1f5f9',
      position: 'relative', zIndex: 10, overflow: 'hidden', flexShrink: 0,
    }}>

      {/* ── HEADER ───────────────────────────────────────────────────── */}
      <div style={{
        padding: '20px 18px 0',
        background: 'linear-gradient(160deg,#f8f7ff 0%,#fff 100%)',
      }}>
        {/* Title + Add button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34,
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(99,102,241,.35)',
            }}>
              <MessageCircle size={16} color="#fff" strokeWidth={2.5} />
            </div>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: '#1e293b', letterSpacing: '-0.4px', margin: 0 }}>
              Messages
            </h2>
          </div>
          <button
            onClick={() => setShowPicker(p => !p)}
            title="New chat"
            style={{
              width: 32, height: 32,
              background: showPicker ? '#fee2e2' : 'linear-gradient(135deg,#eef2ff,#e0e7ff)',
              border: 'none', borderRadius: 10, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(99,102,241,.12)',
            }}
          >
            {showPicker
              ? <X size={14} color="#ef4444" strokeWidth={3} />
              : <Plus size={14} color="#6366f1" strokeWidth={3} />}
          </button>
        </div>

        {/* ── People Picker ── */}
        {showPicker && (
          <div ref={pickerRef} style={{
            background: '#fff', border: '1.5px solid #c7d2fe',
            borderRadius: 14, overflow: 'hidden',
            boxShadow: '0 8px 30px rgba(99,102,241,.18)',
            marginBottom: 14,
            animation: 'slideDown .2s ease',
          }}>
            <div style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ position: 'relative' }}>
                <Search size={13} color="#94a3b8" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  autoFocus
                  value={pickerSearch}
                  onChange={e => setPickerSearch(e.target.value)}
                  placeholder="Search team members…"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    border: '1.5px solid #e2e8f0', borderRadius: 9,
                    padding: '7px 10px 7px 28px',
                    fontSize: 12, fontWeight: 600, color: '#334155', outline: 'none',
                    background: '#f8fafc',
                  }}
                />
              </div>
            </div>
            <div style={{ maxHeight: 220, overflowY: 'auto' }}>
              {pickerFiltered.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
                  No team members found
                </div>
              ) : pickerFiltered.map(u => (
                <button
                  key={u.id}
                  onClick={() => startChat(u)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', background: 'transparent', border: 'none',
                    cursor: 'pointer', textAlign: 'left', transition: 'background .15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8f7ff'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: avatarColor(u.name),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 800, fontSize: 12,
                  }}>
                    {(u.name || '?').slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {u.name}
                    </p>
                    <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', fontWeight: 500, textTransform: 'capitalize' }}>
                      {u.role}
                    </p>
                  </div>
                  <ChevronRight size={14} color="#c7d2fe" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Icon Tab Bar ── */}
        <div style={{
          display: 'flex', background: '#f1f5f9', borderRadius: 14,
          padding: 4, marginBottom: 14, gap: 2,
        }}>
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                title={tab.label}
                style={{
                  flex: 1, height: 36,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  border: 'none', borderRadius: 11, cursor: 'pointer',
                  background: active ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'transparent',
                  color: active ? '#fff' : '#94a3b8',
                  transition: 'all .22s cubic-bezier(.4,0,.2,1)',
                  boxShadow: active ? '0 4px 12px rgba(99,102,241,.3)' : 'none',
                  transform: active ? 'scale(1.03)' : 'scale(1)',
                  fontWeight: 700, fontSize: 9, letterSpacing: '0.07em', textTransform: 'uppercase',
                }}
              >
                <tab.icon size={14} strokeWidth={active ? 2.5 : 2} />
                {active && <span>{tab.label}</span>}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <Search size={13} color="#94a3b8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Search conversations…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: '#f8fafc', border: '1.5px solid #e2e8f0',
              borderRadius: 10, padding: '8px 10px 8px 30px',
              fontSize: 12.5, fontWeight: 500, color: '#475569', outline: 'none',
              transition: 'border-color .2s, box-shadow .2s',
            }}
            onFocus={e => { e.target.style.borderColor = '#a5b4fc'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,.1)'; }}
            onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
          />
        </div>

        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#94a3b8', paddingBottom: 8, borderBottom: '1px solid #f1f5f9' }}>
          {filtered.length} {activeTab === 'archive' ? 'Archived' : activeTab === 'groups' ? 'Groups' : 'Conversations'}
        </div>
      </div>

      {/* ── CHAT LIST ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
        <style>{`
          .chat-item:hover { background: #f8f7ff !important; }
          @keyframes slideDown { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        `}</style>

        {filtered.length > 0 ? filtered.map(chat => {
          const active = activeId === chat.id;
          const bg = avatarColor(chat.name);
          return (
            <div
              key={chat.id}
              className="chat-item"
              onClick={() => onSelect(chat.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 18px', cursor: 'pointer',
                background: active ? 'linear-gradient(90deg,#eef2ff,#f5f3ff)' : 'transparent',
                borderLeft: active ? '3px solid #6366f1' : '3px solid transparent',
                transition: 'all .18s ease',
              }}
            >
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 13,
                  background: active ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : bg,
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 13,
                  boxShadow: active ? '0 4px 14px rgba(99,102,241,.35)' : '0 2px 8px rgba(0,0,0,.08)',
                }}>
                  {chat.initials}
                </div>
                <div style={{
                  position: 'absolute', bottom: -1, right: -1,
                  width: 11, height: 11, background: '#10b981',
                  border: '2px solid #fff', borderRadius: '50%',
                }} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontWeight: 700, fontSize: 13.5, color: active ? '#4338ca' : '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 130 }}>
                    {chat.name}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: active ? '#818cf8' : '#cbd5e1', flexShrink: 0, marginLeft: 6 }}>
                    {chat.updatedAt?.toDate
                      ? chat.updatedAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : ''}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <LastMsg chat={chat} activeId={activeId} />
                  <UnreadBadge chatId={chat.id} currentUserId={currentUserId} isActive={active} />
                </div>
              </div>
            </div>
          );
        }) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', gap: 12 }}>
            <div style={{ width: 56, height: 56, background: 'linear-gradient(135deg,#eef2ff,#e0e7ff)', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageCircle size={24} color="#6366f1" strokeWidth={1.5} />
            </div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', textAlign: 'center', margin: 0 }}>
              {searchTerm ? 'No matches found' : 'No conversations yet'}
            </p>
            {!searchTerm && (
              <p style={{ fontSize: 11, color: '#cbd5e1', textAlign: 'center', margin: 0 }}>
                Click <strong style={{ color: '#6366f1' }}>+</strong> to start chatting
              </p>
            )}
          </div>
        )}
      </div>

      <div style={{ height: 32, background: 'linear-gradient(to top,#fff,transparent)', pointerEvents: 'none', marginTop: -32, position: 'relative', zIndex: 2 }} />
    </div>
  );
}
