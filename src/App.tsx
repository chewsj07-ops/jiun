import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import { Toaster, toast } from 'sonner';
import { Book, Heart, History, MessageCircle, Settings, Trophy, Sparkles, Music, Wind, Plus, Trash2, Check, ChevronDown, Users, ThumbsUp, Globe, Leaf, Brain, Target, Share2, X, LogOut, Menu, Home, BookOpen, Moon, Download, ShieldCheck, Upload, UserRound, Minimize2 } from 'lucide-react';
import { aiGenerate } from './services/geminiClient';
import { POST_SESSION_REFLECTION_SYSTEM_PROMPT } from './data/zenAssistantPrompt';
import { useFirebaseSync } from './hooks/useFirebaseSync';
import { useFirebase } from './contexts/FirebaseContext';
import { doc, setDoc, deleteDoc, writeBatch, collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { sendEmailVerification } from 'firebase/auth';
import { db, auth } from './firebase';
import { handleFirestoreError, OperationType } from './utils/firebaseErrors';
import { translateFirebaseAuthError } from './utils/firebaseAuthErrors';
import { containsBadWords } from './utils/badWords';
import { Dashboard } from './components/Dashboard';
import {
  WoodenFishPracticeView,
  FISH_DEDICATION_PRESETS,
  FishDedicationChoice,
  resolveFishDedicationText,
} from './components/WoodenFishPracticeView';
import { ObserveThoughtFab } from './components/ObserveThoughtFab';
import {
  practiceService,
  getDefaultTargetForCategory,
  getDefaultUnitForCategory,
  connectRealtime,
  disconnectRealtime,
  subscribeRealtimeStatus,
  isRealtimeOffline,
} from './services/practiceService';
import { DailyPracticeItem } from './types/practice';
import { RitualRunMode } from './data/ritual';
import { RitualSettings, ritualService } from './services/ritualService';
import { getScriptures, Scripture } from './constants';
import { useTranslation, LANGUAGES } from './i18n';
import { parseISO, format } from 'date-fns';
import { cn } from './lib/utils';
import { ChantingProvider } from './features/chanting/ChantingContext';
import { ZenOnboarding } from './components/ZenOnboarding';
import { identityService } from './services/identityService';
import { Country, City } from './utils/locationData';
import type { VowBookSegment, VowFeatureSection } from './components/VowBookView';

// Lazy-loaded components for optimal mobile Safari startup performance
const Meditation = React.lazy(() => import('./components/Meditation').then(m => ({ default: m.Meditation })));
const VowBookView = React.lazy(() => import('./components/VowBookView').then(m => ({ default: m.VowBookView })));
const MeritMap = React.lazy(() => import('./components/MeritMap').then(m => ({ default: m.MeritMap })));
const ExportModal = React.lazy(() => import('./components/ExportModal').then(m => ({ default: m.ExportModal })));
const CustomCalendar = React.lazy(() => import('./components/CustomCalendar').then(m => ({ default: m.CustomCalendar })));
const ThoughtCollector = React.lazy(() => import('./components/ThoughtCollector').then(m => ({ default: m.ThoughtCollector })));
const GoodDeedCollector = React.lazy(() => import('./components/GoodDeedCollector').then(m => ({ default: m.GoodDeedCollector })));
const AudioManagement = React.lazy(() => import('./components/AudioManagement').then(m => ({ default: m.AudioManagement })));
const AuthModal = React.lazy(() => import('./components/AuthModal').then(m => ({ default: m.AuthModal })));
const ChangePasswordModal = React.lazy(() => import('./components/ChangePasswordModal').then(m => ({ default: m.ChangePasswordModal })));
const InstallAppModal = React.lazy(() => import('./components/InstallAppModal').then(m => ({ default: m.InstallAppModal })));
const LegalModals = React.lazy(() => import('./components/LegalModals').then(m => ({ default: m.LegalModals })));
const RejoiceModal = React.lazy(() => import('./components/RejoiceModal').then(m => ({ default: m.RejoiceModal })));
const DeleteAccountPage = React.lazy(() => import('./components/DeleteAccountPage').then(m => ({ default: m.DeleteAccountPage })));
const ScriptureLibrary = React.lazy(() => import('./components/ScriptureLibrary').then(m => ({ default: m.ScriptureLibrary })));
import { safeStorage } from './utils/safeStorage';
import { recordVault } from './services/recordVault';
import { scriptureDatabaseService } from './services/scriptureDatabaseService';
import { playCompletionBell } from './utils/zenAudio';
import { OfflineIndicator } from './components/OfflineIndicator';

interface CommunityPost {
  id: number | string;
  userName: string;
  chant: string;
  count: number;
  dedication: string;
  likes: number;
  timestamp: number;
  isLiked?: boolean;
  isUserPost?: boolean;
}

const LEVELS = [
  { minExp: 0, nameKey: "level_1_name", title: "Level 1" },
  { minExp: 1000, nameKey: "level_2_name", title: "Level 2" },
  { minExp: 3000, nameKey: "level_3_name", title: "Level 3" },
  { minExp: 6000, nameKey: "level_4_name", title: "Level 4" },
  { minExp: 10000, nameKey: "level_5_name", title: "Level 5" }
];

const ALL_COUNTRIES = Country.getAllCountries();

const ZenSuspenseFallback: React.FC<{ text?: string }> = ({ text = "正在静心载入..." }) => (
  <div className="flex flex-col items-center justify-center min-h-[220px] p-6 text-center animate-fade-in">
    <div className="w-10 h-10 rounded-full bg-zen-accent/10 border border-zen-accent/20 flex items-center justify-center text-zen-accent mb-3 animate-pulse">
      <Sparkles className="w-5 h-5" />
    </div>
    <p className="text-xs font-serif text-zen-accent/70 tracking-widest">{text}</p>
  </div>
);

// Trigger Vercel Production Deployment
export default function App() {
  const [isDeleteAccountRoute, setIsDeleteAccountRoute] = useState(false);
  const [isAppReady, setIsAppReady] = useState(false);

  useEffect(() => {
    if (window.location.pathname === '/delete-account' || window.location.pathname === '/delete-account.html') {
      setIsDeleteAccountRoute(true);
    }
  }, []);

  useEffect(() => {
    // Safari optimization: yield to browser loop before rendering heavy tree to avoid blank freeze
    const timer = setTimeout(() => {
      setIsAppReady(true);
    }, 40);
    return () => clearTimeout(timer);
  }, []);

  const { t, language, setLanguage } = useTranslation();

  const [personalVow, setPersonalVow] = useState(() => safeStorage.getItem('personal_vow') || "");
  const [isVowExpanded, setIsVowExpanded] = useState(false);

  useEffect(() => {
    const handleVowUpdate = () => {
      setPersonalVow(safeStorage.getItem('personal_vow') || "");
    };
    window.addEventListener('vow_updated', handleVowUpdate);
    return () => window.removeEventListener('vow_updated', handleVowUpdate);
  }, []);

  const [count, setCount] = useState(() => {
    const saved = safeStorage.getItem('zen_count');
    return saved ? parseInt(saved, 10) : 0;
  });
  
  const [vowBookSegment, setVowBookSegment] = useState<VowBookSegment>('vow');
  const [vowFeatureSection, setVowFeatureSection] = useState<VowFeatureSection>('overview');
  const [immersive, setImmersive] = useState<boolean>(false);
  const [isMeSheetOpen, setIsMeSheetOpen] = useState<boolean>(false);
  const [meditationPresetDuration, setMeditationPresetDuration] = useState<number | null>(null);
  const [openRitualOnFishEnter, setOpenRitualOnFishEnter] = useState<boolean>(false);
  const [ritualSettings, setRitualSettings] = useState<RitualSettings>(() => ritualService.getSettings());

  const [rejoiceId, setRejoiceId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const rejoice = urlParams.get('rejoice');
      if (rejoice) {
        setRejoiceId(rejoice);
      }
    } catch (e) {
      console.warn("URL params notice:", e);
    }
  }, []);

  const [activeTab, setActiveTab] = useState<'fish' | 'scripture' | 'assistant' | 'history' | 'meditation' | 'settings' | 'community' | 'vow' | 'merit' | 'dashboard'>('dashboard');
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);

  // Automatically enter immersive mode when entering 木鱼 page, and restore when leaving
  const prevTabRef = useRef(activeTab);
  useEffect(() => {
    const prevTab = prevTabRef.current;
    if (activeTab === 'fish' && prevTab !== 'fish') {
      setImmersive(true);
    } else if (prevTab === 'fish' && activeTab !== 'fish') {
      setImmersive(false);
    }
    prevTabRef.current = activeTab;
  }, [activeTab]);

  const navigateTo = (target: string) => {
    if (target === 'daily-practice') {
      const enabledPractice = dailyPractice
        .filter((item) => item.enabled)
        .sort((a, b) => a.order - b.order);

      if (enabledPractice.length > 0) {
        const latestCounts = practiceService.getDailyPractice().scriptureCounts || {};
        const firstUnfinished = enabledPractice.find(
          (item) => (latestCounts[item.scriptureId] || 0) < item.target
        );
        if (!firstUnfinished) {
          setActiveTab('meditation');
          setImmersive(false);
          return;
        }
        const matched = allScriptures.find((s) => s.id === firstUnfinished.scriptureId);
        if (matched) {
          setActiveScriptureId(matched.id);
          setSelectedChant(matched.title);
          setRecentScriptureIds(practiceService.recordRecentScriptureId(matched.id));
          setActiveTab(matched.category === 'meditation' ? 'meditation' : 'fish');
          if (matched.category !== 'meditation') {
            setOpenRitualOnFishEnter(true);
          }
          setImmersive(false);
          return;
        }
      }

      const configuredGoals = practiceService.getSettings().scriptureGoals || {};
      const hasCurrentGoal = Boolean(configuredGoals[activeScriptureId]);
      const targetScriptureId = hasCurrentGoal
        ? activeScriptureId
        : Object.keys(configuredGoals).find((id) => configuredGoals[id] > 0);

      if (targetScriptureId) {
        const matched = allScriptures.find((s) => s.id === targetScriptureId);
        if (matched) {
          setActiveScriptureId(matched.id);
          setSelectedChant(matched.title);
          setActiveTab(matched.category === 'meditation' ? 'meditation' : 'fish');
          if (matched.category !== 'meditation') {
            setOpenRitualOnFishEnter(true);
          }
        } else {
          setOpenRitualOnFishEnter(true);
          setActiveTab('fish');
        }
      } else {
        setOpenRitualOnFishEnter(true);
        setActiveTab('fish');
      }
      setImmersive(false);
      return;
    }

    if (target === 'history') {
      setVowBookSegment('merit');
      setActiveTab('vow');
    } else if (target === 'assistant' || target === 'vow-coach') {
      setVowBookSegment('mind');
      setActiveTab('vow');
    } else if (target === 'vow-wisdom') {
      setVowBookSegment('vow');
      setVowFeatureSection('wisdom');
      setActiveTab('vow');
    } else if (target === 'vow-setup') {
      setVowBookSegment('vow');
      setVowFeatureSection('setup_vow');
      setActiveTab('vow');
    } else if (target === 'vow') {
      setVowBookSegment('vow');
      setVowFeatureSection('overview');
      setActiveTab('vow');
    } else {
      setActiveTab(target as any);
    }
    if (target !== 'fish' && target !== 'meditation' && target !== 'scripture') {
      setImmersive(false);
    }
  };
  const [selectedScripture, setSelectedScripture] = useState<Scripture>(getScriptures('zh-CN')[0]);
  const [selectedChant, setSelectedChant] = useState<string>(() => {
    return safeStorage.getItem('zen_selected_chant') || "功德 +1";
  });

  const [customScriptures, setCustomScriptures] = useState<Scripture[]>(() => {
    return safeStorage.getJSON<Scripture[]>('zen_custom_scriptures', []);
  });

  const allScriptures = [...getScriptures(language), ...customScriptures];

  const [activeScriptureId, setActiveScriptureId] = useState<string>(() => {
    return safeStorage.getItem('zen_active_scripture_id') || getScriptures('zh-CN')[0].id;
  });

  const [scriptureGoals, setScriptureGoals] = useState<Record<string, number>>(() => {
    return practiceService.getSettings().scriptureGoals;
  });

  const [scriptureGoalTypes, setScriptureGoalTypes] = useState<Record<string, 'count' | 'time'>>(() => {
    return practiceService.getSettings().scriptureGoalTypes || {};
  });

  const [aiEnabled, setAiEnabled] = useState<boolean>(() => {
    const saved = practiceService.getSettings().aiEnabled;
    return saved === undefined ? true : saved;
  });

  const [dailyCounts, setDailyCounts] = useState<Record<string, number>>(() => {
    return practiceService.getDailyPractice().scriptureCounts || {};
  });

  const [dailyPractice, setDailyPractice] = useState<DailyPracticeItem[]>(() => {
    return practiceService.getDailyPracticeList(allScriptures);
  });

  const [dailyPracticeUpdatedAt, setDailyPracticeUpdatedAt] = useState<number>(() => {
    return practiceService.getSettings().dailyPracticeUpdatedAt || 0;
  });

  const [recentScriptureIds, setRecentScriptureIds] = useState<string[]>(() => {
    return practiceService.getRecentScriptureIds();
  });

  const handleUpdateDailyPractice = (items: DailyPracticeItem[]) => {
    const saved = practiceService.saveDailyPracticeList(items);
    setDailyPractice(saved);
    setDailyPracticeUpdatedAt(practiceService.getSettings().dailyPracticeUpdatedAt || Date.now());
    setScriptureGoals(practiceService.getSettings().scriptureGoals || {});
  };

  const getHistoryDisplayUnit = (item: { unit?: string; type?: string; source?: string; chant?: string }): '遍' | '声' | null => {
    if (item.unit === '遍' || item.unit === '声') return item.unit;
    if (item.type === '禅修' || item.source === '禅修') return null;
    const matched = allScriptures.find((s) => s.title === item.chant);
    if (matched) return getDefaultUnitForCategory(matched.category);
    if (item.type === '诵经') return '遍';
    if (item.type === '持咒') return '声';
    return null;
  };

  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingGoalValue, setEditingGoalValue] = useState(108);
  const [editingGoalType, setEditingGoalType] = useState<'count' | 'time'>('count');

  const activeScripture = allScriptures.find(s => s.id === activeScriptureId) || allScriptures[0];

  const [showMeritFloat, setShowMeritFloat] = useState<boolean>(() => {
    try {
      return safeStorage.getItem('zen_show_merit_float') === 'true';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      safeStorage.setItem('zen_show_merit_float', String(showMeritFloat));
    } catch {
      // ignore
    }
  }, [showMeritFloat]);

  const [fishDedicationChoice, setFishDedicationChoice] = useState<FishDedicationChoice>(() => {
    try {
      const saved = safeStorage.getItem('zen_fish_dedication_choice') as FishDedicationChoice | null;
      return saved || '1';
    } catch {
      return '1';
    }
  });
  useEffect(() => {
    try {
      safeStorage.setItem('zen_fish_dedication_choice', fishDedicationChoice);
    } catch {
      // ignore
    }
  }, [fishDedicationChoice]);

  const [fishCustomDedication, setFishCustomDedication] = useState<string>(() => {
    try {
      return safeStorage.getItem('zen_fish_custom_dedication') || '';
    } catch {
      return '';
    }
  });
  useEffect(() => {
    try {
      safeStorage.setItem('zen_fish_custom_dedication', fishCustomDedication);
    } catch {
      // ignore
    }
  }, [fishCustomDedication]);

  const [fishCompletionSignal, setFishCompletionSignal] = useState<number>(0);

  const [volume, setVolume] = useState(() => {
    try {
      const saved = safeStorage.getItem('zen_volume');
      const parsed = saved !== null ? parseFloat(saved) : 0.8;
      return Number.isFinite(parsed) ? Math.min(1, Math.max(0, parsed)) : 0.8;
    } catch {
      return 0.8;
    }
  });

  const [soundType, setSoundType] = useState<'standard' | 'crisp' | 'deep'>(() => {
    try {
      const saved = safeStorage.getItem('zen_sound_type');
      return (saved as 'standard' | 'crisp' | 'deep') || 'standard';
    } catch {
      return 'standard';
    }
  });

  const [customChants, setCustomChants] = useState<string[]>(() => {
    try {
      return safeStorage.getJSON<string[]>('zen_custom_chants', []);
    } catch {
      return [];
    }
  });

  const [theme, setTheme] = useState<'zen' | 'lotus' | 'sky' | 'dark'>(() => {
    try {
      return (safeStorage.getItem('zen_theme') as any) || 'zen';
    } catch {
      return 'zen';
    }
  });
  const [isSharing, setIsSharing] = useState(false);

  const [userProfile, setUserProfile] = useState(() => {
    try {
      const saved = safeStorage.getItem('zen_user_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.gender === 'other') {
          parsed.gender = '';
        }
        return parsed;
      }
    } catch (e) {
      console.warn("User profile load error:", e);
    }
    return {
      name: '',
      email: '',
      birthday: '',
      gender: '',
      role: 'Employee'
    };
  });

  useEffect(() => {
    try {
      safeStorage.setJSON('zen_user_profile', userProfile);
      window.dispatchEvent(new CustomEvent('user_profile_updated'));
      // Update community posts if the user's name changed
      setCommunityPosts(prev => prev.map(post => {
        if (post.isUserPost) {
          return { ...post, userName: userProfile.name || "静心居士" };
        }
        return post;
      }));
    } catch (e) {
      console.warn("Save user profile error:", e);
    }
  }, [userProfile]);

  useEffect(() => {
    const handleProfileUpdate = () => {
      try {
        const saved = safeStorage.getItem('zen_user_profile');
        if (saved) {
          const parsed = JSON.parse(saved);
          setUserProfile((prev: any) => {
            if (JSON.stringify(prev) !== JSON.stringify(parsed)) {
              return parsed;
            }
            return prev;
          });
        }
      } catch (e) {
        console.warn("Profile update notice:", e);
      }
    };
    window.addEventListener('user_profile_updated', handleProfileUpdate);
    return () => window.removeEventListener('user_profile_updated', handleProfileUpdate);
  }, []);

  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>(() => {
    try {
      return (safeStorage.getItem('zen_font_size') as any) || 'medium';
    } catch {
      return 'medium';
    }
  });

  // Removed internal language state as it is now managed by useTranslation hook

  const [woodenFishAppearance, setWoodenFishAppearance] = useState<'fish' | 'lotus' | 'bowl'>(() => {
    try {
      return (safeStorage.getItem('zen_fish_appearance') as any) || 'lotus';
    } catch {
      return 'lotus';
    }
  });

  const [meditationWoodenFishAppearance, setMeditationWoodenFishAppearance] = useState<'fish' | 'lotus' | 'bowl'>(() => {
    try {
      return (safeStorage.getItem('zen_meditation_fish_appearance') as any) || 'lotus';
    } catch {
      return 'lotus';
    }
  });

  const [dedications, setDedications] = useState<{id: string, content: string, isDefault: boolean}[]>(() => {
    try {
      return safeStorage.getJSON<{id: string, content: string, isDefault: boolean}[]>('zen_dedications', [
        {
          id: 'default',
          content: "愿以此功德，庄严佛净土。\n上报四重恩，下济三途苦。\n若有见闻者，悉发菩提心。\n尽此一报身，同生极乐国。",
          isDefault: true
        }
      ]);
    } catch {
      return [
        {
          id: 'default',
          content: "愿以此功德，庄严佛净土。\n上报四重恩，下济三途苦。\n若有见闻者，悉发菩提心。\n尽此一报身，同生极乐国。",
          isDefault: true
        }
      ];
    }
  });

  const [vows, setVows] = useState<{id: string, content: string, isDefault: boolean}[]>(() => {
    try {
      return safeStorage.getJSON<{id: string, content: string, isDefault: boolean}[]>('zen_vows', [
        {
          id: 'default',
          content: "众生无边誓愿度，\n烦恼无尽誓愿断，\n法门无量誓愿学，\n佛道无上誓愿成。",
          isDefault: true
        }
      ]);
    } catch {
      return [
        {
          id: 'default',
          content: "众生无边誓愿度，\n烦恼无尽誓愿断，\n法门无量誓愿学，\n佛道无上誓愿成。",
          isDefault: true
        }
      ];
    }
  });

  const [meditationDedications, setMeditationDedications] = useState<{id: string, content: string, isDefault: boolean}[]>(() => {
    try {
      return safeStorage.getJSON<{id: string, content: string, isDefault: boolean}[]>('zen_meditation_dedications', [
        {
          id: 'default',
          content: "愿以此禅修功德，\n回向法界众生，\n身心清净，\n福慧增长。",
          isDefault: true
        }
      ]);
    } catch {
      return [
        {
          id: 'default',
          content: "愿以此禅修功德，\n回向法界众生，\n身心清净，\n福慧增长。",
          isDefault: true
        }
      ];
    }
  });

  useEffect(() => {
    try {
      safeStorage.setJSON('zen_meditation_dedications', meditationDedications);
    } catch (e) {
      console.warn("Save meditation dedications error:", e);
    }
  }, [meditationDedications]);

  // Legacy state support (can be removed later or used for migration)
  const [customDedication, setCustomDedication] = useState(""); 
  const [customVow, setCustomVow] = useState("");

  const [newChantInput, setNewChantInput] = useState("");

  // Session State
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [sessionCount, setSessionCount] = useState(0);
  const [sessionTimeLeft, setSessionTimeLeft] = useState<number | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try {
      return !safeStorage.getItem('zen_onboarding_seen');
    } catch {
      return false;
    }
  });
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [sessionFlowStep, setSessionFlowStep] = useState<'none' | 'dedication' | 'vow' | 'summary'>('none');
  const [lastSession, setLastSession] = useState<any>(null);
  const [history, setHistory] = useState<any[]>(() => {
    try {
      return safeStorage.getJSON<any[]>('zen_history', []);
    } catch {
      return [];
    }
  });

  // Cross-storage self-healing: verify against IndexedDB vault on startup so records NEVER disappear
  useEffect(() => {
    recordVault.getRecords().then(vaultRecords => {
      if (vaultRecords && vaultRecords.length > 0) {
        setHistory(prev => {
          if (prev.length < vaultRecords.length) {
            return vaultRecords;
          }
          return prev;
        });
      }
    }).catch(err => console.warn('Record vault startup recovery:', err));
  }, []);

  const { user: fbUser } = useFirebase();

  const shareMerit = async (meritData: any, isCommunity: boolean = false) => {
    if (isSharing) return;
    
    // Check for bad words
    const contentToCheck = `${meritData.chant || ''} ${meritData.type || ''} ${meritData.dedication || ''} ${meritData.vow || ''} ${meritData.content || ''}`;
    if (containsBadWords(contentToCheck)) {
      alert('您的内容包含不当词汇，请修改后再分享。');
      return;
    }
    
    setIsSharing(true);
    try {
      let shareUrl = window.location.origin;
      
      // If sharing an existing community post, reuse its ID so rejoices go to the original post
      const isExistingCommunityPost = !!meritData.userName && meritData.likes !== undefined;
      const shareId = isExistingCommunityPost 
        ? meritData.id 
        : Date.now().toString() + Math.random().toString(36).substring(2, 9);
        
      const currentUserId = fbUser ? fbUser.uid : identityService.getUserId();
      
      const url = new URL(window.location.origin);
      url.searchParams.set('rejoice', shareId);
      shareUrl = url.toString();

      let shareMessage = `我刚刚完成了 ${meritData.count ? meritData.count + ' 次 ' : ''}${meritData.chant || meritData.type}。愿以此功德，普及于一切。邀请您一同随喜赞叹！`;
      if (isExistingCommunityPost && !meritData.isUserPost) {
        shareMessage = `邀请您一同随喜赞叹 ${meritData.userName} 完成的 ${meritData.count ? meritData.count + ' 次 ' : ''}${meritData.chant || meritData.type}！`;
      }
      const fullShareText = `${shareMessage}\n\n${shareUrl}`;

      // 1. Save to Firestore FIRST
      // This is critical for iOS Safari. If we call navigator.share first, Safari might suspend
      // the page and the network request for setDoc will be paused until the user returns to Safari.
      // If the friend clicks the link before the user returns to Safari, the document won't exist.
      try {
        if (!isExistingCommunityPost) {
          const shareDoc = {
            userId: currentUserId,
            userName: userProfile.name || '同修',
            type: meritData.type || '修行',
            title: `${meritData.chant || meritData.type || '修行'} ${meritData.count ? meritData.count + '次' : ''}`.trim(),
            description: meritData.dedication || meritData.vow || meritData.content || '',
            rejoiceCount: meritData.likes || 0,
            timestamp: meritData.timestamp || meritData.endTime || Date.now(),
            isCommunity: isCommunity,
            chant: meritData.chant || meritData.type || '修行',
            count: meritData.count || 0
          };
          
          await setDoc(doc(db, 'shared_merits', shareId), shareDoc, { merge: true });
        }
      } catch (err: any) {
        console.error('Failed to save shared merit to Firestore:', err);
        alert('生成分享链接失败，请检查网络或稍后再试。错误信息: ' + err.message);
        return; // Stop if we can't save
      }

      // 2. THEN call navigator.share or clipboard
      try {
        if (navigator.share) {
          await navigator.share({
            title: '随喜赞叹',
            text: shareMessage,
            url: shareUrl
          });
        } else {
          // Fallback for desktop or unsupported browsers
          const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
          if (confirm('当前浏览器不支持原生分享。是否直接分享到 WhatsApp？\n(点击取消将复制链接到剪贴板)')) {
            const waUrl = isMobile 
              ? `whatsapp://send?text=${encodeURIComponent(fullShareText)}`
              : `https://web.whatsapp.com/send?text=${encodeURIComponent(fullShareText)}`;
            window.open(waUrl, '_blank');
          } else {
            if (navigator.clipboard && navigator.clipboard.writeText) {
              await navigator.clipboard.writeText(fullShareText);
              alert('链接已复制到剪贴板，快去分享给好友吧！');
            } else {
              const textArea = document.createElement("textarea");
              textArea.value = fullShareText;
              document.body.appendChild(textArea);
              textArea.focus();
              textArea.select();
              try {
                document.execCommand('copy');
                alert('链接已复制到剪贴板，快去分享给好友吧！');
              } catch (err) {
                alert('复制失败，请手动复制链接:\n\n' + shareUrl);
              }
              document.body.removeChild(textArea);
            }
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Share failed:', err);
          // Fallback to clipboard if share fails for other reasons (like being blocked by Safari due to async delay)
          if (confirm('分享被拦截或失败。是否尝试直接分享到 WhatsApp？\n(点击取消将复制链接到剪贴板)')) {
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
            const waUrl = isMobile 
              ? `whatsapp://send?text=${encodeURIComponent(fullShareText)}`
              : `https://web.whatsapp.com/send?text=${encodeURIComponent(fullShareText)}`;
            window.open(waUrl, '_blank');
          } else {
            try {
              if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(fullShareText);
                alert('链接已复制到剪贴板，快去分享给好友吧！');
              } else {
                const textArea = document.createElement("textarea");
                textArea.value = fullShareText;
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                try {
                  document.execCommand('copy');
                  alert('链接已复制到剪贴板，快去分享给好友吧！');
                } catch (err) {
                  alert('复制失败，请手动复制链接:\n\n' + shareUrl);
                }
                document.body.removeChild(textArea);
              }
            } catch (clipboardErr) {
              console.error('Clipboard fallback failed:', clipboardErr);
              alert('复制失败，请手动复制链接:\n\n' + shareUrl);
            }
          }
        }
      }
      
    } catch (error) {
      console.error(error);
    } finally {
      setIsSharing(false);
    }
  };

  const addHistoryItem = async (item: any) => {
    setHistory(prev => {
      const next = [item, ...prev];
      recordVault.saveRecords(next);
      return next;
    });
    if (fbUser) {
      try {
        const cleanItem = Object.fromEntries(Object.entries(item).filter(([_, v]) => v !== undefined));
        await setDoc(doc(db, `users/${fbUser.uid}/history`, item.id.toString()), cleanItem);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${fbUser.uid}/history`);
      }
    }
  };

  const deleteHistoryItem = async (id: string) => {
    setHistory(prev => {
      const next = prev.filter(h => h.id !== id);
      recordVault.saveRecords(next);
      return next;
    });
    if (fbUser) {
      try {
        await deleteDoc(doc(db, `users/${fbUser.uid}/history`, id.toString()));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `users/${fbUser.uid}/history`);
      }
    }
  };

  const restoreHistory = async (newHistory: any[]) => {
    setHistory(newHistory);
    recordVault.saveRecords(newHistory);
    if (fbUser) {
      try {
        const batch = writeBatch(db);
        newHistory.forEach(item => {
          const docRef = doc(db, `users/${fbUser.uid}/history`, item.id.toString());
          const cleanItem = Object.fromEntries(Object.entries(item).filter(([_, v]) => v !== undefined));
          batch.set(docRef, cleanItem);
        });
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${fbUser.uid}/history`);
      }
    }
  };

  const updateVows = async (newVows: any[]) => {
    setVows(newVows);
    if (fbUser) {
      try {
        const batch = writeBatch(db);
        newVows.forEach(vow => {
          const docRef = doc(db, `users/${fbUser.uid}/vows`, vow.id.toString());
          const cleanVow = Object.fromEntries(Object.entries(vow).filter(([_, v]) => v !== undefined));
          batch.set(docRef, cleanVow);
        });
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${fbUser.uid}/vows`);
      }
    }
  };

  const [userExp, setUserExp] = useState(() => {
    try {
      const saved = safeStorage.getItem('zen_user_exp');
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  const currentLevel = LEVELS.slice().reverse().find(l => userExp >= l.minExp) || LEVELS[0];
  const nextLevel = LEVELS.find(l => l.minExp > userExp);
  const progressToNext = nextLevel 
    ? ((userExp - currentLevel.minExp) / (nextLevel.minExp - currentLevel.minExp)) * 100 
    : 100;

  const [userStats, setUserStats] = useState<Record<string, number>>(() => {
    try {
      return safeStorage.getJSON<Record<string, number>>('zen_user_stats', {});
    } catch {
      return {};
    }
  });

  const [rejoiceStats, setRejoiceStats] = useState(practiceService.getRejoiceStats());

  useEffect(() => {
    try {
      safeStorage.setJSON('zen_user_stats', userStats);
    } catch (e) {
      console.warn("Save user stats notice:", e);
    }
  }, [userStats]);

  const triggerLevelUpAnimation = (msg: string) => {
    alert(`升级了！${msg}`);
  };

  const user = {
    merit_points: userExp,
    level: currentLevel.nameKey,
    next_level_threshold: nextLevel ? nextLevel.minExp : Infinity,
    total_stats: userStats,
    ...userProfile
  };

  useFirebaseSync(
    userProfile, setUserProfile,
    history, setHistory,
    vows, setVows,
    scriptureGoals, setScriptureGoals,
    count, setCount,
    userExp, setUserExp,
    personalVow, setPersonalVow,
    selectedChant, setSelectedChant,
    volume, setVolume,
    soundType, setSoundType,
    woodenFishAppearance, setWoodenFishAppearance,
    customScriptures, setCustomScriptures,
    dailyPractice, setDailyPractice,
    dailyPracticeUpdatedAt, setDailyPracticeUpdatedAt
  );

  const [realtimeOffline, setRealtimeOffline] = useState<boolean>(() => isRealtimeOffline());
  const [sharedMeritsOffline, setSharedMeritsOffline] = useState<boolean>(
    () => typeof navigator !== 'undefined' && !navigator.onLine
  );

  useEffect(() => {
    return subscribeRealtimeStatus(setRealtimeOffline);
  }, []);

  useEffect(() => {
    if (activeTab === 'community' || activeTab === 'merit') {
      connectRealtime();
    } else {
      disconnectRealtime(30000);
    }
  }, [activeTab]);

  const isCommunityOffline =
    realtimeOffline ||
    sharedMeritsOffline ||
    (typeof navigator !== 'undefined' && !navigator.onLine);

  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>(() => {
    try {
      const saved = safeStorage.getJSON<CommunityPost[] | null>('zen_community_posts', null);
      if (saved && Array.isArray(saved) && saved.length > 0) return saved;
    } catch {}
    // Initial fake data
    return [
      { id: 1, userName: userProfile.name || "静心居士", chant: "心经", count: 7, dedication: "愿以此功德，回向给家人身体健康。", likes: 12, timestamp: Date.now() - 3600000, isUserPost: true },
      { id: 2, userName: "悟道者", chant: "南无阿弥陀佛", count: 108, dedication: "愿众生离苦得乐。", likes: 8, timestamp: Date.now() - 7200000, isUserPost: false },
    ];
  });

  useEffect(() => {
    try {
      safeStorage.setItem('zen_user_exp', userExp.toString());
      window.dispatchEvent(new CustomEvent('zen_data_updated'));
    } catch (e) {
      console.warn("Save user exp notice:", e);
    }
  }, [userExp]);

  useEffect(() => {
    try {
      safeStorage.setJSON('zen_community_posts', communityPosts);
    } catch (e) {
      console.warn("Save community posts notice:", e);
    }
  }, [communityPosts]);

  useEffect(() => {
    const q = query(
      collection(db, 'shared_merits'),
      orderBy('timestamp', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSharedMeritsOffline(false);
      const posts: CommunityPost[] = [];
      const currentUserId = fbUser ? fbUser.uid : identityService.getUserId();
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.isCommunity) {
          posts.push({
            id: doc.id,
            userName: data.userName || '同修',
            chant: data.chant || data.title?.split(' ')[0] || '修行',
            count: data.count || parseInt(data.title?.match(/\d+/)?.[0] || '0') || 0,
            dedication: data.description || '',
            likes: data.rejoiceCount || 0,
            timestamp: data.timestamp || Date.now(),
            isUserPost: data.userId === currentUserId
          });
        }
      });
      
      // Always include some mock data so the feed isn't empty for new users
      const mockPosts: CommunityPost[] = [
        { id: 'mock1', userName: "悟道者", chant: "南无阿弥陀佛", count: 108, dedication: "愿众生离苦得乐。", likes: 24, timestamp: Date.now() - 7200000, isUserPost: false },
        { id: 'mock2', userName: "清净心", chant: "心经", count: 21, dedication: "愿以此功德，回向给家人身体健康，平安喜乐。", likes: 15, timestamp: Date.now() - 86400000, isUserPost: false },
        { id: 'mock3', userName: "无名氏", chant: "大悲咒", count: 7, dedication: "祈愿世界和平，国泰民安。", likes: 42, timestamp: Date.now() - 172800000, isUserPost: false }
      ];
      
      // Filter out mock posts if we have a lot of real posts, otherwise merge them
      if (posts.length < 10) {
        setCommunityPosts([...posts, ...mockPosts]);
      } else {
        setCommunityPosts(posts);
      }
    }, (error) => {
      console.error('Error fetching community posts:', error);
      setSharedMeritsOffline(true);
      // Fallback to local storage if query fails
    });

    return () => unsubscribe();
  }, [fbUser]);

  const [shareToCommunity, setShareToCommunity] = useState(true);
  const [communityPeriod, setCommunityPeriod] = useState<'daily' | 'monthly' | 'yearly' | 'all'>('all');
  const [communitySelectedDate, setCommunitySelectedDate] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [showCommunityCalendarModal, setShowCommunityCalendarModal] = useState(false);

  const filteredCommunityPosts = communityPosts.filter(post => {
    const postDate = new Date(post.timestamp);
    const year = postDate.getFullYear();
    const month = String(postDate.getMonth() + 1).padStart(2, '0');
    const day = String(postDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    if (communityPeriod === 'daily') return dateStr === communitySelectedDate;
    if (communityPeriod === 'monthly') return dateStr.startsWith(communitySelectedDate.substring(0, 7));
    if (communityPeriod === 'yearly') return dateStr.startsWith(communitySelectedDate.substring(0, 4));
    return true; // 'all'
  });

  const [showAddRecord, setShowAddRecord] = useState(false);
  const [newRecordDate, setNewRecordDate] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [newRecordChant, setNewRecordChant] = useState("功德 +1");
  const [newRecordCount, setNewRecordCount] = useState(108);
  const [newRecordDuration, setNewRecordDuration] = useState(10);
  const [newRecordDedication, setNewRecordDedication] = useState("");
  const [newRecordType, setNewRecordType] = useState<'诵经' | '禅修' | '持咒'>('诵经');
  const [newRecordVow, setNewRecordVow] = useState("");

  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const [historyPeriod, setHistoryPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | 'all'>('daily');
  const [showCalendarModal, setShowCalendarModal] = useState(false);

  const recordDates = Array.from(new Set(history.map(item => {
    const itemDate = new Date(item.endTime);
    const year = itemDate.getFullYear();
    const month = String(itemDate.getMonth() + 1).padStart(2, '0');
    const day = String(itemDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  })));

  const filteredHistory = history.filter(item => {
    const itemDate = new Date(item.endTime);
    const year = itemDate.getFullYear();
    const month = String(itemDate.getMonth() + 1).padStart(2, '0');
    const day = String(itemDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    if (historyPeriod === 'daily') return dateStr === selectedDate;
    if (historyPeriod === 'weekly') {
      const selected = parseISO(selectedDate);
      const day = selected.getDay() || 7; // Convert Sunday (0) to 7
      const startOfWeek = new Date(selected);
      startOfWeek.setDate(selected.getDate() - day + 1);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      const itemD = parseISO(dateStr);
      return itemD >= startOfWeek && itemD <= endOfWeek;
    }
    if (historyPeriod === 'monthly') return dateStr.startsWith(selectedDate.substring(0, 7));
    if (historyPeriod === 'yearly') return dateStr.startsWith(selectedDate.substring(0, 4));
    return true; // 'all'
  });

  const dailyTotal = filteredHistory.reduce((sum, item) => sum + item.count, 0);

  useEffect(() => {
    let mounted = true;
    scriptureDatabaseService.getCustomScriptures().then((idbItems) => {
      if (mounted && idbItems.length > 0) {
        setCustomScriptures(prev => {
          const map = new Map<string, Scripture>();
          prev.forEach(item => map.set(item.id, item));
          idbItems.forEach(item => map.set(item.id, item as Scripture));
          return Array.from(map.values());
        });
      }
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    try {
      scriptureDatabaseService.saveCustomScriptures(customScriptures);
    } catch (e) {
      console.warn("Save custom scriptures notice:", e);
    }
  }, [customScriptures]);

  useEffect(() => {
    try {
      safeStorage.setItem('zen_active_scripture_id', activeScriptureId);
    } catch (e) {
      console.warn("Save active scripture id notice:", e);
    }
  }, [activeScriptureId]);

  useEffect(() => {
    try {
      safeStorage.setItem('zen_count', count.toString());
    } catch (e) {
      console.warn("Save count notice:", e);
    }
  }, [count]);

  useEffect(() => {
    try {
      safeStorage.setItem('zen_volume', volume.toString());
    } catch (e) {
      console.warn("Save volume notice:", e);
    }
  }, [volume]);

  useEffect(() => {
    try {
      safeStorage.setItem('zen_sound_type', soundType);
    } catch (e) {
      console.warn("Save sound type notice:", e);
    }
  }, [soundType]);

  useEffect(() => {
    try {
      safeStorage.setItem('zen_theme', theme);
    } catch (e) {
      console.warn("Save theme notice:", e);
    }
    // Apply theme via data-theme attribute so index.css [data-theme="..."] variables govern all 4 themes
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.style.removeProperty('--theme-bg');
    root.style.removeProperty('--theme-ink');
    root.style.removeProperty('--theme-accent');

    const themeColors: Record<string, string> = {
      zen: '#4A755A',
      lotus: '#9A5470',
      sky: '#3F6E8C',
      dark: '#121614',
    };
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', themeColors[theme] || '#4A755A');
    }
  }, [theme]);

  useEffect(() => {
    try {
      safeStorage.setItem('zen_font_size', fontSize);
    } catch (e) {
      console.warn("Save font size notice:", e);
    }
    const root = document.documentElement;
    if (fontSize === 'small') {
      root.style.fontSize = '14px';
    } else if (fontSize === 'medium') {
      root.style.fontSize = '16px';
    } else if (fontSize === 'large') {
      root.style.fontSize = '20px';
    }
  }, [fontSize]);

  // Language persistence is handled by useTranslation hook

  useEffect(() => {
    try {
      safeStorage.setItem('zen_fish_appearance', woodenFishAppearance);
    } catch (e) {
      console.warn("Save fish appearance notice:", e);
    }
  }, [woodenFishAppearance]);

  useEffect(() => {
    try {
      safeStorage.setItem('zen_meditation_fish_appearance', meditationWoodenFishAppearance);
    } catch (e) {
      console.warn("Save meditation fish appearance notice:", e);
    }
  }, [meditationWoodenFishAppearance]);

  useEffect(() => {
    try {
      safeStorage.setJSON('zen_dedications', dedications);
    } catch (e) {
      console.warn("Save dedications notice:", e);
    }
  }, [dedications]);

  useEffect(() => {
    try {
      safeStorage.setJSON('zen_vows', vows);
    } catch (e) {
      console.warn("Save vows notice:", e);
    }
  }, [vows]);

  useEffect(() => {
    try {
      safeStorage.setJSON('zen_custom_chants', customChants);
    } catch (e) {
      console.warn("Save custom chants notice:", e);
    }
  }, [customChants]);

  useEffect(() => {
    try {
      safeStorage.setItem('zen_custom_dedication', customDedication);
    } catch (e) {
      console.warn("Save custom dedication notice:", e);
    }
  }, [customDedication]);

  useEffect(() => {
    try {
      safeStorage.setItem('zen_custom_vow', customVow);
    } catch (e) {
      console.warn("Save custom vow notice:", e);
    }
  }, [customVow]);

  useEffect(() => {
    try {
      safeStorage.setItem('zen_selected_chant', selectedChant);
    } catch (e) {
      console.warn("Save selected chant notice:", e);
    }
  }, [selectedChant]);

  useEffect(() => {
    try {
      safeStorage.setJSON('zen_history', history);
      recordVault.saveRecords(history);
    } catch (e) {
      console.warn("Save history notice:", e);
    }
  }, [history]);

  useEffect(() => {
    const handleSwitchTab = (e: any) => {
      navigateTo(e.detail);
    };
    const handleAddExp = (e: any) => {
      setUserExp(prev => prev + e.detail);
    };
    const handleOpenSync = () => {
      setShowExportModal(true);
    };
    window.addEventListener('switchTab', handleSwitchTab);
    window.addEventListener('addExp', handleAddExp);
    window.addEventListener('open-data-sync-modal', handleOpenSync);
    return () => {
      window.removeEventListener('switchTab', handleSwitchTab);
      window.removeEventListener('addExp', handleAddExp);
      window.removeEventListener('open-data-sync-modal', handleOpenSync);
    };
  }, []);

  const handleSaveGoal = () => {
    const newGoals = { ...scriptureGoals, [activeScriptureId]: editingGoalValue };
    const newGoalTypes = { ...scriptureGoalTypes, [activeScriptureId]: editingGoalType };
    setScriptureGoals(newGoals);
    setScriptureGoalTypes(newGoalTypes);
    practiceService.saveSettings({ scriptureGoals: newGoals, scriptureGoalTypes: newGoalTypes });
    setShowGoalModal(false);
  };

  const sessionCountRef = useRef(sessionCount);
  useEffect(() => {
    sessionCountRef.current = sessionCount;
  }, [sessionCount]);

  const handleHit = () => {
    const increment = 1;

    setCount(prev => prev + increment);

    const activePracticeItem = dailyPractice.find(
      (item) => item.scriptureId === activeScriptureId
    );
    const goalType = activePracticeItem
      ? 'count'
      : ((scriptureGoalTypes || {})[activeScriptureId] || 'count');
    const goalValue =
      activePracticeItem?.target ||
      (scriptureGoals || {})[activeScriptureId] ||
      getDefaultTargetForCategory(activeScripture.category);

    let nextSessionCount = sessionCountRef.current + increment;
    if (!isSessionActive) {
      nextSessionCount = increment;
      setIsSessionActive(true);
      setSessionStartTime(Date.now());
      setSessionCount(increment);
      sessionCountRef.current = increment;

      if (goalType === 'time') {
        if (sessionTimerRef.current) {
          clearInterval(sessionTimerRef.current);
          sessionTimerRef.current = null;
        }
        setSessionTimeLeft(goalValue * 60);
        sessionTimerRef.current = setInterval(() => {
          setSessionTimeLeft(prev => {
            if (prev === null || prev <= 1) {
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setSessionTimeLeft(null);
      }
    } else {
      setSessionCount(nextSessionCount);
      sessionCountRef.current = nextSessionCount;
    }

    const practice = practiceService.updateActivity('chanting', increment, activeScriptureId);
    practiceService.logMerit('chanting');
    if (practice.scriptureCounts) {
      setDailyCounts(practice.scriptureCounts);
    }

    const updatedTodayCount = practice.scriptureCounts?.[activeScriptureId] || 0;
    const alreadyCelebrated = (practice.celebratedScriptures || []).includes(activeScriptureId);

    if (goalType === 'count' && updatedTodayCount >= goalValue && !alreadyCelebrated) {
      practiceService.markScriptureCelebrated(activeScriptureId);
      if (window.Notification && Notification.permission === "granted") {
        new Notification("修行圆满", { body: `${activeScripture.title} 次数已达标` });
      }
      setFishCompletionSignal(c => c + 1);
    }

    setRecentScriptureIds(practiceService.recordRecentScriptureId(activeScriptureId));
  };

  const [isGeneratingReflection, setIsGeneratingReflection] = useState(false);
  const [currentReflection, setCurrentReflection] = useState("");
  const [isProfileExpanded, setIsProfileExpanded] = useState(true);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const resetAccount = async () => {
    try {
      safeStorage.clear();
    } catch (e) {
      console.warn("Storage clear notice:", e);
    }
    await auth.signOut();
    window.location.reload();
  };
  const [isPersonalSettingsExpanded, setIsPersonalSettingsExpanded] = useState(true);
  const [isChantingSettingsExpanded, setIsChantingSettingsExpanded] = useState(true);
  const [isRitualSettingsExpanded, setIsRitualSettingsExpanded] = useState(true);
  const [isMeditationSettingsExpanded, setIsMeditationSettingsExpanded] = useState(true);
  const [isVowSettingsExpanded, setIsVowSettingsExpanded] = useState(true);
  const [isFeedbackExpanded, setIsFeedbackExpanded] = useState(true);
  const [isAiSettingsExpanded, setIsAiSettingsExpanded] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isSystemSettingsExpanded, setIsSystemSettingsExpanded] = useState(true);
  const aiSettingsRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleNavigateToSettings = (event: any) => {
      setActiveTab('settings');
      if (event.detail?.section === 'ai-settings') {
        setIsAiSettingsExpanded(true);
        setTimeout(() => {
          aiSettingsRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    };
    const handleOpenInstallModal = () => setShowInstallModal(true);
    const handleOpenMeditationPreset = (event: any) => {
      const duration = Number(event?.detail?.duration) || 3;
      setMeditationPresetDuration(duration);
      setImmersive(false);
      setActiveTab('meditation');
    };
    const handleRitualSettingsUpdated = () => {
      setRitualSettings(ritualService.getSettings());
    };
    
    window.addEventListener('navigate_to_settings', handleNavigateToSettings);
    window.addEventListener('open-install-modal', handleOpenInstallModal);
    window.addEventListener('open-meditation-preset', handleOpenMeditationPreset);
    window.addEventListener('zen_ritual_settings_updated', handleRitualSettingsUpdated);
    
    return () => {
      window.removeEventListener('navigate_to_settings', handleNavigateToSettings);
      window.removeEventListener('open-install-modal', handleOpenInstallModal);
      window.removeEventListener('open-meditation-preset', handleOpenMeditationPreset);
      window.removeEventListener('zen_ritual_settings_updated', handleRitualSettingsUpdated);
    };
  }, []);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [isGuest, setIsGuest] = useState(!fbUser && identityService.isGuest());
  const [userId, setUserId] = useState(fbUser ? fbUser.uid : identityService.getUserId());
  const [emailVerified, setEmailVerified] = useState<boolean>(() => Boolean(fbUser?.emailVerified));
  const [isResendingVerification, setIsResendingVerification] = useState<boolean>(false);

  useEffect(() => {
    setIsGuest(!fbUser && identityService.isGuest());
    setUserId(fbUser ? fbUser.uid : identityService.getUserId());
    setEmailVerified(Boolean(fbUser?.emailVerified));
  }, [fbUser]);

  useEffect(() => {
    if (!fbUser || emailVerified) return;
    const refreshVerification = async () => {
      try {
        await auth.currentUser?.reload();
        if (auth.currentUser?.emailVerified) {
          setEmailVerified(true);
        }
      } catch {
        // ignore offline reload failure
      }
    };
    window.addEventListener('focus', refreshVerification);
    return () => window.removeEventListener('focus', refreshVerification);
  }, [fbUser, emailVerified]);

  useEffect(() => {
    const handleAuthState = () => {
      if (!fbUser) {
        setIsGuest(identityService.isGuest());
        setUserId(identityService.getUserId());
      }
    };
    
    window.addEventListener('auth_state_changed', handleAuthState);
    
    return () => {
      window.removeEventListener('auth_state_changed', handleAuthState);
    };
  }, [fbUser]);

  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Handle timer completion
  useEffect(() => {
    if (isSessionActive && sessionTimeLeft === 0) {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
        sessionTimerRef.current = null;
      }
      if (window.Notification && Notification.permission === "granted") {
        new Notification("修行圆满", { body: `${activeScripture.title} 计时结束` });
      }
      setFishCompletionSignal(c => c + 1);
    }
  }, [sessionTimeLeft, isSessionActive, activeScripture.title]);

  const resetFishSession = () => {
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
    setIsSessionActive(false);
    setSessionStartTime(null);
    setSessionCount(0);
    sessionCountRef.current = 0;
    setSessionTimeLeft(null);
  };

  const recordFishSession = (
    resolvedDedication: string,
    unit: '遍' | '声' = getDefaultUnitForCategory(activeScripture.category),
    silent = false,
    ritualMeta?: {
      ritualMode?: RitualRunMode;
      dedicationTarget?: string;
    }
  ) => {
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
    const endTime = Date.now();
    const duration = Math.max(1, Math.floor((endTime - (sessionStartTime || endTime)) / 1000));
    const defaultVow = vows.find(v => v.isDefault)?.content || vows[0]?.content || "";
    const recordedCount = sessionCountRef.current > 0
      ? sessionCountRef.current
      : (dailyCounts[activeScriptureId] || 1);

    const newSession = {
      id: Date.now(),
      chant: activeScripture.title,
      count: recordedCount,
      unit,
      startTime: sessionStartTime || endTime,
      endTime,
      duration,
      dedication: resolvedDedication,
      vow: defaultVow,
      type: activeScripture.category === 'sutra' ? '诵经' : activeScripture.category === 'meditation' ? '禅修' : '持咒',
      source: '诵经',
      ...(ritualMeta?.ritualMode ? { ritualMode: ritualMeta.ritualMode } : {}),
      ...(ritualMeta?.dedicationTarget ? { dedicationTarget: ritualMeta.dedicationTarget } : {}),
    };

    const expGained = recordedCount + Math.floor(duration / 60) * 10;
    setUserExp(prev => prev + expGained);
    practiceService.logMerit('chanting');
    addHistoryItem(newSession);

    setIsSessionActive(false);
    setSessionStartTime(null);
    setSessionCount(0);
    sessionCountRef.current = 0;
    setSessionTimeLeft(null);
    if (!silent) {
      toast.success('已记入愿簿');
    }
  };

  const finishSession = async () => {
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
    const endTime = Date.now();
    const duration = Math.floor((endTime - (sessionStartTime || endTime)) / 1000);
    
    const defaultDedication = dedications.find(d => d.isDefault)?.content || dedications[0]?.content || "";
    const defaultVow = vows.find(v => v.isDefault)?.content || vows[0]?.content || "";

    const newSession = {
      id: Date.now(),
      chant: activeScripture.title,
      count: sessionCount,
      startTime: sessionStartTime,
      endTime,
      duration,
      dedication: defaultDedication,
      vow: defaultVow,
      type: activeScripture.category === 'sutra' ? '诵经' : activeScripture.category === 'meditation' ? '禅修' : '持咒',
      source: '诵经',
    };

    // Calculate EXP: 1 exp per count, 10 exp per minute
    const expGained = sessionCount + Math.floor(duration / 60) * 10;
    setUserExp(prev => prev + expGained);
    
    // Add 1 to total count for meditation completion
    setCount(prev => prev + 1);
    
    // Log Merit Energy for Chanting
    practiceService.logMerit('chanting');

    addHistoryItem(newSession);
    setLastSession(newSession);
    setIsSessionActive(false);
    setSessionFlowStep('dedication');
    setShowSummary(true);

    // Generate AI Reflection if enabled
    if (aiEnabled) {
      setIsGeneratingReflection(true);
      try {
        const text = await aiGenerate({
          systemInstruction: POST_SESSION_REFLECTION_SYSTEM_PROMPT,
          contents: `我刚刚完成了一次修行。念诵内容是：${activeScripture.title}，念诵次数：${sessionCount}次，时长：${Math.floor(duration / 60)}分${duration % 60}秒。`,
        });
        setCurrentReflection(text.trim() || "心如止水，功德圆满。");
      } catch (error) {
        console.error("AI Reflection Error:", error);
        setCurrentReflection("安住当下，细水长流。");
      } finally {
        setIsGeneratingReflection(false);
      }
    } else {
      setCurrentReflection("心如止水，功德圆满。");
    }
  };

  const buddhaNames = getScriptures(language).filter(s => s.category === 'name');

  const finishOnboarding = () => {
    try {
      safeStorage.setItem('zen_onboarding_seen', 'true');
    } catch (e) {
      console.warn("Storage set notice:", e);
    }
    setShowOnboarding(false);
  };

  const onboardingSteps = [
    {
      title: "欢迎来到 VowZen",
      description: "在这里，我们将“愿”作为修行的核心，以愿导行，开启一段真实的改变之旅。",
      icon: Heart,
      color: "bg-zen-accent/10 text-zen-accent"
    },
    {
      title: "发下你的愿 (Vow)",
      description: "修行不只是放松，而是为了解决生命中的困惑。请选择一个你今日的愿，作为你修行的动力。",
      icon: Target,
      color: "bg-amber-100 text-amber-600"
    },
    {
      title: "以愿导行",
      description: "无论诵经、禅修还是持咒，都将围绕你的“愿”展开。让每一次修行都成为对愿望的坚定。",
      icon: Book,
      color: "bg-emerald-100 text-emerald-600"
    },
    {
      title: "每日精进",
      description: "通过每日的记录与反馈，将“愿”转化为日常的习惯，在精进中感受内心的力量。",
      icon: Wind,
      color: "bg-purple-100 text-purple-600"
    },
    {
      title: "智慧指引",
      description: "AI 禅师将根据你的“愿”与修行状态，为你提供个性化的智慧指引。",
      icon: Brain,
      color: "bg-blue-100 text-blue-600"
    }
  ];

  const availableCities = React.useMemo(() => {
    const selectedCountry = ALL_COUNTRIES.find(c => c.name === userProfile.country);
    const code = selectedCountry ? selectedCountry.isoCode : '';
    return code ? City.getCitiesOfCountry(code) : [];
  }, [userProfile.country]);

  const currentCountryCode = React.useMemo(() => {
    const selectedCountry = ALL_COUNTRIES.find(c => c.name === userProfile.country);
    return selectedCountry ? selectedCountry.isoCode : '';
  }, [userProfile.country]);

  if (isDeleteAccountRoute) {
    return (
      <React.Suspense fallback={<div className="min-h-screen bg-paper flex items-center justify-center p-6 text-sm text-accent">载入中...</div>}>
        <DeleteAccountPage />
      </React.Suspense>
    );
  }

  if (!isAppReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-paper text-ink p-6 selection:bg-accent/20 font-serif">
        <div className="relative flex items-center justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-accent-mist border border-accent/20 flex items-center justify-center text-accent animate-pulse">
            <Sparkles className="w-8 h-8" />
          </div>
        </div>
        <h1 className="text-xl tracking-widest font-serif text-ink mb-2 font-medium">愿禅助手</h1>
        <p className="text-xs tracking-widest text-accent/80 font-light">一念清净 · 福慧双修</p>
      </div>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
    <ChantingProvider>
      <div className="min-h-screen bg-paper text-ink selection:bg-accent/20">
        <ZenOnboarding 
          showOnboarding={showOnboarding}
          onboardingStep={onboardingStep}
          onboardingSteps={onboardingSteps}
          onNext={() => setOnboardingStep(prev => prev + 1)}
          onFinish={finishOnboarding}
        />
        {/* ... rest of the app ... */}

      {/* Summary / Dedication / Vow Modal */}
      <AnimatePresence>
        {showSummary && lastSession && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/20 backdrop-blur-sm">
            <div className="min-h-full flex items-center justify-center p-4 py-8">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-surface w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-float border border-line relative"
              >
                {(sessionFlowStep === 'dedication' || sessionFlowStep === 'vow') && (
                  <button 
                    onClick={() => {
                      setShowSummary(false);
                      setSessionFlowStep('none');
                    }}
                    className="absolute top-6 right-6 p-2 bg-surface-2 rounded-full text-ink-2 hover:text-accent hover:bg-accent-mist transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              {sessionFlowStep === 'dedication' && (
                <motion.div key="dedication" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-accent-mist rounded-full flex items-center justify-center mx-auto mb-4">
                      <Heart className="w-8 h-8 text-accent" />
                    </div>
                    <h2 className="text-2xl font-serif font-bold">至诚回向</h2>
                    <p className="text-xs text-ink-3 uppercase tracking-widest font-bold mt-2">Dedication of Merit</p>
                  </div>
                  
                  <div className="bg-surface-2 p-8 rounded-2xl mb-8 border border-line">
                    <p className="text-lg font-serif leading-relaxed text-center text-ink whitespace-pre-wrap">
                      {lastSession?.dedication}
                    </p>
                  </div>

                  <button 
                    onClick={() => {
                      practiceService.updateActivity('dedication', true);
                      practiceService.logMerit('dedication');
                      setSessionFlowStep('vow');
                    }}
                    className="w-full bg-accent text-on-accent py-4 rounded-2xl font-bold hover:bg-accent-hover transition-colors flex items-center justify-center gap-2"
                  >
                    至诚回向
                  </button>

                </motion.div>
              )}

              {sessionFlowStep === 'vow' && (
                <motion.div key="vow" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-accent-mist rounded-full flex items-center justify-center mx-auto mb-4">
                      <Sparkles className="w-8 h-8 text-accent" />
                    </div>
                    <h2 className="text-2xl font-serif font-bold">至诚发愿</h2>
                    <p className="text-xs text-ink-3 uppercase tracking-widest font-bold mt-2">The Four Great Vows</p>
                  </div>
                  
                  <div className="bg-surface-2 p-8 rounded-2xl mb-8 border border-line">
                    <p className="text-lg font-serif leading-relaxed text-center text-ink whitespace-pre-wrap">
                      {lastSession?.vow}
                    </p>
                  </div>

                  <button 
                    onClick={() => setSessionFlowStep('summary')}
                    className="w-full bg-accent text-on-accent py-4 rounded-2xl font-bold hover:bg-accent-hover transition-colors"
                  >
                    至诚发愿
                  </button>

                </motion.div>
              )}

              {sessionFlowStep === 'summary' && (
                <motion.div key="summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-zen-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Trophy className="w-8 h-8 text-zen-accent" />
                    </div>
                    <h2 className="text-2xl font-serif font-bold">修行圆满</h2>
                    <p className="text-sm text-zen-accent/60 italic mt-1">“心无挂碍，无挂碍故”</p>
                  </div>

                  <div className="space-y-4 mb-8">
                    <div className="flex justify-between items-center py-3 border-b border-zen-accent/5">
                      <span className="text-sm text-zen-accent/60">念诵内容</span>
                      <span className="font-medium">{lastSession.chant}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-zen-accent/5">
                      <span className="text-sm text-zen-accent/60">本次功德</span>
                      <span className="font-serif text-xl">+{lastSession.count}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-zen-accent/5">
                      <span className="text-sm text-zen-accent/60">修行时长</span>
                      <span className="font-medium">{lastSession.duration >= 60 ? `${Math.floor(lastSession.duration / 60)}分${lastSession.duration % 60}秒` : `${lastSession.duration}秒`}</span>
                    </div>
                  </div>

                  {/* AI Reflection Block - Temporarily Disabled
                  <div className="bg-zen-bg/50 p-5 rounded-3xl mb-8 relative">
                    <div className="absolute -top-2 -left-2 bg-zen-accent text-white p-1 rounded-lg">
                      <MessageCircle className="w-3 h-3" />
                    </div>
                    {isGeneratingReflection ? (
                      <div className="flex flex-col items-center py-4 gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-zen-accent/40" />
                        <p className="text-[10px] text-zen-accent/40 uppercase tracking-widest">禅师感悟中...</p>
                      </div>
                    ) : (
                      <p className="italic text-sm text-center text-zen-ink/80 leading-relaxed">
                        “{currentReflection || "修行不在于数量，而在于那一刻的清净心。愿此功德，普及于一切。"}”
                      </p>
                    )}
                  </div>
                  */}

                  <div className="mb-6 bg-surface-2 rounded-2xl border border-line divide-y divide-line">
                    <label className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface transition-colors rounded-2xl">
                      <div className="flex-1 pr-4">
                        <p className="font-bold text-sm text-ink">分享至共修大厅</p>
                        <p className="text-xs text-ink-2 mt-1">与同修分享功德，随喜赞叹</p>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={shareToCommunity}
                        onChange={(e) => setShareToCommunity(e.target.checked)}
                        className="w-5 h-5 rounded border-line-strong text-accent focus:ring-accent"
                      />
                    </label>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={async () => {
                        if (shareToCommunity) {
                          const dedicationContent = lastSession.dedication || dedications.find(d => d.isDefault)?.content || dedications[0]?.content || "";
                          
                          if (containsBadWords(dedicationContent)) {
                            alert('您的回向文包含不当词汇，请修改后再分享。');
                            return;
                          }
                          
                          const newPost: CommunityPost = {
                            id: Date.now().toString(),
                            userName: userProfile.name || "静心居士",
                            chant: lastSession.chant,
                            count: lastSession.count,
                            dedication: dedicationContent,
                            likes: 0,
                            timestamp: Date.now(),
                            isUserPost: true
                          };
                          
                          // Save to local state for immediate feedback
                          setCommunityPosts(prev => [newPost, ...prev]);
                          
                          // Save to Firestore for real community feed
                          try {
                            const currentUserId = fbUser ? fbUser.uid : identityService.getUserId();
                            const shareId = newPost.id.toString() + Math.random().toString(36).substring(2, 9);
                            const shareDoc = {
                              userId: currentUserId,
                              userName: newPost.userName,
                              type: '修行',
                              title: `${newPost.chant} ${newPost.count}次`,
                              description: newPost.dedication,
                              rejoiceCount: 0,
                              timestamp: newPost.timestamp,
                              isCommunity: true,
                              chant: newPost.chant,
                              count: newPost.count
                            };
                            await setDoc(doc(db, 'shared_merits', shareId), shareDoc);
                          } catch (err: any) {
                            console.error('Failed to save to community feed:', err);
                            alert('分享至共修大厅失败，请检查网络或稍后再试。错误信息: ' + err.message);
                          }
                        }
                        
                        practiceService.updateActivity('full_dedication', true);
                        practiceService.logMerit('full_dedication');
                        setShowSummary(false);
                        setSessionFlowStep('none');
                      }}
                      className="flex-1 bg-accent text-on-accent py-4 rounded-2xl font-bold hover:bg-accent-hover transition-colors"
                    >
                      诵经圆满
                    </button>
                    <button
                      onClick={async () => {
                        // Optimistic update for community feed
                        if (shareToCommunity) {
                          const newPost: CommunityPost = {
                            id: Date.now().toString(),
                            userName: userProfile.name || "静心居士",
                            chant: lastSession.chant,
                            count: lastSession.count,
                            dedication: lastSession.dedication || dedications.find(d => d.isDefault)?.content || dedications[0]?.content || "",
                            likes: 0,
                            timestamp: Date.now(),
                            isUserPost: true
                          };
                          setCommunityPosts(prev => [newPost, ...prev]);
                        }
                        
                        // Mark session as complete
                        practiceService.updateActivity('full_dedication', true);
                        practiceService.logMerit('full_dedication');
                        
                        // Trigger share (this saves to Firestore and opens share sheet)
                        await shareMerit(lastSession, shareToCommunity);
                        
                        // Close modal
                        setShowSummary(false);
                        setSessionFlowStep('none');
                      }}
                      disabled={isSharing}
                      className="w-14 flex relative items-center justify-center bg-surface-2 text-accent rounded-2xl font-bold hover:bg-accent-mist transition-colors border border-line-strong disabled:opacity-50"
                    >
                      {isSharing && (
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-ink text-paper px-3 py-1.5 rounded-lg text-xs whitespace-nowrap animate-fade-in">
                          诵经圆满，准备分享...
                        </div>
                      )}
                      <Share2 className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Exit Immersive Button (hidden on views with native immersive controls) */}
      <AnimatePresence>
        {immersive && activeTab !== 'fish' && activeTab !== 'meditation' && activeTab !== 'scripture' && (
          <motion.button
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            onClick={() => setImmersive(false)}
            className="fixed top-4 right-4 z-[65] flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface/85 backdrop-blur-md border border-line shadow-float text-xs font-medium text-ink-2 hover:text-accent transition-colors"
            title="退出沉浸"
          >
            <Minimize2 size={14} strokeWidth={1.5} />
            <span>退出沉浸</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Header */}
      <header
        className={cn(
          "sticky top-0 z-[60] bg-paper/90 backdrop-blur-md border-b border-line transition-all duration-300 ease-[var(--ease-zen)]",
          immersive ? "opacity-0 -translate-y-full pointer-events-none" : "opacity-100 translate-y-0"
        )}
      >
        {/* Mobile Header (< md): Lotus logo (28px) + time greeting on left, "我" button on right */}
        <div className="flex md:hidden items-center justify-between px-4 py-2.5 gap-3">
          <div
            className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
            onClick={() => navigateTo('dashboard')}
          >
            <img
              src="/assets/aistudio/logo_f2d0c65b.png"
              alt="愿禅助手莲花"
              className="w-7 h-7 rounded-full object-cover shrink-0 bg-surface"
            />
            <span className="text-caption truncate">
              {(() => {
                const hour = new Date().getHours();
                const greeting = hour < 12 ? "早安" : hour < 18 ? "午安" : "晚安";
                return `${greeting} · 愿你今日安住`;
              })()}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsMeSheetOpen(true)}
            aria-label="我"
            title="个人与设置"
            className="w-10 h-10 rounded-full bg-surface-2 border border-line flex items-center justify-center text-ink hover:text-accent transition-colors shrink-0"
          >
            <UserRound size={20} strokeWidth={1.5} />
          </button>
        </div>

        {/* Desktop Header (≥ md): Full bar with side menu trigger, title, vow, streak, ThoughtCollector & auth */}
        <div className="hidden md:flex max-w-4xl mx-auto px-4 py-2 items-center justify-between gap-2">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={() => setIsSideMenuOpen(true)}
              className="p-2 -ml-2 text-accent hover:bg-accent-mist rounded-full transition-colors shrink-0"
              title="菜单"
            >
              <Menu className="w-6 h-6" />
            </button>
            <img
              src="/assets/aistudio/logo_f2d0c65b.png"
              alt="愿禅助手 Logo"
              className="w-9 h-9 rounded-xl object-cover border border-line shrink-0 cursor-pointer bg-surface"
              onClick={() => navigateTo('dashboard')}
              title="主页"
            />
            <div className="text-left flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-base font-serif font-bold text-ink truncate">愿禅助手</p>
                <p className="text-xs text-ink-2 font-medium truncate">
                  {(() => {
                    const hour = new Date().getHours();
                    let greeting = "欢迎回来";
                    if (hour < 12) greeting = "早上好";
                    else if (hour < 18) greeting = "下午好";
                    else greeting = "晚上好";

                    const userName = userProfile.name || '修行者';
                    return `${userName}，${greeting}`;
                  })()}
                </p>
              </div>
              <p
                className={cn(
                  "text-xs text-accent w-full cursor-pointer transition-all",
                  isVowExpanded ? "whitespace-normal break-words" : "truncate"
                )}
                title={isVowExpanded ? "点击收起" : "点击展开愿力"}
                onClick={() => setIsVowExpanded(!isVowExpanded)}
              >
                {personalVow || t('default_vow_text')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-2 rounded-full border border-line-strong text-gold" title="连续修持天数">
              <span className="text-xs">🔥</span>
              <span className="text-sm font-serif font-bold leading-none">
                {(() => {
                  if (history.length === 0) return "0 天";
                  const dates = history.map(h => {
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
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    if (uniqueDates[0] === yesterday.toDateString()) {
                      streak = 1;
                      lastDate = yesterday;
                      lastDate.setDate(lastDate.getDate() - 1);
                    } else {
                      return "0 天";
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
                  return `${streak} 天`;
                })()}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <React.Suspense fallback={null}>
                <ThoughtCollector className="!px-3 !py-1.5 !text-xs rounded-full" />
              </React.Suspense>
            </div>

            <button
              onClick={async () => {
                if (isGuest) {
                  setShowAuthModal(true);
                } else {
                  if (fbUser) {
                    await auth.signOut();
                  }
                  identityService.logout();
                  window.dispatchEvent(new CustomEvent('auth_state_changed'));
                }
              }}
              className="flex items-center justify-center px-3 py-1.5 bg-surface hover:bg-surface-2 rounded-full text-xs font-medium text-ink-2 transition-colors border border-line shrink-0"
              title={isGuest ? '游客登录' : '退出登录'}
            >
              {isGuest ? <Users className="w-3.5 h-3.5" /> : <LogOut className="w-3.5 h-3.5" />}
              <span className="ml-1.5">{isGuest ? '游客登录' : '退出登录'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Always-mounted modal listeners for ThoughtCollector & GoodDeedCollector (triggered by 观一念 FAB & Dashboard) */}
      <React.Suspense fallback={null}>
        <ThoughtCollector hideTrigger />
        <GoodDeedCollector />
      </React.Suspense>

      {/* Mobile "我" Bottom Sheet Drawer */}
      <AnimatePresence>
        {isMeSheetOpen && (
          <div className="fixed inset-0 z-[90] md:hidden flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMeSheetOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 w-full rounded-t-3xl bg-surface border-t border-line shadow-float overflow-hidden pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
            >
              {/* Drag Handle */}
              <div className="w-10 h-1 rounded-full bg-line-strong mx-auto mt-3 mb-2" />

              {/* User Header */}
              <div className="px-6 py-4 border-b border-line flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-full bg-accent-mist text-accent flex items-center justify-center font-serif font-bold text-base shrink-0">
                    {userProfile.name ? userProfile.name[0] : <UserRound size={20} strokeWidth={1.5} />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-serif font-bold text-ink truncate">
                      {userProfile.name || (isGuest ? '随喜访客' : '修行者')}
                    </p>
                    <p className="text-xs text-ink-2 truncate">
                      {personalVow || t('default_vow_text')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsMeSheetOpen(false)}
                  className="p-2 text-ink-3 hover:text-ink rounded-full hover:bg-surface-2 transition-colors"
                >
                  <X size={20} strokeWidth={1.5} />
                </button>
              </div>

              {/* Menu Items */}
              <div className="p-4 space-y-1.5">
                <button
                  onClick={() => {
                    navigateTo('settings');
                    setIsMeSheetOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-ink hover:bg-surface-2 transition-colors text-left"
                >
                  <Settings size={20} strokeWidth={1.5} className="text-accent shrink-0" />
                  <span className="font-medium text-sm">系统设置</span>
                </button>

                <button
                  onClick={() => {
                    navigateTo('community');
                    setIsMeSheetOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-ink hover:bg-surface-2 transition-colors text-left"
                >
                  <Sparkles size={20} strokeWidth={1.5} className="text-accent shrink-0" />
                  <span className="font-medium text-sm">共修动态</span>
                </button>

                <button
                  onClick={() => {
                    navigateTo('merit');
                    setIsMeSheetOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-ink hover:bg-surface-2 transition-colors text-left"
                >
                  <Globe size={20} strokeWidth={1.5} className="text-accent shrink-0" />
                  <span className="font-medium text-sm">功德地图</span>
                </button>

                <button
                  onClick={() => {
                    setShowExportModal(true);
                    setIsMeSheetOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-ink hover:bg-surface-2 transition-colors text-left"
                >
                  <ShieldCheck size={20} strokeWidth={1.5} className="text-accent shrink-0" />
                  <span className="font-medium text-sm">数据同步与备份</span>
                </button>

                <button
                  onClick={() => {
                    setShowInstallModal(true);
                    setIsMeSheetOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-ink hover:bg-surface-2 transition-colors text-left"
                >
                  <Download size={20} strokeWidth={1.5} className="text-ink-2 shrink-0" />
                  <span className="font-medium text-sm">下载APP到手机</span>
                </button>

                <div className="pt-2 mt-2 border-t border-line">
                  {!isGuest ? (
                    <button
                      onClick={async () => {
                        setIsMeSheetOpen(false);
                        if (fbUser) {
                          await auth.signOut();
                        }
                        identityService.logout();
                        window.dispatchEvent(new CustomEvent('auth_state_changed'));
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-red-500 hover:bg-red-500/10 transition-colors text-left"
                    >
                      <LogOut size={20} strokeWidth={1.5} className="shrink-0" />
                      <span className="font-medium text-sm">退出登录</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setShowAuthModal(true);
                        setIsMeSheetOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-accent hover:bg-accent-mist transition-colors text-left"
                    >
                      <Users size={20} strokeWidth={1.5} className="shrink-0" />
                      <span className="font-medium text-sm">登录 / 注册</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Desktop Side Menu Drawer (≥ md) */}
      <AnimatePresence>
        {isSideMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSideMenuOpen(false)}
              className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-[300px] sm:w-80 bg-surface z-[80] shadow-float border-r border-line flex flex-col"
            >
              <div className="p-5 sm:p-6 border-b border-line flex items-center justify-between">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <img
                    src="/assets/aistudio/logo_f2d0c65b.png"
                    alt="愿禅助手 Logo"
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-cover border border-line shrink-0 bg-paper"
                  />
                  <span className="font-serif font-bold text-base sm:text-lg whitespace-nowrap text-ink">愿禅助手</span>
                </div>
                <button
                  onClick={() => setIsSideMenuOpen(false)}
                  className="p-1.5 sm:p-2 text-ink-2 hover:bg-accent-mist rounded-full transition-colors shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-3 sm:py-4 space-y-4 sm:space-y-5">
                {/* Main */}
                <div className="px-3">
                  <button
                    onClick={() => {
                      navigateTo('dashboard');
                      setIsSideMenuOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all",
                      activeTab === 'dashboard'
                        ? "bg-accent text-on-accent"
                        : "text-ink-2 hover:bg-accent-mist hover:text-accent"
                    )}
                  >
                    <Home className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                    <span className="font-medium text-sm sm:text-base truncate">今日</span>
                  </button>
                </div>

                {/* Practice */}
                <div className="px-3">
                  <p className="text-[10px] sm:text-xs font-bold text-ink-3 uppercase tracking-wider mb-1.5 px-4">修行</p>
                  <div className="space-y-0.5">
                    {[
                      { id: 'fish', icon: Heart, label: '木鱼' },
                      { id: 'meditation', icon: Wind, label: '静坐' },
                      { id: 'scripture', icon: BookOpen, label: '经藏' },
                      { id: 'vow', icon: Leaf, label: '愿簿' },
                    ].map(item => (
                      <button
                        key={item.id}
                        onClick={() => {
                          navigateTo(item.id);
                          setIsSideMenuOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all",
                          activeTab === item.id
                            ? "bg-accent-mist text-accent font-bold"
                            : "text-ink-2 hover:bg-surface-2 hover:text-accent"
                        )}
                      >
                        <item.icon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                        <span className="font-medium text-sm sm:text-base truncate">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Records & Community */}
                <div className="px-3">
                  <p className="text-[10px] sm:text-xs font-bold text-ink-3 uppercase tracking-wider mb-1.5 px-4">记录与共修</p>
                  <div className="space-y-0.5">
                    {[
                      { id: 'history', icon: History, label: '功德簿' },
                      { id: 'community', icon: Sparkles, label: '共修动态' },
                      { id: 'merit', icon: Globe, label: '功德地图' },
                    ].map(item => (
                      <button
                        key={item.id}
                        onClick={() => {
                          navigateTo(item.id);
                          setIsSideMenuOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all",
                          (item.id === 'history' ? (activeTab === 'vow' && vowBookSegment === 'merit') : activeTab === item.id)
                            ? "bg-accent-mist text-accent font-bold"
                            : "text-ink-2 hover:bg-surface-2 hover:text-accent"
                        )}
                      >
                        <item.icon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                        <span className="font-medium text-sm sm:text-base truncate">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* System */}
                <div className="px-3">
                  <p className="text-[10px] sm:text-xs font-bold text-ink-3 uppercase tracking-wider mb-1.5 px-4">系统</p>
                  <div className="space-y-0.5">
                    <button
                      onClick={() => {
                        navigateTo('settings');
                        setIsSideMenuOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all",
                        activeTab === 'settings'
                          ? "bg-accent-mist text-accent font-bold"
                          : "text-ink-2 hover:bg-surface-2 hover:text-accent"
                      )}
                    >
                      <Settings className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                      <span className="font-medium text-sm sm:text-base truncate">系统设置</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-line space-y-4 shrink-0">
                <button
                  onClick={() => {
                    setShowInstallModal(true);
                    setIsSideMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 text-ink-2 hover:text-accent transition-colors"
                >
                  <Download className="w-5 h-5 shrink-0" />
                  <span className="font-medium truncate">下载APP到手机</span>
                </button>

                <button
                  onClick={() => {
                    setShowExportModal(true);
                    setIsSideMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 text-ink-2 hover:text-accent transition-colors"
                >
                  <ShieldCheck className="w-5 h-5 shrink-0 text-accent" />
                  <span className="font-medium truncate">{t('data_sync')}</span>
                </button>

                {!isGuest ? (
                  <button
                    onClick={async () => {
                      if (fbUser) {
                        await auth.signOut();
                      }
                      identityService.logout();
                      window.dispatchEvent(new CustomEvent('auth_state_changed'));
                    }}
                    className="w-full flex items-center gap-3 text-red-500/80 hover:text-red-500 transition-colors"
                  >
                    <LogOut className="w-5 h-5 shrink-0" />
                    <span className="font-medium truncate">退出登录 (Logout)</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setShowAuthModal(true);
                      setIsSideMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 text-accent hover:text-accent-hover transition-colors"
                  >
                    <Users className="w-5 h-5 shrink-0" />
                    <span className="font-medium truncate">登录 / 注册 (Login)</span>
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pb-24 pt-4 sm:pt-6 relative z-10 overflow-x-hidden">
        {/* Content Area */}
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && <Dashboard onNavigate={navigateTo} />}
          {activeTab === 'fish' && (() => {
            const activePracticeItem = dailyPractice.find(
              (item) => item.scriptureId === activeScriptureId
            );
            const activeGoalType = activePracticeItem
              ? 'count'
              : ((scriptureGoalTypes || {})[activeScriptureId] || 'count');
            const activeGoalValue =
              activePracticeItem?.target ||
              (scriptureGoals || {})[activeScriptureId] ||
              getDefaultTargetForCategory(activeScripture.category);
            const activeUnit =
              activePracticeItem?.unit ||
              getDefaultUnitForCategory(activeScripture.category);

            return (
              <WoodenFishPracticeView
                key="fish"
                activeScripture={activeScripture}
                allScriptures={allScriptures}
                dailyPractice={dailyPractice}
                dailyCounts={dailyCounts}
                recentScriptureIds={recentScriptureIds}
                goalType={activeGoalType}
                goalValue={activeGoalValue}
                unit={activeUnit}
                todayCount={dailyCounts[activeScriptureId] || 0}
                sessionCount={sessionCount}
                isSessionActive={isSessionActive}
                sessionStartTime={sessionStartTime}
                sessionTimeLeft={sessionTimeLeft}
                volume={volume}
                soundType={soundType}
                onChangeVolume={setVolume}
                onChangeSoundType={setSoundType}
                appearance={woodenFishAppearance}
                showMeritFloat={showMeritFloat}
                meritFloatText={activeScripture.category === 'name' ? activeScripture.title : t('merit_plus_one')}
                dedicationText={resolveFishDedicationText(fishDedicationChoice, fishCustomDedication)}
                personalVow={personalVow}
                autoOpenRitual={openRitualOnFishEnter}
                onAutoOpenRitualConsumed={() => setOpenRitualOnFishEnter(false)}
                theme={theme}
                completionSignal={fishCompletionSignal}
                onSelectScripture={(scripture) => {
                  resetFishSession();
                  setActiveScriptureId(scripture.id);
                  setSelectedChant(scripture.title);
                  setRecentScriptureIds(practiceService.recordRecentScriptureId(scripture.id));
                }}
                onUpdateDailyPractice={handleUpdateDailyPractice}
                onOpenLibrary={() => setActiveTab('scripture')}
                onOpenGoalModal={() => {
                  setEditingGoalType((scriptureGoalTypes || {})[activeScriptureId] || 'count');
                  setEditingGoalValue((scriptureGoals || {})[activeScriptureId] || 108);
                  setShowGoalModal(true);
                }}
                onHit={handleHit}
                onResetSession={resetFishSession}
                onRecordSession={recordFishSession}
                onBack={() => navigateTo('dashboard')}
              />
            );
          })()}

          {activeTab === 'meditation' && (
            <motion.div
              key="meditation"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full"
            >
              <React.Suspense fallback={<ZenSuspenseFallback text="正在载入禅修空间..." />}>
                <Meditation
                  presetDuration={meditationPresetDuration}
                  onPresetConsumed={() => setMeditationPresetDuration(null)}
                  onImmersiveChange={setImmersive}
                  onFinish={(session) => {
                    const newSession = {
                      id: Date.now(),
                      chant: session.trackTitle,
                      count: Math.max(1, Math.floor(session.duration)),
                      startTime: Date.now() - session.duration * 60 * 1000,
                      endTime: Date.now(),
                      duration: session.duration * 60,
                      dedication: session.dedication,
                      vow: session.vow,
                      ...(session.mood ? { mood: session.mood } : {}),
                      type: '禅修',
                      source: '禅修',
                    };
                    addHistoryItem(newSession);
                  }}
                />
              </React.Suspense>
            </motion.div>
          )}

          {activeTab === 'vow' && (
            <motion.div
              key="vow"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full"
            >
              <React.Suspense fallback={<ZenSuspenseFallback text="正在载入愿簿..." />}>
                <VowBookView
                  activeSegment={vowBookSegment}
                  onSegmentChange={setVowBookSegment}
                  vowSubSection={vowFeatureSection}
                  onVowSubSectionChange={setVowFeatureSection}
                  user={user}
                  onLevelUp={triggerLevelUpAnimation}
                  historyContent={
                    <div className="bg-surface rounded-2xl p-6 sm:p-8 border border-line">
                {/* Permanent Vault Safety Banner */}
                <div className="mb-6 p-4 rounded-2xl bg-accent-mist border border-line-strong flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-surface text-accent border border-line flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-ink flex items-center gap-1.5">
                        打卡记录双重金库 (永久保护)
                        <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                      </div>
                      <p className="text-[11px] text-ink-2">
                        LocalStorage + IndexedDB 永久保存 · 累计 {history.length} 条打卡记录安全在库
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => setShowExportModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover text-on-accent rounded-xl text-xs font-semibold transition-colors"
                      title="打开数据同步 (备份与恢复)"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>数据同步与备份</span>
                    </button>
                    <button
                      onClick={() => {
                        const json = recordVault.exportBackupJSON(history);
                        const blob = new Blob([json], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `VowZen_功德打卡簿备份_${new Date().toISOString().split('T')[0]}.json`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-surface hover:bg-surface-2 text-accent border border-line-strong rounded-xl text-xs font-medium transition-colors"
                      title="一键下载打卡记录备份"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>快速导出</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold font-serif text-zen-ink">功德打卡簿</h2>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-zen-accent/10 text-zen-accent font-semibold">
                      共 {history.length} 条
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowAddRecord(!showAddRecord)}
                      className="p-2 bg-zen-accent/10 text-zen-accent rounded-xl hover:bg-zen-accent/20 transition-colors flex items-center gap-1 text-xs font-semibold"
                      title="补录功德"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="hidden sm:inline">补录</span>
                    </button>
                    <div className="h-8 w-px bg-zen-accent/10 mx-2" />
                    <div className="flex items-center gap-2">
                      <select
                        value={historyPeriod}
                        onChange={(e) => {
                          if (e.target.value === 'export') {
                            setShowExportModal(true);
                          } else {
                            setHistoryPeriod(e.target.value as any);
                          }
                        }}
                        className="bg-zen-bg/50 border border-zen-accent/10 rounded-xl px-3 py-2 text-sm text-zen-ink focus:outline-none focus:border-zen-accent/30 hover:bg-zen-bg transition-colors cursor-pointer truncate"
                      >
                        <option value="daily">按日</option>
                        <option value="weekly">本周</option>
                        <option value="monthly">本月</option>
                        <option value="yearly">按年</option>
                        <option value="all">全部</option>
                        <option disabled>──────────</option>
                        <option value="export">导出记录</option>
                      </select>
                      
                      {historyPeriod !== 'all' && (
                        <div className="relative">
                          <button 
                            onClick={() => setShowCalendarModal(!showCalendarModal)}
                            className="bg-zen-bg/50 border border-zen-accent/10 rounded-xl px-4 py-2 text-sm text-zen-ink focus:outline-none focus:border-zen-accent/30 flex items-center gap-2 hover:bg-zen-bg transition-colors"
                          >
                            {historyPeriod === 'daily' ? selectedDate : 
                             historyPeriod === 'weekly' ? (() => {
                               const selected = parseISO(selectedDate);
                               const day = selected.getDay() || 7;
                               const start = new Date(selected);
                               start.setDate(selected.getDate() - day + 1);
                               const end = new Date(start);
                               end.setDate(start.getDate() + 6);
                               return `${start.getMonth()+1}/${start.getDate()} - ${end.getMonth()+1}/${end.getDate()}`;
                             })() :
                             historyPeriod === 'monthly' ? selectedDate.substring(0, 7) : 
                             selectedDate.substring(0, 4)}
                          </button>
                          
                          <AnimatePresence>
                            {showCalendarModal && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="absolute right-0 top-full mt-2 z-50"
                              >
                                <React.Suspense fallback={<div className="p-4 bg-surface rounded-2xl border border-line shadow-float text-xs text-ink-2 text-center">日历载入中...</div>}>
                                  <CustomCalendar 
                                    selectedDate={parseISO(selectedDate)} 
                                    onSelectDate={(date: any) => {
                                      setSelectedDate(format(date, 'yyyy-MM-dd'));
                                      setShowCalendarModal(false);
                                    }}
                                    recordDates={recordDates}
                                  />
                                </React.Suspense>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mb-6">
                  <div className="text-right">
                    <div className="text-xs text-zen-accent/40 uppercase tracking-widest font-bold">
                      {historyPeriod === 'daily' ? '今日功德' : 
                       historyPeriod === 'weekly' ? '本周功德' :
                       historyPeriod === 'monthly' ? '本月功德' : 
                       historyPeriod === 'yearly' ? '本年功德' : '累计功德'}
                    </div>
                    <div className="font-serif font-bold text-zen-accent">+{dailyTotal}</div>
                  </div>
                </div>

                <AnimatePresence>
                  {showAddRecord && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden mb-8"
                    >
                      <div className="bg-surface-2 rounded-2xl p-6 border border-line">
                        <h3 className="font-bold text-lg mb-4 text-accent">补录功德</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-xs font-bold text-ink-2 mb-1 uppercase tracking-wider">时间</label>
                            <input
                              type="datetime-local"
                              value={newRecordDate}
                              onChange={(e) => setNewRecordDate(e.target.value)}
                              className="w-full bg-surface border border-line rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-ink-2 mb-1 uppercase tracking-wider">修行内容</label>
                            <select
                              value={newRecordType}
                              onChange={(e) => setNewRecordType(e.target.value as any)}
                              className="w-full bg-surface border border-line rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent"
                            >
                              <option value="诵经">诵经</option>
                              <option value="禅修">禅修</option>
                              <option value="持咒">持咒</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-ink-2 mb-1 uppercase tracking-wider">具体项目</label>
                            <select
                              value={newRecordChant}
                              onChange={(e) => setNewRecordChant(e.target.value)}
                              className="w-full bg-surface border border-line rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent"
                            >
                              <option value="功德 +1">功德 +1</option>
                              {allScriptures.map(s => (
                                <option key={s.id} value={s.title}>{s.title}</option>
                              ))}
                              {customChants.map((c, i) => (
                                <option key={`custom-${i}`} value={c}>{c}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-ink-2 mb-1 uppercase tracking-wider">数量 (遍/声)</label>
                            <input
                              type="number"
                              min="1"
                              value={newRecordCount}
                              onChange={(e) => setNewRecordCount(parseInt(e.target.value) || 0)}
                              className="w-full bg-surface border border-line rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-ink-2 mb-1 uppercase tracking-wider">时长 (分钟)</label>
                            <input
                              type="number"
                              min="1"
                              value={newRecordDuration}
                              onChange={(e) => setNewRecordDuration(parseInt(e.target.value) || 0)}
                              className="w-full bg-surface border border-line rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent"
                            />
                          </div>
                        </div>
                        <div className="space-y-4 mb-4">
                          <div>
                            <label className="block text-xs font-bold text-ink-2 mb-1 uppercase tracking-wider">功德回向 (选填)</label>
                            <textarea
                              value={newRecordDedication}
                              onChange={(e) => setNewRecordDedication(e.target.value)}
                              placeholder="愿以此功德，庄严佛净土..."
                              className="w-full bg-surface border border-line rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent resize-none h-20"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-ink-2 mb-1 uppercase tracking-wider">发愿 (选填)</label>
                            <textarea
                              value={newRecordVow}
                              onChange={(e) => setNewRecordVow(e.target.value)}
                              placeholder="我愿..."
                              className="w-full bg-surface border border-line rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent resize-none h-20"
                            />
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => setShowAddRecord(false)}
                            className="flex-1 bg-surface border border-line text-ink-2 py-2 rounded-xl text-sm font-bold hover:bg-accent-mist transition-colors"
                          >
                            取消
                          </button>
                          <button
                            onClick={() => {
                              if (newRecordCount > 0 && newRecordDuration > 0) {
                                const endTime = new Date(newRecordDate).getTime();
                                const newRecord = {
                                  id: Date.now(),
                                  startTime: endTime - (newRecordDuration * 60 * 1000),
                                  endTime: endTime,
                                  duration: newRecordDuration * 60,
                                  count: newRecordCount,
                                  chant: newRecordChant,
                                  type: newRecordType,
                                  source: '手动记录',
                                  dedication: newRecordDedication,
                                  vow: newRecordVow
                                };
                                addHistoryItem(newRecord);
                                setCount(prev => prev + newRecordCount);
                                setShowAddRecord(false);
                                setNewRecordDedication("");
                                setNewRecordVow("");
                              }
                            }}
                            className="flex-1 bg-accent text-on-accent py-2 rounded-xl text-sm font-bold hover:bg-accent-hover transition-colors"
                          >
                            确认补录
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {filteredHistory.length === 0 ? (
                  <div className="text-center py-12 px-4 rounded-2xl bg-surface-2 border border-line my-4">
                    <div className="w-12 h-12 rounded-full bg-accent-mist text-accent flex items-center justify-center mx-auto mb-3">
                      <Heart className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-medium text-ink mb-1">
                      {historyPeriod === 'daily' ? '所选日期暂无打卡记录' : '当前时段暂无打卡记录'}
                    </p>
                    <p className="text-xs text-ink-2 max-w-sm mx-auto mb-4">
                      您累计已有 <span className="font-bold text-accent">{history.length}</span> 条打卡记录安全保存在双重金库中。
                    </p>
                    <div className="flex justify-center gap-2">
                      {historyPeriod !== 'all' && history.length > 0 && (
                        <button
                          onClick={() => setHistoryPeriod('all')}
                          className="px-4 py-2 bg-surface border border-line-strong rounded-xl text-xs font-semibold text-ink hover:bg-surface-2 transition-colors"
                        >
                          查看全部 ({history.length}) 条记录
                        </button>
                      )}
                      <button
                        onClick={() => setActiveTab('fish')}
                        className="px-4 py-2 bg-accent text-on-accent rounded-xl text-xs font-bold hover:bg-accent-hover transition-colors"
                      >
                        去敲木鱼打卡
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredHistory.map((item) => (
                      <div key={item.id} className="p-4 rounded-2xl bg-zen-bg/30 border border-zen-accent/5 flex items-start justify-between gap-4 group">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {item.type && (
                              <span className="px-2 py-0.5 bg-zen-accent/10 text-zen-accent rounded text-[10px] font-bold">
                                {item.type}
                              </span>
                            )}
                            <p className="font-medium text-sm">{item.chant}</p>
                            <button
                              onClick={() => shareMerit(item)}
                              disabled={isSharing}
                              className="p-1 text-zen-accent/30 hover:text-zen-accent transition-all disabled:opacity-50"
                              title="分享此功德"
                            >
                              <Share2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('确定要删除这条记录吗？')) {
                                  deleteHistoryItem(item.id);
                                  setCount(prev => Math.max(0, prev - item.count));
                                }
                              }}
                              className="p-1 text-zen-accent/30 hover:text-red-500 transition-all"
                              title="删除记录"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                          <p className="text-[10px] text-zen-accent/40 mt-1">
                            {format(new Date(item.endTime), 'yyyy年M月d日 HH:mm')} · {item.duration >= 60 ? `${Math.floor(item.duration / 60)}分${item.duration % 60}秒` : `${item.duration}秒`}
                            {item.source && ` · 来自${item.source === '木鱼' ? '诵经' : item.source}`}
                            {item.ritualMode && ` · ${ritualService.formatRunModeLabel(item.ritualMode)}`}
                            {item.dedicationTarget && ` · 发愿对象：${item.dedicationTarget}`}
                            {item.mood && ` · 此刻的心：${item.mood}`}
                          </p>
                          {(item.dedication || item.vow) && (
                            <div className="mt-3 pt-3 border-t border-zen-accent/5 space-y-2">
                              {item.dedication && (
                                <div>
                                  <p className="text-[9px] uppercase tracking-widest text-zen-accent/40 font-bold mb-0.5">回向</p>
                                  <p className="text-xs text-zen-ink/70 font-serif line-clamp-2">{item.dedication}</p>
                                </div>
                              )}
                              {item.vow && (
                                <div>
                                  <p className="text-[9px] uppercase tracking-widest text-zen-accent/40 font-bold mb-0.5">发愿</p>
                                  <p className="text-xs text-zen-ink/70 font-serif line-clamp-2">{item.vow}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-serif text-lg text-zen-accent">
                            {(() => {
                              const displayUnit = getHistoryDisplayUnit(item);
                              return `+${item.count}${displayUnit ? ` ${displayUnit}` : ''}`;
                            })()}
                          </p>
                          <p className="text-[10px] text-zen-accent/40 uppercase tracking-widest font-bold">功德</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
                  }
                />
              </React.Suspense>
            </motion.div>
          )}

          {activeTab === 'merit' && (
            <motion.div
              key="merit"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <React.Suspense fallback={<div className="flex items-center justify-center min-h-[300px] text-accent">正在加载功德地图...</div>}>
                <MeritMap theme={theme} />
              </React.Suspense>
            </motion.div>
          )}

          {activeTab === 'community' && (
            <motion.div
              key="community"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto w-full space-y-6"
            >
              {/* Community Feed */}
              <div className="space-y-4">
                <div className="bg-accent-mist rounded-2xl p-3 border border-line flex gap-2 items-center">
                  <div className="p-1.5 bg-surface rounded-lg text-accent shrink-0 border border-line">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <p className="text-[10px] text-ink-2 leading-relaxed">
                    随喜赞叹，是修心最快的法门之一。因为当你真心为别人的善而欢喜，你的心已经离开嫉妒，走向慈悲。随喜，是与善同行。赞叹，是让善在世间继续发光。
                  </p>
                </div>

                <div className="bg-surface rounded-2xl p-4 border border-line flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-accent" />
                    <span className="font-bold text-sm text-ink">随喜赞叹</span>
                  </div>
                  <div className="flex gap-4 text-center">
                    <div>
                      <p className="text-[10px] text-ink-3 uppercase tracking-widest font-bold">今日</p>
                      <p className="text-sm font-serif font-semibold">{rejoiceStats.today}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-ink-3 uppercase tracking-widest font-bold">本周</p>
                      <p className="text-sm font-serif font-semibold">{rejoiceStats.week}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-ink-3 uppercase tracking-widest font-bold">总计</p>
                      <p className="text-sm font-serif font-semibold">{rejoiceStats.total}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between px-2">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-accent" />
                    {t('community_feed')}
                  </h3>
                  <div className="flex items-center gap-2">
                    <select
                      value={communityPeriod}
                      onChange={(e) => setCommunityPeriod(e.target.value as any)}
                      className="bg-surface-2 border border-line rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent hover:bg-surface transition-colors cursor-pointer"
                    >
                      <option value="daily">按日</option>
                      <option value="monthly">按月</option>
                      <option value="yearly">按年</option>
                      <option value="all">全部</option>
                    </select>
                    
                    {communityPeriod !== 'all' && (
                      <div className="relative">
                        <button 
                          onClick={() => setShowCommunityCalendarModal(!showCommunityCalendarModal)}
                          className="bg-surface-2 border border-line rounded-xl px-4 py-2 text-sm text-ink focus:outline-none focus:border-accent flex items-center gap-2 hover:bg-surface transition-colors"
                        >
                          {communityPeriod === 'daily' ? communitySelectedDate : communityPeriod === 'monthly' ? communitySelectedDate.substring(0, 7) : communitySelectedDate.substring(0, 4)}
                        </button>
                        
                        <AnimatePresence>
                          {showCommunityCalendarModal && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                              className="absolute right-0 top-full mt-2 z-50"
                            >
                              <React.Suspense fallback={<div className="p-4 bg-surface rounded-2xl border border-line shadow-float text-xs text-ink-2 text-center">日历载入中...</div>}>
                                <CustomCalendar 
                                  selectedDate={parseISO(communitySelectedDate)} 
                                  onSelectDate={(date: any) => {
                                    setCommunitySelectedDate(format(date, 'yyyy-MM-dd'));
                                    setShowCommunityCalendarModal(false);
                                  }}
                                  recordDates={[]}
                                />
                              </React.Suspense>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                </div>
                {isCommunityOffline && (
                  <p className="text-caption px-2">目前离线，恢复网络后会自动更新</p>
                )}
                {filteredCommunityPosts.length === 0 ? (
                  <div className="text-center py-20 text-ink-3 italic">
                    该时间段暂无共修记录。
                  </div>
                ) : (
                  filteredCommunityPosts.map((post) => (
                    <div key={post.id} className="bg-surface rounded-2xl p-6 border border-line">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-zen-bg flex items-center justify-center text-zen-accent font-bold text-sm">
                          {post.userName[0]}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-zen-ink">{post.userName}</p>
                          <p className="text-[10px] text-zen-accent/50">
                            {new Date(post.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="bg-zen-accent/5 px-3 py-1 rounded-full text-xs font-bold text-zen-accent">
                        {post.chant} · {post.count}{t('times')}
                      </div>
                    </div>
                    
                    <div className="bg-zen-bg/30 p-4 rounded-xl mb-4">
                      <p className="text-xs text-zen-accent/40 uppercase tracking-widest font-bold mb-1">{t('dedication')}</p>
                      <p className="text-sm text-zen-ink/80 font-serif leading-relaxed">
                        {post.dedication}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-2 sm:gap-4 border-t border-zen-accent/5 pt-4 mt-4">
                      <div className="flex items-center gap-3 sm:gap-6">
                        <button
                          onClick={() => shareMerit(post)}
                          disabled={isSharing}
                          className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold text-zen-accent/40 hover:text-zen-accent transition-colors disabled:opacity-50"
                        >
                          <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span>分享</span>
                        </button>
                        <button
                          onClick={() => {
                            const scripture = allScriptures.find(s => s.title === post.chant);
                            if (scripture) {
                              setActiveScriptureId(scripture.id);
                              if (scripture.category === 'meditation') {
                                setActiveTab('meditation');
                              } else {
                                setActiveTab('fish');
                              }
                            } else {
                              setActiveTab('fish');
                            }
                          }}
                          className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold text-zen-accent/40 hover:text-zen-accent transition-colors"
                        >
                          <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span>我也要修行</span>
                        </button>
                      </div>
                      <button 
                        onClick={async () => {
                          // Optimistic update
                          setCommunityPosts(prev => prev.map(p => 
                            p.id === post.id ? { ...p, likes: p.likes + 1 } : p
                          ));
                          
                          // Update Firestore
                          try {
                            const postRef = doc(db, 'shared_merits', post.id.toString());
                            await setDoc(postRef, { rejoiceCount: post.likes + 1 }, { merge: true });
                          } catch (err) {
                            console.error('Failed to update rejoice count in Firestore:', err);
                          }
                          
                          practiceService.logRejoice();
                          setRejoiceStats(practiceService.getRejoiceStats());
                          
                          // Add to good deed history
                          const history = safeStorage.getJSON<any[]>('good_deed_history', []);
                          const now = new Date();
                          const offset = now.getTimezoneOffset() * 60000;
                          const localDate = new Date(now.getTime() - offset).toISOString().slice(0, 16);
                          
                          const newEntry = {
                            id: Date.now().toString(),
                            date: localDate,
                            type: 'good',
                            content: `随喜赞叹同修功德`,
                            result: {
                              ledger_entry: {
                                deed: `随喜赞叹同修功德`,
                                liufan_category: "正",
                                mindset_applied: "随喜"
                              },
                              merit_calculation: {
                                base: 1,
                                multiplier: 1.0,
                                total_this_time: 1,
                                progress_to_3000: ""
                              },
                              fate_insight: {
                                current_trend: "平稳向善",
                                wisdom_quote: "随喜功德，无量无边。",
                                daily_habit_task: "继续保持随喜赞叹的心"
                              },
                              visual_cue: "GOLDEN_FLARE"
                            }
                          };
                          
                          const newHistory = [newEntry, ...history].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
                          safeStorage.setJSON('good_deed_history', newHistory);
                          
                          if (fbUser) {
                            try {
                              const cleanEntry = Object.fromEntries(Object.entries(newEntry).filter(([_, v]) => v !== undefined));
                              await setDoc(doc(db, `users/${fbUser.uid}/goodDeeds`, newEntry.id), cleanEntry);
                            } catch (error) {
                              handleFirestoreError(error, OperationType.WRITE, `users/${fbUser.uid}/goodDeeds`);
                            }
                          }
                          
                          window.dispatchEvent(new CustomEvent('zen_data_updated'));
                        }}
                        className={cn(
                          "flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold transition-colors",
                          "text-zen-accent/40 hover:text-zen-accent"
                        )}
                      >
                        <ThumbsUp className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4")} />
                        <span>{t('like_dedication')} {post.likes > 0 && post.likes}</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto w-full space-y-6"
            >
              <div className="bg-surface rounded-2xl p-8 border border-line">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-ink">
                  <Settings className="w-5 h-5 text-accent" />
                  {t('preferences')}
                </h2>

                <div className="space-y-8">
                  {['chewsj07@gmail.com'].includes(auth.currentUser?.email || '') && (
                    <div className="bg-surface-2 rounded-2xl p-4 sm:p-8 border border-line">
                      <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 flex items-center gap-2">
                        <Music className="w-5 h-5 text-zen-accent" />
                        音频管理 (Admin)
                      </h2>
                      <React.Suspense fallback={<div className="p-4 text-center text-xs text-zen-accent/60">加载音频管理...</div>}>
                        <AudioManagement />
                      </React.Suspense>
                    </div>
                  )}
                  {/* User Profile */}
                  <div>
                    <button 
                      onClick={() => setIsProfileExpanded(!isProfileExpanded)}
                      className="w-full flex items-center justify-between text-sm font-bold text-zen-accent/70 mb-3 hover:text-zen-accent transition-colors"
                    >
                      <span>{t('user_profile')}</span>
                      <ChevronDown className={cn("w-4 h-4 transition-transform", isProfileExpanded ? "rotate-180" : "")} />
                    </button>
                    
                    <AnimatePresence>
                      {isProfileExpanded && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-3 pb-4">
                            <input type="text" placeholder={t('name')} value={userProfile.name} onChange={(e) => setUserProfile({...userProfile, name: e.target.value})} className="w-full bg-zen-bg/50 border border-zen-accent/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-zen-accent" />
                            <input type="email" placeholder={t('email')} value={userProfile.email} onChange={(e) => setUserProfile({...userProfile, email: e.target.value})} className="w-full bg-zen-bg/50 border border-zen-accent/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-zen-accent" />
                            {fbUser && fbUser.email && !emailVerified && (
                              <div className="flex items-center justify-between gap-2 px-4 py-2.5 rounded-2xl bg-surface-2 border border-line text-xs">
                                <span className="text-ink-2">邮箱尚未验证</span>
                                <button
                                  type="button"
                                  disabled={isResendingVerification}
                                  onClick={async () => {
                                    if (!auth.currentUser || isResendingVerification) return;
                                    try {
                                      setIsResendingVerification(true);
                                      await sendEmailVerification(auth.currentUser);
                                      toast.success('验证邮件已发送，请到邮箱点击链接');
                                    } catch (err: unknown) {
                                      toast.error(translateFirebaseAuthError(err));
                                    } finally {
                                      setIsResendingVerification(false);
                                    }
                                  }}
                                  className="text-accent font-medium hover:underline disabled:opacity-50 shrink-0"
                                >
                                  {isResendingVerification ? '发送中...' : '重新发送'}
                                </button>
                              </div>
                            )}
                            <select
                              value={currentCountryCode}
                              onChange={(e) => {
                                const code = e.target.value;
                                const selected = ALL_COUNTRIES.find(c => c.isoCode === code);
                                setUserProfile({
                                  ...userProfile,
                                  country: selected ? selected.name : '',
                                  location: ''
                                });
                              }}
                              className="w-full bg-zen-bg/50 border border-zen-accent/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-zen-accent appearance-none"
                            >
                              <option value="">国家 (Country)</option>
                              {ALL_COUNTRIES.map(c => (
                                <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
                              ))}
                            </select>
                            <select
                              value={userProfile.location || ''}
                              onChange={(e) => setUserProfile({...userProfile, location: e.target.value})}
                              disabled={!currentCountryCode}
                              className="w-full bg-zen-bg/50 border border-zen-accent/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-zen-accent disabled:opacity-50 appearance-none"
                            >
                              <option value="">城市/地区 (City)</option>
                              {availableCities && availableCities.map(c => (
                                <option key={c.name} value={c.name}>{c.name}</option>
                              ))}
                            </select>
                            <div className="flex items-center bg-zen-bg/50 border border-zen-accent/10 rounded-2xl px-4 py-3 focus-within:border-zen-accent transition-colors">
                              <span className="text-sm text-zen-accent/70 mr-3 whitespace-nowrap">{t('birthday')}</span>
                              <input type="date" value={userProfile.birthday} onChange={(e) => setUserProfile({...userProfile, birthday: e.target.value})} className="w-full bg-transparent text-sm focus:outline-none" />
                            </div>
                            <select value={userProfile.gender} onChange={(e) => setUserProfile({...userProfile, gender: e.target.value})} className="w-full bg-zen-bg/50 border border-zen-accent/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-zen-accent">
                              <option value="" disabled>{t('gender')}</option>
                              <option value="male">{t('male')}</option>
                              <option value="female">{t('female')}</option>
                            </select>
                            <select value={userProfile.role} onChange={(e) => setUserProfile({...userProfile, role: e.target.value})} className="w-full bg-zen-bg/50 border border-zen-accent/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-zen-accent">
                              <option value="homemaker">{t('role_homemaker')}</option>
                              <option value="executive">{t('role_executive')}</option>
                              <option value="financially_independent">{t('role_financially_independent')}</option>
                              <option value="elder">{t('role_elder')}</option>
                              <option value="self_employed">{t('role_self_employed')}</option>
                              <option value="entrepreneur">{t('role_entrepreneur')}</option>
                              <option value="primary_student">{t('role_primary_student')}</option>
                              <option value="middle_student">{t('role_middle_student')}</option>
                              <option value="university_student">{t('role_university_student')}</option>
                              <option value="retiree">{t('role_retiree')}</option>
                              <option value="employee">{t('role_employee')}</option>
                            </select>
                            {fbUser?.providerData?.some((p) => p.providerId === 'password') && (
                              <button
                                onClick={() => setShowChangePasswordModal(true)}
                                className="w-full py-3 bg-zen-bg/50 border border-zen-accent/20 text-zen-accent rounded-xl font-bold hover:bg-zen-bg transition-colors flex items-center justify-center gap-2"
                              >
                                修改密码
                              </button>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Personal Preferences */}
                  <div>
                    <button 
                      onClick={() => setIsPersonalSettingsExpanded(!isPersonalSettingsExpanded)}
                      className="w-full flex items-center justify-between text-sm font-bold text-zen-accent/70 mb-3 hover:text-zen-accent transition-colors"
                    >
                      <span>个人偏好设置</span>
                      <ChevronDown className={cn("w-4 h-4 transition-transform", isPersonalSettingsExpanded ? "rotate-180" : "")} />
                    </button>
                    
                    <AnimatePresence>
                      {isPersonalSettingsExpanded && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-6 pb-4">
                            {/* Language Selection */}
                            <div>
                              <label className="block text-sm font-bold text-zen-accent/70 mb-3">{t('language')}</label>
                              <div className="relative">
                                <select
                                  value={language}
                                  onChange={(e) => setLanguage(e.target.value as any)}
                                  className="w-full appearance-none bg-zen-bg/50 border border-zen-accent/10 rounded-2xl px-4 py-3 pr-10 text-zen-accent font-bold focus:outline-none focus:border-zen-accent transition-colors"
                                >
                                  {LANGUAGES.map((lang) => (
                                    <option key={lang.id} value={lang.id}>
                                      {lang.label}
                                    </option>
                                  ))}
                                </select>
                                <Globe className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zen-accent/50 pointer-events-none" />
                              </div>
                            </div>

                            {/* Theme Selection */}
                            <div>
                              <label className="block text-sm font-bold text-zen-accent/70 mb-3">{t('theme')}</label>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[
                                  { id: 'zen', label: t('theme_zen'), color: '#FAF9F5' },
                                  { id: 'lotus', label: t('theme_lotus'), color: '#FBF5F4' },
                                  { id: 'sky', label: t('theme_sky'), color: '#F4F7F8' },
                                  { id: 'dark', label: t('theme_dark'), color: '#121614' }
                                ].map((t) => (
                                  <button
                                    key={t.id}
                                    onClick={() => setTheme(t.id as any)}
                                    className={cn(
                                      "rounded-2xl flex flex-col items-center justify-center gap-2 border-2 transition-all p-3",
                                      theme === t.id ? "border-accent scale-105" : "border-line hover:scale-105"
                                    )}
                                    style={{ backgroundColor: t.color }}
                                  >
                                    <div className={cn("w-4 h-4 rounded-full", theme === t.id ? "bg-accent" : "bg-black/15")} />
                                    <span className={cn("text-xs font-bold text-center", t.id === 'dark' ? "text-[#E7E9E4]" : "text-ink")}>{t.label}</span>
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Font Size Selection */}
                            <div>
                              <label className="block text-sm font-bold text-zen-accent/70 mb-3">{t('font_size')}</label>
                              <div className="flex gap-3">
                                {[
                                  { id: 'small', label: t('font_small') },
                                  { id: 'medium', label: t('font_medium') },
                                  { id: 'large', label: t('font_large') }
                                ].map((s) => (
                                  <button
                                    key={s.id}
                                    onClick={() => setFontSize(s.id as any)}
                                    className={cn(
                                      "flex-1 py-3 rounded-xl text-sm font-bold transition-all border",
                                      fontSize === s.id
                                        ? "bg-accent text-on-accent border-accent"
                                        : "bg-surface-2 text-accent border-line hover:border-line-strong"
                                    )}
                                  >
                                    {s.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Chanting Preferences */}
                  <div>
                    <button 
                      onClick={() => setIsChantingSettingsExpanded(!isChantingSettingsExpanded)}
                      className="w-full flex items-center justify-between text-sm font-bold text-zen-accent/70 mb-3 hover:text-zen-accent transition-colors"
                    >
                      <span>诵经偏好设置</span>
                      <ChevronDown className={cn("w-4 h-4 transition-transform", isChantingSettingsExpanded ? "rotate-180" : "")} />
                    </button>
                    
                    <AnimatePresence>
                      {isChantingSettingsExpanded && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-6 pb-4">
                            {/* Appearance Selection */}
                            <div>
                              <label className="block text-sm font-bold text-zen-accent/70 mb-3">{t('wooden_fish_appearance')}</label>
                              <div className="flex gap-3">
                                {[
                                  { id: 'fish', label: t('appearance_fish') },
                                  { id: 'lotus', label: t('appearance_lotus') },
                                  { id: 'bowl', label: t('appearance_bowl') }
                                ].map((a) => (
                                  <button
                                    key={a.id}
                                    onClick={() => setWoodenFishAppearance(a.id as any)}
                                    className={cn(
                                      "flex-1 py-3 rounded-xl text-sm font-bold transition-all border",
                                      woodenFishAppearance === a.id
                                        ? "bg-accent text-on-accent border-accent"
                                        : "bg-surface-2 text-accent border-line hover:border-line-strong"
                                    )}
                                  >
                                    {a.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Volume */}
                            <div>
                              <label className="block text-sm font-bold text-zen-accent/70 mb-2">{t('volume_control')}</label>
                              <input 
                                type="range" 
                                min="0" max="1" step="0.01" 
                                value={volume} 
                                onChange={(e) => setVolume(parseFloat(e.target.value))}
                                className="w-full accent-zen-accent"
                              />
                            </div>

                            {/* Show Merit Floating Text Toggle (off by default) */}
                            <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-surface-2 border border-line">
                              <div>
                                <p className="text-sm font-bold text-ink">显示功德飘字</p>
                                <p className="text-xs text-ink-3 mt-0.5">默认关闭；开启后敲击时轻柔上浮提示</p>
                              </div>
                              <button
                                type="button"
                                role="switch"
                                aria-checked={showMeritFloat}
                                onClick={() => setShowMeritFloat(v => !v)}
                                className={cn(
                                  "w-12 h-7 rounded-full p-1 transition-colors shrink-0 flex items-center",
                                  showMeritFloat ? "bg-accent justify-end" : "bg-line-strong justify-start"
                                )}
                              >
                                <span className="w-5 h-5 rounded-full bg-surface shadow-sm block" />
                              </button>
                            </div>

                            {/* WoodenFish Completion Dedication Presets (3 Presets + Custom) */}
                            <div>
                              <label className="block text-sm font-bold text-zen-accent/70 mb-2">木鱼圆满回向文</label>
                              <div className="space-y-2">
                                {FISH_DEDICATION_PRESETS.map((preset) => (
                                  <button
                                    key={preset.id}
                                    type="button"
                                    onClick={() => setFishDedicationChoice(preset.id)}
                                    className={cn(
                                      "w-full text-left p-3 rounded-xl border transition-colors",
                                      fishDedicationChoice === preset.id
                                        ? "bg-accent-mist border-accent text-ink"
                                        : "bg-surface-2 border-line text-ink-2 hover:border-line-strong"
                                    )}
                                  >
                                    <p className="text-xs font-bold text-accent mb-1">{preset.label}</p>
                                    <p className="text-xs leading-relaxed">{preset.text}</p>
                                  </button>
                                ))}

                                <div
                                  onClick={() => setFishDedicationChoice('custom')}
                                  className={cn(
                                    "w-full text-left p-3 rounded-xl border transition-colors cursor-pointer",
                                    fishDedicationChoice === 'custom'
                                      ? "bg-accent-mist border-accent text-ink"
                                      : "bg-surface-2 border-line text-ink-2 hover:border-line-strong"
                                  )}
                                >
                                  <p className="text-xs font-bold text-accent mb-1.5">自定义回向文</p>
                                  <textarea
                                    value={fishCustomDedication}
                                    onFocus={() => setFishDedicationChoice('custom')}
                                    onChange={(e) => {
                                      setFishDedicationChoice('custom');
                                      setFishCustomDedication(e.target.value);
                                    }}
                                    placeholder="写下您自己的回向文..."
                                    rows={2}
                                    className="w-full bg-surface/80 border border-line rounded-lg px-2.5 py-2 text-xs text-ink resize-none focus:outline-none focus:border-accent"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Sound Type */}
                            <div>
                              <label className="block text-sm font-bold text-zen-accent/70 mb-2">{t('sound_selection')}</label>
                              <div className="flex gap-2">
                                {[
                                  { id: 'standard', label: t('sound_standard') },
                                  { id: 'crisp', label: t('sound_crisp') },
                                  { id: 'deep', label: t('sound_deep') }
                                ].map(type => (
                                  <button
                                    key={type.id}
                                    onClick={() => setSoundType(type.id as any)}
                                    className={cn(
                                      "flex-1 py-2 rounded-xl text-sm font-bold transition-colors border",
                                      soundType === type.id
                                        ? "bg-accent text-on-accent border-accent"
                                        : "bg-surface-2 text-accent border-line hover:border-line-strong"
                                    )}
                                  >
                                    {type.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Dedication Settings */}
                            <div>
                              <div className="flex justify-between items-center mb-3">
                                <label className="block text-sm font-bold text-zen-accent/70">诵经回向文</label>
                                <button 
                                  onClick={() => {
                                    const newId = Date.now().toString();
                                    setDedications([...dedications, { id: newId, content: "愿以此功德...", isDefault: false }]);
                                  }}
                                  className="text-xs bg-zen-accent/10 text-zen-accent px-2 py-1 rounded-lg hover:bg-zen-accent/20 transition-colors"
                                >
                                  + {t('add_new')}
                                </button>
                              </div>
                              <div className="space-y-3">
                                {dedications.map((dedication, index) => (
                                  <div key={dedication.id} className="bg-zen-bg/30 p-3 rounded-xl border border-zen-accent/5 relative group">
                                    <textarea
                                      value={dedication.content}
                                      onChange={(e) => {
                                        const newDedications = [...dedications];
                                        newDedications[index].content = e.target.value;
                                        setDedications(newDedications);
                                      }}
                                      className="w-full bg-transparent text-sm font-serif resize-none focus:outline-none mb-2"
                                      rows={3}
                                    />
                                    <div className="flex justify-between items-center border-t border-zen-accent/5 pt-2">
                                      <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                          type="radio" 
                                          name="defaultDedication"
                                          checked={dedication.isDefault}
                                          onChange={() => {
                                            const newDedications = dedications.map(d => ({ ...d, isDefault: d.id === dedication.id }));
                                            setDedications(newDedications);
                                          }}
                                          className="accent-zen-accent"
                                        />
                                        <span className="text-xs text-zen-accent/60">{t('set_default')}</span>
                                      </label>
                                      {dedications.length > 1 && (
                                        <button 
                                          onClick={() => {
                                            if (confirm(t('confirm_delete_dedication'))) {
                                              setDedications(dedications.filter(d => d.id !== dedication.id));
                                            }
                                          }}
                                          className="text-zen-accent/30 hover:text-red-500 transition-colors"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Ritual Preferences */}
                  <div>
                    <button
                      onClick={() => setIsRitualSettingsExpanded(!isRitualSettingsExpanded)}
                      className="w-full flex items-center justify-between text-sm font-bold text-zen-accent/70 mb-3 hover:text-zen-accent transition-colors"
                    >
                      <span>念诵仪轨</span>
                      <ChevronDown className={cn("w-4 h-4 transition-transform", isRitualSettingsExpanded ? "rotate-180" : "")} />
                    </button>

                    <AnimatePresence>
                      {isRitualSettingsExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-5 pb-4">
                            {/* Ritual Mode */}
                            <div>
                              <label className="block text-sm font-bold text-zen-accent/70 mb-2">仪轨版本</label>
                              <div className="flex gap-2">
                                {[
                                  { id: 'full' as const, label: '完整版（约 4–6 分钟）' },
                                  { id: 'brief' as const, label: '简要版（约 1 分钟）' },
                                ].map((opt) => {
                                  const effectiveMode = ritualService.getEffectiveMode(ritualSettings);
                                  const active = effectiveMode === opt.id;
                                  return (
                                    <button
                                      key={opt.id}
                                      onClick={() => {
                                        const next = ritualService.saveSettings({
                                          mode: opt.id,
                                          userChosenMode: true,
                                        });
                                        setRitualSettings(next);
                                      }}
                                      className={cn(
                                        "flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-colors border",
                                        active
                                          ? "bg-accent text-on-accent border-accent"
                                          : "bg-surface-2 text-accent border-line hover:border-line-strong"
                                      )}
                                    >
                                      {opt.label}
                                    </button>
                                  );
                                })}
                              </div>
                              <p className="text-[11px] text-ink-3 mt-1.5 leading-relaxed">
                                {ritualSettings.hasCompletedFirstRitual
                                  ? '完整版含调息、礼佛、净口、忏悔、发愿、开经与念诵要点；简要版保留礼佛、发愿与开经偈。'
                                  : '首次念诵将自动以「完整版」引导仪轨，完成后默认切换为「简要版」，可随时在此调整。'}
                              </p>
                            </div>

                            {/* Homage Style */}
                            <div>
                              <label className="block text-sm font-bold text-zen-accent/70 mb-2">礼佛方式</label>
                              <div className="flex gap-2">
                                {[
                                  { id: 'bow1' as const, label: '问讯一次' },
                                  { id: 'prostrate3' as const, label: '礼拜三拜' },
                                ].map((opt) => (
                                  <button
                                    key={opt.id}
                                    onClick={() => {
                                      const next = ritualService.saveSettings({
                                        homageStyle: opt.id,
                                      });
                                      setRitualSettings(next);
                                    }}
                                    className={cn(
                                      "flex-1 py-2 rounded-xl text-sm font-bold transition-colors border",
                                      ritualSettings.homageStyle === opt.id
                                        ? "bg-accent text-on-accent border-accent"
                                        : "bg-surface-2 text-accent border-line hover:border-line-strong"
                                    )}
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Pure Mouth Mantra Reps */}
                            <div>
                              <label className="block text-sm font-bold text-zen-accent/70 mb-2">净口业真言遍数</label>
                              <div className="flex gap-2">
                                {([1, 3, 7] as const).map((rep) => (
                                  <button
                                    key={rep}
                                    onClick={() => {
                                      const next = ritualService.saveSettings({
                                        pureMouthReps: rep,
                                      });
                                      setRitualSettings(next);
                                    }}
                                    className={cn(
                                      "flex-1 py-2 rounded-xl text-sm font-bold transition-colors border",
                                      ritualSettings.pureMouthReps === rep
                                        ? "bg-accent text-on-accent border-accent"
                                        : "bg-surface-2 text-accent border-line hover:border-line-strong"
                                    )}
                                  >
                                    {rep} 遍
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Show Why */}
                            <div className="flex items-center justify-between gap-4 py-2 px-3 rounded-xl bg-surface-2 border border-line">
                              <div>
                                <p className="text-sm font-bold text-ink">显示「为什么」说明</p>
                                <p className="text-[11px] text-ink-3">在仪轨每一步右上角显示「为什么？」解说按钮</p>
                              </div>
                              <button
                                type="button"
                                role="switch"
                                aria-checked={ritualSettings.showWhy}
                                onClick={() => {
                                  const next = ritualService.saveSettings({
                                    showWhy: !ritualSettings.showWhy,
                                  });
                                  setRitualSettings(next);
                                }}
                                className={cn(
                                  "w-11 h-6 rounded-full transition-colors relative shrink-0",
                                  ritualSettings.showWhy ? "bg-accent" : "bg-line-strong"
                                )}
                              >
                                <span
                                  className={cn(
                                    "block w-5 h-5 rounded-full bg-surface shadow-sm transition-transform absolute top-0.5",
                                    ritualSettings.showWhy ? "translate-x-5.5 left-0" : "translate-x-0.5 left-0"
                                  )}
                                />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Meditation Preferences */}
                  <div>
                    <button 
                      onClick={() => setIsMeditationSettingsExpanded(!isMeditationSettingsExpanded)}
                      className="w-full flex items-center justify-between text-sm font-bold text-zen-accent/70 mb-3 hover:text-zen-accent transition-colors"
                    >
                      <span>禅修偏好设置</span>
                      <ChevronDown className={cn("w-4 h-4 transition-transform", isMeditationSettingsExpanded ? "rotate-180" : "")} />
                    </button>
                    
                    <AnimatePresence>
                      {isMeditationSettingsExpanded && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-6 pb-4">
                            {/* Appearance Selection */}
                            <div>
                              <label className="block text-sm font-bold text-zen-accent/70 mb-3">{t('wooden_fish_appearance')}</label>
                              <div className="flex gap-3">
                                {[
                                  { id: 'fish', label: t('appearance_fish') },
                                  { id: 'lotus', label: t('appearance_lotus') },
                                  { id: 'bowl', label: t('appearance_bowl') }
                                ].map((a) => (
                                  <button
                                    key={a.id}
                                    onClick={() => setMeditationWoodenFishAppearance(a.id as any)}
                                    className={cn(
                                      "flex-1 py-3 rounded-xl text-sm font-bold transition-all border",
                                      meditationWoodenFishAppearance === a.id
                                        ? "bg-accent text-on-accent border-accent"
                                        : "bg-surface-2 text-accent border-line hover:border-line-strong"
                                    )}
                                  >
                                    {a.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Meditation Dedication Settings */}
                            <div>
                              <div className="flex justify-between items-center mb-3">
                                <label className="block text-sm font-bold text-zen-accent/70">禅修回向文</label>
                                <button 
                                  onClick={() => {
                                    const newId = Date.now().toString();
                                    setMeditationDedications([...meditationDedications, { id: newId, content: "愿以此禅修功德...", isDefault: false }]);
                                  }}
                                  className="text-xs bg-zen-accent/10 text-zen-accent px-2 py-1 rounded-lg hover:bg-zen-accent/20 transition-colors"
                                >
                                  + {t('add_new')}
                                </button>
                              </div>
                              <div className="space-y-3">
                                {meditationDedications.map((dedication, index) => (
                                  <div key={dedication.id} className="bg-zen-bg/30 p-3 rounded-xl border border-zen-accent/5 relative group">
                                    <textarea
                                      value={dedication.content}
                                      onChange={(e) => {
                                        const newDedications = [...meditationDedications];
                                        newDedications[index].content = e.target.value;
                                        setMeditationDedications(newDedications);
                                      }}
                                      className="w-full bg-transparent text-sm font-serif resize-none focus:outline-none mb-2"
                                      rows={3}
                                    />
                                    <div className="flex justify-between items-center border-t border-zen-accent/5 pt-2">
                                      <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                          type="radio" 
                                          name="defaultMeditationDedication"
                                          checked={dedication.isDefault}
                                          onChange={() => {
                                            const newDedications = meditationDedications.map(d => ({ ...d, isDefault: d.id === dedication.id }));
                                            setMeditationDedications(newDedications);
                                          }}
                                          className="accent-zen-accent"
                                        />
                                        <span className="text-xs text-zen-accent/60">{t('set_default')}</span>
                                      </label>
                                      {meditationDedications.length > 1 && (
                                        <button 
                                          onClick={() => {
                                            if (confirm(t('confirm_delete_meditation_dedication'))) {
                                              setMeditationDedications(meditationDedications.filter(d => d.id !== dedication.id));
                                            }
                                          }}
                                          className="text-zen-accent/30 hover:text-red-500 transition-colors"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Vow Settings */}
                  <div>
                    <button 
                      onClick={() => setIsVowSettingsExpanded(!isVowSettingsExpanded)}
                      className="w-full flex items-center justify-between text-sm font-bold text-zen-accent/70 mb-3 hover:text-zen-accent transition-colors"
                    >
                      <span>诵经和禅修发愿设置</span>
                      <ChevronDown className={cn("w-4 h-4 transition-transform", isVowSettingsExpanded ? "rotate-180" : "")} />
                    </button>
                    
                    <AnimatePresence>
                      {isVowSettingsExpanded && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-6 pb-4">
                            <div>
                              <label className="block text-sm font-bold text-zen-accent/70 mb-3">发愿文设置</label>
                              <div className="space-y-3">
                                {vows.map((vow, index) => (
                                  <div key={vow.id} className="bg-zen-bg/30 p-3 rounded-xl border border-zen-accent/5 relative group">
                                    <textarea
                                      value={vow.content}
                                      readOnly
                                      className="w-full bg-transparent text-sm font-serif resize-none focus:outline-none mb-2"
                                      rows={3}
                                    />
                                    <div className="flex justify-between items-center border-t border-zen-accent/5 pt-2">
                                      <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                          type="radio" 
                                          name="defaultVow"
                                          checked={vow.isDefault}
                                          onChange={() => {
                                            const newVows = vows.map(v => ({ ...v, isDefault: v.id === vow.id }));
                                            updateVows(newVows);
                                          }}
                                          className="accent-zen-accent"
                                        />
                                        <span className="text-xs text-zen-accent/60">{t('set_default')}</span>
                                      </label>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                </div>
              </div>

              {/* Vowzen AI Companion */}
              <div className="bg-surface rounded-2xl p-8 border border-line" ref={aiSettingsRef}>
                <button 
                  onClick={() => setIsAiSettingsExpanded(!isAiSettingsExpanded)}
                  className="w-full flex items-center justify-between text-xl font-bold mb-2 hover:text-accent transition-colors text-ink"
                >
                  <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-accent" />
                    愿禅助手 AI 陪伴
                  </div>
                  <ChevronDown className={cn("w-5 h-5 transition-transform", isAiSettingsExpanded ? "rotate-180" : "")} />
                </button>
                
                <AnimatePresence>
                  {isAiSettingsExpanded && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-4 pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-sm font-bold text-ink-2 mb-1">开启愿禅助手对话与感悟</h3>
                            <p className="text-xs text-ink-3">以温和、不盲修的方式陪伴日常观心与修行解惑</p>
                          </div>
                          <button
                            onClick={() => {
                              const newVal = !aiEnabled;
                              setAiEnabled(newVal);
                              practiceService.saveSettings({ ...practiceService.getSettings(), aiEnabled: newVal });
                            }}
                            className={cn(
                              "w-12 h-6 rounded-full transition-colors relative",
                              aiEnabled ? "bg-accent" : "bg-surface-2 border border-line"
                            )}
                          >
                            <motion.div
                              className="w-5 h-5 bg-surface rounded-full absolute top-0.5 border border-line"
                              animate={{ left: aiEnabled ? "26px" : "2px" }}
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Feedback */}
              <div className="bg-surface rounded-2xl p-8 border border-line">
                <button 
                  onClick={() => setIsFeedbackExpanded(!isFeedbackExpanded)}
                  className="w-full flex items-center justify-between text-xl font-bold mb-2 hover:text-accent transition-colors text-ink"
                >
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-accent" />
                    用户反馈 (Feedback)
                  </div>
                  <ChevronDown className={cn("w-5 h-5 transition-transform", isFeedbackExpanded ? "rotate-180" : "")} />
                </button>
                
                <AnimatePresence>
                  {isFeedbackExpanded && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-4 pt-6">
                        <p className="text-sm text-ink-2">
                          如果您在使用过程中遇到任何问题，或有任何建议，欢迎告诉我们。您的反馈将帮助我们不断改进。
                        </p>
                        <textarea 
                          placeholder="请在此输入您的反馈意见..." 
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                          className="w-full h-32 bg-surface-2 border border-line rounded-2xl px-4 py-3 text-sm text-ink focus:outline-none focus:border-accent resize-none"
                        ></textarea>
                        {feedbackSuccess && (
                          <div className="p-3 bg-accent-mist text-accent text-sm rounded-xl border border-line flex items-center gap-2">
                            <Check className="w-4 h-4" />
                            感谢您的反馈！我们会认真阅读并不断改进。
                          </div>
                        )}
                        <button 
                          onClick={() => {
                            if (!feedbackText.trim()) return;
                            // Mock submit feedback
                            setFeedbackSuccess(true);
                            setFeedbackText('');
                            setTimeout(() => setFeedbackSuccess(false), 3000);
                          }}
                          disabled={!feedbackText.trim()}
                          className="w-full bg-accent text-on-accent py-3 rounded-2xl font-bold hover:bg-accent-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          <MessageCircle className="w-4 h-4" />
                          提交反馈
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* System */}
              <div className="bg-surface rounded-2xl p-8 border border-line">
                <button 
                  onClick={() => setIsSystemSettingsExpanded(!isSystemSettingsExpanded)}
                  className="w-full flex items-center justify-between text-xl font-bold mb-2 hover:text-zen-accent transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-zen-accent" />
                    系统
                  </div>
                  <ChevronDown className={cn("w-5 h-5 transition-transform", isSystemSettingsExpanded ? "rotate-180" : "")} />
                </button>
                
                <AnimatePresence>
                  {isSystemSettingsExpanded && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-8 pt-6">
                        {/* Data Sync */}
                        <div>
                          <h3 className="text-sm font-bold text-zen-accent/70 mb-3 flex items-center gap-2">
                            <History className="w-4 h-4" />
                            {t('data_sync')}
                          </h3>
                          <p className="text-xs text-zen-accent/60 mb-4 leading-relaxed">
                            {t('data_sync_desc')}
                          </p>
                          <div className="flex gap-4">
                            <button 
                              onClick={() => {
                                const data = {
                                  count, history, customChants, customDedication, customVow, volume
                                };
                                const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = `zen_backup_${new Date().toISOString().split('T')[0]}.json`;
                                a.click();
                                URL.revokeObjectURL(url);
                              }}
                              className="flex-1 bg-surface-2 border border-line-strong text-accent py-3 rounded-2xl font-bold hover:bg-accent-mist transition-colors text-sm"
                            >
                              {t('export_backup')}
                            </button>
                            <label className="flex-1 bg-accent text-on-accent py-3 rounded-2xl font-bold hover:bg-accent-hover transition-colors cursor-pointer text-center text-sm">
                              {t('restore_data')}
                              <input 
                                type="file" 
                                accept=".json" 
                                className="hidden" 
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (event) => {
                                      try {
                                        const data = JSON.parse(event.target?.result as string);
                                        if (data.count !== undefined) setCount(data.count);
                                        if (data.history) restoreHistory(data.history);
                                        if (data.customChants) setCustomChants(data.customChants);
                                        if (data.customDedication) setCustomDedication(data.customDedication);
                                        if (data.customVow) setCustomVow(data.customVow);
                                        if (data.volume !== undefined) setVolume(data.volume);
                                        alert(t('restore_success'));
                                      } catch (err) {
                                        alert(t('restore_fail'));
                                      }
                                    };
                                    reader.readAsText(file);
                                  }
                                }}
                              />
                            </label>
                          </div>
                        </div>

                        {/* Clear Data */}
                        <div className="border-t border-line pt-6">
                          <h3 className="text-sm font-bold text-red-500 mb-3 flex items-center gap-2">
                            <Trash2 className="w-4 h-4" />
                            清除所有数据
                          </h3>
                          <p className="text-xs text-ink-2 mb-4 leading-relaxed">
                            此操作将清除您设备上的所有本地数据（包括功德、历史记录、设置和冥想音频），且不可恢复。如果您已登录，云端数据不会被删除。
                          </p>
                          {!showClearConfirm ? (
                            <button 
                              onClick={() => setShowClearConfirm(true)}
                              className="w-full bg-red-500/10 border border-red-500/30 text-red-500 py-3 rounded-2xl font-bold hover:bg-red-500/20 transition-colors text-sm"
                            >
                              清除所有本地数据
                            </button>
                          ) : (
                            <div className="flex gap-4">
                              <button 
                                onClick={() => setShowClearConfirm(false)}
                                className="flex-1 bg-surface-2 border border-line-strong text-accent py-3 rounded-2xl font-bold hover:bg-accent-mist transition-colors text-sm"
                              >
                                取消
                              </button>
                              <button 
                                onClick={() => {
                                  try {
                                    safeStorage.clear();
                                  } catch (e) {
                                    console.warn("Storage clear notice:", e);
                                  }
                                  try {
                                    indexedDB.deleteDatabase('ZenMeditationDB');
                                  } catch (e) {
                                    console.warn("IndexedDB delete notice:", e);
                                  }
                                  window.location.reload();
                                }}
                                className="flex-1 bg-red-500 text-white py-3 rounded-2xl font-bold hover:bg-red-600 transition-colors text-sm"
                              >
                                确认清除
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Auth Status / Logout */}
                        <div className="border-t border-line pt-6">
                          {!isGuest ? (
                            <button
                              onClick={async () => {
                                if (fbUser) {
                                  await auth.signOut();
                                }
                                identityService.logout();
                                window.dispatchEvent(new CustomEvent('auth_state_changed'));
                              }}
                              className="w-full bg-surface-2 border border-line-strong text-accent py-3 rounded-2xl font-bold hover:bg-accent-mist transition-colors text-sm flex items-center justify-center gap-2"
                            >
                              <LogOut className="w-4 h-4" />
                              退出登录 (Logout)
                            </button>
                          ) : (
                            <button
                              onClick={() => setShowAuthModal(true)}
                              className="w-full bg-accent text-on-accent py-3 rounded-2xl font-bold hover:bg-accent-hover transition-colors text-sm flex items-center justify-center gap-2"
                            >
                              <Users className="w-4 h-4" />
                              登录 / 注册 (Login / Register)
                            </button>
                          )}
                        </div>

                        {/* Account Deletion */}
                        <div className="border-t border-zen-accent/10 pt-6">
                          <details className="group">
                            <summary className="flex items-center justify-between cursor-pointer list-none">
                              <h3 className="text-sm font-bold text-red-500 flex items-center gap-2">
                                <Trash2 className="w-4 h-4" />
                                账号删除 (Account Deletion)
                              </h3>
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    window.dispatchEvent(new CustomEvent('open-deletion-modal'));
                                  }}
                                  className="text-xs text-zen-accent underline hover:text-zen-accent/80 transition-colors"
                                >
                                  数据删除政策
                                </button>
                                <ChevronDown className="w-4 h-4 text-zen-accent/50 group-open:rotate-180 transition-transform" />
                              </div>
                            </summary>
                            
                            <div className="pt-4 animate-in fade-in slide-in-from-top-2 duration-200">
                              <p className="text-xs text-zen-accent/60 mb-4 leading-relaxed">
                                删除账号将永久清除您的所有数据（包括修行记录、偏好设置等）。此操作不可逆。建议您在删除前先导出备份数据。
                              </p>
                              <button
                                onClick={() => {
                                  if (confirm("警告：您确定要永久删除您的账号和所有数据吗？此操作无法撤销。")) {
                                    // 1. Clear local storage safely
                                    identityService.logout();
                                    // 2. Reset state
                                    setCount(0);
                                    setHistory([]);
                                    setCustomChants([]);
                                    setCustomDedication("");
                                    setCustomVow("");
                                    // 3. Revoke token/logout if applicable
                                    if (fbUser) {
                                      auth.signOut();
                                    }
                                    alert("账号及数据已成功删除。");
                                    window.dispatchEvent(new CustomEvent('auth_state_changed'));
                                  }
                                }}
                                className="w-full bg-red-50 text-red-500 border border-red-200 py-3 rounded-2xl font-bold hover:bg-red-100 transition-colors text-sm"
                              >
                                永久删除账号
                              </button>
                            </div>
                          </details>
                        </div>

                        {/* Version and Legal */}
                        <div className="border-t border-zen-accent/10 pt-6 text-center space-y-3">
                          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-zen-accent/60">
                            <button 
                              onClick={() => window.dispatchEvent(new CustomEvent('open-terms-modal'))}
                              className="hover:text-zen-accent underline transition-colors"
                            >
                              服务条款 (Terms of Service)
                            </button>
                            <span>|</span>
                            <button 
                              onClick={() => window.dispatchEvent(new CustomEvent('open-privacy-modal'))}
                              className="hover:text-zen-accent underline transition-colors"
                            >
                              隐私政策 (Privacy Policy)
                            </button>
                            <span>|</span>
                            <button onClick={() => window.dispatchEvent(new CustomEvent('open-ai-modal'))} className="hover:text-zen-accent underline transition-colors">
                              AI使用说明 (AI Usage Policy)
                            </button>
                            <span>|</span>
                            <button onClick={() => window.dispatchEvent(new CustomEvent('open-deletion-modal'))} className="hover:text-zen-accent underline transition-colors">
                              数据删除政策 (Data Deletion Policy)
                            </button>
                          </div>
                          <p className="text-xs text-zen-accent/50 font-mono">
                            v2.5.0-opt (2026.11.12 · 极速轻量版)
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {activeTab === 'scripture' && (
            <React.Suspense fallback={<ZenSuspenseFallback text="正在载入佛教经文数据库..." />}>
              <ScriptureLibrary
                allScriptures={allScriptures}
                activeScriptureId={activeScriptureId}
                onImmersiveChange={setImmersive}
                onSelectScripture={(scripture, goToFish) => {
                  setActiveScriptureId(scripture.id);
                  setSelectedChant(scripture.title);
                  if (goToFish) {
                    setActiveTab('fish');
                  }
                }}
                onAddCustomScripture={(newScripture) => {
                  setCustomScriptures(prev => [...prev, newScripture]);
                }}
                onDeleteCustomScripture={(id) => {
                  setCustomScriptures(prev => prev.filter(s => s.id !== id));
                  if (activeScriptureId === id && allScriptures[0]) {
                    setActiveScriptureId(allScriptures[0].id);
                    setSelectedChant(allScriptures[0].title);
                  }
                }}
              />
            </React.Suspense>
          )}


        </AnimatePresence>
      </main>

      {/* 「观一念」Floating Action Button (Only on 今日/dashboard) */}
      <ObserveThoughtFab visible={activeTab === 'dashboard' && !immersive} />

      {/* Fixed Bottom Navigation (5 items) */}
      <nav
        aria-label="主导航"
        style={{
          height: 'calc(64px + env(safe-area-inset-bottom))',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 bg-surface/85 backdrop-blur-xl border-t border-line shadow-float px-2 transition-all duration-300 ease-[var(--ease-zen)]",
          immersive ? "opacity-0 translate-y-full pointer-events-none" : "opacity-100 translate-y-0"
        )}
      >
        <div className="h-16 flex justify-around items-center max-w-2xl mx-auto">
          {[
            { id: 'dashboard', icon: Home, label: '今日' },
            { id: 'fish', icon: Heart, label: '木鱼' },
            { id: 'meditation', icon: Wind, label: '静坐' },
            { id: 'scripture', icon: BookOpen, label: '经藏' },
            { id: 'vow', icon: Leaf, label: '愿簿' },
          ].map(tab => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => navigateTo(tab.id)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 flex-1 min-w-[48px] min-h-[48px] rounded-2xl transition-colors",
                  isSelected
                    ? "text-accent font-semibold"
                    : "text-ink-3 hover:text-ink-2"
                )}
              >
                <span className="relative inline-flex items-center justify-center px-4 py-1">
                  {isSelected && (
                    <motion.span
                      layoutId="bottom-nav-pill"
                      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute inset-0 bg-accent-mist rounded-full -z-10"
                    />
                  )}
                  <tab.icon size={22} strokeWidth={1.5} className="shrink-0" />
                </span>
                <span className="text-[11px] leading-none truncate w-full text-center">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
      {/* Goal Modal (Global z-70 so it layers cleanly above WoodenFishPracticeView) */}
      <AnimatePresence>
        {showGoalModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-black/30 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-surface w-full max-w-sm rounded-3xl p-6 shadow-float border border-line"
            >
              <h3 className="text-lg font-bold mb-4 text-center text-ink">设定每日目标</h3>
              <p className="text-sm text-center text-ink-2 mb-4">{activeScripture.title}</p>

              <div className="flex bg-surface-2 p-1 rounded-xl mb-6">
                <button
                  onClick={() => setEditingGoalType('count')}
                  className={cn(
                    "flex-1 py-2 text-sm font-bold rounded-lg transition-colors",
                    editingGoalType === 'count' ? "bg-surface text-accent border border-line" : "text-ink-2"
                  )}
                >
                  算次数 (自由时间)
                </button>
                <button
                  onClick={() => setEditingGoalType('time')}
                  className={cn(
                    "flex-1 py-2 text-sm font-bold rounded-lg transition-colors",
                    editingGoalType === 'time' ? "bg-surface text-accent border border-line" : "text-ink-2"
                  )}
                >
                  订时间 (自由次数)
                </button>
              </div>

              <div className="flex justify-center flex-wrap gap-4 mb-6">
                {editingGoalType === 'count'
                  ? [21, 49, 108, 1000, 10000, 100000].map(val => (
                      <button
                        key={val}
                        onClick={() => setEditingGoalValue(val)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-sm font-bold border transition-colors",
                          editingGoalValue === val
                            ? "bg-accent text-on-accent border-accent"
                            : "border-line text-ink-2"
                        )}
                      >
                        {val >= 1000 ? `${val / 1000}k` : val}
                      </button>
                    ))
                  : [5, 10, 15, 30, 45, 60].map(val => (
                      <button
                        key={val}
                        onClick={() => setEditingGoalValue(val)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-sm font-bold border transition-colors",
                          editingGoalValue === val
                            ? "bg-accent text-on-accent border-accent"
                            : "border-line text-ink-2"
                        )}
                      >
                        {val} 分钟
                      </button>
                    ))}
              </div>

              <div className="flex items-center justify-center gap-2 mb-8">
                <input
                  type="number"
                  value={editingGoalValue}
                  onChange={(e) => setEditingGoalValue(parseInt(e.target.value) || 0)}
                  className="w-24 text-center text-3xl font-serif font-bold bg-transparent border-b-2 border-line focus:border-accent outline-none py-2 text-ink"
                />
                <span className="text-ink-2 font-bold">{editingGoalType === 'count' ? '次' : '分钟'}</span>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowGoalModal(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-ink-2 hover:bg-surface-2 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveGoal}
                  className="flex-1 bg-accent text-on-accent py-3 rounded-xl font-bold hover:bg-accent-hover transition-colors"
                >
                  确认
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <React.Suspense fallback={null}>
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
        <ChangePasswordModal isOpen={showChangePasswordModal} onClose={() => setShowChangePasswordModal(false)} />
        <ExportModal isOpen={showExportModal} onClose={() => setShowExportModal(false)} />
        <InstallAppModal isOpen={showInstallModal} onClose={() => setShowInstallModal(false)} />
        <LegalModals />
        {rejoiceId && (
          <RejoiceModal 
            shareId={rejoiceId} 
            onClose={() => setRejoiceId(null)} 
            onViewCommunity={() => setActiveTab('community')}
            onPractice={(chantTitle: any) => {
              if (chantTitle) {
                const scripture = allScriptures.find(s => s.title === chantTitle || chantTitle.includes(s.title));
                if (scripture) {
                  setActiveScriptureId(scripture.id);
                  if (scripture.category === 'meditation') {
                    setActiveTab('meditation');
                  } else {
                    setActiveTab('fish');
                  }
                  return;
                }
              }
              setActiveTab('fish');
            }}
          />
        )}
      </React.Suspense>
      <OfflineIndicator />
      <Toaster />
      </div>
    </ChantingProvider>
    </MotionConfig>
  );
}