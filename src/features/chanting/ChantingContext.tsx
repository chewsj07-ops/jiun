import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { practiceService } from '../../services/practiceService';
import { getScriptures, Scripture } from '../../constants';

interface ChantingContextType {
  count: number;
  setCount: React.Dispatch<React.SetStateAction<number>>;
  activeScriptureId: string;
  setActiveScriptureId: React.Dispatch<React.SetStateAction<string>>;
  selectedChant: string;
  setSelectedChant: React.Dispatch<React.SetStateAction<string>>;
  isSessionActive: boolean;
  setIsSessionActive: React.Dispatch<React.SetStateAction<boolean>>;
  sessionCount: number;
  setSessionCount: React.Dispatch<React.SetStateAction<number>>;
  activeScripture: Scripture;
  handleHit: () => void;
}

const ChantingContext = createContext<ChantingContextType | undefined>(undefined);

export const ChantingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [count, setCount] = useState(() => parseInt(localStorage.getItem('zen_count') || '0', 10));
  const [activeScriptureId, setActiveScriptureId] = useState(() => localStorage.getItem('zen_active_scripture_id') || getScriptures('zh-CN')[0].id);
  const [selectedChant, setSelectedChant] = useState(() => localStorage.getItem('zen_selected_chant') || "功德 +1");
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);

  const allScriptures = getScriptures('zh-CN'); // Simplified for now
  const activeScripture = allScriptures.find(s => s.id === activeScriptureId) || allScriptures[0];

  const handleHit = () => {
    const increment = 1;
    setCount(prev => prev + increment);
    if (isSessionActive) {
      setSessionCount(prev => prev + increment);
    }
    practiceService.updateActivity('chanting', increment, activeScriptureId);
    practiceService.logMerit('chanting');
  };

  useEffect(() => { localStorage.setItem('zen_count', count.toString()); }, [count]);
  useEffect(() => { localStorage.setItem('zen_active_scripture_id', activeScriptureId); }, [activeScriptureId]);
  useEffect(() => { localStorage.setItem('zen_selected_chant', selectedChant); }, [selectedChant]);

  return (
    <ChantingContext.Provider value={{ count, setCount, activeScriptureId, setActiveScriptureId, selectedChant, setSelectedChant, isSessionActive, setIsSessionActive, sessionCount, setSessionCount, activeScripture, handleHit }}>
      {children}
    </ChantingContext.Provider>
  );
};

export const useChanting = () => {
  const context = useContext(ChantingContext);
  if (!context) throw new Error('useChanting must be used within a ChantingProvider');
  return context;
};
