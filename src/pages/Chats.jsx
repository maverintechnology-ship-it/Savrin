import React, { useState, useEffect, useRef } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase-config';
import { collection, query, onSnapshot, addDoc, orderBy } from 'firebase/firestore';
import './Chats.css';

export default function Chats() {
  const { userData } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!userData) return;

    // Listen to global chats for now (could be restricted by conversation ID in a real app)
    const q = query(collection(db, 'chats'), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    return () => unsubscribe();
  }, [userData]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await addDoc(collection(db, 'chats'), {
        senderId: userData.id,
        senderName: userData.name,
        role: userData.role,
        text: newMessage,
        timestamp: new Date().toISOString()
      });
      setNewMessage('');
    } catch (err) {
      console.error("Failed to send message", err);
    }
  };

  const formatTime = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <DashboardLayout title="Internal Communications">
      <div className="chat-container">
        <div className="chat-header">
          <span style={{ fontSize: '20px' }}>💬</span>
          <h3>General Support & Discussion</h3>
        </div>

        <div className="chat-messages">
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: '20px' }}>No messages yet. Say hello!</div>
          ) : (
            messages.map((msg) => {
              const isSentByMe = msg.senderId === userData.id;
              return (
                <div key={msg.id} className={`chat-bubble-wrapper ${isSentByMe ? 'sent' : 'received'}`}>
                  <div className="chat-bubble">
                    {msg.text}
                  </div>
                  <div className="chat-meta">
                    {!isSentByMe && <span>{msg.senderName} ({msg.role})</span>}
                    <span>{formatTime(msg.timestamp)}</span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="chat-input-area" onSubmit={handleSendMessage}>
          <input 
            type="text" 
            className="chat-input" 
            placeholder="Type your message..." 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          <button type="submit" className="chat-send-btn">
            ➤
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}
