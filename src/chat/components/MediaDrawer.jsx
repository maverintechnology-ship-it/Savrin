import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase-config';
import { X, Image, Link2, FileText, Ban } from 'lucide-react';

export default function MediaDrawer({ chat, onClose, onBlock }) {
  const [tab, setTab] = useState('media');
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const q = query(collection(db, 'chats', chat.id, 'messages'), orderBy('timestamp', 'asc'));
    const unsub = onSnapshot(q, snap => setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return unsub;
  }, [chat.id]);

  const media = messages.filter(m => m.type?.startsWith('image/') || m.type?.startsWith('video/'));
  const links = messages.filter(m => m.text && /https?:\/\//.test(m.text));
  const docs  = messages.filter(m => m.fileUrl && !m.type?.startsWith('image/') && !m.type?.startsWith('video/') && !m.type?.startsWith('audio'));

  const TABS = [
    { id: 'media', label: 'Media', icon: Image, items: media },
    { id: 'links', label: 'Links', icon: Link2, items: links },
    { id: 'docs',  label: 'Docs',  icon: FileText, items: docs },
  ];

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, bottom: 0, width: 300,
      background: '#fff', borderLeft: '1px solid #f1f5f9', zIndex: 100,
      display: 'flex', flexDirection: 'column',
      boxShadow: '-8px 0 40px rgba(0,0,0,.08)',
      animation: 'slideInRight .25s ease',
    }}>
      <style>{`@keyframes slideInRight { from{transform:translateX(20px);opacity:0} to{transform:translateX(0);opacity:1} }`}</style>

      {/* Drawer header */}
      <div style={{ padding: '18px 18px 12px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: '#1e293b' }}>{chat.name}</p>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>Conversation Info</p>
        </div>
        <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 9, padding: 8, cursor: 'pointer' }}>
          <X size={14} color="#64748b" />
        </button>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', padding: '10px 14px', gap: 4 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1, padding: '7px 4px', border: 'none', borderRadius: 9,
              background: tab === t.id ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : '#f1f5f9',
              color: tab === t.id ? '#fff' : '#64748b',
              fontWeight: 700, fontSize: 10, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              boxShadow: tab === t.id ? '0 3px 10px rgba(99,102,241,.3)' : 'none',
            }}
          >
            <t.icon size={11} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 14px' }}>
        {tab === 'media' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
            {media.length === 0 ? empty('No media yet') : media.map(m => (
              <a key={m.id} href={m.fileUrl} target="_blank" rel="noreferrer">
                <img src={m.fileUrl} alt="media" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 8 }} />
              </a>
            ))}
          </div>
        )}
        {tab === 'links' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {links.length === 0 ? empty('No links yet') : links.map(m => {
              const url = m.text.match(/https?:\/\/[^\s]+/)?.[0];
              return (
                <a key={m.id} href={url} target="_blank" rel="noreferrer" style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 12px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', textDecoration: 'none' }}>
                  <Link2 size={14} color="#6366f1" />
                  <span style={{ fontSize: 12, color: '#4338ca', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{url}</span>
                </a>
              );
            })}
          </div>
        )}
        {tab === 'docs' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {docs.length === 0 ? empty('No documents yet') : docs.map(m => (
              <a key={m.id} href={m.fileUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 12px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', textDecoration: 'none' }}>
                <FileText size={14} color="#6366f1" />
                <span style={{ fontSize: 12, color: '#334155', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.fileName || 'Document'}</span>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Block */}
      <div style={{ padding: '12px 14px', borderTop: '1px solid #f1f5f9' }}>
        <button
          onClick={() => {
            if (window.confirm(`Block ${chat.name}? They won't be able to message you.`)) onBlock();
          }}
          style={{
            width: '100%', padding: '10px', borderRadius: 10, border: '1.5px solid #fecaca',
            background: '#fff5f5', color: '#ef4444', fontWeight: 700, fontSize: 13,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <Ban size={14} /> Block {chat.name}
        </button>
      </div>
    </div>
  );
}

const empty = txt => (
  <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: 12 }}>{txt}</div>
);
