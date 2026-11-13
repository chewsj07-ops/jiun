import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageCircle,
  X,
  Sparkles,
  History,
  Loader2,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Lock,
  Trash2,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { containsBadWords } from '../utils/badWords';
import { practiceService } from '../services/practiceService';
import { aiGenerate } from '../services/geminiClient';
import { buildThoughtGuidanceSystemPrompt } from '../data/zenAssistantPrompt';
import { cryptoService } from '../services/cryptoService';
import { identityService } from '../services/identityService';
import { auth, db } from '../firebase';
import { writeBatch, doc, deleteDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/firebaseErrors';
import { consentService } from '../services/consentService';
import { safeStorage } from '../utils/safeStorage';
import { MindConsentSheet } from './ConsentModals';
import { ConfirmSheet } from './ConfirmSheet';
import {
  containsCrisisKeywords,
  matchOfflineGuidance,
} from '../data/offlineGuidance';
import { SafetyNetCard } from './vow/SafetyNetCard';
import { GuidanceCards, StructuredGuidance } from './vow/GuidanceCards';

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
  isLocalOnly?: boolean;
}

export interface EmotionOption {
  id: string;
  label: string;
}

export interface EmotionGroup {
  label: string;
  positive?: boolean;
  options: EmotionOption[];
}

export const EMOTION_GROUPS: EmotionGroup[] = [
  {
    label: '不安与恐惧',
    options: [
      { id: 'anxious', label: '焦虑' },
      { id: 'restless', label: '不安' },
      { id: 'worried', label: '担心' },
      { id: 'fearful', label: '恐惧' },
      { id: 'stressed', label: '压力' },
    ],
  },
  {
    label: '愤怒与烦躁',
    options: [
      { id: 'angry', label: '生气' },
      { id: 'irritable', label: '烦躁' },
    ],
  },
  {
    label: '委屈与难过',
    options: [
      { id: '委屈', label: '委屈' },
      { id: 'sad', label: '悲伤' },
      { id: 'disappointed', label: '失望' },
      { id: 'helpless', label: '无助' },
    ],
  },
  {
    label: '羞愧与自责',
    options: [
      { id: 'ashamed', label: '羞愧' },
      { id: 'regretful', label: '懊悔' },
    ],
  },
  {
    label: '嫉妒与比较',
    options: [{ id: 'jealous', label: '嫉妒' }],
  },
  {
    label: '孤独与疏离',
    options: [{ id: 'lonely', label: '孤独' }],
  },
  {
    label: '疲惫与无力',
    options: [{ id: 'tired', label: '疲惫' }],
  },
  {
    label: '迷茫与困惑',
    options: [{ id: 'confused', label: '困惑' }],
  },
  {
    label: '贪求与执着',
    options: [
      { id: 'attached', label: '执着' },
      { id: 'craving', label: '放不下' },
    ],
  },
  {
    label: '喜悦与感恩',
    positive: true,
    options: [
      { id: 'peaceful', label: '平静' },
      { id: 'joy', label: '喜悦' },
      { id: 'grateful', label: '感恩' },
      { id: 'content', label: '满足' },
      { id: 'hopeful', label: '充满希望' },
      { id: 'confident', label: '自信' },
      { id: 'relaxed', label: '轻松' },
      { id: 'loving', label: '充满爱' },
      { id: 'forgiving', label: '宽容' },
      { id: 'focused', label: '专注' },
    ],
  },
];

export const ALL_EMOTIONS = EMOTION_GROUPS.flatMap((g) => g.options);

const AI_TIMEOUT_MS = 8000;

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

export function containsThoughtCrisis(thought: Partial<Thought>): boolean {
  return containsCrisisKeywords(
    thought.event,
    thought.action,
    thought.result,
    thought.learning,
    thought.vow
  );
}

function parseStructuredGuidance(raw?: string): StructuredGuidance | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof parsed.observe === 'string' &&
      typeof parsed.reflect === 'string' &&
      typeof parsed.act === 'string' &&
      typeof parsed.compassion === 'string'
    ) {
      return {
        observe: parsed.observe,
        reflect: parsed.reflect,
        act: parsed.act,
        compassion: parsed.compassion,
        verse: typeof parsed.verse === 'string' ? parsed.verse : undefined,
        isOffline: Boolean(parsed.isOffline),
      };
    }
  } catch {
    // Legacy plain-text guidance string
  }
  return null;
}

const QUESTION_STEPS = [
  {
    key: 'event',
    question: '发生了什么事？',
    placeholder: '写下引动此刻感受的经过、场景或一句话……',
  },
  {
    key: 'action',
    question: '当时你如何面对，或尝试怎样转念？',
    placeholder: '例如深呼吸、先停一下、尝试理解或观察自己的念头……',
  },
  {
    key: 'result',
    question: '后来怎么样了？',
    placeholder: '写下事情的走向，或心情细微的变化……',
  },
  {
    key: 'learning',
    question: '这件事让你看见或学会了什么？',
    placeholder: '哪怕是一点点对自己的了解，也值得被记下……',
  },
  {
    key: 'vow',
    question: '把这次觉察，化作一句给自己的愿',
    placeholder: '你可以直接修改下面为你拟好的愿力，或写下自己的发愿……',
  },
] as const;

