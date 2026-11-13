import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, Sparkles, Trash2, Edit2, Plus, List } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '../../i18n';
import { PracticeRecord } from '../../types';
import { practiceService } from '../../services/practiceService';
import { aiGenerate } from '../../services/geminiClient';
import { ZEN_ASSISTANT_SYSTEM_PROMPT } from '../../data/zenAssistantPrompt';

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
    if (!settings.aiEnabled) {
      toast.info("愿禅助手 AI 陪伴尚未开启。请前往「设置」->「愿禅助手 AI 陪伴」中开启。");
      return;
    }

    setLoading(true);
    try {
      const responseText = await aiGenerate({
        systemInstruction: ZEN_ASSISTANT_SYSTEM_PROMPT,
        contents: `用户记录了日常觉察与转念过程：行为总结为“${actionSummary}”，心理转折为“${mindShift}”。请按以下JSON格式生成简短、温和、踏实的修行记录（不夸大、不做交易式回报承诺）：
{
  "action_summary": "行为与心理转折概括",
  "eightfold_path": {
    "primary": "对应八正道法门",
    "mind_shift": "识别运用的心法或觉察"
  },
  "merit_system": {
    "base_points": 10,
    "mind_power_bonus": 0,
    "current_attribute": "本次修行的核心态度"
  },
  "ceo_strategy_insight": "一句温和踏实的践行洞察(限20字)",
  "habit_nudge": "一个当下或明天可做的小练习(限20字)",
  "merit_dedication": "一句简短回向文(限20字)",
  "status_update": "温和鼓励语"
}`,
        responseMimeType: "application/json",
      });

      const newRecord: PracticeRecord = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        ...JSON.parse(responseText || "{}")
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
        <h2 className="text-2xl font-serif font-bold text-ink">{t('eightfold_practice_title')}</h2>
        <button onClick={() => setActiveView(activeView === 'list' ? 'add' : 'list')} className="p-2 bg-accent-mist rounded-full text-accent">
          {activeView === 'list' ? <Plus /> : <List />}
        </button>
      </div>

      {activeView === 'add' ? (
        <div className="bg-surface p-6 rounded-2xl border border-line space-y-4">
          <textarea value={actionSummary} onChange={e => setActionSummary(e.target.value)} className="w-full p-4 bg-surface-2 border border-line rounded-xl text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent" placeholder={t('action_summary_placeholder')} rows={3} />
          <textarea value={mindShift} onChange={e => setMindShift(e.target.value)} className="w-full p-4 bg-surface-2 border border-line rounded-xl text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent" placeholder={t('mind_shift_placeholder')} rows={3} />
          <button onClick={handleAdd} disabled={loading} className="w-full bg-accent text-on-accent hover:bg-accent-hover py-3 rounded-xl font-bold transition-colors">{loading ? "AI 炼心中..." : t('save_practice')}</button>
        </div>
      ) : (
        <div className="space-y-4">
          {currentRecords.map(r => (
            <div key={r.id} className="bg-surface p-6 rounded-2xl border border-line space-y-2">
              <h3 className="font-bold text-ink">{r.action_summary}</h3>
              <p className="text-xs text-ink-2">{r.eightfold_path.primary} - {r.eightfold_path.mind_shift}</p>
              <button onClick={() => handleDelete(r.id)} className="text-red-500 text-xs flex items-center gap-1"><Trash2 className="w-3 h-3" /> {t('delete_practice')}</button>
            </div>
          ))}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="px-4 py-2 bg-accent-mist text-accent rounded-xl text-sm font-medium disabled:opacity-50">Previous</button>
              <span className="text-sm text-ink-2 tabular-nums">{currentPage} / {totalPages}</span>
              <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="px-4 py-2 bg-accent-mist text-accent rounded-xl text-sm font-medium disabled:opacity-50">Next</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
