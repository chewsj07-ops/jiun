import React from 'react';
import { X, Sparkles, LogOut, BookOpen, Settings, Map, Users, History, Download } from 'lucide-react';

export const SideMenu = ({ isOpen, onClose, onNavigate }: { isOpen: boolean; onClose: () => void; onNavigate: (tab: string) => void }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose}>
      <div className="absolute right-0 top-0 h-full w-72 bg-zen-bg p-6 shadow-2xl border-l border-zen-accent/10 flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-8 pb-4 border-b border-zen-accent/10">
          <h2 className="text-xl font-bold font-serif text-zen-ink">菜单</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-zen-accent/10 text-zen-ink/60 hover:text-zen-ink transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <nav className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-2">
          <MenuButton icon={<Sparkles />} label="愿禅助手" onClick={() => { onNavigate('assistant'); onClose(); }} />
          <MenuButton icon={<Map />} label="功德地图" onClick={() => { onNavigate('merit'); onClose(); }} />
          <MenuButton icon={<History />} label="修行记录" onClick={() => { onNavigate('history'); onClose(); }} />
          <MenuButton icon={<Users />} label="共修社区" onClick={() => { onNavigate('community'); onClose(); }} />
          <MenuButton icon={<BookOpen />} label="经文库" onClick={() => { onNavigate('scripture'); onClose(); }} />
          
          <div className="my-6 border-t border-zen-accent/10 pt-4 space-y-2">
            <MenuButton icon={<Download />} label="下载APP到手机" onClick={() => { window.dispatchEvent(new CustomEvent('open-install-modal')); onClose(); }} />
            <MenuButton icon={<Settings />} label="设置" onClick={() => { onNavigate('settings'); onClose(); }} />
          </div>
        </nav>
      </div>
    </div>
  );
};

const MenuButton = ({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) => (
  <button 
    onClick={onClick} 
    className="flex items-center gap-4 w-full p-4 hover:bg-white rounded-2xl transition-all text-zen-ink/80 hover:text-zen-accent hover:shadow-sm group"
  >
    <div className="text-zen-accent/60 group-hover:text-zen-accent transition-colors">
      {React.cloneElement(icon as React.ReactElement, { className: "w-5 h-5" } as any)}
    </div>
    <span className="font-medium">{label}</span>
  </button>
);
