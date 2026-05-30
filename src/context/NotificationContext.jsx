import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit, getDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase-config';
import { useAuth } from './AuthContext';
import CallModal from '../chat/components/CallModal';

const NotificationContext = createContext();

export function useNotifications() {
  return useContext(NotificationContext);
}

let toastId = 0;

export function NotificationProvider({ children }) {
  const { userData } = useAuth();
  const [toasts, setToasts] = useState([]);
  const initializedRef = useRef({});
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);

  // ── Badge counts ──
  const [unreadChat, setUnreadChat] = useState(0);
  const [unreadResources, setUnreadResources] = useState(0);

  const clearChatBadge = useCallback(() => setUnreadChat(0), []);
  const clearResourcesBadge = useCallback(() => setUnreadResources(0), []);

  const addToast = useCallback((toast) => {
    const id = ++toastId;
    setToasts(prev => [...prev.slice(-4), { ...toast, id }]); // keep max 5
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // ── Chat messages listener ──
  useEffect(() => {
    if (!userData?.id || !userData?.companyId || userData.companyId === 'platform') return;

    const currentUserId = userData.id || userData.uid;
    const chatsRef = collection(db, 'chats');
    const q = query(chatsRef, where('users', 'array-contains', currentUserId));

    let chatUnsubs = [];
    let firstLoad = true;

    const unsub = onSnapshot(q, (snap) => {
      // Clean up previous message listeners
      chatUnsubs.forEach(u => u());
      chatUnsubs = [];

      const chatDocs = snap.docs;

      chatDocs.forEach(chatDoc => {
        const chatData = chatDoc.data();
        const chatId = chatDoc.id;

        const messagesRef = collection(db, 'chats', chatId, 'messages');
        const mq = query(messagesRef, orderBy('timestamp', 'desc'), limit(1));

        let isFirstSnapshot = true;

        const msgUnsub = onSnapshot(mq, (msgSnap) => {
          // Skip the first snapshot (existing messages on load)
          if (isFirstSnapshot) {
            isFirstSnapshot = false;
            return;
          }

          if (!msgSnap.empty) {
            const msg = msgSnap.docs[0].data();
            // Only notify if it's not from the current user
            if (msg.senderId !== currentUserId) {
              const senderName = msg.senderName || chatData.userNames?.[msg.senderId] || 'Someone';
              let preview = '';
              if (msg.type === 'image') preview = '📷 Sent an image';
              else if (msg.type === 'voice') preview = '🎤 Sent a voice message';
              else preview = msg.text?.substring(0, 60) || 'New message';

              // Increment chat badge
              setUnreadChat(prev => prev + 1);

              addToast({
                type: 'chat',
                icon: '💬',
                title: senderName,
                message: preview,
                link: '/chat',
              });
            }
          }
        });

        chatUnsubs.push(msgUnsub);
      });

      firstLoad = false;
    });

    return () => {
      unsub();
      chatUnsubs.forEach(u => u());
    };
  }, [userData?.id, userData?.uid, userData?.companyId, addToast]);

  // ── Workshops listener ──
  useEffect(() => {
    if (!userData?.companyId || userData.companyId === 'platform') return;

    const q = query(
      collection(db, 'workshops'),
      where('companyId', '==', userData.companyId)
    );

    let isFirstSnapshot = true;

    const unsub = onSnapshot(q, (snap) => {
      if (isFirstSnapshot) {
        isFirstSnapshot = false;
        return;
      }

      snap.docChanges().forEach(change => {
        if (change.type === 'added') {
          const data = change.doc.data();

          // Increment resources badge
          setUnreadResources(prev => prev + 1);

          addToast({
            type: 'workshop',
            icon: '📚',
            title: 'New Workshop',
            message: data.title || 'A new workshop has been added',
            link: '/resources/workshops',
          });
        }
      });
    });

    return () => unsub();
  }, [userData?.companyId, addToast]);

  // ── Meetings listener ──
  useEffect(() => {
    if (!userData?.companyId || userData.companyId === 'platform') return;

    const q = query(
      collection(db, 'meetings'),
      where('companyId', '==', userData.companyId)
    );

    let isFirstSnapshot = true;

    const unsub = onSnapshot(q, (snap) => {
      if (isFirstSnapshot) {
        isFirstSnapshot = false;
        return;
      }

      snap.docChanges().forEach(change => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const scheduledAt = data.scheduledAt ? new Date(data.scheduledAt).toLocaleString() : '';

          // Increment resources badge
          setUnreadResources(prev => prev + 1);

          addToast({
            type: 'meeting',
            icon: '📅',
            title: 'New Meeting Scheduled',
            message: `${data.title || 'A new meeting'}${scheduledAt ? ` — ${scheduledAt}` : ''}`,
            link: '/admin',
          });
        }
      });
    });

    return () => unsub();
  }, [userData?.companyId, addToast]);

  // ── Calls listener ──
  useEffect(() => {
    if (!userData?.id && !userData?.uid) return;
    const currentUserId = userData.id || userData.uid;

    const q = query(
      collection(db, 'calls'),
      where('receiverId', '==', currentUserId),
      where('status', '==', 'calling')
    );

    const unsub = onSnapshot(q, async (snap) => {
      if (!snap.empty) {
        const callDoc = snap.docs[0];
        const data = callDoc.data();
        
        // Fetch chat details for the CallModal
        const chatSnap = await getDoc(doc(db, 'chats', data.chatId));
        const chatData = chatSnap.exists() ? { id: chatSnap.id, ...chatSnap.data() } : { id: data.chatId, name: 'Unknown Caller', initials: '?' };
        
        // If callerName is missing, we can try to find it
        if (!chatData.name && chatData.participantNames) {
           chatData.name = chatData.participantNames[data.callerId] || 'Caller';
           chatData.initials = chatData.name.substring(0, 2).toUpperCase();
        }

        setIncomingCall({ id: callDoc.id, data, chat: chatData });
      } else {
        setIncomingCall(null);
      }
    });

    return () => unsub();
  }, [userData?.id, userData?.uid]);

  const handleAnswerCall = () => {
    setActiveCall({
      id: incomingCall.id,
      type: incomingCall.data.type,
      chat: incomingCall.chat,
      isReceiver: true
    });
    setIncomingCall(null);
  };

  const handleDeclineCall = async () => {
    if (incomingCall) {
      await updateDoc(doc(db, 'calls', incomingCall.id), { status: 'declined' });
      setIncomingCall(null);
    }
  };


  return (
    <NotificationContext.Provider value={{
      toasts, addToast, removeToast,
      unreadChat, unreadResources,
      clearChatBadge, clearResourcesBadge
    }}>
      {children}
      
      {/* Incoming Call Modal Overlay */}
      {incomingCall && !activeCall && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 99999,
          background: '#fff', borderRadius: 16, padding: '20px 24px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)', display: 'flex',
          flexDirection: 'column', gap: 16, border: '1px solid #e2e8f0', minWidth: 280
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 18 }}>
              {incomingCall.chat.initials || '📞'}
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>{incomingCall.chat.name}</h4>
              <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>Incoming {incomingCall.data.type} call...</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleDeclineCall} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#fee2e2', color: '#ef4444', fontWeight: 600, cursor: 'pointer' }}>Decline</button>
            <button onClick={handleAnswerCall} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#10b981', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Answer</button>
          </div>
        </div>
      )}

      {/* Active Call Modal */}
      {activeCall && (
        <CallModal
          type={activeCall.type}
          chat={activeCall.chat}
          currentUserId={userData.id || userData.uid}
          isReceiver={activeCall.isReceiver}
          incomingCallId={activeCall.id}
          onClose={() => setActiveCall(null)}
        />
      )}
    </NotificationContext.Provider>
  );
}
