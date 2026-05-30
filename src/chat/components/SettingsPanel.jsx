import { useState } from 'react';
import { Palette, Type, User, MessageCircle, ChevronRight, Check, Sparkles, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase-config';

// ── Purge all chats + their messages subcollection ──────────────────────────
async function purgeAllChatData(onProgress) {
  const chatsSnap = await getDocs(collection(db, 'chats'));
  const chatDocs = chatsSnap.docs;
  let deleted = 0;

  for (const chatDoc of chatDocs) {
    // Delete every message inside this chat
    const messagesSnap = await getDocs(collection(db, 'chats', chatDoc.id, 'messages'));
    for (const msgDoc of messagesSnap.docs) {
      await deleteDoc(doc(db, 'chats', chatDoc.id, 'messages', msgDoc.id));
    }
    // Delete the chat document itself
    await deleteDoc(doc(db, 'chats', chatDoc.id));
    deleted++;
    onProgress(deleted, chatDocs.length);
  }
  return deleted;
}

export default function SettingsPanel({ user, fontSize, onUpdateFontSize, theme, onUpdateTheme }) {
  const [activeSection, setActiveSection] = useState('account');

  // Danger zone state
  const [deletePhase, setDeletePhase] = useState('idle'); // idle | confirm | deleting | done
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [confirmText, setConfirmText] = useState('');

  const handleDeleteAllChats = async () => {
    setDeletePhase('deleting');
    setProgress({ done: 0, total: 0 });
    try {
      await purgeAllChatData((done, total) => setProgress({ done, total }));
      setDeletePhase('done');
      setConfirmText('');
    } catch (err) {
      console.error('[Purge] Error:', err);
      alert('Error deleting chats: ' + err.message);
      setDeletePhase('confirm');
    }
  };

  const sections = [
    { id: 'account', label: 'Account',  icon: User,          desc: 'Manage your profile and username' },
    { id: 'theme',   label: 'Theme',    icon: Palette,       desc: 'Customize colors and layout' },
    { id: 'fonts',   label: 'Fonts',    icon: Type,          desc: 'Adjust text size for comfort' },
    { id: 'chat',    label: 'Chat',     icon: MessageCircle, desc: 'Messaging preferences' },
    { id: 'danger',  label: 'Danger',   icon: Trash2,        desc: 'Irreversible admin actions' },
  ];

  return (
    <div style={{
      flex: 1,
      height: '100%',
      display: 'flex',
      overflow: 'hidden',
      background: '#fff',
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* ── LEFT NAV ── */}
      <div style={{
        width: '320px',
        height: '100%',
        borderRight: '1px solid #f1f5f9',
        padding: '32px 24px',
        display: 'flex',
        flexDirection: 'column',
        background: '#f8fafc',
        flexShrink: 0,
      }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1e293b', marginBottom: '24px', paddingLeft: '8px' }}>Settings</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sections.map((s) => {
            const isDanger = s.id === 'danger';
            const isActive = activeSection === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '14px 18px',
                  borderRadius: '16px',
                  border: '1.5px solid',
                  borderColor: isActive 
                    ? (isDanger ? '#fca5a5' : '#c7d2fe') 
                    : 'transparent',
                  background: isActive 
                    ? (isDanger ? '#fff5f5' : '#fff') 
                    : 'transparent',
                  boxShadow: isActive ? '0 4px 20px rgba(99,102,241,0.06)' : 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = isDanger ? '#fff5f5' : '#f1f5f9';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isActive 
                    ? (isDanger ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)') 
                    : (isDanger ? '#fee2e2' : '#e2e8f0'),
                  color: isActive ? '#fff' : (isDanger ? '#ef4444' : '#64748b'),
                  boxShadow: isActive ? '0 4px 12px rgba(99,102,241,0.2)' : 'none',
                  flexShrink: 0,
                  transition: 'all 0.2s ease',
                }}>
                  <s.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    margin: 0,
                    fontWeight: 700,
                    fontSize: '14px',
                    color: isActive 
                      ? (isDanger ? '#b91c1c' : '#1e3a8a') 
                      : (isDanger ? '#ef4444' : '#475569'),
                  }}>{s.label}</p>
                  <p style={{
                    margin: '3px 0 0',
                    fontSize: '11px',
                    fontWeight: 500,
                    color: '#94a3b8',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>{s.desc}</p>
                </div>
                {isActive && (
                  <ChevronRight size={16} color={isDanger ? '#ef4444' : '#6366f1'} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{
        flex: 1,
        height: '100%',
        background: '#fff',
        padding: '48px 40px',
        overflowY: 'auto',
      }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>

          {/* ACCOUNT */}
          {activeSection === 'account' && (
            <div style={{ animation: 'slideUp 0.4s ease' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1e293b', marginBottom: '24px' }}>Account Identity</h2>
              <div style={{
                background: '#f8fafc',
                padding: '32px',
                borderRadius: '24px',
                border: '1.5px solid #e2e8f0',
                boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
              }}>
                {/* Identity Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '24px', paddingBottom: '24px', borderBottom: '1.5px solid #e2e8f0' }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '24px',
                    borderRadius: '20px',
                    boxShadow: '0 8px 24px rgba(99,102,241,0.25)',
                    flexShrink: 0,
                  }}>
                    {user.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '11px', fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Authenticated ID</p>
                    <p style={{ margin: '4px 0 0', fontSize: '24px', fontWeight: 800, color: '#1e293b' }}>{user}</p>
                  </div>
                </div>
                {/* Verification Info */}
                <div style={{ padding: '20px', background: '#fff', borderRadius: '16px', border: '1.5px solid #e2e8f0', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.01)' }}>
                  <p style={{ margin: 0, fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={14} color="#6366f1" /> System Verified
                  </p>
                  <p style={{ margin: '8px 0 0', fontSize: '18px', fontWeight: 700, color: '#475569', fontStyle: 'italic' }}>@{user}</p>
                </div>
              </div>
            </div>
          )}

          {/* THEME */}
          {activeSection === 'theme' && (
            <div style={{ animation: 'slideUp 0.4s ease' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1e293b', marginBottom: '24px' }}>Theme Preferences</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <button
                  onClick={() => onUpdateTheme('light')}
                  style={{
                    background: '#f8fafc', padding: '24px', borderRadius: '24px', border: '2px solid',
                    borderColor: theme === 'light' ? '#6366f1' : 'transparent',
                    textAlign: 'left', cursor: 'pointer', position: 'relative',
                    boxShadow: theme === 'light' ? '0 10px 25px rgba(99,102,241,0.1)' : 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  {theme === 'light' && (
                    <div style={{ position: 'absolute', top: '16px', right: '16px', background: '#6366f1', color: '#fff', padding: '6px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={14} strokeWidth={3} />
                    </div>
                  )}
                  <div style={{ width: '100%', height: '120px', background: '#fff', borderRadius: '16px', marginBottom: '16px', border: '1.5px solid #e2e8f0' }} />
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '15px', color: '#1e293b' }}>Standard Light</p>
                  <p style={{ margin: '4px 0 0', fontSize: '10px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Clean Indigo</p>
                </button>
                <button
                  onClick={() => onUpdateTheme('dark')}
                  style={{
                    background: '#0f172a', padding: '24px', borderRadius: '24px', border: '2px solid',
                    borderColor: theme === 'dark' ? '#6366f1' : 'transparent',
                    textAlign: 'left', cursor: 'pointer', position: 'relative',
                    boxShadow: theme === 'dark' ? '0 10px 25px rgba(0,0,0,0.2)' : 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  {theme === 'dark' && (
                    <div style={{ position: 'absolute', top: '16px', right: '16px', background: '#6366f1', color: '#fff', padding: '6px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={14} strokeWidth={3} />
                    </div>
                  )}
                  <div style={{ width: '100%', height: '120px', background: '#1e293b', borderRadius: '16px', marginBottom: '16px', border: '1.5px solid #334155' }} />
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '15px', color: '#fff' }}>Midnight Dark</p>
                  <p style={{ margin: '4px 0 0', fontSize: '10px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Focus Mode</p>
                </button>
              </div>
            </div>
          )}

          {/* FONTS */}
          {activeSection === 'fonts' && (
            <div style={{ animation: 'slideUp 0.4s ease' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1e293b', marginBottom: '24px' }}>Typography Control</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {['small', 'medium', 'large'].map((size) => {
                  const isActive = fontSize === size;
                  return (
                    <button
                      key={size}
                      onClick={() => onUpdateFontSize(size)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '20px 24px', borderRadius: '16px', border: '2px solid',
                        borderColor: isActive ? '#6366f1' : 'transparent',
                        background: isActive ? '#f5f3ff' : '#f8fafc',
                        cursor: 'pointer', transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                          width: '12px', height: '12px', borderRadius: '50%',
                          background: isActive ? '#6366f1' : '#cbd5e1'
                        }} />
                        <span style={{
                          fontWeight: 700, textTransform: 'capitalize',
                          fontSize: size === 'small' ? '13px' : size === 'large' ? '18px' : '15px',
                          color: isActive ? '#4c1d95' : '#475569'
                        }}>
                          {size} Text
                        </span>
                      </div>
                      {isActive && <Check size={18} color="#6366f1" strokeWidth={3} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* CHAT */}
          {activeSection === 'chat' && (
            <div style={{ animation: 'slideUp 0.4s ease' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1e293b', marginBottom: '24px' }}>Privacy &amp; Security</h2>
              <div style={{
                background: '#f8fafc', padding: '32px', borderRadius: '24px', border: '1.5px solid #e2e8f0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px', background: '#fff', borderRadius: '16px', border: '1.5px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                      width: '48px', height: '48px', background: '#e0e7ff', color: '#6366f1',
                      borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Sparkles size={24} color="#6366f1" />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '15px', color: '#1e293b' }}>End-to-End Encryption</p>
                      <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>Your messages are private and secure.</p>
                    </div>
                  </div>
                  <div style={{ width: '48px', height: '24px', background: '#6366f1', borderRadius: '12px', padding: '4px', display: 'flex', justifyContent: 'flex-end', cursor: 'pointer' }}>
                    <div style={{ width: '16px', height: '16px', background: '#fff', borderRadius: '50%' }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── DANGER ZONE ── */}
          {activeSection === 'danger' && (
            <div style={{ animation: 'slideUp 0.4s ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <AlertTriangle size={24} color="#ef4444" />
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#dc2626', margin: 0 }}>Danger Zone</h2>
              </div>
              <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>
                These actions are <strong style={{ color: '#dc2626' }}>permanent and irreversible</strong>. Proceed with extreme caution.
              </p>

              {/* Delete All Chat Data Card */}
              <div style={{
                border: '1.5px solid #fecaca',
                borderRadius: '24px',
                background: 'linear-gradient(135deg, #fff5f5 0%, #fff 100%)',
                overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(239,68,68,0.02)',
              }}>
                {/* Header */}
                <div style={{ padding: '32px', borderBottom: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{
                    width: '52px', height: '52px',
                    background: 'linear-gradient(135deg,#ef4444,#dc2626)',
                    borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 14px rgba(239,68,68,0.35)',
                    flexShrink: 0,
                  }}>
                    <Trash2 size={24} color="#fff" />
                  </div>
                  <div>
                    <p style={{ fontWeight: 800, fontSize: '16px', color: '#1e293b', margin: 0 }}>Delete All Chat Data</p>
                    <p style={{ fontSize: '12.5px', color: '#94a3b8', margin: '4px 0 0', fontWeight: 500 }}>
                      Permanently removes every conversation and all messages for all users.
                    </p>
                  </div>
                </div>

                {/* Body */}
                <div style={{ padding: '32px' }}>

                  {/* IDLE */}
                  {deletePhase === 'idle' && (
                    <button
                      onClick={() => setDeletePhase('confirm')}
                      style={{
                        background: 'linear-gradient(135deg,#ef4444,#dc2626)',
                        color: '#fff', border: 'none', borderRadius: '12px',
                        padding: '12px 28px', fontWeight: 700, fontSize: '14px',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                        boxShadow: '0 4px 14px rgba(239,68,68,0.3)',
                        transition: 'all 0.2s',
                      }}
                    >
                      <Trash2 size={16} /> Delete All Chat Data
                    </button>
                  )}

                  {/* CONFIRM */}
                  {deletePhase === 'confirm' && (
                    <div style={{ animation: 'slideUp 0.2s ease' }}>
                      <div style={{
                        background: '#fff7ed', border: '1px solid #fed7aa',
                        borderRadius: '12px', padding: '16px 20px', marginBottom: '20px',
                        display: 'flex', gap: '12px', alignItems: 'flex-start',
                      }}>
                        <AlertTriangle size={18} color="#f97316" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <p style={{ fontSize: '13px', color: '#92400e', margin: 0, lineHeight: 1.6, fontWeight: 500 }}>
                          This will permanently delete <strong>ALL</strong> chat conversations and messages
                          for every employee and admin. This cannot be undone.
                          Type <strong style={{ color: '#dc2626', fontFamily: 'monospace' }}>DELETE ALL</strong> to confirm.
                        </p>
                      </div>

                      <input
                        autoFocus
                        type="text"
                        value={confirmText}
                        onChange={e => setConfirmText(e.target.value)}
                        placeholder='Type DELETE ALL to confirm'
                        style={{
                          width: '100%', boxSizing: 'border-box',
                          border: '1.5px solid',
                          borderColor: confirmText === 'DELETE ALL' ? '#ef4444' : '#e2e8f0',
                          borderRadius: '12px', padding: '12px 16px',
                          fontSize: '14px', fontWeight: 600, fontFamily: 'monospace',
                          color: '#334155', outline: 'none',
                          background: '#fff',
                          marginBottom: '16px',
                          transition: 'border-color 0.2s',
                        }}
                      />

                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                          onClick={() => { setDeletePhase('idle'); setConfirmText(''); }}
                          style={{
                            flex: 1, padding: '12px', borderRadius: '12px',
                            border: '1.5px solid #e2e8f0', background: '#f8fafc',
                            color: '#64748b', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleDeleteAllChats}
                          disabled={confirmText !== 'DELETE ALL'}
                          style={{
                            flex: 2, padding: '12px', borderRadius: '12px',
                            background: confirmText === 'DELETE ALL'
                              ? 'linear-gradient(135deg,#ef4444,#dc2626)'
                              : '#fca5a5',
                            border: 'none', color: '#fff',
                            fontWeight: 800, fontSize: '14px',
                            cursor: confirmText === 'DELETE ALL' ? 'pointer' : 'not-allowed',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            boxShadow: confirmText === 'DELETE ALL' ? '0 4px 14px rgba(239,68,68,0.3)' : 'none',
                            transition: 'all 0.2s',
                          }}
                        >
                          <Trash2 size={14} /> Confirm Permanent Delete
                        </button>
                      </div>
                    </div>
                  )}

                  {/* DELETING */}
                  {deletePhase === 'deleting' && (
                    <div style={{ textAlign: 'center', padding: '24px 0' }}>
                      <Loader2 size={36} color="#ef4444" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                      <p style={{ fontWeight: 700, color: '#dc2626', fontSize: '15px', margin: '0 0 8px' }}>
                        Deleting all chat data...
                      </p>
                      {progress.total > 0 && (
                        <>
                          <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 16px' }}>
                            {progress.done} of {progress.total} conversations deleted
                          </p>
                          <div style={{
                            height: '8px', background: '#fecaca', borderRadius: '99px', overflow: 'hidden',
                          }}>
                            <div style={{
                              height: '100%', borderRadius: '99px',
                              background: 'linear-gradient(90deg,#ef4444,#dc2626)',
                              width: `${Math.round((progress.done / progress.total) * 100)}%`,
                              transition: 'width 0.3s ease',
                            }} />
                          </div>
                        </>
                      )}
                      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
                    </div>
                  )}

                  {/* DONE */}
                  {deletePhase === 'done' && (
                    <div style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      gap: '16px', padding: '20px 0', textAlign: 'center',
                      animation: 'slideUp 0.3s ease',
                    }}>
                      <div style={{
                        width: '56px', height: '56px',
                        background: 'linear-gradient(135deg,#10b981,#059669)',
                        borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 14px rgba(16,185,129,0.35)',
                      }}>
                        <Check size={28} color="#fff" strokeWidth={3} />
                      </div>
                      <p style={{ fontWeight: 800, color: '#065f46', fontSize: '16px', margin: 0 }}>All chat data deleted</p>
                      <p style={{ fontSize: '13px', color: '#10b981', margin: 0, fontWeight: 500 }}>
                        {progress.done} conversation{progress.done !== 1 ? 's' : ''} and all messages have been permanently removed.
                      </p>
                      <button
                        onClick={() => { setDeletePhase('idle'); setProgress({ done: 0, total: 0 }); }}
                        style={{
                          marginTop: '8px', padding: '10px 24px',
                          background: '#f0fdf4', border: '1.5px solid #a7f3d0',
                          borderRadius: '10px', color: '#065f46',
                          fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                        }}
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Extra warning notice */}
              <div style={{
                marginTop: '24px', padding: '16px 20px',
                background: '#fafafa', borderRadius: '12px',
                border: '1px solid #f1f5f9',
                display: 'flex', gap: '12px', alignItems: 'center',
              }}>
                <AlertTriangle size={16} color="#f59e0b" style={{ flexShrink: 0 }} />
                <p style={{ fontSize: '12.5px', color: '#64748b', margin: 0, lineHeight: 1.6 }}>
                  <strong>Note:</strong> This action only removes Firestore data (messages &amp; conversations).
                  User accounts and login credentials are not affected.
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
