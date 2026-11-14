import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, Send, ShieldCheck, Heart, Sparkles, X } from 'lucide-react';
import { parseISO } from 'date-fns';
import { toast } from 'sonner';
import { containsBadWords } from '../../utils/badWords';
import { isSamePracticeDay, practiceService } from '../../services/practiceService';
import { identityService } from '../../services/identityService';
import { aiGenerate } from '../../services/geminiClient';
import { ZEN_ASSISTANT_SYSTEM_PROMPT } from '../../data/zenAssistantPrompt';
import { useFirebase } from '../../contexts/FirebaseContext';
import { collection, doc, setDoc, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { handleFirestoreError, OperationType } from '../../utils/firebaseErrors';
import { consentService } from '../../services/consentService';
import { safeStorage } from '../../utils/safeStorage';
import { cn } from '../../lib/utils';

type DeedMode = 'self' | 'rejoice' | 'repentance';

interface DeedEntry {
  id: string;
  date: string;
  type: 'good' | 'repentance';
  subType?: DeedMode;
  category?: string;
  recipient?: string;
  content: string;
  result: any;
}

const GOOD_CATEGORIES = ['布施', '爱语', '利行', '随喜', '护生', '十善业'] as const;

const SELF_DEED_SUGGESTIONS = [
  '吃素一餐',
  '布施/捐助',
  '温和说话',
  '帮助他人',
  '随手环保',
  '微笑待人',
];

const REJOICE_SUGGESTIONS = [
  '看见有人礼让老人',
  '随喜朋友真诚助人',
  '随喜家人安静体谅',
  '赞叹陌生人的善意',
];

const REPENTANCE_SUGGESTIONS = [
  '起急躁发脾气',
  '说了伤人的话',
  '心生嫉妒比较',
  '浪费粮食时间',
];

const AI_DEED_TIMEOUT_MS = 8000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('AI_TIMEOUT')), ms);
    promise
      .then((val) => {
        window.clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        window.clearTimeout(timer);
        reject(err);
      });
  });
}

function buildOfflineDeedResult(
  mode: DeedMode,
  content: string,
  category: string,
  recipient: string
) {
  const shortTitle = content.trim().slice(0, 12) || (mode === 'rejoice' ? '随喜善行' : '每日一善');
  if (mode === 'repentance') {
    return {
      ledger_entry: {
        deed: shortTitle,
        liufan_category: '改过',
        mindset_applied: '如实看见',
      },
      merit_calculation: {
        base: 5,
        multiplier: 1.0,
        total_this_time: 5,
        progress_to_3000: '看见过失即是转机',
      },
      fate_insight: {
        current_trend: '觉照改过',
        wisdom_quote: '看见不是为了自责，承认即已轻了一半。',
        daily_habit_task: '下次起念时先停三秒',
      },
    };
  }
  if (mode === 'rejoice') {
    return {
      ledger_entry: {
        deed: shortTitle,
        liufan_category: category || '随喜',
        mindset_applied: recipient ? `随喜${recipient}` : '随喜赞叹',
      },
      merit_calculation: {
        base: 10,
        multiplier: 1.0,
        total_this_time: 10,
        progress_to_3000: '随喜他善即是自善',
      },
      fate_insight: {
        current_trend: '随喜增慧',
        wisdom_quote: '见人行善心生欢喜，微光便已在心里点亮。',
        daily_habit_task: '今日再留意身边一件小善',
      },
    };
  }
  return {
    ledger_entry: {
      deed: shortTitle,
      liufan_category: category || '正行',
      mindset_applied: recipient ? `为${recipient}` : '清净发心',
    },
    merit_calculation: {
      base: 10,
      multiplier: 1.0,
      total_this_time: 10,
      progress_to_3000: '日行一善',
    },
    fate_insight: {
      current_trend: '踏实前行',
      wisdom_quote: '善念已落处，不必声张，自有微光与安稳。',
      daily_habit_task: '随缘把这份善意带给身边人',
    },
  };
}

