import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LoginScreen() {
  const [name, setName] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      localStorage.setItem('chat_user', name.trim());
      navigate('/chat');
    }
  };

  return (
    <div className="h-screen w-full flex items-center justify-center bg-sky-tint">
      <div className="bg-white/80 backdrop-blur-xl p-12 rounded-[48px] shadow-soft w-full max-w-md border border-white flex flex-col items-center">
        <div className="w-20 h-20 bg-mixed-gradient rounded-[24px] flex items-center justify-center mb-10 shadow-soft">
          <div className="w-10 h-10 bg-white" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}></div>
        </div>
        
        <h1 className="text-4xl font-black text-dark mb-2 tracking-tighter">CRM Sync</h1>
        <p className="text-indigo-600 font-black uppercase tracking-[0.3em] text-[10px] mb-12">Connect & Collaborate</p>
        
        <form onSubmit={handleSubmit} className="w-full space-y-6">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 ml-1">
              What should we call you?
            </label>
            <input 
              autoFocus
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex"
              className="w-full bg-pastel-blue/30 border-2 border-pastel-border rounded-2xl px-8 py-5 text-lg font-bold focus:outline-none focus:border-sky-soft transition-all placeholder:text-slate-400 text-dark"
            />
          </div>
          
          <button 
            type="submit"
            disabled={!name.trim()}
            className="w-full btn-primary py-5 text-xl font-black disabled:opacity-50 disabled:shadow-none"
          >
            Access Dashboard
          </button>
        </form>
        
        <p className="mt-10 text-slate-300 text-[10px] font-bold uppercase tracking-widest">
          Secured by ChatFlow Protocol
        </p>
      </div>
    </div>
  );
}
