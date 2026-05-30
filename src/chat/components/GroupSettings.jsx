import { useState } from 'react';
import { X, UserPlus, Trash2, Camera, User } from 'lucide-react';
import { doc, updateDoc, arrayRemove, arrayUnion } from 'firebase/firestore';
import { db } from '../../firebase-config';

export default function GroupSettings({ chat, onClose, currentUser }) {
  const [newName, setNewName] = useState(chat.name || '');
  const [newMember, setNewMember] = useState('');

  const handleUpdateName = async () => {
    if (!newName.trim()) return;
    try {
      await updateDoc(doc(db, 'chats', chat.id), { groupName: newName.trim() });
      alert("Group name updated");
    } catch (err) {
      alert("Error updating name");
    }
  };

  const handleAddMember = async () => {
    if (!newMember.trim()) return;
    try {
      await updateDoc(doc(db, 'chats', chat.id), { 
        participants: arrayUnion(newMember.trim()) 
      });
      setNewMember('');
      alert("Member added");
    } catch (err) {
      alert("Error adding member");
    }
  };

  const handleRemoveMember = async (member) => {
    if (!window.confirm(`Remove ${member} from group?`)) return;
    try {
      await updateDoc(doc(db, 'chats', chat.id), { 
        participants: arrayRemove(member) 
      });
    } catch (err) {
      alert("Error removing member");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div className="w-full max-w-md bg-white rounded-[40px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white">
          <h2 className="text-xl font-black text-indigo-900">Group Info</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-all">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
          {/* Avatar Section */}
          <div className="flex flex-col items-center">
            <div className="relative group cursor-pointer">
              <div className="w-32 h-32 bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-4xl rounded-[40px] shadow-lg border-4 border-white">
                {chat.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="absolute inset-0 bg-indigo-900/40 rounded-[40px] opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                <Camera className="w-8 h-8 text-white" />
              </div>
            </div>
            <div className="mt-6 flex items-center gap-3">
              <input 
                type="text" 
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="text-center font-black text-2xl text-indigo-900 bg-transparent border-b-2 border-indigo-100 focus:border-indigo-600 outline-none px-2 transition-all"
              />
              <button onClick={handleUpdateName} className="text-xs font-black text-indigo-600 uppercase hover:underline">Save</button>
            </div>
          </div>

          {/* Members List */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Participants ({chat.participants?.length})</h3>
            </div>
            
            <div className="space-y-3">
              {chat.participants?.map(member => (
                <div key={member} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white text-indigo-900 flex items-center justify-center font-bold text-[10px] rounded-lg shadow-sm">
                      {member.slice(0, 2).toUpperCase()}
                    </div>
                    <p className="text-sm font-bold text-indigo-900">{member} {member === currentUser && "(You)"}</p>
                  </div>
                  {member !== currentUser && (
                    <button onClick={() => handleRemoveMember(member)} className="p-2 text-slate-300 hover:text-red-500 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Add Member */}
          <div className="p-6 bg-indigo-50 rounded-3xl border border-indigo-100">
            <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-4">Add New Member</h3>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
                <input 
                  type="text" 
                  placeholder="Username..." 
                  value={newMember}
                  onChange={(e) => setNewMember(e.target.value)}
                  className="w-full bg-white border-none rounded-xl py-2.5 pl-10 pr-4 text-xs font-bold text-indigo-900 shadow-sm focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              <button 
                onClick={handleAddMember}
                className="px-6 py-2.5 bg-indigo-600 text-white text-xs font-black rounded-xl shadow-md hover:bg-indigo-700 transition-all"
              >
                ADD
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
