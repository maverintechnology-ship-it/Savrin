import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { MessageCircle } from 'lucide-react';
import { db } from '../../firebase-config';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';

import ChatSidebar from '../components/ChatSidebar';
import ChatWindow from '../components/ChatWindow';
import SettingsPanel from '../components/SettingsPanel';

// ── one-time purge of ALL chats (runs while authenticated) ──────────────────
async function purgeAllChats() {
  try {
    const snap = await getDocs(collection(db, 'chats'));
    for (const chatDoc of snap.docs) {
      const msgs = await getDocs(collection(db, 'chats', chatDoc.id, 'messages'));
      for (const m of msgs.docs) {
        await deleteDoc(doc(db, 'chats', chatDoc.id, 'messages', m.id));
      }
      await deleteDoc(doc(db, 'chats', chatDoc.id));
    }
    console.log('[Chat] All previous chat data purged.');
  } catch (e) {
    console.warn('[Chat] Purge skipped:', e.message);
  }
}

export default function ChatPage() {
  const { userData } = useAuth();
  // Use uid as the participant key so both sides share the same chat doc
  const currentUserId = userData?.id || userData?.uid || userData?.email?.split('@')[0] || 'me';

  const [activeTab, setActiveTab] = useState('chats');
  const [activeChatId, setActiveChatId] = useState(null);
  const [chats, setChats] = useState([]);
  const [fontSize, setFontSize] = useState('medium');
  const [theme, setTheme] = useState('light');
  const [purged, setPurged] = useState(false);

  // Purge old data once on mount (admin/company only)
  useEffect(() => {
    if (!currentUserId || purged) return;
    if (['admin', 'company'].includes(userData?.role)) {
      setPurged(true);
      purgeAllChats();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;
    let q;
    const chatsRef = collection(db, 'chats');
    if (activeTab === 'archive') {
      q = query(chatsRef,
        where('participants', 'array-contains', currentUserId),
        where('isArchived', '==', true));
    } else if (activeTab === 'groups') {
      q = query(chatsRef,
        where('participants', 'array-contains', currentUserId),
        where('isGroup', '==', true),
        where('isArchived', '==', false));
    } else {
      q = query(chatsRef,
        where('participants', 'array-contains', currentUserId),
        where('isArchived', '==', false));
    }

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => {
        const data = d.data();
        let name = data.groupName || data.name;
        // For DMs, show the other person's display name
        if (!data.isGroup) {
          const otherId = data.participants?.find(p => p !== currentUserId);
          name = data.participantNames?.[otherId] || otherId || 'Unknown';
        }
        return {
          id: d.id,
          name,
          initials: (name || '?').slice(0, 2).toUpperCase(),
          ...data,
        };
      });
      list.sort((a, b) => (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0));
      setChats(list);
    }, (err) => console.error('Chat listener error:', err));

    return unsub;
  }, [currentUserId, activeTab]);

  const activeChat = chats.find(c => c.id === activeChatId);

  return (
    <DashboardLayout title="Messages" fullWidth={true} noPadding={true}>
      <div className="flex flex-1 w-full h-full bg-white overflow-hidden font-sans select-none relative">
        <ChatSidebar
          activeId={activeChatId}
          list={chats}
          onSelect={setActiveChatId}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          currentUserId={currentUserId}
          currentUserData={userData}
        />

        <div className="flex-1 bg-white flex flex-col overflow-hidden relative">
          {activeTab === 'settings' ? (
            <SettingsPanel
              user={userData?.name || currentUserId}
              fontSize={fontSize}
              onUpdateFontSize={setFontSize}
              theme={theme}
              onUpdateTheme={setTheme}
            />
          ) : activeChat ? (
            <ChatWindow
              chat={activeChat}
              currentUserId={currentUserId}
              currentUserData={userData}
              fontSize={fontSize}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-20 text-center bg-[#f8fbff]/60 relative overflow-hidden">
              <div className="absolute w-[300px] h-[300px] bg-gradient-to-tr from-indigo-400/10 to-sky-400/10 blur-[60px] rounded-full z-0 pointer-events-none" />
              <div className="w-48 h-48 bg-white rounded-full flex items-center justify-center mb-10 shadow-xl shadow-indigo-100/50 border border-slate-100/80 transition-all duration-500 hover:scale-105 z-10 relative group">
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 to-sky-500/5 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500" />
                <MessageCircle className="w-20 h-20 text-indigo-500/25 group-hover:text-indigo-500 transition-colors duration-500" />
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-2 z-10 tracking-tight">Select a Conversation</h3>
              <p className="text-xs font-bold text-indigo-500/60 uppercase tracking-[0.25em] max-w-xs leading-relaxed z-10">
                Click <strong className="text-indigo-400">+</strong> to start a new chat with a team member
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
