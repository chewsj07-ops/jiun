import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-[#5A5A40]/90 backdrop-blur-md px-4 py-2 text-xs font-medium text-white shadow-lg border border-white/20 animate-fade-in">
      <WifiOff className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
      <span>离线静修模式已启用 (本地修行与音效正常可用)</span>
    </div>
  );
};
