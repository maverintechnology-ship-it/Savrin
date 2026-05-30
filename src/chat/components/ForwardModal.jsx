import { useState, useEffect } from 'react';
import { X, Search, Send, User } from 'lucide-react';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase-config';

export default function ForwardModal({ message, onClose, currentUser }) {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchChats();
  }, []);

  const fetchChats = async () => {
    try {
      const q = query(
        collection(db, 'chats'), 
        where('participants', 'array-contains', currentUser)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(d => {
        const data = d.data();
        let name = data.groupName || data.name;
        if (!data.isGroup) {
          name = data.participants.find(p => p !== currentUser) || 'Self';
        }
        return { id: d.id, name, ...data };
      });
      setChats(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleForward = async (targetChat) => {
    try {
      const messagesRef = collection(db, 'chats', targetChat.id, 'messages');
      await addDoc(messagesRef, {
        sender: currentUser,
        text: message.text || '',
        fileUrl: message.fileUrl || null,
        fileName: message.fileName || null,
        type: message.type || null,
        isForwarded: true,
        timestamp: serverTimestamp(),
        readBy: [currentUser]
      });
      alert(`Forwarded to ${targetChat.name}`);
      onClose();
    } catch (err) {
      alert("Failed to forward");
    }
  };

  const filtered = chats.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div className="w-full max-w-md bg-white rounded-[32px] overflow-hidden shadow-2xl flex flex-col h-[500px]">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
          <h2 className="text-xl font-black text-indigo-900">Forward Message</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-all">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-6 pb-0">
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search contacts..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-2xl py-3 pl-11 pr-4 text-sm font-bold text-indigo-900 placeholder:text-slate-300 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-2 custom-scrollbar">
          {loading ? (
            <div className="py-10 text-center text-slate-400 text-xs font-bold uppercase tracking-widest animate-pulse">Loading Chats...</div>
          ) : filtered.length > 0 ? (
            filtered.map(chat => (
              <div 
                key={chat.id} 
                onClick={() => handleForward(chat)}
                className="flex items-center justify-between p-4 hover:bg-indigo-50 rounded-2xl cursor-pointer transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-indigo-100 text-indigo-600 flex items-center justify-center font-black rounded-xl text-xs">
                    {chat.name.slice(0, 2).toUpperCase()}
                  </div>
                  <p className="text-sm font-bold text-indigo-900">{chat.name}</p>
                </div>
                <Send className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition-all" />
              </div>
            ))
          ) : (
            <div className="py-10 text-center text-slate-300 text-xs font-bold uppercase">No results found</div>
          )}
        </div>
      </div>
    </div>
  );
}
