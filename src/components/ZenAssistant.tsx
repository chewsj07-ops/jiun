import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { motion } from 'motion/react';
import { Send, Sparkles, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useTranslation } from '../i18n';

import { handleUserPractice } from '../services/aiPracticeService';
import { practiceService } from '../services/practiceService';

export const ZenAssistant: React.FC<{
  user: any;
  onLevelUp: (msg: string) => void;
}> = ({ user, onLevelUp }) => {
  const { t, language } = useTranslation();
  const [input, setInput] = useState('');
  const [selectedHeartMethod, setSelectedHeartMethod] = useState<string>('');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string; timestamp: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('zen_assistant_history');
    if (saved) setMessages(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('zen_assistant_history', JSON.stringify(messages));
  }, [messages]);

  const heartMethods = ['感恩心', '孝心', '菩提心', '平等心', '慈心', '悲心', '无常观'];

  const getStreak = () => {
    try {
      const saved = localStorage.getItem('zen_history');
      if (!saved) return 0;
      const history = JSON.parse(saved);
      if (!history || history.length === 0) return 0;
      
      const dates = history.map((h: any) => {
        const ts = h.startTime || h.endTime || h.timestamp || h.id;
        return ts ? new Date(ts).toDateString() : null;
      }).filter(Boolean) as string[];
      const uniqueDates = [...new Set(dates)].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      
      let streak = 0;
      let lastDate = new Date();
      
      if (uniqueDates[0] === lastDate.toDateString()) {
        streak = 1;
        lastDate.setDate(lastDate.getDate() - 1);
      } else {
        let yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (uniqueDates[0] === yesterday.toDateString()) {
          streak = 1;
          lastDate = yesterday;
          lastDate.setDate(lastDate.getDate() - 1);
        } else {
          return 0;
        }
      }
      
      for (let i = 1; i < uniqueDates.length; i++) {
        if (new Date(uniqueDates[i]).toDateString() === lastDate.toDateString()) {
          streak++;
          lastDate.setDate(lastDate.getDate() - 1);
        } else {
          break;
        }
      }
      return streak;
    } catch (e) {
      return 0;
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    const now = new Date().toLocaleString();
    setMessages(prev => [...prev, { role: 'user', content: userMsg, timestamp: now }]);
    setIsLoading(true);

    try {
      const settings = practiceService.getSettings();
      if (!settings.aiEnabled || !settings.aiApiKey) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: "阿弥陀佛。AI 禅师功能目前未开启或未配置 API Key。请前往「设置」->「AI 禅师」中开启并填入您的 Gemini API Key。",
          timestamp: new Date().toLocaleString()
        }]);
        setIsLoading(false);
        return;
      }

      const daily_streak = getStreak();
      const result = await handleUserPractice(
        userMsg, 
        user, 
        { selected_heart_method: selectedHeartMethod, daily_streak, userRole: user?.role },
        onLevelUp,
        settings.aiApiKey
      );
      
      const responseNow = new Date().toLocaleString();
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `《${result.card}》\n\n**禅意感悟**:\n${result.insight}\n\n**属性提升**:\n${result.bonus}\n\n**下一个原子习惯**:\n${result.next_habit}\n\n**转念提示**:\n${result.transform}${result.kshitigarbha ? `\n\n**${result.kshitigarbha.practice_label}**\n*${result.kshitigarbha.heart_earth_status}*\n\n> ${result.kshitigarbha.kshitigarbha_vow}\n\n${result.kshitigarbha.ai_coaching}\n\n*${result.kshitigarbha.dedication_ritual}*` : `\n\n**回向**:\n${result.ritual}`}`,
        timestamp: responseNow
      }]);
      setSelectedHeartMethod('');
    } catch (error) {
      console.error('AI Error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: t('zen_master_error'), timestamp: new Date().toLocaleString() }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[500px] bg-white rounded-3xl shadow-sm border border-zen-accent/10 overflow-hidden">
      <div className="p-4 border-bottom border-zen-accent/5 bg-zen-bg/50 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-zen-accent" />
            <h3 className="text-sm font-semibold uppercase tracking-wider">{t('zen_assistant_title')}</h3>
          </div>
          {messages.length > 0 && (
            <button 
              onClick={() => setMessages([])}
              className="text-xs text-zen-ink/40 hover:text-zen-ink transition-colors"
            >
              清空记录
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {heartMethods.map(method => (
            <button
              key={method}
              onClick={() => setSelectedHeartMethod(method === selectedHeartMethod ? '' : method)}
              className={`px-2 py-0.5 rounded-full text-xs ${selectedHeartMethod === method ? 'bg-zen-accent text-white' : 'bg-zen-bg text-zen-ink border border-zen-accent/10'}`}
            >
              {method}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-10 text-zen-accent/40 italic text-sm">
            <ReactMarkdown>{t('zen_assistant_placeholder')}</ReactMarkdown>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
              msg.role === 'user' 
                ? 'bg-zen-accent text-white' 
                : 'bg-zen-bg text-zen-ink border border-zen-accent/5'
            }`}>
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
            <span className="text-[10px] text-zen-ink/40 mt-1 px-1">{msg.timestamp}</span>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-zen-bg p-3 rounded-2xl border border-zen-accent/5">
              <Loader2 className="w-4 h-4 animate-spin text-zen-accent" />
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-zen-accent/5 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={t('ask_zen_master')}
          className="flex-1 bg-zen-bg border-none rounded-full px-4 py-2 text-sm focus:ring-1 focus:ring-zen-accent outline-none"
        />
        <button
          onClick={handleSend}
          disabled={isLoading}
          className="bg-zen-accent text-white p-2 rounded-full hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
