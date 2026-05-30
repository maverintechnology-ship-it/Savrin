import { useState } from 'react';
import { X, UserPlus, Shield, Camera, Trash2, Check } from 'lucide-react';

export default function CreateGroupModal({ isOpen, onClose, onCreate, currentUser }) {
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [admins, setAdmins] = useState([currentUser]);
  const [newMemberName, setNewMemberName] = useState('');
  const [groupImageFile, setGroupImageFile] = useState(null);
  const [groupImagePreview, setGroupImagePreview] = useState(null);

  if (!isOpen) return null;

  const toggleMember = (user) => {
    if (selectedMembers.includes(user)) {
      setSelectedMembers(selectedMembers.filter(u => u !== user));
      setAdmins(admins.filter(a => a !== user));
    } else {
      setSelectedMembers([...selectedMembers, user]);
    }
  };

  const toggleAdmin = (user) => {
    if (admins.includes(user)) {
      if (user === currentUser) return; // Creator must be admin
      setAdmins(admins.filter(a => a !== user));
    } else {
      setAdmins([...admins, user]);
    }
  };

  const handleAddMember = (e) => {
    e.preventDefault();
    const name = newMemberName.trim();
    if (name && name !== currentUser && !selectedMembers.includes(name)) {
      setSelectedMembers([...selectedMembers, name]);
      setNewMemberName('');
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setGroupImageFile(file);
      setGroupImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = (e) => {
    e.stopPropagation();
    setGroupImageFile(null);
    setGroupImagePreview(null);
    const input = document.getElementById('groupImageInput');
    if (input) input.value = '';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (groupName.trim() && selectedMembers.length > 0) {
      onCreate({
        groupName: groupName,
        name: groupName,
        participants: [...selectedMembers, currentUser],
        admins: admins,
        isGroup: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }, groupImageFile);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-dark/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-xl rounded-[48px] shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-10 bg-sky-gradient text-white flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-3xl font-black tracking-tight">Create Pulse Group</h2>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mt-1 text-sky-light">Start a new collective experience</p>
          </div>
          <button onClick={onClose} className="p-3 bg-white/20 hover:bg-white/30 rounded-2xl transition-all">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-12 space-y-10">
          {/* Group Identity */}
          <div className="flex items-center gap-8">
            <div className="relative group">
              <input type="file" id="groupImageInput" className="hidden" accept="image/*" onChange={handleImageSelect} />
              <div 
                onClick={() => document.getElementById('groupImageInput').click()}
                className="w-24 h-24 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px] flex items-center justify-center text-slate-300 hover:border-sky-soft hover:text-sky-soft transition-all cursor-pointer overflow-hidden relative"
              >
                {groupImagePreview ? (
                  <img src={groupImagePreview} alt="Group Profile" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-8 h-8" />
                )}
                
                {groupImagePreview && (
                  <div className="absolute inset-0 bg-dark/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-[10px] font-black uppercase tracking-widest">Change</p>
                  </div>
                )}
              </div>

              {groupImagePreview ? (
                <button 
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute -bottom-2 -right-2 bg-white text-red-500 p-2 rounded-xl shadow-sky border-2 border-slate-100 hover:border-red-100 hover:bg-red-50 transition-all z-10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              ) : (
                <div className="absolute -bottom-2 -right-2 bg-sky-gradient text-white p-2 rounded-xl shadow-sky border-2 border-white z-10 pointer-events-none">
                  <UserPlus className="w-4 h-4" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 ml-1">Group Pulse Name</label>
              <input 
                autoFocus
                type="text" 
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g. Design Sync"
                className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 py-4 font-bold focus:outline-none focus:border-sky-soft transition-all text-dark placeholder:text-slate-200"
              />
            </div>
          </div>

          {/* Member Selection */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Add New Member</label>
              <span className="text-[10px] font-black text-sky-soft uppercase tracking-widest">{selectedMembers.length} Added</span>
            </div>
            
            <div className="flex gap-3 mb-6">
              <input 
                type="text" 
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddMember(e);
                  }
                }}
                placeholder="Enter member name..."
                className="flex-1 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 py-4 font-bold focus:outline-none focus:border-sky-soft transition-all text-dark placeholder:text-slate-200"
              />
              <button 
                type="button"
                onClick={handleAddMember}
                disabled={!newMemberName.trim()}
                className="bg-sky-gradient text-white px-6 rounded-2xl font-black disabled:opacity-50 transition-all hover:shadow-sky"
              >
                Add
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
              {selectedMembers.map((user) => {
                const isAdmin = admins.includes(user);
                
                return (
                  <div 
                    key={user}
                    className="p-4 rounded-3xl border-2 bg-sky-light/30 border-sky-soft flex items-center gap-4 group"
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs transition-all bg-sky-gradient text-white shadow-sky">
                      {user.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm truncate text-sky-deep">{user}</p>
                    </div>
                    
                    <button 
                      type="button"
                      onClick={() => toggleAdmin(user)}
                      className={`p-2 rounded-lg transition-all ${
                        isAdmin ? 'bg-sky-deep text-white shadow-sky' : 'bg-white text-slate-300 border border-slate-200 hover:border-sky-soft hover:text-sky-soft'
                      }`}
                      title={isAdmin ? "Remove Admin Role" : "Make Admin"}
                    >
                      <Shield className="w-3.5 h-3.5" />
                    </button>
                    
                    <button 
                      type="button"
                      onClick={() => toggleMember(user)}
                      className="p-2 rounded-lg transition-all bg-white text-red-300 border border-slate-200 hover:border-red-400 hover:text-red-500"
                      title="Remove Member"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-10 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {currentUser} is the default Admin
          </p>
          <button 
            type="button"
            onClick={handleSubmit}
            disabled={!groupName.trim() || selectedMembers.length === 0}
            className="btn-primary px-10 py-5 text-lg font-black disabled:opacity-30 disabled:shadow-none flex items-center gap-3"
          >
            Create Group <Check className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
