import { MessageSquare, Users, Archive, Settings, LogOut, Globe } from 'lucide-react';

export default function NavigationRail({ activeTab, onTabChange }) {
  const navItems = [
    { icon: MessageSquare, label: 'Chats', id: 'chats' },
    { icon: Globe,         label: 'Groups', id: 'groups' },
    { icon: Users,         label: 'Friends',   id: 'friends' },
    { icon: Archive,       label: 'Archived',  id: 'archive' },
    { icon: Settings,      label: 'Settings',  id: 'settings' },
  ];

  return (
    <div className="w-[80px] h-full flex flex-col items-center py-10 shrink-0 border-r border-pastel-border bg-pastel-blue">

      {/* Nav */}
      <div className="flex-1 flex flex-col items-center gap-4 w-full px-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`w-full flex flex-col items-center gap-1.5 py-4 transition-all relative group ${
              activeTab === item.id ? 'text-indigo-600' : 'text-slate-400 hover:text-indigo-500'
            }`}
          >
            <div className={`p-3 rounded-2xl transition-all ${activeTab === item.id ? 'bg-indigo-50 shadow-sm border border-white/50' : 'group-hover:bg-white/50'}`}>
              <item.icon className={`w-6 h-6 transition-transform ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-105'}`} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest">{item.label}</span>
            {activeTab === item.id && (
              <div className="absolute right-0 top-4 bottom-4 w-1 bg-indigo-600 rounded-l-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
            )}
          </button>
        ))}
      </div>

      {/* Logout */}
      <button 
        onClick={() => { window.location.href = '/login'; }}
        className="mt-auto p-4 text-slate-400 hover:text-indigo-500 transition-colors"
      >
        <LogOut className="w-6 h-6" />
      </button>
    </div>
  );
}
