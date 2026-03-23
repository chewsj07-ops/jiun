import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, Sparkles, Trash2, Edit2, Plus, List } from 'lucide-react';
import { useTranslation } from '../../i18n';
import { PracticeRecord } from '../../types';
import { GoogleGenAI } from "@google/genai";
import { practiceService } from '../../services/practiceService';

export const EightfoldPractice = () => {
  const { t } = useTranslation();
  const [records, setRecords] = useState<PracticeRecord[]>(() => {
    const saved = localStorage.getItem('eightfold_records');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeView, setActiveView] = useState<'list' | 'add'>('list');
  const [actionSummary, setActionSummary] = useState('');
  const [mindShift, setMindShift] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 5;
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = records.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(records.length / recordsPerPage);

  useEffect(() => {
    localStorage.setItem('eightfold_records', JSON.stringify(records));
  }, [records]);

  const handleAdd = async () => {
    const settings = practiceService.getSettings();
    if (!settings.aiEnabled || !settings.aiApiKey) {
      alert("AI 禅师未开启或未配置 API Key。请前往「设置」->「AI 禅师」中开启。");
      return;
    }

    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: settings.aiApiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: `用户记录了转念过程：行为总结为“${actionSummary}”，心理转折为“${mindShift}”。请作为CEO视角和唯识导师，按照以下JSON格式生成最精简、省字的修行记录：
{
  "action_summary": "行为与心理转折概括",
  "eightfold_path": {
    "primary": "对应八正道法门",
    "mind_shift": "识别运用的心法"
  },
  "merit_system": {
    "base_points": 10,
    "mind_power_bonus": 30,
    "current_attribute": "本次修行的核心属性"
  },
  "ceo_strategy_insight": "AI 以 CEO 视角给出的最精简修行战略建议(限20字)",
  "habit_nudge": "基于[原子习惯]的最精简下一步练习(限20字)",
  "merit_dedication": "结合[菩提心]的最精简回向文(限20字)",
  "status_update": "等级进度与系统激励语"
}`,
        config: { responseMimeType: "application/json" }
      });
      
      const newRecord: PracticeRecord = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        ...JSON.parse(response.text || "{}")
      };
      setRecords([newRecord, ...records]);
      setActiveView('list');
      setCurrentPage(1);
      setActionSummary('');
      setMindShift('');
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleDelete = (id: string) => {
    setRecords(records.filter(r => r.id !== id));
  };

  return (
    <div className="w-full max-w-md mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-serif font-bold text-zen-ink">{t('eightfold_practice_title')}</h2>
        <button onClick={() => setActiveView(activeView === 'list' ? 'add' : 'list')} className="p-2 bg-zen-accent/10 rounded-full text-zen-accent">
          {activeView === 'list' ? <Plus /> : <List />}
        </button>
      </div>

      {activeView === 'add' ? (
        <div className="bg-white p-6 rounded-3xl border border-zen-accent/5 shadow-sm space-y-4">
          <textarea value={actionSummary} onChange={e => setActionSummary(e.target.value)} className="w-full p-4 bg-zen-bg rounded-xl text-sm" placeholder={t('action_summary_placeholder')} rows={3} />
          <textarea value={mindShift} onChange={e => setMindShift(e.target.value)} className="w-full p-4 bg-zen-bg rounded-xl text-sm" placeholder={t('mind_shift_placeholder')} rows={3} />
          <button onClick={handleAdd} disabled={loading} className="w-full bg-zen-accent text-white py-3 rounded-xl font-bold">{loading ? "AI 炼心中..." : t('save_practice')}</button>
        </div>
      ) : (
        <div className="space-y-4">
          {currentRecords.map(r => (
            <div key={r.id} className="bg-white p-6 rounded-3xl border border-zen-accent/5 shadow-sm space-y-2">
              <h3 className="font-bold">{r.action_summary}</h3>
              <p className="text-xs text-zen-accent/60">{r.eightfold_path.primary} - {r.eightfold_path.mind_shift}</p>
              <button onClick={() => handleDelete(r.id)} className="text-red-500 text-xs flex items-center gap-1"><Trash2 className="w-3 h-3" /> {t('delete_practice')}</button>
            </div>
          ))}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="px-4 py-2 bg-zen-accent/10 rounded-xl text-sm">Previous</button>
              <span className="text-sm">{currentPage} / {totalPages}</span>
              <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="px-4 py-2 bg-zen-accent/10 rounded-xl text-sm">Next</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
