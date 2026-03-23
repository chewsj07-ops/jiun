import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, X, Sparkles, History, Loader2, CheckCircle2, ChevronDown, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { GoogleGenAI } from "@google/genai";
import { toast } from 'sonner';
import { containsBadWords } from '../utils/badWords';
import { practiceService } from '../services/practiceService';

import { cryptoService } from '../services/cryptoService';
import { identityService } from '../services/identityService';
import { syncService } from '../services/syncService';
import { auth, db } from '../firebase';
import { writeBatch, doc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/firebaseErrors';

interface Thought {
  id: number;
  uid?: string;
  type?: string;
  record_version?: number;
  emotions: string[];
  event: string;
  action: string;
  result: string;
  learning: string;
  vow: string;
  timestamp: string;
  guidance?: string;
  isEncrypted?: boolean;
  content_encrypted?: string;
  iv?: string;
}

export const EMOTION_GROUPS = [
  {
    label: '正面情绪',
    options: [
      { id: 'peaceful', label: '平静', color: 'text-blue-500', bg: 'bg-blue-500/10' },
      { id: 'joy', label: '喜悦', color: 'text-pink-500', bg: 'bg-pink-500/10' },
      { id: 'grateful', label: '感恩', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
      { id: 'content', label: '满足', color: 'text-teal-500', bg: 'bg-teal-500/10' },
      { id: 'hopeful', label: '充满希望', color: 'text-amber-500', bg: 'bg-amber-500/10' },
      { id: 'confident', label: '自信', color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
      { id: 'relaxed', label: '轻松', color: 'text-sky-500', bg: 'bg-sky-500/10' },
      { id: 'loving', label: '充满爱', color: 'text-rose-500', bg: 'bg-rose-500/10' },
      { id: 'forgiving', label: '宽容', color: 'text-purple-500', bg: 'bg-purple-500/10' },
      { id: 'focused', label: '专注', color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
    ]
  },
  {
    label: '负面情绪',
    options: [
      { id: 'angry', label: '生气', color: 'text-red-500', bg: 'bg-red-500/10' },
      { id: 'anxious', label: '焦虑', color: 'text-amber-600', bg: 'bg-amber-600/10' },
      { id: 'sad', label: '悲伤', color: 'text-indigo-600', bg: 'bg-indigo-600/10' },
      { id: 'jealous', label: '嫉妒', color: 'text-emerald-600', bg: 'bg-emerald-600/10' },
      { id: '委屈', label: '委屈', color: 'text-purple-600', bg: 'bg-purple-600/10' },
      { id: 'stressed', label: '压力', color: 'text-orange-500', bg: 'bg-orange-500/10' },
      { id: 'worried', label: '担心', color: 'text-yellow-600', bg: 'bg-yellow-600/10' },
      { id: 'restless', label: '不安', color: 'text-teal-600', bg: 'bg-teal-600/10' },
      { id: 'ashamed', label: '羞愧', color: 'text-rose-600', bg: 'bg-rose-600/10' },
      { id: 'lonely', label: '孤独', color: 'text-slate-500', bg: 'bg-slate-500/10' },
      { id: 'disappointed', label: '失望', color: 'text-gray-500', bg: 'bg-gray-500/10' },
      { id: 'confused', label: '困惑', color: 'text-blue-600', bg: 'bg-blue-600/10' },
      { id: 'fearful', label: '恐惧', color: 'text-zinc-700', bg: 'bg-zinc-700/10' },
      { id: 'tired', label: '疲惫', color: 'text-stone-500', bg: 'bg-stone-500/10' },
      { id: 'irritable', label: '烦躁', color: 'text-red-400', bg: 'bg-red-400/10' },
      { id: 'helpless', label: '无助', color: 'text-sky-600', bg: 'bg-sky-600/10' },
      { id: 'regretful', label: '懊悔', color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
    ]
  }
];

export const ALL_EMOTIONS = EMOTION_GROUPS.flatMap(g => g.options);

export const ThoughtCollector = ({ className, iconOnlyOnMobile }: { className?: string, iconOnlyOnMobile?: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'record' | 'history'>('record');
  
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [eventText, setEventText] = useState('');
  const [actionText, setActionText] = useState('');
  const [resultText, setResultText] = useState('');
  const [learningText, setLearningText] = useState('');
  const [vowText, setVowText] = useState('');
  
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [isLoadingGuidance, setIsLoadingGuidance] = useState<number | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [filterEmotion, setFilterEmotion] = useState<string | 'all'>('all');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterDay, setFilterDay] = useState<string>('all');

  const [showPlaque, setShowPlaque] = useState<Thought | null>(null);

  const filteredThoughts = thoughts.filter(t => {
    const d = new Date(t.timestamp || t.id);
    const matchEmotion = filterEmotion === 'all' || t.emotions.includes(filterEmotion);
    const matchYear = filterYear === 'all' || d.getFullYear().toString() === filterYear;
    const matchMonth = filterMonth === 'all' || (d.getMonth() + 1).toString() === filterMonth;
    const matchDay = filterDay === 'all' || d.getDate().toString() === filterDay;
    return matchEmotion && matchYear && matchMonth && matchDay;
  });

  const uniqueYears = Array.from(new Set([new Date().getFullYear().toString(), ...thoughts.map(t => new Date(t.timestamp || t.id).getFullYear().toString())])).sort((a, b) => b.localeCompare(a));

  const getDaysInMonth = (yearStr: string, monthStr: string) => {
    if (monthStr === 'all') return 31;
    const month = parseInt(monthStr);
    // If year is 'all', use a leap year (e.g., 2024) to ensure Feb has 29 days just in case.
    const year = yearStr === 'all' ? 2024 : parseInt(yearStr);
    return new Date(year, month, 0).getDate();
  };

  const maxDays = getDaysInMonth(filterYear, filterMonth);

  useEffect(() => {
    if (filterDay !== 'all') {
      const day = parseInt(filterDay);
      if (day > maxDays) {
        setFilterDay('all');
      }
    }
  }, [maxDays, filterDay]);

  useEffect(() => {
    const loadThoughts = async () => {
      const saved = localStorage.getItem('zen_thoughts');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const decryptedThoughts = await Promise.all(parsed.map(async (t: any) => {
            if (t.isEncrypted && t.iv) {
              const decryptedContent = await cryptoService.decrypt(t.content_encrypted, t.iv);
              try {
                const content = JSON.parse(decryptedContent);
                return {
                  ...t,
                  emotions: t.emotions || (t.emotion ? [t.emotion] : []),
                  event: content.event || '',
                  action: content.action || '',
                  result: content.result || '',
                  learning: content.learning || '',
                  vow: content.vow || ''
                };
              } catch (e) {
                return t;
              }
            }
            return {
              ...t,
              emotions: t.emotions || (t.emotion ? [t.emotion] : []),
              vow: t.vow || ''
            };
          }));
          setThoughts(decryptedThoughts);
        } catch (e) {
          console.error("Failed to parse thoughts", e);
        }
      }
    };
    loadThoughts();
  }, []);

  useEffect(() => {
    const saveThoughts = async () => {
      if (thoughts.length === 0) return;
      
      const encryptedThoughts = await Promise.all(thoughts.map(async (t) => {
        if (t.isEncrypted) return t; // Already encrypted
        
        const contentToEncrypt = JSON.stringify({
          event: t.event,
          action: t.action,
          result: t.result,
          learning: t.learning,
          vow: t.vow
        });
        
        const { ciphertext, iv } = await cryptoService.encrypt(contentToEncrypt);
        
        const newThought: any = {
          id: t.id,
          uid: t.uid || identityService.getUserId(),
          type: t.type || 'thought_observation',
          record_version: t.record_version || 1,
          emotions: t.emotions,
          timestamp: t.timestamp || new Date(t.id).toISOString(),
          isEncrypted: true,
          content_encrypted: ciphertext,
          iv: iv
        };
        
        if (t.guidance !== undefined) {
          newThought.guidance = t.guidance;
        }
        
        return newThought;
      }));
      
      localStorage.setItem('zen_thoughts', JSON.stringify(encryptedThoughts));
      window.dispatchEvent(new CustomEvent('zen_data_updated'));
      
      // Trigger sync
      if (auth.currentUser) {
        try {
          const batch = writeBatch(db);
          encryptedThoughts.forEach((t: any) => {
            const docRef = doc(db, `users/${auth.currentUser!.uid}/thoughts`, t.id.toString());
            const cleanT = Object.fromEntries(Object.entries(t).filter(([_, v]) => v !== undefined));
            batch.set(docRef, cleanT);
          });
          await batch.commit();
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${auth.currentUser.uid}/thoughts`);
        }
      }
    };
    
    saveThoughts();
  }, [thoughts]);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-thought-collector', handleOpen);
    return () => window.removeEventListener('open-thought-collector', handleOpen);
  }, []);

  const toggleEmotion = (id: string) => {
    setSelectedEmotions(prev => 
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  const handleGetGuidance = async (thought: Thought) => {
    const settings = practiceService.getSettings();
    if (!settings.aiEnabled || !settings.aiApiKey) {
      alert("AI 禅师未开启或未配置 API Key。请前往「设置」->「AI 禅师」中开启。");
      return;
    }

    setIsLoadingGuidance(thought.id);
    try {
      const ai = new GoogleGenAI({ apiKey: settings.aiApiKey });
      const emoLabels = thought.emotions.map(id => ALL_EMOTIONS.find(e => e.id === id)?.label).filter(Boolean).join('、') || '未知';
      
      const prompt = `你是一位慈悲的导师以5戒8正道4圣谛和正道的佛法来说法。用户感受到了 ${emoLabels}，因为 ${thought.event}。他尝试用 ${thought.action} 转念。请给予一句最精简、最省字、直击心灵的睿智点评（限30字以内）。`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: prompt,
      });

      if (response.text) {
        const text = response.text;
        setThoughts(prev => prev.map(t => 
          t.id === thought.id ? { ...t, guidance: text } : t
        ));
        setShowPlaque(prev => (prev && prev.id === thought.id) ? { ...prev, guidance: text } : prev);
      }
    } catch (error) {
      console.error('Failed to get guidance:', error);
      const fallbackText = "导师正在沉思，稍后再为您解答。";
      setThoughts(prev => prev.map(t => 
        t.id === thought.id ? { ...t, guidance: fallbackText } : t
      ));
      setShowPlaque(prev => (prev && prev.id === thought.id) ? { ...prev, guidance: fallbackText } : prev);
    } finally {
      setIsLoadingGuidance(null);
    }
  };

  const handleSave = async () => {
    if (selectedEmotions.length === 0 && !eventText && !actionText && !resultText && !learningText && !vowText) return;
    
    const contentToCheck = `${eventText} ${actionText} ${resultText} ${learningText} ${vowText} ${selectedEmotions.join(' ')}`;
    if (containsBadWords(contentToCheck)) {
      toast.error('您的内容包含不当词汇，请修改后再保存。');
      return;
    }
    
    const newThought: Thought = {
      id: Date.now(),
      uid: identityService.getUserId(),
      type: 'thought_observation',
      record_version: 1,
      emotions: selectedEmotions.length > 0 ? selectedEmotions : ['peaceful'],
      event: eventText,
      action: actionText,
      result: resultText,
      learning: learningText,
      vow: vowText,
      timestamp: new Date().toISOString()
    };
    
    setThoughts(prev => [newThought, ...prev]);
    
    // Add EXP
    window.dispatchEvent(new CustomEvent('addExp', { detail: 5 }));
    
    // Show Toast
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);

    // Clear form
    setSelectedEmotions([]);
    setEventText('');
    setActionText('');
    setResultText('');
    setLearningText('');
    setVowText('');
    
    // Show plaque
    setShowPlaque(newThought);
    
    // Automatically get guidance for the new thought
    await handleGetGuidance(newThought);
  };

  const renderPlaque = () => {
    if (!showPlaque) return null;
    const emoLabels = showPlaque.emotions.map(id => ALL_EMOTIONS.find(e => e.id === id)?.label).filter(Boolean).join('、') || '未知';

    return createPortal(
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, rotateX: 20 }}
          animate={{ opacity: 1, scale: 1, rotateX: 0 }}
          className="relative w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
          style={{
            backgroundColor: '#f4ecd8', // rice paper color
            backgroundImage: 'url("https://www.transparenttextures.com/patterns/rice-paper.png")',
            borderRadius: '8px',
            boxShadow: '2px 4px 15px rgba(0,0,0,0.2), inset 0 0 20px rgba(139,94,60,0.1)'
          }}
        >
          <div className="flex justify-between items-center p-6 pb-4 shrink-0 sticky top-0 z-10 border-b border-amber-900/10" style={{ backgroundColor: '#f4ecd8', backgroundImage: 'url("https://www.transparenttextures.com/patterns/rice-paper.png")' }}>
            <h3 className="text-2xl font-bold font-serif text-amber-900">念头封存</h3>
            <button onClick={() => setShowPlaque(null)} className="p-2 text-amber-900/40 hover:text-amber-900 rounded-full hover:bg-amber-900/10 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-8 pt-4 font-serif text-amber-900 space-y-4">
            <p className="leading-relaxed">我承认我现在感觉：<strong>{emoLabels}</strong></p>
            {showPlaque.event && <p className="leading-relaxed">因为发生了：<strong>{showPlaque.event}</strong></p>}
            {showPlaque.action && <p className="leading-relaxed">我尝试用：<strong>{showPlaque.action}</strong></p>}
            {showPlaque.result && <p className="leading-relaxed">结果是：<strong>{showPlaque.result}</strong></p>}
            {showPlaque.learning && <p className="leading-relaxed">感恩这件事情让我学会了：<strong>{showPlaque.learning}</strong></p>}
            {showPlaque.vow && <p className="leading-relaxed">发愿 / 祝福：<strong>{showPlaque.vow}</strong></p>}
            
            {showPlaque.guidance ? (
              <div className="mt-6 pt-6 border-t border-amber-900/20">
                <p className="text-sm italic text-amber-900/80 flex items-center gap-1 mb-3">
                  <Sparkles className="w-4 h-4" /> 觉察陪伴者：
                </p>
                <div className="space-y-3 text-sm leading-relaxed whitespace-pre-wrap">
                  {showPlaque.guidance}
                </div>
              </div>
            ) : (
              <div className="mt-6 pt-6 border-t border-amber-900/20 flex flex-col items-center justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-amber-900/40 mb-2" />
                <p className="text-xs text-amber-900/60 font-bold tracking-widest">导师正在思考...</p>
              </div>
            )}
          </div>

          <div className="p-6 pt-4 border-t border-amber-900/10 shrink-0" style={{ backgroundColor: '#f4ecd8', backgroundImage: 'url("https://www.transparenttextures.com/patterns/rice-paper.png")' }}>
            <button
              onClick={() => setShowPlaque(null)}
              className="w-full bg-amber-900/10 text-amber-900 py-3 rounded-2xl font-bold hover:bg-amber-900/20 transition-colors"
            >
              感恩圆满
            </button>
          </div>
        </motion.div>
      </div>,
      document.body
    );
  };

  return (
    <>
      {/* Trigger Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        title="觉察记录"
        className={cn(
          "px-3 py-1.5 bg-zen-accent text-white rounded-full shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-1.5 text-xs",
          className
        )}
      >
        <MessageCircle className="w-4 h-4" />
        <span className={cn("font-bold", iconOnlyOnMobile && "hidden sm:inline")}>觉察</span>
      </motion.button>

      {/* Toast */}
      {createPortal(
        <AnimatePresence>
          {showToast && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-40 left-1/2 -translate-x-1/2 z-[70] bg-zen-ink text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span className="text-sm font-medium">当念头被看见，智慧就开始出现。 (+5 功德)</span>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Modal */}
      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white rounded-[32px] w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col overflow-hidden relative"
              >
              <div className="flex justify-between items-center p-6 pb-4 shrink-0 bg-white border-b border-zen-accent/5 sticky top-0 z-10">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-zen-accent" />
                  <h3 className="text-xl font-bold font-serif text-zen-ink">念头觉察</h3>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-2 text-zen-ink/40 hover:text-zen-ink rounded-full hover:bg-zen-bg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 pt-4">
                <div className="flex gap-2 mb-6 shrink-0 bg-zen-bg/50 p-1 rounded-xl">
                <button
                  onClick={() => setActiveTab('record')}
                  className={cn(
                    "flex-1 py-2 text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2",
                    activeTab === 'record' ? "bg-white text-zen-accent shadow-sm" : "text-zen-ink/60 hover:text-zen-ink"
                  )}
                >
                  <MessageCircle className="w-4 h-4" />
                  记录念头
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={cn(
                    "flex-1 py-2 text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2",
                    activeTab === 'history' ? "bg-white text-zen-accent shadow-sm" : "text-zen-ink/60 hover:text-zen-ink"
                  )}
                >
                  <History className="w-4 h-4" />
                  成长轨迹
                </button>
              </div>

              {activeTab === 'record' ? (
                <div className="space-y-6 flex-1 flex flex-col min-h-0">
                  <div className="shrink-0 relative">
                    <label className="block text-sm font-bold text-zen-ink/60 mb-3">第一步：选择情绪</label>
                    
                    {/* Selected Tags */}
                    {selectedEmotions.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {selectedEmotions.map(id => {
                          const emo = ALL_EMOTIONS.find(e => e.id === id);
                          if (!emo) return null;
                          return (
                            <span key={id} className={cn("flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold", emo.bg, emo.color)}>
                              {emo.label}
                              <button onClick={() => toggleEmotion(id)} className="hover:opacity-70 ml-1 p-0.5 rounded-full hover:bg-black/5">
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Dropdown Button */}
                    <button
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="w-full flex items-center justify-between bg-zen-bg/30 border border-zen-accent/10 rounded-xl p-3 text-sm text-zen-ink/80 hover:bg-zen-bg/50 transition-colors"
                    >
                      <span>{selectedEmotions.length === 0 ? '点击选择情绪...' : '继续添加情绪...'}</span>
                      <ChevronDown className={cn("w-4 h-4 transition-transform", isDropdownOpen && "rotate-180")} />
                    </button>

                    {/* Dropdown Menu */}
                    <AnimatePresence>
                      {isDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute z-10 w-full mt-2 bg-white border border-zen-accent/10 rounded-xl shadow-xl max-h-64 overflow-y-auto p-3"
                        >
                          {EMOTION_GROUPS.map(group => (
                            <div key={group.label} className="mb-4 last:mb-0">
                              <div className="px-2 py-1 text-xs font-bold text-zen-ink/40 uppercase tracking-wider mb-2">
                                {group.label}
                              </div>
                              <div className="grid grid-cols-2 gap-1.5">
                                {group.options.map(emo => {
                                  const isSelected = selectedEmotions.includes(emo.id);
                                  return (
                                    <button
                                      key={emo.id}
                                      onClick={() => toggleEmotion(emo.id)}
                                      className={cn(
                                        "flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors text-left",
                                        isSelected ? `${emo.bg} ${emo.color} font-bold` : "hover:bg-zen-bg/50 text-zen-ink/70"
                                      )}
                                    >
                                      <span>{emo.label}</span>
                                      {isSelected && <Check className="w-4 h-4" />}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="shrink-0">
                    <label className="block text-sm font-bold text-zen-ink/60 mb-2">第二步：觉察记录</label>
                    <div className="space-y-3">
                      <div className="bg-zen-bg/30 border border-zen-accent/10 rounded-xl p-3 text-sm text-zen-ink/80">
                        <span className="text-zen-ink/50 block mb-1">我承认我现在感觉：</span>
                        {selectedEmotions.length > 0 
                          ? selectedEmotions.map(id => ALL_EMOTIONS.find(e => e.id === id)?.label).join('、')
                          : '（请在上方选择情绪）'}
                      </div>
                      
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-zen-ink/50 ml-1">因为发生了...</label>
                        <textarea
                          value={eventText}
                          onChange={(e) => setEventText(e.target.value)}
                          className="w-full h-20 bg-zen-bg/30 border border-zen-accent/10 rounded-xl p-3 text-sm focus:outline-none focus:border-zen-accent/30 resize-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-zen-ink/50 ml-1">我尝试用（例如慈心、平等心、理解、包容、观察念头等）来转念或面对这件事...</label>
                        <textarea
                          value={actionText}
                          onChange={(e) => setActionText(e.target.value)}
                          className="w-full h-20 bg-zen-bg/30 border border-zen-accent/10 rounded-xl p-3 text-sm focus:outline-none focus:border-zen-accent/30 resize-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-zen-ink/50 ml-1">结果是...</label>
                        <textarea
                          value={resultText}
                          onChange={(e) => setResultText(e.target.value)}
                          className="w-full h-20 bg-zen-bg/30 border border-zen-accent/10 rounded-xl p-3 text-sm focus:outline-none focus:border-zen-accent/30 resize-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-zen-ink/50 ml-1">感恩这件事情让我学会了...</label>
                        <textarea
                          value={learningText}
                          onChange={(e) => setLearningText(e.target.value)}
                          className="w-full h-20 bg-zen-bg/30 border border-zen-accent/10 rounded-xl p-3 text-sm focus:outline-none focus:border-zen-accent/30 resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <label className="block text-sm font-bold text-zen-ink/60 mb-2">第三步：发愿 / 祝福</label>
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-zen-ink/50 ml-1">例如：愿我下次遇到类似情况能更有智慧。愿一切众生都能远离这种烦恼...</label>
                      <textarea
                        value={vowText}
                        onChange={(e) => setVowText(e.target.value)}
                        className="w-full h-20 bg-zen-bg/30 border border-zen-accent/10 rounded-xl p-3 text-sm focus:outline-none focus:border-zen-accent/30 resize-none"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col min-h-0">
                  {thoughts.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-zen-ink/40 py-12">
                      <History className="w-12 h-12 mb-4 opacity-20" />
                      <p>暂无成长轨迹</p>
                    </div>
                  ) : (
                    <div className="flex flex-col h-full min-h-0">
                      {/* Filter Bar */}
                      <div className="flex flex-col gap-3 mb-4 shrink-0 px-1">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-bold text-zen-ink/60">
                            共 {filteredThoughts.length} 条记录
                          </div>
                          <div className="relative">
                            <select
                              value={filterEmotion}
                              onChange={(e) => setFilterEmotion(e.target.value)}
                              className="appearance-none bg-zen-bg/50 border border-zen-accent/10 rounded-lg pl-3 pr-8 py-1.5 text-xs font-bold text-zen-ink/80 focus:outline-none focus:border-zen-accent/30 cursor-pointer"
                            >
                              <option value="all">所有情绪</option>
                              {EMOTION_GROUPS.map(g => (
                                <optgroup key={g.label} label={g.label}>
                                  {g.options.map(emo => (
                                    <option key={emo.id} value={emo.id}>{emo.label}</option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zen-ink/40 pointer-events-none" />
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <select
                              value={filterYear}
                              onChange={(e) => setFilterYear(e.target.value)}
                              className="w-full appearance-none bg-zen-bg/50 border border-zen-accent/10 rounded-lg pl-3 pr-8 py-1.5 text-xs font-bold text-zen-ink/80 focus:outline-none focus:border-zen-accent/30 cursor-pointer"
                            >
                              <option value="all">所有年份</option>
                              {uniqueYears.map(y => (
                                <option key={y} value={y}>{y}年</option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zen-ink/40 pointer-events-none" />
                          </div>
                          <div className="relative flex-1">
                            <select
                              value={filterMonth}
                              onChange={(e) => setFilterMonth(e.target.value)}
                              className="w-full appearance-none bg-zen-bg/50 border border-zen-accent/10 rounded-lg pl-3 pr-8 py-1.5 text-xs font-bold text-zen-ink/80 focus:outline-none focus:border-zen-accent/30 cursor-pointer"
                            >
                              <option value="all">所有月份</option>
                              {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                                <option key={m} value={m.toString()}>{m}月</option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zen-ink/40 pointer-events-none" />
                          </div>
                          <div className="relative flex-1">
                            <select
                              value={filterDay}
                              onChange={(e) => setFilterDay(e.target.value)}
                              className="w-full appearance-none bg-zen-bg/50 border border-zen-accent/10 rounded-lg pl-3 pr-8 py-1.5 text-xs font-bold text-zen-ink/80 focus:outline-none focus:border-zen-accent/30 cursor-pointer"
                            >
                              <option value="all">所有日期</option>
                              {Array.from({length: maxDays}, (_, i) => i + 1).map(d => (
                                <option key={d} value={d.toString()}>{d}日</option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zen-ink/40 pointer-events-none" />
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-6 overflow-y-auto pr-2 flex-1 pb-4">
                        {filteredThoughts.length === 0 && (
                          <div className="text-center text-zen-ink/40 py-8 text-sm">没有找到符合条件的记录</div>
                        )}
                        {Object.entries(
                          filteredThoughts
                            .reduce((acc, thought) => {
                              const date = new Date(thought.timestamp || thought.id);
                              const monthYear = `${date.getFullYear()}年${date.getMonth() + 1}月`;
                              if (!acc[monthYear]) acc[monthYear] = [];
                              acc[monthYear].push(thought);
                              return acc;
                            }, {} as Record<string, Thought[]>)
                        ).map(([month, monthThoughts]) => (
                          <div key={month} className="space-y-4">
                            <div className="sticky top-0 bg-white/95 backdrop-blur-sm py-2 z-10 -mx-2 px-2">
                              <h4 className="text-xs font-bold text-zen-ink/40 flex items-center gap-2">
                                <div className="h-px bg-zen-ink/10 flex-1"></div>
                                {month}
                                <div className="h-px bg-zen-ink/10 flex-1"></div>
                              </h4>
                            </div>
                            {monthThoughts.map(thought => {
                              return (
                                <div key={thought.id} className="p-4 bg-zen-bg/50 rounded-2xl text-sm border border-zen-accent/5">
                                  <div className="flex justify-between items-center mb-3">
                                    <div className="flex flex-wrap gap-1">
                                      {thought.emotions.map(emoId => {
                                        const emo = ALL_EMOTIONS.find(e => e.id === emoId);
                                        if (!emo) return null;
                                        return (
                                          <span key={emoId} className={cn("text-[10px] font-bold px-2 py-1 rounded-md", emo.bg, emo.color)}>
                                            {emo.label}
                                          </span>
                                        );
                                      })}
                                    </div>
                                    <span className="text-[10px] text-zen-ink/40 font-medium">
                                      {new Date(thought.timestamp || thought.id).toLocaleString()}
                                    </span>
                                  </div>
                                  
                                  <div className="space-y-2 mb-3">
                                    {thought.event && <p className="text-zen-ink/80"><span className="text-zen-ink/40 mr-1">因为:</span>{thought.event}</p>}
                                    {thought.action && <p className="text-zen-ink/80"><span className="text-zen-ink/40 mr-1">转念:</span>{thought.action}</p>}
                                    {thought.result && <p className="text-zen-ink/80"><span className="text-zen-ink/40 mr-1">结果:</span>{thought.result}</p>}
                                    {thought.learning && <p className="text-zen-ink/80"><span className="text-zen-ink/40 mr-1">学会:</span>{thought.learning}</p>}
                                    {thought.vow && <p className="text-zen-ink/80"><span className="text-zen-ink/40 mr-1">发愿:</span>{thought.vow}</p>}
                                  </div>
                                  
                                  {thought.guidance ? (
                                    <div className="mt-3 p-3 bg-zen-accent/5 rounded-xl border border-zen-accent/10">
                                      <div className="flex items-center gap-1.5 mb-1.5 text-zen-accent">
                                        <Sparkles className="w-3.5 h-3.5" />
                                        <span className="text-xs font-bold">觉察陪伴者</span>
                                      </div>
                                      <p className="text-xs text-zen-ink/70 leading-relaxed whitespace-pre-wrap">{thought.guidance}</p>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => handleGetGuidance(thought)}
                                      disabled={isLoadingGuidance === thought.id}
                                      className="flex items-center gap-1.5 text-xs text-zen-accent hover:text-zen-accent/80 transition-colors disabled:opacity-50 mt-2"
                                    >
                                      {isLoadingGuidance === thought.id ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      ) : (
                                        <Sparkles className="w-3.5 h-3.5" />
                                      )}
                                      请教陪伴者
                                    </button>
                                  )}
                                  
                                  <button 
                                    onClick={() => setShowPlaque(thought)}
                                    className="mt-3 w-full py-2 bg-white border border-zen-accent/10 rounded-lg text-xs font-medium text-zen-ink/60 hover:text-zen-accent hover:border-zen-accent/30 transition-colors"
                                  >
                                    查看木牌
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              </div>
              
              <div className="p-6 pt-4 border-t border-zen-accent/5 bg-white shrink-0">
                {activeTab === 'record' ? (
                  <div className="flex gap-3">
                    <button onClick={() => setIsOpen(false)} className="flex-1 bg-zen-bg text-zen-accent py-3 rounded-2xl font-bold hover:bg-zen-accent/10 transition-colors">取消</button>
                    <button 
                      onClick={handleSave}
                      disabled={selectedEmotions.length === 0 && !eventText && !actionText && !resultText && !learningText && !vowText}
                      className="flex-1 bg-zen-accent text-white py-3 rounded-2xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                    >
                      封存念头
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setIsOpen(false)} className="w-full bg-zen-bg text-zen-accent py-3 rounded-2xl font-bold hover:bg-zen-accent/10 transition-colors">关闭</button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
    )}
      
      {renderPlaque()}
    </>
  );
};