export const ThoughtCollector = ({
  className,
  iconOnlyOnMobile,
  hideTrigger = false,
  embedded = false,
}: {
  className?: string;
  iconOnlyOnMobile?: boolean;
  hideTrigger?: boolean;
  embedded?: boolean;
}) => {
  const instanceIdRef = useRef(`tc_${Math.random().toString(36).slice(2, 9)}`);
  const isExternalSyncRef = useRef(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'record' | 'history'>('record');

  // Step 0 = 情绪觉察, Steps 1..5 = 5 question screens (top 5 progress dots)
  const [step, setStep] = useState<number>(0);
  const [showPositiveGroup, setShowPositiveGroup] = useState<boolean>(false);

  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [eventText, setEventText] = useState('');
  const [actionText, setActionText] = useState('');
  const [resultText, setResultText] = useState('');
  const [learningText, setLearningText] = useState('');
  const [vowText, setVowText] = useState('');
  const hasEditedVowRef = useRef(false);

  const [showSafetyNet, setShowSafetyNet] = useState(false);
  const [safetyDismissedForSession, setSafetyDismissedForSession] = useState(false);

  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [isLoadingGuidance, setIsLoadingGuidance] = useState<number | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [filterEmotion, setFilterEmotion] = useState<string | 'all'>('all');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterDay, setFilterDay] = useState<string>('all');

  const [showPlaque, setShowPlaque] = useState<Thought | null>(null);
  const [hasMindConsent, setHasMindConsent] = useState<boolean>(() => consentService.hasMindConsent());
  const [showMindConsent, setShowMindConsent] = useState<boolean>(false);
  const [pendingDeleteThought, setPendingDeleteThought] = useState<Thought | null>(null);

  useEffect(() => {
    const syncConsent = () => setHasMindConsent(consentService.hasMindConsent());
    window.addEventListener('zen_consent_updated', syncConsent);
    return () => window.removeEventListener('zen_consent_updated', syncConsent);
  }, []);

  useEffect(() => {
    if (!hasMindConsent && thoughts.length > 0 && activeTab === 'record') {
      setActiveTab('history');
    }
  }, [hasMindConsent, thoughts.length, activeTab]);

  const negativeEmotionGroups = EMOTION_GROUPS.filter((g) => !g.positive);
  const positiveEmotionGroups = EMOTION_GROUPS.filter((g) => Boolean(g.positive));

  const filteredThoughts = thoughts.filter((t) => {
    const d = new Date(t.timestamp || t.id);
    const matchEmotion =
      filterEmotion === 'all' || t.emotions.includes(filterEmotion);
    const matchYear =
      filterYear === 'all' || d.getFullYear().toString() === filterYear;
    const matchMonth =
      filterMonth === 'all' || (d.getMonth() + 1).toString() === filterMonth;
    const matchDay = filterDay === 'all' || d.getDate().toString() === filterDay;
    return matchEmotion && matchYear && matchMonth && matchDay;
  });

  const uniqueYears = Array.from(
    new Set([
      new Date().getFullYear().toString(),
      ...thoughts.map((t) =>
        new Date(t.timestamp || t.id).getFullYear().toString()
      ),
    ])
  ).sort((a, b) => b.localeCompare(a));

  const getDaysInMonth = (yearStr: string, monthStr: string) => {
    if (monthStr === 'all') return 31;
    const month = parseInt(monthStr, 10);
    const year = yearStr === 'all' ? 2024 : parseInt(yearStr, 10);
    return new Date(year, month, 0).getDate();
  };

  const maxDays = getDaysInMonth(filterYear, filterMonth);

  useEffect(() => {
    if (filterDay !== 'all') {
      const day = parseInt(filterDay, 10);
      if (day > maxDays) {
        setFilterDay('all');
      }
    }
  }, [maxDays, filterDay]);

  const decryptThoughtList = async (parsed: any[]): Promise<Thought[]> => {
    return Promise.all(
      parsed.map(async (t: any) => {
        if (t.isEncrypted && t.iv) {
          const decryptedContent = await cryptoService.decrypt(
            t.content_encrypted,
            t.iv
          );
          try {
            const content = JSON.parse(decryptedContent);
            const hydrated: Thought = {
              ...t,
              emotions: t.emotions || (t.emotion ? [t.emotion] : []),
              event: content.event || '',
              action: content.action || '',
              result: content.result || '',
              learning: content.learning || '',
              vow: content.vow || '',
            };
            hydrated.isLocalOnly =
              Boolean(t.isLocalOnly) || containsThoughtCrisis(hydrated);
            return hydrated;
          } catch {
            return t;
          }
        }
        const plain: Thought = {
          ...t,
          emotions: t.emotions || (t.emotion ? [t.emotion] : []),
          vow: t.vow || '',
        };
        plain.isLocalOnly =
          Boolean(t.isLocalOnly) || containsThoughtCrisis(plain);
        return plain;
      })
    );
  };

  useEffect(() => {
    const loadThoughts = async () => {
      const saved = safeStorage.getItem('zen_thoughts');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const decryptedThoughts = await decryptThoughtList(parsed);
          setThoughts(decryptedThoughts);
        } catch (e) {
          console.error('Failed to parse thoughts', e);
        }
      }
    };
    loadThoughts();
  }, []);

  useEffect(() => {
    const loadThoughtsFromStorage = async () => {
      const saved = safeStorage.getItem('zen_thoughts');
      if (!saved) {
        isExternalSyncRef.current = true;
        setThoughts([]);
        return;
      }
      try {
        const parsed = JSON.parse(saved);
        const decryptedThoughts = await decryptThoughtList(parsed);
        isExternalSyncRef.current = true;
        setThoughts(decryptedThoughts);
      } catch (e) {
        console.error('Failed to parse thoughts', e);
      }
    };

    const handleSyncUpdate = (e: any) => {
      if (e?.detail?.sourceId !== instanceIdRef.current) {
        loadThoughtsFromStorage();
      }
    };
    window.addEventListener('zen_thoughts_updated', handleSyncUpdate);
    return () =>
      window.removeEventListener('zen_thoughts_updated', handleSyncUpdate);
  }, []);

  useEffect(() => {
    const saveThoughts = async () => {
      if (thoughts.length === 0) return;
      if (isExternalSyncRef.current) {
        isExternalSyncRef.current = false;
        return;
      }

      const encryptedThoughts = await Promise.all(
        thoughts.map(async (t) => {
          const isCrisisLocal = Boolean(t.isLocalOnly) || containsThoughtCrisis(t);

          if (t.isEncrypted) {
            return isCrisisLocal ? { ...t, isLocalOnly: true } : t;
          }

          const contentToEncrypt = JSON.stringify({
            event: t.event,
            action: t.action,
            result: t.result,
            learning: t.learning,
            vow: t.vow,
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
            iv,
          };

          if (isCrisisLocal) {
            newThought.isLocalOnly = true;
          }

          if (t.guidance !== undefined) {
            newThought.guidance = t.guidance;
          }

          return newThought;
        })
      );

      safeStorage.setItem('zen_thoughts', JSON.stringify(encryptedThoughts));
      window.dispatchEvent(new CustomEvent('zen_data_updated'));
      window.dispatchEvent(
        new CustomEvent('zen_thoughts_updated', {
          detail: { sourceId: instanceIdRef.current },
        })
      );

      // Strictly exclude any crisis / local-only records from Firestore sync, and require Cloud Consent
      const syncableThoughts = encryptedThoughts.filter((t: any) => !t.isLocalOnly);
      if (auth.currentUser && consentService.hasCloudConsent() && syncableThoughts.length > 0) {
        try {
          const batch = writeBatch(db);
          syncableThoughts.forEach((t: any) => {
            const docRef = doc(
              db,
              `users/${auth.currentUser!.uid}/thoughts`,
              t.id.toString()
            );
            const cleanT = Object.fromEntries(
              Object.entries(t).filter(([_, v]) => v !== undefined)
            );
            batch.set(docRef, cleanT);
          });
          await batch.commit();
        } catch (error) {
          handleFirestoreError(
            error,
            OperationType.WRITE,
            `users/${auth.currentUser.uid}/thoughts`
          );
        }
      }
    };

    saveThoughts();
  }, [thoughts]);

  const openWithConsentCheck = () => {
    if (consentService.hasMindConsent()) {
      setIsOpen(true);
      return;
    }
    if (consentService.hasLegacyThoughts()) {
      setActiveTab('history');
      setIsOpen(true);
      return;
    }
    setShowMindConsent(true);
  };

  useEffect(() => {
    if (embedded) return;
    const handleOpen = () => openWithConsentCheck();
    window.addEventListener('open-thought-collector', handleOpen);
    return () =>
      window.removeEventListener('open-thought-collector', handleOpen);
  }, [embedded]);

  // Monitor live text inputs for crisis keywords
  const checkCrisisInDraft = (nextValues?: {
    event?: string;
    action?: string;
    result?: string;
    learning?: string;
    vow?: string;
  }) => {
    const e = nextValues?.event ?? eventText;
    const a = nextValues?.action ?? actionText;
    const r = nextValues?.result ?? resultText;
    const l = nextValues?.learning ?? learningText;
    const v = nextValues?.vow ?? vowText;
    const hasCrisis = containsCrisisKeywords(e, a, r, l, v);

    if (hasCrisis) {
      if (!safetyDismissedForSession) {
        setShowSafetyNet(true);
      }
    } else {
      setShowSafetyNet(false);
      setSafetyDismissedForSession(false);
    }
  };

  const toggleEmotion = (id: string) => {
    setSelectedEmotions((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  const getEmotionLabels = (emotionIds: string[]) =>
    emotionIds
      .map((id) => ALL_EMOTIONS.find((e) => e.id === id)?.label || id)
      .filter(Boolean);

  // Pre-fill 「化为愿力」 when entering step 5 if user hasn't manually edited it
  useEffect(() => {
    if (step === 5 && !hasEditedVowRef.current && !vowText.trim()) {
      const matched = matchOfflineGuidance({
        emotionLabels: getEmotionLabels(selectedEmotions),
        freeText: `${eventText} ${actionText} ${learningText}`,
        eventText,
      });
      setVowText(matched.vow);
    }
  }, [step]);

  const buildOfflineGuidanceJson = (thought: Thought): string => {
    const emotionLabels = getEmotionLabels(thought.emotions);
    const matched = matchOfflineGuidance({
      emotionLabels,
      freeText: `${thought.event} ${thought.action} ${thought.learning}`,
      eventText: thought.event,
    });
    const structured: StructuredGuidance = {
      observe: matched.observe,
      reflect: matched.reflect,
      act: matched.act,
      compassion: matched.compassion,
      verse: matched.verse,
      isOffline: true,
    };
    return JSON.stringify(structured);
  };

  const handleGetGuidance = async (thought: Thought) => {
    // Safety Net: never call AI or display 4-step guidance if crisis keywords are present
    if (thought.isLocalOnly || containsThoughtCrisis(thought)) {
      return;
    }

    const saveGuidanceToThought = (guidanceStr: string) => {
      setThoughts((prev) =>
        prev.map((t) =>
          t.id === thought.id ? { ...t, guidance: guidanceStr } : t
        )
      );
      setShowPlaque((prev) =>
        prev && prev.id === thought.id
          ? { ...prev, guidance: guidanceStr }
          : prev
      );
    };

    const settings = practiceService.getSettings();
    if (!settings.aiEnabled) {
      saveGuidanceToThought(buildOfflineGuidanceJson(thought));
      return;
    }

    setIsLoadingGuidance(thought.id);
    try {
      const emoLabels = getEmotionLabels(thought.emotions).join('、') || '未知';

      const prompt = `用户此刻觉察到的情绪：${emoLabels}
发生的事件：${thought.event || '未填写'}
当下的应对与转念：${thought.action || '未填写'}
结果：${thought.result || '未填写'}
认知收获：${thought.learning || '未填写'}
发愿：${thought.vow || '未填写'}`;

      const text = await withTimeout(
        aiGenerate({
          contents: prompt,
          systemInstruction: buildThoughtGuidanceSystemPrompt('zh-CN'),
          responseMimeType: 'application/json',
        }),
        AI_TIMEOUT_MS
      );

      if (text) {
        const parsed = JSON.parse(text);
        if (
          parsed &&
          parsed.observation &&
          parsed.reflection &&
          parsed.practice &&
          parsed.compassion
        ) {
          const structured: StructuredGuidance = {
            observe: String(parsed.observation),
            reflect: String(parsed.reflection),
            act: String(parsed.practice),
            compassion: String(parsed.compassion),
            verse: parsed.verse ? String(parsed.verse) : undefined,
            isOffline: false,
          };
          saveGuidanceToThought(JSON.stringify(structured));
          return;
        }
      }

      saveGuidanceToThought(buildOfflineGuidanceJson(thought));
    } catch {
      // Seamless silent fallback to offline guidance (no error popup or toast)
      saveGuidanceToThought(buildOfflineGuidanceJson(thought));
    } finally {
      setIsLoadingGuidance(null);
    }
  };

  const handleOpenThreeMinMeditation = () => {
    setShowSafetyNet(false);
    setShowPlaque(null);
    setIsOpen(false);
    window.dispatchEvent(
      new CustomEvent('open-meditation-preset', {
        detail: { duration: 3 },
      })
    );
  };

  const resetForm = () => {
    setSelectedEmotions([]);
    setEventText('');
    setActionText('');
    setResultText('');
    setLearningText('');
    setVowText('');
    hasEditedVowRef.current = false;
    setStep(0);
    setShowPositiveGroup(false);
    setShowSafetyNet(false);
    setSafetyDismissedForSession(false);
  };

  const handleDeleteThought = async (thought: Thought) => {
    const remaining = thoughts.filter((item) => item.id !== thought.id);
    if (remaining.length === 0) {
      isExternalSyncRef.current = true;
      setThoughts([]);
      safeStorage.removeItem('zen_thoughts');
      window.dispatchEvent(new CustomEvent('zen_data_updated'));
      window.dispatchEvent(
        new CustomEvent('zen_thoughts_updated', {
          detail: { sourceId: instanceIdRef.current },
        })
      );
    } else {
      setThoughts(remaining);
    }

    if (auth.currentUser && consentService.hasCloudConsent()) {
      await deleteDoc(
        doc(db, 'users', auth.currentUser.uid, 'thoughts', thought.id.toString())
      ).catch(() => {});
    }
    setPendingDeleteThought(null);
    toast.success('已删除该条观心记录');
  };

  const handleSave = async () => {
    if (!consentService.hasMindConsent()) {
      setShowMindConsent(true);
      return;
    }
    if (
      selectedEmotions.length === 0 &&
      !eventText.trim() &&
      !actionText.trim() &&
      !resultText.trim() &&
      !learningText.trim() &&
      !vowText.trim()
    ) {
      return;
    }

    const contentToCheck = `${eventText} ${actionText} ${resultText} ${learningText} ${vowText} ${selectedEmotions.join(' ')}`;
    const hasCrisis = containsCrisisKeywords(contentToCheck);

    if (!hasCrisis && containsBadWords(contentToCheck)) {
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
      timestamp: new Date().toISOString(),
      ...(hasCrisis ? { isLocalOnly: true } : {}),
    };

    setThoughts((prev) => [newThought, ...prev]);

    window.dispatchEvent(new CustomEvent('addExp', { detail: 5 }));

    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);

    resetForm();
    setShowPlaque(newThought);

    if (!hasCrisis) {
      await handleGetGuidance(newThought);
    }
  };

  const getCurrentStepField = () => {
    const stepConfig = QUESTION_STEPS[step - 1];
    if (!stepConfig) return null;
    switch (stepConfig.key) {
      case 'event':
        return {
          ...stepConfig,
          value: eventText,
          onChange: (val: string) => {
            setEventText(val);
            checkCrisisInDraft({ event: val });
          },
        };
      case 'action':
        return {
          ...stepConfig,
          value: actionText,
          onChange: (val: string) => {
            setActionText(val);
            checkCrisisInDraft({ action: val });
          },
        };
      case 'result':
        return {
          ...stepConfig,
          value: resultText,
          onChange: (val: string) => {
            setResultText(val);
            checkCrisisInDraft({ result: val });
          },
        };
      case 'learning':
        return {
          ...stepConfig,
          value: learningText,
          onChange: (val: string) => {
            setLearningText(val);
            checkCrisisInDraft({ learning: val });
          },
        };
      case 'vow':
        return {
          ...stepConfig,
          value: vowText,
          onChange: (val: string) => {
            hasEditedVowRef.current = true;
            setVowText(val);
            checkCrisisInDraft({ vow: val });
          },
        };
    }
  };

  const canSaveThought =
    selectedEmotions.length > 0 ||
    Boolean(eventText.trim()) ||
    Boolean(actionText.trim()) ||
    Boolean(resultText.trim()) ||
    Boolean(learningText.trim()) ||
    Boolean(vowText.trim());

  const renderPlaque = () => {
    if (!showPlaque) return null;
    const emoLabels =
      getEmotionLabels(showPlaque.emotions).join('、') || '平静';
    const isCrisisPlaque =
      Boolean(showPlaque.isLocalOnly) || containsThoughtCrisis(showPlaque);
    const parsedGuidance = !isCrisisPlaque
      ? parseStructuredGuidance(showPlaque.guidance)
      : null;

    return createPortal(
      <div
        className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        onClick={() => setShowPlaque(null)}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md bg-surface border border-line rounded-3xl shadow-float max-h-[90vh] flex flex-col overflow-hidden"
        >
          <div className="flex justify-between items-center px-6 py-4 shrink-0 border-b border-line bg-surface">
            <h3 className="text-title text-ink">念头封存</h3>
            <button
              type="button"
              onClick={() => setShowPlaque(null)}
              aria-label="关闭"
              className="p-2 text-ink-3 hover:text-ink rounded-full hover:bg-surface-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <div className="bg-surface-2 rounded-2xl p-4 border border-line space-y-2 text-sm text-ink leading-relaxed">
              <p>
                <span className="text-ink-2">此刻感受：</span>
                <span className="font-medium">{emoLabels}</span>
              </p>
              {showPlaque.event && (
                <p>
                  <span className="text-ink-2">缘起事件：</span>
                  {showPlaque.event}
                </p>
              )}
              {showPlaque.action && (
                <p>
                  <span className="text-ink-2">当下转念：</span>
                  {showPlaque.action}
                </p>
              )}
              {showPlaque.result && (
                <p>
                  <span className="text-ink-2">后来结果：</span>
                  {showPlaque.result}
                </p>
              )}
              {showPlaque.learning && (
                <p>
                  <span className="text-ink-2">认知收获：</span>
                  {showPlaque.learning}
                </p>
              )}
              {showPlaque.vow && (
                <p>
                  <span className="text-ink-2">化为愿力：</span>
                  <span className="font-serif text-accent">{showPlaque.vow}</span>
                </p>
              )}
            </div>

            {isCrisisPlaque ? (
              <SafetyNetCard
                onMeditate={handleOpenThreeMinMeditation}
                onContinue={() => setShowPlaque(null)}
                continueLabel="我知道了"
              />
            ) : parsedGuidance ? (
              <GuidanceCards
                guidance={parsedGuidance}
                onBeforeOpenSettings={() => {
                  setShowPlaque(null);
                  setIsOpen(false);
                }}
              />
            ) : showPlaque.guidance ? (
              <div className="bg-surface border border-line rounded-2xl p-5 space-y-2">
                <div className="text-caption !text-accent flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>觉察陪伴者</span>
                </div>
                <p className="text-reading !text-[17px] !leading-[1.85] text-ink whitespace-pre-wrap">
                  {showPlaque.guidance}
                </p>
              </div>
            ) : (
              <div className="py-6 flex flex-col items-center justify-center text-ink-3 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-accent" />
                <p className="text-caption">正在整理觉察回应……</p>
              </div>
            )}
          </div>

          <div className="p-5 pt-4 border-t border-line shrink-0 bg-surface">
            <button
              type="button"
              onClick={() => setShowPlaque(null)}
              className="w-full h-11 rounded-full bg-accent hover:bg-accent-hover text-on-accent text-sm font-medium transition-colors"
            >
              感恩圆满
            </button>
          </div>
        </motion.div>
      </div>,
      document.body
    );
  };

  const currentField = step >= 1 ? getCurrentStepField() : null;

  const renderStepWizard = () => {
    if (showSafetyNet) {
      return (
        <div className="py-2">
          <SafetyNetCard
            onMeditate={handleOpenThreeMinMeditation}
            onContinue={() => {
              setSafetyDismissedForSession(true);
              setShowSafetyNet(false);
            }}
          />
        </div>
      );
    }

    if (step === 0) {
      return (
        <motion.div
          key="collector-step-0"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-6"
        >
          <div className="space-y-1">
            <h4 className="text-title text-ink">此刻心里升起了什么感受？</h4>
            <p className="text-caption">可复选，也可以直接跳过写下事情</p>
          </div>

          {/* Negative emotion groups first */}
          <div className="space-y-4">
            {negativeEmotionGroups.map((group) => (
              <div key={group.label} className="space-y-2">
                <div className="text-caption font-medium text-ink-2">
                  {group.label}
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.options.map((emo) => {
                    const isSelected = selectedEmotions.includes(emo.id);
                    return (
                      <button
                        key={emo.id}
                        type="button"
                        onClick={() => toggleEmotion(emo.id)}
                        className={cn(
                          'h-9 px-4 rounded-full border text-sm transition-colors',
                          isSelected
                            ? 'bg-accent-mist text-accent border-transparent font-medium'
                            : 'border-line text-ink-2 hover:border-line-strong hover:text-ink'
                        )}
                      >
                        {emo.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Collapsible positive emotion group */}
          <div className="pt-2 border-t border-line">
            <button
              type="button"
              onClick={() => setShowPositiveGroup((v) => !v)}
              className="w-full flex items-center justify-between py-2 text-sm text-ink-2 hover:text-ink transition-colors"
            >
              <span>也记下美好的</span>
              <ChevronDown
                size={16}
                strokeWidth={1.5}
                className={cn(
                  'transition-transform duration-200',
                  showPositiveGroup && 'rotate-180'
                )}
              />
            </button>

            <AnimatePresence initial={false}>
              {showPositiveGroup && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="pt-3 pb-1 space-y-3">
                    {positiveEmotionGroups.map((group) => (
                      <div key={group.label} className="space-y-2">
                        <div className="text-caption font-medium text-ink-2">
                          {group.label}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {group.options.map((emo) => {
                            const isSelected = selectedEmotions.includes(emo.id);
                            return (
                              <button
                                key={emo.id}
                                type="button"
                                onClick={() => toggleEmotion(emo.id)}
                                className={cn(
                                  'h-9 px-4 rounded-full border text-sm transition-colors',
                                  isSelected
                                    ? 'bg-accent-mist text-accent border-transparent font-medium'
                                    : 'border-line text-ink-2 hover:border-line-strong hover:text-ink'
                                )}
                              >
                                {emo.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      );
    }

    if (!currentField) return null;

    return (
      <motion.div
        key={`collector-step-${step}`}
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="space-y-5 py-1"
      >
        {/* 5 small progress dots at top */}
        <div className="flex items-center justify-center gap-2 pt-1">
          {[1, 2, 3, 4, 5].map((dotIdx) => {
            const isCurrent = step === dotIdx;
            const isDone = step > dotIdx;
            return (
              <button
                key={dotIdx}
                type="button"
                aria-label={`第 ${dotIdx} 步`}
                onClick={() => setStep(dotIdx)}
                className={cn(
                  'h-2 rounded-full transition-all duration-200',
                  isCurrent
                    ? 'w-5 bg-accent'
                    : isDone
                    ? 'w-2 bg-accent-soft'
                    : 'w-2 bg-line-strong'
                )}
              />
            );
          })}
        </div>

        {/* Selected emotions recap pill line */}
        {selectedEmotions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {getEmotionLabels(selectedEmotions).map((label) => (
              <span
                key={label}
                className="px-2.5 py-0.5 rounded-full bg-accent-mist text-accent text-xs"
              >
                {label}
              </span>
            ))}
          </div>
        )}

        {/* Single focused question */}
        <div className="space-y-3">
          <h4 className="text-title text-ink">{currentField.question}</h4>
          <textarea
            value={currentField.value}
            onChange={(e) => currentField.onChange(e.target.value)}
            placeholder={currentField.placeholder}
            className="w-full bg-surface-2 rounded-2xl p-4 min-h-[120px] border border-line focus:outline-none focus:border-accent text-ink placeholder:text-ink-3 resize-none leading-relaxed"
          />
        </div>
      </motion.div>
    );
  };

  const renderStepFooter = () => {
    if (activeTab !== 'record' || showSafetyNet) return null;

    if (step === 0) {
      return (
        <div className="flex items-center gap-3">
          {!embedded && (
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="h-11 px-5 rounded-full bg-surface-2 border border-line text-ink-2 hover:text-ink text-sm transition-colors"
            >
              取消
            </button>
          )}
          <button
            type="button"
            onClick={() => setStep(1)}
            className="flex-1 h-11 px-5 rounded-full bg-accent hover:bg-accent-hover text-on-accent text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
          >
            <span>继续觉察</span>
            <ChevronRight size={16} strokeWidth={1.5} />
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          className="h-11 px-4 rounded-full bg-surface-2 border border-line text-ink-2 hover:text-ink text-sm transition-colors flex items-center gap-1"
        >
          <ChevronLeft size={16} strokeWidth={1.5} />
          <span>上一步</span>
        </button>

        {step < 5 ? (
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(5, s + 1))}
            className="flex-1 h-11 px-5 rounded-full bg-accent hover:bg-accent-hover text-on-accent text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
          >
            <span>下一步</span>
            <ChevronRight size={16} strokeWidth={1.5} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSaveThought}
            className="flex-1 h-11 px-5 rounded-full bg-accent hover:bg-accent-hover text-on-accent text-sm font-medium disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
          >
            封存念头
          </button>
        )}
      </div>
    );
  };

  const collectorInnerBody = (
    <div className="flex-1 overflow-y-auto p-6 pt-4 space-y-5">
      {/* Privacy reassurance header */}
      <div className="flex items-center gap-1.5 text-caption">
        <Lock size={13} strokeWidth={1.5} className="text-ink-3 shrink-0" />
        <span>这里写下的只存在你的设备里，不会公开。</span>
      </div>

      {!hasMindConsent && (
        <div className="p-3.5 rounded-2xl bg-surface-2 border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs text-ink-2 leading-relaxed">
            你尚未同意《隐私说明》中关于观心记录的说明。目前可查看与删除过去的记录，同意后即可新增记录。
          </p>
          <button
            type="button"
            onClick={() => setShowMindConsent(true)}
            className="px-3.5 py-2 rounded-full bg-accent text-on-accent hover:bg-accent-hover text-xs font-medium shrink-0 self-start sm:self-auto transition-colors"
          >
            查看并同意
          </button>
        </div>
      )}

      {/* Record / History switcher */}
      <div className="flex gap-2 shrink-0 bg-surface-2 p-1 rounded-xl border border-line">
        <button
          type="button"
          onClick={() => {
            if (!hasMindConsent) {
              setShowMindConsent(true);
              return;
            }
            setActiveTab('record');
          }}
          className={cn(
            'flex-1 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2',
            activeTab === 'record'
              ? 'bg-surface text-accent border border-line'
              : 'text-ink-2 hover:text-ink',
            !hasMindConsent && 'opacity-60'
          )}
        >
          <MessageCircle className="w-4 h-4" strokeWidth={1.5} />
          <span>记录念头</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={cn(
            'flex-1 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2',
            activeTab === 'history'
              ? 'bg-surface text-accent border border-line'
              : 'text-ink-2 hover:text-ink'
          )}
        >
          <History className="w-4 h-4" strokeWidth={1.5} />
          <span>成长轨迹</span>
        </button>
      </div>

      {activeTab === 'record' ? (
        hasMindConsent ? (
          <AnimatePresence mode="wait">{renderStepWizard()}</AnimatePresence>
        ) : (
          <div className="py-10 text-center space-y-3">
            <p className="text-sm text-ink-2">请先阅读并同意观心隐私说明，再新增觉察记录。</p>
            <button
              type="button"
              onClick={() => setShowMindConsent(true)}
              className="px-5 py-2.5 rounded-full bg-accent text-on-accent hover:bg-accent-hover text-xs font-medium transition-colors"
            >
              查看并同意
            </button>
          </div>
        )
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          {thoughts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-ink-3 py-12">
              <History className="w-12 h-12 mb-4 opacity-20" strokeWidth={1.5} />
              <p className="text-sm">暂无成长轨迹</p>
            </div>
          ) : (
            <div className="flex flex-col h-full min-h-0">
              {/* Filter Bar */}
              <div className="flex flex-col gap-3 mb-4 shrink-0 px-1">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-ink-2">
                    共 {filteredThoughts.length} 条记录
                  </div>
                  <div className="relative">
                    <select
                      value={filterEmotion}
                      onChange={(e) => setFilterEmotion(e.target.value)}
                      className="appearance-none bg-surface-2 border border-line rounded-lg pl-3 pr-8 py-1.5 text-xs font-medium text-ink focus:outline-none focus:border-accent cursor-pointer"
                    >
                      <option value="all">所有情绪</option>
                      {EMOTION_GROUPS.map((g) => (
                        <optgroup key={g.label} label={g.label}>
                          {g.options.map((emo) => (
                            <option key={emo.id} value={emo.id}>
                              {emo.label}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-ink-3 pointer-events-none" />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <select
                      value={filterYear}
                      onChange={(e) => setFilterYear(e.target.value)}
                      className="w-full appearance-none bg-surface-2 border border-line rounded-lg pl-3 pr-8 py-1.5 text-xs font-medium text-ink focus:outline-none focus:border-accent cursor-pointer"
                    >
                      <option value="all">所有年份</option>
                      {uniqueYears.map((y) => (
                        <option key={y} value={y}>
                          {y}年
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-ink-3 pointer-events-none" />
                  </div>
                  <div className="relative flex-1">
                    <select
                      value={filterMonth}
                      onChange={(e) => setFilterMonth(e.target.value)}
                      className="w-full appearance-none bg-surface-2 border border-line rounded-lg pl-3 pr-8 py-1.5 text-xs font-medium text-ink focus:outline-none focus:border-accent cursor-pointer"
                    >
                      <option value="all">所有月份</option>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m.toString()}>
                          {m}月
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-ink-3 pointer-events-none" />
                  </div>
                  <div className="relative flex-1">
                    <select
                      value={filterDay}
                      onChange={(e) => setFilterDay(e.target.value)}
                      className="w-full appearance-none bg-surface-2 border border-line rounded-lg pl-3 pr-8 py-1.5 text-xs font-medium text-ink focus:outline-none focus:border-accent cursor-pointer"
                    >
                      <option value="all">所有日期</option>
                      {Array.from({ length: maxDays }, (_, i) => i + 1).map(
                        (d) => (
                          <option key={d} value={d.toString()}>
                            {d}日
                          </option>
                        )
                      )}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-ink-3 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="space-y-6 overflow-y-auto pr-1 flex-1 pb-4">
                {filteredThoughts.length === 0 && (
                  <div className="text-center text-ink-3 py-8 text-sm">
                    没有找到符合条件的记录
                  </div>
                )}
                {Object.entries(
                  filteredThoughts.reduce((acc, thought) => {
                    const date = new Date(thought.timestamp || thought.id);
                    const monthYear = `${date.getFullYear()}年${
                      date.getMonth() + 1
                    }月`;
                    if (!acc[monthYear]) acc[monthYear] = [];
                    acc[monthYear].push(thought);
                    return acc;
                  }, {} as Record<string, Thought[]>)
                ).map(([month, monthThoughts]) => (
                  <div key={month} className="space-y-4">
                    <div className="sticky top-0 bg-surface/95 backdrop-blur-sm py-2 z-10 -mx-1 px-1">
                      <h4 className="text-xs font-medium text-ink-3 flex items-center gap-2">
                        <div className="h-px bg-line flex-1" />
                        {month}
                        <div className="h-px bg-line flex-1" />
                      </h4>
                    </div>

                    {monthThoughts.map((thought) => {
                      const isLocalCrisis =
                        Boolean(thought.isLocalOnly) ||
                        containsThoughtCrisis(thought);
                      const structured = !isLocalCrisis
                        ? parseStructuredGuidance(thought.guidance)
                        : null;

                      return (
                        <div
                          key={thought.id}
                          className="p-4 bg-surface-2 rounded-2xl text-sm border border-line space-y-3"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex flex-wrap gap-1.5">
                              {thought.emotions.map((emoId) => {
                                const emo = ALL_EMOTIONS.find(
                                  (e) => e.id === emoId
                                );
                                const label = emo?.label || emoId;
                                return (
                                  <span
                                    key={emoId}
                                    className="text-xs px-2.5 py-0.5 rounded-full bg-accent-mist text-accent font-medium"
                                  >
                                    {label}
                                  </span>
                                );
                              })}
                              {isLocalCrisis && (
                                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-surface border border-line text-ink-3">
                                  <Lock size={10} />
                                  仅存本机
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-ink-3 shrink-0">
                              {new Date(
                                thought.timestamp || thought.id
                              ).toLocaleDateString()}
                            </span>
                          </div>

                          <div className="space-y-1.5 text-ink leading-relaxed">
                            {thought.event && (
                              <p>
                                <span className="text-ink-3 mr-1">因为：</span>
                                {thought.event}
                              </p>
                            )}
                            {thought.action && (
                              <p>
                                <span className="text-ink-3 mr-1">转念：</span>
                                {thought.action}
                              </p>
                            )}
                            {thought.result && (
                              <p>
                                <span className="text-ink-3 mr-1">结果：</span>
                                {thought.result}
                              </p>
                            )}
                            {thought.learning && (
                              <p>
                                <span className="text-ink-3 mr-1">学会：</span>
                                {thought.learning}
                              </p>
                            )}
                            {thought.vow && (
                              <p>
                                <span className="text-ink-3 mr-1">发愿：</span>
                                {thought.vow}
                              </p>
                            )}
                          </div>

                          {!isLocalCrisis && structured ? (
                            <div className="p-3 bg-surface rounded-xl border border-line space-y-1">
                              <div className="flex items-center gap-1.5 text-accent text-xs font-medium">
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>觉察回应</span>
                              </div>
                              <p className="text-xs text-ink-2 leading-relaxed">
                                {structured.observe}
                              </p>
                            </div>
                          ) : !isLocalCrisis && thought.guidance ? (
                            <div className="p-3 bg-surface rounded-xl border border-line space-y-1">
                              <div className="flex items-center gap-1.5 text-accent text-xs font-medium">
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>觉察陪伴者</span>
                              </div>
                              <p className="text-xs text-ink-2 leading-relaxed whitespace-pre-wrap">
                                {thought.guidance}
                              </p>
                            </div>
                          ) : !isLocalCrisis ? (
                            <button
                              type="button"
                              onClick={() => handleGetGuidance(thought)}
                              disabled={isLoadingGuidance === thought.id}
                              className="flex items-center gap-1.5 text-xs text-accent hover:text-accent-hover transition-colors disabled:opacity-50"
                            >
                              {isLoadingGuidance === thought.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Sparkles className="w-3.5 h-3.5" />
                              )}
                              <span>生成觉察回应</span>
                            </button>
                          ) : null}

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setShowPlaque(thought)}
                              className="flex-1 py-2 bg-surface border border-line rounded-xl text-xs font-medium text-ink-2 hover:text-accent hover:border-accent transition-colors"
                            >
                              {isLocalCrisis ? '查看陪伴资源' : '查看念头木牌'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setPendingDeleteThought(thought)}
                              aria-label="删除观心记录"
                              className="px-3 py-2 bg-surface border border-line rounded-xl text-xs text-ink-3 hover:text-red-500 hover:border-red-500/40 transition-colors flex items-center justify-center"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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
  );

  if (embedded) {
    return (
      <>
        <div className="bg-surface rounded-2xl border border-line flex flex-col overflow-hidden">
          <div className="flex justify-between items-center p-5 pb-3 border-b border-line">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent" strokeWidth={1.5} />
              <h3 className="text-title text-ink">起心动念收集器</h3>
            </div>
            <span className="text-caption">共 {thoughts.length} 条觉察</span>
          </div>

          {collectorInnerBody}

          {activeTab === 'record' && hasMindConsent && !showSafetyNet && (
            <div className="p-5 pt-3 border-t border-line bg-surface">
              {renderStepFooter()}
            </div>
          )}
          {renderPlaque()}
        </div>

        <MindConsentSheet
          isOpen={showMindConsent}
          onConsentAccepted={() => {
            setHasMindConsent(true);
            setShowMindConsent(false);
            setActiveTab('record');
          }}
          onCancel={() => setShowMindConsent(false)}
        />
        <ConfirmSheet
          isOpen={Boolean(pendingDeleteThought)}
          title="删除这条观心记录？"
          description="删除后无法恢复。若已开启云端同步，云端记录也会一并移除。"
          confirmLabel="确认删除"
          destructive
          onConfirm={() => {
            if (pendingDeleteThought) handleDeleteThought(pendingDeleteThought);
          }}
          onCancel={() => setPendingDeleteThought(null)}
        />
      </>
    );
  }

  return (
    <>
      {!hideTrigger && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={openWithConsentCheck}
          title="觉察记录"
          className={cn(
            'px-3 py-1.5 bg-accent text-on-accent hover:bg-accent-hover rounded-full shadow-float transition-all flex items-center justify-center gap-1.5 text-xs',
            className
          )}
        >
          <MessageCircle className="w-4 h-4" strokeWidth={1.5} />
          <span className={cn('font-medium', iconOnlyOnMobile && 'hidden sm:inline')}>
            觉察
          </span>
        </motion.button>
      )}

      {/* Toast */}
      {createPortal(
        <AnimatePresence>
          {showToast && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-40 left-1/2 -translate-x-1/2 z-[70] bg-ink text-paper px-6 py-3 rounded-full shadow-float flex items-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5 text-accent-soft" />
              <span className="text-sm font-medium">
                当念头被看见，智慧就开始出现。
              </span>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Bottom Sheet (mobile) / Modal (desktop) */}
      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-black/30 backdrop-blur-sm"
            >
              <motion.div
                initial={{ y: '100%', opacity: 0.8 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0.8 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="bg-surface rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md shadow-float border-t sm:border border-line max-h-[88vh] sm:max-h-[90vh] flex flex-col overflow-hidden relative"
              >
                <div className="sm:hidden w-10 h-1 rounded-full bg-line-strong mx-auto mt-3 mb-1 shrink-0" />
                <div className="flex justify-between items-center px-6 py-4 shrink-0 bg-surface border-b border-line sticky top-0 z-10">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-accent" strokeWidth={1.5} />
                    <h3 className="text-title text-ink">起心动念</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    aria-label="关闭"
                    className="p-2 text-ink-3 hover:text-ink rounded-full hover:bg-surface-2 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {collectorInnerBody}

                {activeTab === 'record' && hasMindConsent && !showSafetyNet && (
                  <div className="p-5 pt-4 border-t border-line bg-surface shrink-0 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-5">
                    {renderStepFooter()}
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {renderPlaque()}

      <MindConsentSheet
        isOpen={showMindConsent}
        onConsentAccepted={() => {
          setHasMindConsent(true);
          setShowMindConsent(false);
          setActiveTab('record');
          setIsOpen(true);
        }}
        onCancel={() => setShowMindConsent(false)}
      />

      <ConfirmSheet
        isOpen={Boolean(pendingDeleteThought)}
        title="删除这条观心记录？"
        description="删除后无法恢复。若已开启云端同步，云端记录也会一并移除。"
        confirmLabel="确认删除"
        destructive
        onConfirm={() => {
          if (pendingDeleteThought) handleDeleteThought(pendingDeleteThought);
        }}
        onCancel={() => setPendingDeleteThought(null)}
      />
    </>
  );
};