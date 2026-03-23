import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Loader2, Send, ShieldCheck, AlertCircle, Calendar, ChevronDown, ChevronUp, X } from 'lucide-react';
import { useTranslation } from '../../i18n';
import { parseISO } from 'date-fns';
import { GoogleGenAI } from "@google/genai";
import { containsBadWords } from '../../utils/badWords';
import { practiceService } from '../../services/practiceService';
import { useFirebase } from '../../contexts/FirebaseContext';
import { collection, doc, setDoc, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { handleFirestoreError, OperationType } from '../../utils/firebaseErrors';

interface DeedEntry {
  id: string;
  date: string;
  type: 'good' | 'repentance';
  content: string;
  result: any;
}

export const DailyGoodDeed = ({ user, onLevelUp, onClose }: { user: any, onLevelUp: (msg: string) => void, onClose?: () => void }) => {
  const { t } = useTranslation();
  const { user: fbUser, isAuthReady } = useFirebase();
  const [input, setInput] = useState('');
  const [isRepentance, setIsRepentance] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 16);
  });
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [history, setHistory] = useState<DeedEntry[]>([]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (isAuthReady && fbUser) {
        try {
          const snapshot = await getDocs(collection(db, `users/${fbUser.uid}/goodDeeds`));
          const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DeedEntry));
          const sorted = data.sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
          setHistory(sorted);
          localStorage.setItem('good_deed_history', JSON.stringify(sorted));
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${fbUser.uid}/goodDeeds`);
        }
      } else {
        const saved = localStorage.getItem('good_deed_history');
        if (saved) {
          const parsed = JSON.parse(saved);
          const filtered = parsed.filter((d: any) => {
            if (!d.content) return true;
            const isChanting = d.content.includes('念诵') || d.content.includes('禅修');
            return !isChanting;
          });
          setHistory(filtered);
        }
      }
    };
    fetchHistory();
  }, [fbUser, isAuthReady]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    if (containsBadWords(input)) {
      alert('您的内容包含不当词汇，请修改后再提交。');
      return;
    }

    const settings = practiceService.getSettings();
    if (!settings.aiEnabled || !settings.aiApiKey) {
      alert("AI 禅师未开启或未配置 API Key。请前往「设置」->「AI 禅师」中开启。");
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const ai = new GoogleGenAI({ apiKey: settings.aiApiKey });
      const prompt = `
        用户输入: ${input}
        类型: ${isRepentance ? '忏悔/改过' : '每日一善'}
        请根据《了凡四训》的五维权重（真、端、阴、正、满）评估此行为。
        返回以下JSON格式:
        {
          "ledger_entry": {
            "deed": "行为概括(限10字)",
            "liufan_category": "五维评估结果",
            "mindset_applied": "运用的心法"
          },
          "merit_calculation": {
            "base": 10,
            "multiplier": 1.0,
            "total_this_time": 10,
            "progress_to_3000": "142/3000"
          },
          "fate_insight": {
            "current_trend": "趋势(限10字)",
            "wisdom_quote": "了凡四训名句(最精简)",
            "daily_habit_task": "明日建议(限15字)"
          },
          "visual_cue": "GOLDEN_FLARE"
        }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      if (response.text) {
        const res = JSON.parse(response.text);
        setResult(res);
        
        // Ensure date is in ISO 8601 format with Z
        const dateObj = parseISO(selectedDate);
        const isoDate = dateObj.toISOString();
        
        const newEntry: DeedEntry = {
          id: Date.now().toString(),
          date: isoDate,
          type: isRepentance ? 'repentance' : 'good',
          content: input,
          result: res
        };
        const newHistory = [newEntry, ...history].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
        setHistory(newHistory);
        localStorage.setItem('good_deed_history', JSON.stringify(newHistory));
        
        if (fbUser) {
          try {
            const cleanEntry = Object.fromEntries(Object.entries(newEntry).filter(([_, v]) => v !== undefined));
            await setDoc(doc(db, `users/${fbUser.uid}/goodDeeds`, newEntry.id), cleanEntry);
          } catch (error) {
            handleFirestoreError(error, OperationType.WRITE, `users/${fbUser.uid}/goodDeeds`);
          }
        }
        
        window.dispatchEvent(new CustomEvent('zen_data_updated'));
        window.dispatchEvent(new CustomEvent('addExp', { detail: 8 }));
      }
    } catch (error) {
      console.error('AI Error:', error);
    } finally {
      setIsLoading(false);
      setInput('');
    }
  };

  const [activeFilter, setActiveFilter] = useState<'today' | 'week' | 'all' | null>(null);

  const getFilteredHistory = () => {
    const now = new Date();
    const todayStr = now.toDateString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    if (activeFilter === 'today') return history.filter(h => new Date(h.date).toDateString() === todayStr);
    if (activeFilter === 'week') return history.filter(h => new Date(h.date) >= weekAgo);
    return history;
  };

  const getSummary = () => {
    const now = new Date();
    const todayStr = now.toDateString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const todayCount = history.filter(h => new Date(h.date).toDateString() === todayStr).length;
    const weekCount = history.filter(h => new Date(h.date) >= weekAgo).length;
    const totalCount = history.length;

    return { todayCount, weekCount, totalCount };
  };

  const summary = getSummary();
  const filteredHistory = getFilteredHistory();

  const toggleFilter = (filter: 'today' | 'week' | 'all') => {
    if (activeFilter === filter) setActiveFilter(null);
    else setActiveFilter(filter);
  };

  return (
    <div className="relative bg-white rounded-3xl sm:rounded-[40px] p-6 sm:p-8 shadow-sm border border-zen-accent/5 space-y-6">
      {onClose && (
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 p-1.5 sm:p-2 text-zen-ink/40 hover:text-zen-ink hover:bg-zen-accent/10 rounded-full transition-colors z-10"
          title="关闭"
        >
          <X className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      )}
      
      <div className="flex items-center justify-between gap-2 pr-8 sm:pr-12">
        <h2 className="text-lg sm:text-2xl font-serif font-bold text-zen-ink whitespace-nowrap shrink-0">每日一善</h2>
        <button 
          onClick={() => setIsRepentance(!isRepentance)}
          className={`flex items-center justify-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-[11px] sm:text-xs font-bold whitespace-nowrap shrink-0 ${isRepentance ? 'bg-red-100 text-red-600' : 'bg-zen-bg text-zen-accent'}`}
        >
          {isRepentance ? <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          {isRepentance ? '忏悔/改过' : '记录善行'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        {[
          { label: '今日', count: summary.todayCount, filter: 'today' },
          { label: '本周', count: summary.weekCount, filter: 'week' },
          { label: '总计', count: summary.totalCount, filter: 'all' }
        ].map((item, i) => (
          <button key={i} onClick={() => toggleFilter(item.filter as any)} className={`p-4 rounded-2xl ${activeFilter === item.filter ? 'bg-zen-accent text-white' : 'bg-zen-bg'}`}>
            <p className={`text-xs mb-1 ${activeFilter === item.filter ? 'text-white/80' : 'text-zen-accent/60'}`}>{item.label}</p>
            <p className={`text-xl font-bold ${activeFilter === item.filter ? 'text-white' : 'text-zen-ink'}`}>{item.count}</p>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {activeFilter && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {filteredHistory.map(h => (
                <div key={h.id} className="text-xs p-3 bg-zen-bg rounded-xl flex justify-between items-center">
                  <span>{new Date(h.date).toLocaleString()}</span>
                  <span className={h.type === 'good' ? 'text-green-600' : 'text-red-600'}>{h.content.substring(0, 10)}...</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!result ? (
        <div className="space-y-4">
          <input
            type="datetime-local"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full p-3 rounded-2xl bg-zen-bg border-none text-sm focus:ring-1 focus:ring-zen-accent outline-none"
          />
          <div className="grid grid-rows-2 grid-flow-col sm:grid-rows-none sm:grid-cols-4 gap-2 overflow-x-auto pb-2 -mx-2 px-2 sm:mx-0 sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {(isRepentance 
              ? ['发脾气', '杀生', '恶语伤人', '浪费食物', '心生嫉妒', '贪婪', '懒惰']
              : ['吃素一天', '布施/捐款', '放生护生', '帮助他人', '环保回收', '微笑待人', '口出善言']
            ).map(tag => (
              <button
                key={tag}
                onClick={() => setInput(prev => prev ? `${prev}，${tag}` : tag)}
                className="px-3 py-2 bg-zen-accent/5 text-zen-accent rounded-xl text-xs hover:bg-zen-accent/10 transition-colors flex items-center justify-center text-center leading-tight whitespace-nowrap sm:whitespace-normal"
              >
                + {tag}
              </button>
            ))}
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isRepentance ? "输入今日过失..." : "输入今日善行..."}
            className="w-full h-32 p-4 rounded-2xl bg-zen-bg border-none focus:ring-1 focus:ring-zen-accent outline-none text-sm"
          />
          <button
            onClick={handleSend}
            disabled={isLoading}
            className="w-full bg-zen-accent text-white py-3 rounded-2xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            提交
          </button>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 text-sm"
        >
          <div className="p-4 bg-zen-bg rounded-2xl">
            <p className="font-bold text-zen-accent mb-2">{result.ledger_entry.deed}</p>
            <p className="text-zen-ink/70">{result.fate_insight.wisdom_quote}</p>
          </div>
          <button 
            onClick={() => setResult(null)}
            className="w-full text-zen-accent text-xs font-bold"
          >
            继续记录
          </button>
        </motion.div>
      )}
    </div>
  );
};