export const DailyGoodDeed = ({
  user,
  onLevelUp,
  onClose,
}: {
  user: any;
  onLevelUp: (msg: string) => void;
  onClose?: () => void;
}) => {
  const { user: fbUser, isAuthReady } = useFirebase();
  const [mode, setMode] = useState<DeedMode>('self');
  const [category, setCategory] = useState<string>('');
  const [recipient, setRecipient] = useState<string>('');
  const [shareToCommunity, setShareToCommunity] = useState<boolean>(false);
  const [input, setInput] = useState('');
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
      if (isAuthReady && fbUser && consentService.hasCloudConsent()) {
        try {
          const snapshot = await getDocs(collection(db, `users/${fbUser.uid}/goodDeeds`));
          const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as DeedEntry));
          const sorted = data.sort(
            (a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()
          );
          setHistory(sorted);
          safeStorage.setItem('good_deed_history', JSON.stringify(sorted));
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${fbUser.uid}/goodDeeds`);
        }
      } else {
        const saved = safeStorage.getItem('good_deed_history');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            const filtered = parsed.filter((d: any) => {
              if (!d.content) return true;
              const isChanting =
                d.content.includes('念诵') || d.content.includes('禅修');
              return !isChanting;
            });
            setHistory(filtered);
          } catch {
            // ignore parse error
          }
        }
      }
    };
    fetchHistory();
    window.addEventListener('zen_consent_updated', fetchHistory);
    return () => window.removeEventListener('zen_consent_updated', fetchHistory);
  }, [fbUser, isAuthReady]);

  const handleModeSwitch = (nextMode: DeedMode) => {
    setMode(nextMode);
    if (nextMode === 'repentance') {
      setShareToCommunity(false);
      setCategory('');
    } else if (nextMode === 'rejoice' && !category) {
      setCategory('随喜');
    }
  };

  const handleSend = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    if (containsBadWords(`${trimmedInput} ${recipient}`)) {
      toast.error('您的内容包含不当词汇，请修改后再提交。');
      return;
    }

    setIsLoading(true);
    setResult(null);

    const settings = practiceService.getSettings();
    const trimmedRecipient = recipient.trim().slice(0, 60);
    const chosenCategory = category || (mode === 'rejoice' ? '随喜' : '');
    let finalRes: any = null;

    if (settings.aiEnabled) {
      try {
        const modeLabel =
          mode === 'repentance'
            ? '忏悔/改过'
            : mode === 'rejoice'
            ? '随喜别人的善行'
            : '每日一善';
        const prompt = `
用户输入: ${trimmedInput}
类型: ${modeLabel}
分类: ${chosenCategory || '日常善行'}
对象/为谁: ${trimmedRecipient || '未指定'}
请以温和踏实、不夸大、不做交易回报承诺的语气回馈用户，并返回以下 JSON 格式:
{
  "ledger_entry": {
    "deed": "行为概括(限12字)",
    "liufan_category": "${chosenCategory || '当下心行观察'}",
    "mindset_applied": "运用的心念"
  },
  "merit_calculation": {
    "base": 10,
    "multiplier": 1.0,
    "total_this_time": 10,
    "progress_to_3000": "记录善行"
  },
  "fate_insight": {
    "current_trend": "踏实前行",
    "wisdom_quote": "一句温和踏实的鼓励或佛法提醒(限24字)",
    "daily_habit_task": "一个明天可做的小练习(限15字)"
  }
}
`;
        const responseText = await withTimeout(
          aiGenerate({
            contents: prompt,
            systemInstruction: ZEN_ASSISTANT_SYSTEM_PROMPT,
            responseMimeType: 'application/json',
          }),
          AI_DEED_TIMEOUT_MS
        );
        if (responseText) {
          finalRes = JSON.parse(responseText);
        }
      } catch {
        // Seamless offline fallback
      }
    }

    if (!finalRes || !finalRes.ledger_entry || !finalRes.fate_insight) {
      finalRes = buildOfflineDeedResult(mode, trimmedInput, chosenCategory, trimmedRecipient);
    }

    try {
      const dateObj = parseISO(selectedDate);
      const isoDate = Number.isNaN(dateObj.getTime())
        ? new Date().toISOString()
        : dateObj.toISOString();

      const newEntry: DeedEntry = {
        id: Date.now().toString(),
        date: isoDate,
        type: mode === 'repentance' ? 'repentance' : 'good',
        subType: mode,
        ...(chosenCategory ? { category: chosenCategory } : {}),
        ...(trimmedRecipient ? { recipient: trimmedRecipient } : {}),
        content: trimmedInput,
        result: finalRes,
      };

      const newHistory = [newEntry, ...history].sort(
        (a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()
      );
      setHistory(newHistory);
      safeStorage.setItem('good_deed_history', JSON.stringify(newHistory));
      setResult(finalRes);

      if (mode === 'rejoice') {
        practiceService.logRejoice();
        practiceService.updateActivity('rejoicing', 1);
      } else if (mode === 'self') {
        practiceService.logMerit('good_deeds');
        practiceService.updateActivity('good_deeds', 1);
      }

      if (fbUser && consentService.hasCloudConsent()) {
        try {
          const cleanEntry = Object.fromEntries(
            Object.entries(newEntry).filter(([_, v]) => v !== undefined)
          );
          await setDoc(doc(db, `users/${fbUser.uid}/goodDeeds`, newEntry.id), cleanEntry);
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${fbUser.uid}/goodDeeds`);
        }
      }

      // Opt-in sharing to「大家共修」(default false, never for repentance)
      if (shareToCommunity && mode !== 'repentance') {
        try {
          const currentUserId = fbUser ? fbUser.uid : identityService.getUserId();
          const savedProfile = safeStorage.getJSON<any>('user_profile', null);
          const displayName =
            user?.name || savedProfile?.name || fbUser?.displayName || '同修';
          const shareId = `deed_${newEntry.id}`;
          const chantTitle =
            mode === 'rejoice'
              ? '随喜赞叹'
              : chosenCategory
              ? `行善 · ${chosenCategory}`
              : '每日一善';
          await setDoc(doc(db, 'shared_merits', shareId), {
            userId: currentUserId,
            userName: displayName,
            type: mode === 'rejoice' ? '随喜' : '行善',
            chant: chantTitle,
            count: 1,
            title: chantTitle,
            description: trimmedRecipient
              ? `${trimmedInput}（回向/随喜：${trimmedRecipient}）`
              : trimmedInput,
            rejoiceCount: 0,
            timestamp: Date.now(),
            isCommunity: true,
          });
          toast.success('已记录并分享至「大家共修」');
        } catch (err) {
          console.warn('Community share notice:', err);
          toast.success('已记录本机（共修动态同步稍后恢复）');
        }
      } else {
        toast.success(
          mode === 'rejoice'
            ? '随喜已记下，愿欢喜长存'
            : mode === 'repentance'
            ? '看见即已轻安'
            : '一善已记下'
        );
      }

      window.dispatchEvent(new CustomEvent('zen_data_updated'));
      window.dispatchEvent(new CustomEvent('addExp', { detail: 8 }));
      setInput('');
      setRecipient('');
      setShareToCommunity(false);
    } finally {
      setIsLoading(false);
    }
  };

  const [activeFilter, setActiveFilter] = useState<'today' | 'week' | 'all' | null>(null);

  const getFilteredHistory = () => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    if (activeFilter === 'today') return history.filter((h) => isSamePracticeDay(h.date, now));
    if (activeFilter === 'week') return history.filter((h) => new Date(h.date) >= weekAgo);
    return history;
  };

  const getSummary = () => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const todayCount = history.filter((h) => isSamePracticeDay(h.date, now)).length;
    const weekCount = history.filter((h) => new Date(h.date) >= weekAgo).length;
    const totalCount = history.length;

    return { todayCount, weekCount, totalCount };
  };

  const summary = getSummary();
  const filteredHistory = getFilteredHistory();

  const toggleFilter = (filter: 'today' | 'week' | 'all') => {
    if (activeFilter === filter) setActiveFilter(null);
    else setActiveFilter(filter);
  };

  const suggestions =
    mode === 'repentance'
      ? REPENTANCE_SUGGESTIONS
      : mode === 'rejoice'
      ? REJOICE_SUGGESTIONS
      : SELF_DEED_SUGGESTIONS;

  return (
    <div className="relative bg-surface rounded-2xl p-6 sm:p-8 border border-line space-y-5">
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 min-w-[44px] min-h-[44px] flex items-center justify-center text-ink-3 hover:text-ink hover:bg-surface-2 rounded-full transition-colors z-10"
          title="关闭"
          aria-label="关闭"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      <div className="space-y-3 pr-10">
        <h2 className="text-lg sm:text-2xl font-serif font-bold text-ink">
          记一善 · 随喜赞叹
        </h2>

        {/* Segmented mode selector */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-2 border border-line">
          {[
            { id: 'self' as const, label: '自己行善', icon: Heart },
            { id: 'rejoice' as const, label: '随喜别人', icon: Sparkles },
            { id: 'repentance' as const, label: '忏悔改过', icon: ShieldCheck },
          ].map((item) => {
            const Icon = item.icon;
            const active = mode === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleModeSwitch(item.id)}
                className={cn(
                  'flex-1 min-h-[38px] px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap',
                  active
                    ? item.id === 'repentance'
                      ? 'bg-surface text-red-500 border border-line'
                      : 'bg-surface text-accent border border-line'
                    : 'text-ink-2 hover:text-ink'
                )}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { label: '今日', count: summary.todayCount, filter: 'today' as const },
          { label: '本周', count: summary.weekCount, filter: 'week' as const },
          { label: '总计', count: summary.totalCount, filter: 'all' as const },
        ].map((item) => (
          <button
            key={item.filter}
            type="button"
            onClick={() => toggleFilter(item.filter)}
            className={cn(
              'p-3.5 rounded-2xl border transition-colors',
              activeFilter === item.filter
                ? 'bg-accent text-on-accent border-accent'
                : 'bg-surface-2 border-line'
            )}
          >
            <p
              className={cn(
                'text-xs mb-0.5',
                activeFilter === item.filter ? 'text-on-accent/80' : 'text-ink-2'
              )}
            >
              {item.label}
            </p>
            <p
              className={cn(
                'text-xl font-bold tabular-nums',
                activeFilter === item.filter ? 'text-on-accent' : 'text-ink'
              )}
            >
              {item.count}
            </p>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {activeFilter && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {filteredHistory.length === 0 ? (
                <p className="text-xs text-ink-3 text-center py-3">暂无记录</p>
              ) : (
                filteredHistory.map((h) => (
                  <div
                    key={h.id}
                    className="text-xs p-3 bg-surface-2 border border-line rounded-xl flex justify-between items-start gap-2 text-ink"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-ink break-words">{h.content}</p>
                      <p className="text-[11px] text-ink-3">
                        {new Date(h.date).toLocaleString()}
                        {h.category ? ` · ${h.category}` : ''}
                        {h.recipient ? ` · 对象：${h.recipient}` : ''}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'text-[11px] font-medium shrink-0',
                        h.type === 'repentance' ? 'text-red-500' : 'text-accent'
                      )}
                    >
                      {h.type === 'repentance'
                        ? '改过'
                        : h.subType === 'rejoice'
                        ? '随喜'
                        : '行善'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!result ? (
        <div className="space-y-4">
          {mode !== 'repentance' && (
            <div className="space-y-1.5">
              <span className="text-xs text-ink-2 block">分类（选填）</span>
              <div className="flex flex-wrap gap-1.5">
                {GOOD_CATEGORIES.map((cat) => {
                  const active = category === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(active ? '' : cat)}
                      className={cn(
                        'min-h-[34px] px-3 rounded-full border text-xs transition-colors',
                        active
                          ? 'bg-accent-mist text-accent border-accent font-medium'
                          : 'bg-surface-2 border-line text-ink-2 hover:text-ink'
                      )}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="datetime-local"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full p-3 rounded-2xl bg-surface-2 border border-line text-sm text-ink focus:ring-1 focus:ring-accent focus:border-accent outline-none"
            />
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value.slice(0, 60))}
              placeholder={
                mode === 'rejoice'
                  ? '随喜谁的善行（选填）'
                  : mode === 'repentance'
                  ? '涉及的对象（选填）'
                  : '为谁而做（选填，如家人/众生）'
              }
              className="w-full p-3 rounded-2xl bg-surface-2 border border-line text-sm text-ink placeholder:text-ink-3 focus:ring-1 focus:ring-accent focus:border-accent outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setInput((prev) => (prev ? `${prev}，${tag}` : tag))}
                className="min-h-[34px] px-3 py-1.5 bg-accent-mist text-accent rounded-full text-xs hover:bg-accent hover:text-on-accent transition-colors"
              >
                + {tag}
              </button>
            ))}
          </div>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              mode === 'repentance'
                ? '如实记下想调整的言行念头，不自责，只在看见…'
                : mode === 'rejoice'
                ? '写下看见了别人怎样的善行（哪怕只是微小的善意）…'
                : '写下今天做了一件什么微小的善事…'
            }
            className="w-full h-28 p-4 rounded-2xl bg-surface-2 border border-line text-ink placeholder:text-ink-3 focus:ring-1 focus:ring-accent focus:border-accent outline-none text-sm resize-none leading-relaxed"
          />

          {mode !== 'repentance' && (
            <label className="flex items-center gap-2.5 px-1 py-1 text-xs text-ink-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={shareToCommunity}
                onChange={(e) => setShareToCommunity(e.target.checked)}
                className="w-4 h-4 rounded border-line accent-zen-accent"
              />
              <span>分享到「大家共修」（默认不公开，只存在自己愿簿里）</span>
            </label>
          )}

          <button
            type="button"
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="w-full min-h-[46px] bg-accent text-on-accent hover:bg-accent-hover py-3 rounded-full font-medium transition-colors disabled:opacity-45 flex items-center justify-center gap-2 text-sm"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>
              {mode === 'rejoice'
                ? '记下这份随喜'
                : mode === 'repentance'
                ? '如实忏悔记下'
                : '记下这一善'}
            </span>
          </button>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 text-sm"
        >
          <div className="p-4 bg-surface-2 border border-line rounded-2xl space-y-2">
            <p className="font-bold text-accent">{result.ledger_entry.deed}</p>
            <p className="text-ink-2 leading-relaxed">
              {result.fate_insight.wisdom_quote}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setResult(null)}
            className="w-full min-h-[44px] rounded-full bg-accent-mist text-accent hover:bg-accent hover:text-on-accent text-xs font-medium transition-colors"
          >
            继续记录
          </button>
        </motion.div>
      )}
    </div>
  );
};

