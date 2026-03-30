import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster } from 'sonner';
import { Book, Heart, History, MessageCircle, Settings, Trophy, Sparkles, Loader2, Music, Play, Pause, Volume2, Wind, Plus, Trash2, Check, ChevronDown, Users, ThumbsUp, Globe, Leaf, Brain, Target, Share2, X, LogOut, Menu, Home, BookOpen, Moon, Clock, Sun, Download } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { useFirebaseSync } from './hooks/useFirebaseSync';
import { useFirebase } from './contexts/FirebaseContext';
import { doc, setDoc, deleteDoc, writeBatch, collection, query, where, orderBy, limit, onSnapshot, getDocs } from 'firebase/firestore';
import { db, auth } from './firebase';
import { handleFirestoreError, OperationType } from './utils/firebaseErrors';
import { containsBadWords } from './utils/badWords';
import { Dashboard } from './components/Dashboard';
import { WoodenFish } from './components/WoodenFish';
import { AudioManagement } from './components/AudioManagement';
import { practiceService } from './services/practiceService';

import { Meditation } from './components/Meditation';
import { MeritMap } from './components/MeritMap';
import { VowPractice } from './components/vow/VowPractice';
import { getScriptures, Scripture } from './constants';
import { useTranslation, LANGUAGES, Language } from './i18n';
import { CustomCalendar } from './components/CustomCalendar';
import { parseISO, format } from 'date-fns';
import { cn } from './lib/utils';
import { ThoughtCollector } from './components/ThoughtCollector';
import { GoodDeedCollector } from './components/GoodDeedCollector';
import { AuthModal } from './components/AuthModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { ExportModal } from './components/ExportModal';
import { InstallAppModal } from './components/InstallAppModal';
import { LegalModals } from './components/LegalModals';
import { RejoiceModal } from './components/RejoiceModal';
import { reportService } from './services/reportService';
import { identityService } from './services/identityService';
import { Country, City } from 'country-state-city';

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

export default function App() {
  const { t, language, setLanguage } = useTranslation();

  const [personalVow, setPersonalVow] = useState(() => localStorage.getItem('personal_vow') || "");
  const [isVowExpanded, setIsVowExpanded] = useState(false);

  useEffect(() => {
    const handleVowUpdate = () => {
      setPersonalVow(localStorage.getItem('personal_vow') || "");
    };
    window.addEventListener('vow_updated', handleVowUpdate);
    return () => window.removeEventListener('vow_updated', handleVowUpdate);
  }, []);

  const [count, setCount] = useState(() => {
    const saved = localStorage.getItem('zen_count');
    return saved ? parseInt(saved, 10) : 0;
  });
  
  const [vowInitialSection, setVowInitialSection] = useState<'menu' | 'coach' | 'wisdom'>('menu');

  const [rejoiceId, setRejoiceId] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const rejoice = urlParams.get('rejoice');
    if (rejoice) {
      setRejoiceId(rejoice);
    }
  }, []);

  const [activeTab, setActiveTab] = useState<'fish' | 'scripture' | 'assistant' | 'history' | 'meditation' | 'settings' | 'community' | 'vow' | 'merit' | 'dashboard'>('dashboard');
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const [selectedScripture, setSelectedScripture] = useState<Scripture>(getScriptures('zh-CN')[0]);
  const [selectedChant, setSelectedChant] = useState<string>(() => {
    return localStorage.getItem('zen_selected_chant') || "功德 +1";
  });

  const [customScriptures, setCustomScriptures] = useState<Scripture[]>(() => {
    const saved = localStorage.getItem('zen_custom_scriptures');
    return saved ? JSON.parse(saved) : [];
  });

  const allScriptures = [...getScriptures(language), ...customScriptures];

  const [activeScriptureId, setActiveScriptureId] = useState<string>(() => {
    return localStorage.getItem('zen_active_scripture_id') || getScriptures('zh-CN')[0].id;
  });

  const [scriptureGoals, setScriptureGoals] = useState<Record<string, number>>(() => {
    return practiceService.getSettings().scriptureGoals;
  });

  const [aiEnabled, setAiEnabled] = useState<boolean>(() => {
    return practiceService.getSettings().aiEnabled || false;
  });

  const [aiApiKey, setAiApiKey] = useState<string>(() => {
    return practiceService.getSettings().aiApiKey || '';
  });

  const [dailyCounts, setDailyCounts] = useState<Record<string, number>>(() => {
    return practiceService.getDailyPractice().scriptureCounts || {};
  });

  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingGoalValue, setEditingGoalValue] = useState(108);

  const activeScripture = allScriptures.find(s => s.id === activeScriptureId) || allScriptures[0];

  const [newScriptureTitle, setNewScriptureTitle] = useState("");
  const [newScriptureContent, setNewScriptureContent] = useState("");
  const [newScriptureCategory, setNewScriptureCategory] = useState<'sutra' | 'mantra' | 'name'>('name');
  const [showAddScripture, setShowAddScripture] = useState(false);

  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('zen_volume');
    return saved ? parseFloat(saved) : 0.8;
  });

  const [soundType, setSoundType] = useState<'standard' | 'crisp' | 'deep'>(() => {
    const saved = localStorage.getItem('zen_sound_type');
    return (saved as 'standard' | 'crisp' | 'deep') || 'standard';
  });

  const [customChants, setCustomChants] = useState<string[]>(() => {
    const saved = localStorage.getItem('zen_custom_chants');
    return saved ? JSON.parse(saved) : [];
  });

  const [theme, setTheme] = useState<'zen' | 'lotus' | 'sky' | 'dark'>(() => {
    return (localStorage.getItem('zen_theme') as any) || 'zen';
  });
  const [isSharing, setIsSharing] = useState(false);

  const [userProfile, setUserProfile] = useState(() => {
    const saved = localStorage.getItem('zen_user_profile');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.gender === 'other') {
        parsed.gender = '';
      }
      return parsed;
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
    localStorage.setItem('zen_user_profile', JSON.stringify(userProfile));
    window.dispatchEvent(new CustomEvent('user_profile_updated'));
    // Update community posts if the user's name changed
    setCommunityPosts(prev => prev.map(post => {
      if (post.isUserPost) {
        return { ...post, userName: userProfile.name || "静心居士" };
      }
      return post;
    }));
  }, [userProfile]);

  useEffect(() => {
    const handleProfileUpdate = () => {
      const saved = localStorage.getItem('zen_user_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        setUserProfile(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(parsed)) {
            return parsed;
          }
          return prev;
        });
      }
    };
    window.addEventListener('user_profile_updated', handleProfileUpdate);
    return () => window.removeEventListener('user_profile_updated', handleProfileUpdate);
  }, []);

  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>(() => {
    return (localStorage.getItem('zen_font_size') as any) || 'medium';
  });

  // Removed internal language state as it is now managed by useTranslation hook

  const [woodenFishAppearance, setWoodenFishAppearance] = useState<'fish' | 'lotus' | 'bowl'>(() => {
    return (localStorage.getItem('zen_fish_appearance') as any) || 'lotus';
  });

  const [meditationWoodenFishAppearance, setMeditationWoodenFishAppearance] = useState<'fish' | 'lotus' | 'bowl'>(() => {
    return (localStorage.getItem('zen_meditation_fish_appearance') as any) || 'lotus';
  });

  const [dedications, setDedications] = useState<{id: string, content: string, isDefault: boolean}[]>(() => {
    const saved = localStorage.getItem('zen_dedications');
    return saved ? JSON.parse(saved) : [
      {
        id: 'default',
        content: "愿以此功德，庄严佛净土。\n上报四重恩，下济三途苦。\n若有见闻者，悉发菩提心。\n尽此一报身，同生极乐国。",
        isDefault: true
      }
    ];
  });

  const [vows, setVows] = useState<{id: string, content: string, isDefault: boolean}[]>(() => {
    const saved = localStorage.getItem('zen_vows');
    return saved ? JSON.parse(saved) : [
      {
        id: 'default',
        content: "众生无边誓愿度，\n烦恼无尽誓愿断，\n法门无量誓愿学，\n佛道无上誓愿成。",
        isDefault: true
      }
    ];
  });

  const [meditationDedications, setMeditationDedications] = useState<{id: string, content: string, isDefault: boolean}[]>(() => {
    const saved = localStorage.getItem('zen_meditation_dedications');
    return saved ? JSON.parse(saved) : [
      {
        id: 'default',
        content: "愿以此禅修功德，\n回向法界众生，\n身心清净，\n福慧增长。",
        isDefault: true
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('zen_meditation_dedications', JSON.stringify(meditationDedications));
  }, [meditationDedications]);

  // Legacy state support (can be removed later or used for migration)
  const [customDedication, setCustomDedication] = useState(""); 
  const [customVow, setCustomVow] = useState("");

  const [newChantInput, setNewChantInput] = useState("");

  // Session State
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [sessionCount, setSessionCount] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem('zen_onboarding_seen');
  });
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [sessionFlowStep, setSessionFlowStep] = useState<'none' | 'dedication' | 'vow' | 'summary'>('none');
  const [lastSession, setLastSession] = useState<any>(null);
  const [history, setHistory] = useState<any[]>(() => {
    const saved = localStorage.getItem('zen_history');
    return saved ? JSON.parse(saved) : [];
  });

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
    setHistory(prev => [item, ...prev]);
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
    setHistory(prev => prev.filter(h => h.id !== id));
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
    const saved = localStorage.getItem('zen_user_exp');
    return saved ? parseInt(saved, 10) : 0;
  });

  const currentLevel = LEVELS.slice().reverse().find(l => userExp >= l.minExp) || LEVELS[0];
  const nextLevel = LEVELS.find(l => l.minExp > userExp);
  const progressToNext = nextLevel 
    ? ((userExp - currentLevel.minExp) / (nextLevel.minExp - currentLevel.minExp)) * 100 
    : 100;

  const [userStats, setUserStats] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('zen_user_stats');
    return saved ? JSON.parse(saved) : {};
  });

  const [rejoiceStats, setRejoiceStats] = useState(practiceService.getRejoiceStats());

  useEffect(() => {
    localStorage.setItem('zen_user_stats', JSON.stringify(userStats));
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
    woodenFishAppearance, setWoodenFishAppearance
  );

  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>(() => {
    const saved = localStorage.getItem('zen_community_posts');
    if (saved) return JSON.parse(saved);
    // Initial fake data
    return [
      { id: 1, userName: userProfile.name || "静心居士", chant: "心经", count: 7, dedication: "愿以此功德，回向给家人身体健康。", likes: 12, timestamp: Date.now() - 3600000, isUserPost: true },
      { id: 2, userName: "悟道者", chant: "南无阿弥陀佛", count: 108, dedication: "愿众生离苦得乐。", likes: 8, timestamp: Date.now() - 7200000, isUserPost: false },
    ];
  });

  useEffect(() => {
    localStorage.setItem('zen_user_exp', userExp.toString());
    window.dispatchEvent(new CustomEvent('zen_data_updated'));
  }, [userExp]);

  useEffect(() => {
    localStorage.setItem('zen_community_posts', JSON.stringify(communityPosts));
  }, [communityPosts]);

  useEffect(() => {
    const q = query(
      collection(db, 'shared_merits'),
      orderBy('timestamp', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
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
    localStorage.setItem('zen_custom_scriptures', JSON.stringify(customScriptures));
  }, [customScriptures]);

  useEffect(() => {
    localStorage.setItem('zen_active_scripture_id', activeScriptureId);
  }, [activeScriptureId]);

  useEffect(() => {
    localStorage.setItem('zen_count', count.toString());
  }, [count]);

  useEffect(() => {
    localStorage.setItem('zen_volume', volume.toString());
  }, [volume]);

  useEffect(() => {
    localStorage.setItem('zen_sound_type', soundType);
  }, [soundType]);

  useEffect(() => {
    localStorage.setItem('zen_theme', theme);
    // Apply theme colors
    const root = document.documentElement;
    if (theme === 'zen') {
      root.style.setProperty('--theme-bg', '#f5f5f0');
      root.style.setProperty('--theme-ink', '#2c2c2c');
      root.style.setProperty('--theme-accent', '#5A5A40');
    } else if (theme === 'lotus') {
      root.style.setProperty('--theme-bg', '#fff0f5');
      root.style.setProperty('--theme-ink', '#4a2c36');
      root.style.setProperty('--theme-accent', '#d65db1');
    } else if (theme === 'sky') {
      root.style.setProperty('--theme-bg', '#f0f8ff');
      root.style.setProperty('--theme-ink', '#1e3a5f');
      root.style.setProperty('--theme-accent', '#4682b4');
    } else if (theme === 'dark') {
      root.style.setProperty('--theme-bg', '#1a1a1a');
      root.style.setProperty('--theme-ink', '#e0e0e0');
      root.style.setProperty('--theme-accent', '#d4af37');
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('zen_font_size', fontSize);
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
    localStorage.setItem('zen_fish_appearance', woodenFishAppearance);
  }, [woodenFishAppearance]);

  useEffect(() => {
    localStorage.setItem('zen_meditation_fish_appearance', meditationWoodenFishAppearance);
  }, [meditationWoodenFishAppearance]);

  useEffect(() => {
    localStorage.setItem('zen_dedications', JSON.stringify(dedications));
  }, [dedications]);

  useEffect(() => {
    localStorage.setItem('zen_vows', JSON.stringify(vows));
  }, [vows]);

  useEffect(() => {
    localStorage.setItem('zen_custom_chants', JSON.stringify(customChants));
  }, [customChants]);

  useEffect(() => {
    localStorage.setItem('zen_custom_dedication', customDedication);
  }, [customDedication]);

  useEffect(() => {
    localStorage.setItem('zen_custom_vow', customVow);
  }, [customVow]);

  useEffect(() => {
    localStorage.setItem('zen_selected_chant', selectedChant);
  }, [selectedChant]);

  useEffect(() => {
    localStorage.setItem('zen_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    const handleSwitchTab = (e: any) => {
      setActiveTab(e.detail);
    };
    const handleAddExp = (e: any) => {
      setUserExp(prev => prev + e.detail);
    };
    window.addEventListener('switchTab', handleSwitchTab);
    window.addEventListener('addExp', handleAddExp);
    return () => {
      window.removeEventListener('switchTab', handleSwitchTab);
      window.removeEventListener('addExp', handleAddExp);
    };
  }, []);

  const handleSaveGoal = () => {
    const newGoals = { ...scriptureGoals, [activeScriptureId]: editingGoalValue };
    setScriptureGoals(newGoals);
    practiceService.saveSettings({ scriptureGoals: newGoals });
    setShowGoalModal(false);
  };

  const handleHit = () => {
    const increment = 1;

    setCount(prev => prev + increment);
    if (isSessionActive) {
      setSessionCount(prev => prev + increment);
    }
    const practice = practiceService.updateActivity('chanting', increment, activeScriptureId);
    practiceService.logMerit('chanting');
    if (practice.scriptureCounts) {
      setDailyCounts(practice.scriptureCounts);
    }
  };

  const [isGeneratingReflection, setIsGeneratingReflection] = useState(false);
  const [currentReflection, setCurrentReflection] = useState("");
  const [isProfileExpanded, setIsProfileExpanded] = useState(true);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const resetAccount = async () => {
    if (auth.currentUser) {
      const uid = auth.currentUser.uid;
      const collections = ['history', 'vows', 'goodDeeds', 'thoughts'];
      const batch = writeBatch(db);
      
      for (const colName of collections) {
        const colRef = collection(db, `users/${uid}/${colName}`);
        const snapshot = await getDocs(colRef);
        snapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
      }
      
      // Also delete the user document itself
      batch.delete(doc(db, 'users', uid));
      
      await batch.commit();
    }
    localStorage.clear();
    await auth.signOut();
    window.location.reload();
  };
  const [isPersonalSettingsExpanded, setIsPersonalSettingsExpanded] = useState(true);
  const [isChantingSettingsExpanded, setIsChantingSettingsExpanded] = useState(true);
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
    window.addEventListener('navigate_to_settings', handleNavigateToSettings);
    return () => window.removeEventListener('navigate_to_settings', handleNavigateToSettings);
  }, []);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [isGuest, setIsGuest] = useState(!fbUser && identityService.isGuest());
  const [userId, setUserId] = useState(fbUser ? fbUser.uid : identityService.getUserId());

  useEffect(() => {
    setIsGuest(!fbUser && identityService.isGuest());
    setUserId(fbUser ? fbUser.uid : identityService.getUserId());
  }, [fbUser]);

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

  const startSession = () => {
    setIsSessionActive(true);
    setSessionStartTime(Date.now());
    setSessionCount(0);
    setCurrentReflection("");
  };

  const finishSession = async () => {
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
    if (aiEnabled && aiApiKey) {
      setIsGeneratingReflection(true);
      try {
        const ai = new GoogleGenAI({ apiKey: aiApiKey });
        const response = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite-preview",
          contents: `我刚刚完成了一次修行。念诵内容是：${activeScripture.title}，念诵次数：${sessionCount}次，时长：${Math.floor(duration / 60)}分${duration % 60}秒。请作为禅师给我一句最精简、最省字、直击心灵的感悟（限30字以内）。`,
        });
        setCurrentReflection(response.text || "心如止水，功德圆满。");
      } catch (error) {
        console.error("AI Reflection Error:", error);
        setCurrentReflection("AI 禅师正在闭关，请检查您的 API Key 是否正确。");
      } finally {
        setIsGeneratingReflection(false);
      }
    } else {
      setCurrentReflection("心如止水，功德圆满。");
    }
  };

  const buddhaNames = getScriptures(language).filter(s => s.category === 'name');

  const finishOnboarding = () => {
    localStorage.setItem('zen_onboarding_seen', 'true');
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

  return (
    <div className="min-h-screen bg-zen-bg text-zen-ink selection:bg-zen-accent/20">
      {/* Onboarding Modal */}
      <AnimatePresence>
        {showOnboarding && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-zen-bg/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-[40px] p-10 shadow-2xl border border-zen-accent/5 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-zen-bg">
                <motion.div 
                  className="h-full bg-zen-accent"
                  initial={{ width: "0%" }}
                  animate={{ width: `${((onboardingStep + 1) / onboardingSteps.length) * 100}%` }}
                />
              </div>

              <div className="text-center">
                <motion.div
                  key={onboardingStep}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={cn(
                    "w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8 transition-colors duration-500",
                    onboardingSteps[onboardingStep].color
                  )}
                >
                  {React.createElement(onboardingSteps[onboardingStep].icon, { className: "w-10 h-10" })}
                </motion.div>

                <motion.h2 
                  key={`t-${onboardingStep}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-2xl font-serif font-bold mb-4"
                >
                  {onboardingSteps[onboardingStep].title}
                </motion.h2>

                <motion.p 
                  key={`d-${onboardingStep}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-zen-accent/60 leading-relaxed mb-10 text-sm"
                >
                  {onboardingSteps[onboardingStep].description}
                </motion.p>
              </div>

              <div className="flex gap-3">
                {onboardingStep > 0 && (
                  <button
                    onClick={() => setOnboardingStep(prev => prev - 1)}
                    className="flex-1 py-4 rounded-2xl font-bold text-zen-accent/60 hover:bg-zen-bg transition-colors"
                  >
                    上一步
                  </button>
                )}
                <button
                  onClick={() => {
                    if (onboardingStep < onboardingSteps.length - 1) {
                      setOnboardingStep(prev => prev + 1);
                    } else {
                      finishOnboarding();
                    }
                  }}
                  className="flex-[2] bg-zen-accent text-white py-4 rounded-2xl font-bold hover:opacity-90 transition-opacity"
                >
                  {onboardingStep === onboardingSteps.length - 1 ? "开启修行" : "下一步"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Summary / Dedication / Vow Modal */}
      <AnimatePresence>
        {showSummary && lastSession && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/20 backdrop-blur-sm">
            <div className="min-h-full flex items-center justify-center p-4 py-8">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white w-full max-w-md rounded-[32px] sm:rounded-[40px] p-6 sm:p-8 shadow-2xl border border-zen-accent/10 relative"
              >
                {(sessionFlowStep === 'dedication' || sessionFlowStep === 'vow') && (
                  <button 
                    onClick={() => {
                      setShowSummary(false);
                      setSessionFlowStep('none');
                    }}
                    className="absolute top-6 right-6 p-2 bg-zen-bg rounded-full text-zen-accent/60 hover:text-zen-accent hover:bg-zen-accent/10 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              {sessionFlowStep === 'dedication' && (
                <motion.div key="dedication" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-zen-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Heart className="w-8 h-8 text-zen-accent" />
                    </div>
                    <h2 className="text-2xl font-serif font-bold">至诚回向</h2>
                    <p className="text-xs text-zen-accent/40 uppercase tracking-widest font-bold mt-2">Dedication of Merit</p>
                  </div>
                  
                  <div className="bg-zen-bg/50 p-8 rounded-[32px] mb-8">
                    <p className="text-lg font-serif leading-relaxed text-center text-zen-ink/80 whitespace-pre-wrap">
                      {lastSession?.dedication}
                    </p>
                  </div>

                  <button 
                    onClick={() => {
                      practiceService.updateActivity('dedication', true);
                      practiceService.logMerit('dedication');
                      setSessionFlowStep('vow');
                    }}
                    className="w-full bg-zen-accent text-white py-4 rounded-2xl font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  >
                    至诚回向
                  </button>
                </motion.div>
              )}

              {sessionFlowStep === 'vow' && (
                <motion.div key="vow" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-zen-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Sparkles className="w-8 h-8 text-zen-accent" />
                    </div>
                    <h2 className="text-2xl font-serif font-bold">至诚发愿</h2>
                    <p className="text-xs text-zen-accent/40 uppercase tracking-widest font-bold mt-2">The Four Great Vows</p>
                  </div>
                  
                  <div className="bg-zen-bg/50 p-8 rounded-[32px] mb-8">
                    <p className="text-lg font-serif leading-relaxed text-center text-zen-ink/80 whitespace-pre-wrap">
                      {lastSession?.vow}
                    </p>
                  </div>

                  <button 
                    onClick={() => setSessionFlowStep('summary')}
                    className="w-full bg-zen-accent text-white py-4 rounded-2xl font-bold hover:opacity-90 transition-opacity"
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

                  <div className="mb-6 bg-white rounded-2xl border border-zen-accent/10 divide-y divide-zen-accent/5">
                    <label className="flex items-center justify-between p-4 cursor-pointer hover:bg-zen-bg/50 transition-colors rounded-t-2xl">
                      <div className="flex-1 pr-4">
                        <p className="font-bold text-sm text-zen-ink">分享至共修大厅</p>
                        <p className="text-xs text-zen-ink/60 mt-1">与同修分享功德，随喜赞叹</p>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={shareToCommunity}
                        onChange={(e) => setShareToCommunity(e.target.checked)}
                        className="w-5 h-5 rounded border-zen-accent/30 text-zen-accent focus:ring-zen-accent"
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
                      className="flex-1 bg-zen-accent text-white py-4 rounded-2xl font-bold hover:opacity-90 transition-opacity"
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
                      className="w-14 flex relative items-center justify-center bg-zen-bg text-zen-accent rounded-2xl font-bold hover:bg-zen-accent/10 transition-colors border border-zen-accent/20 disabled:opacity-50"
                    >
                      {isSharing && (
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black/80 text-white px-3 py-1.5 rounded-lg text-xs whitespace-nowrap animate-fade-in">
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

      {/* Header */}
      <header className="sticky top-0 z-[60] bg-zen-bg/90 backdrop-blur-md border-b border-zen-accent/10">
        <div className="max-w-4xl mx-auto px-2 sm:px-4 py-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 sm:gap-3 flex-1 min-w-0">
              <button 
                onClick={() => setIsSideMenuOpen(true)}
                className="p-1.5 sm:p-2 -ml-1 sm:-ml-2 text-zen-accent hover:bg-zen-accent/10 rounded-full transition-colors shrink-0"
                title="菜单"
              >
                <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <div 
                className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-zen-accent flex items-center justify-center text-white shrink-0 cursor-pointer"
                onClick={() => setActiveTab('dashboard')}
                title="主页"
              >
                <Heart className="w-3 h-3 sm:w-4 sm:h-4 fill-current" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm sm:text-base font-serif font-bold text-zen-ink truncate">愿禅助手</p>
                  <p className="text-xs text-zen-ink/70 font-medium hidden sm:block truncate">
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
                    "text-[10px] sm:text-xs text-purple-600/80 w-full cursor-pointer transition-all",
                    isVowExpanded ? "whitespace-normal break-words" : "truncate"
                  )} 
                  title={isVowExpanded ? "点击收起" : "点击展开愿力"}
                  onClick={() => setIsVowExpanded(!isVowExpanded)}
                >
                  {personalVow || t('default_vow_text')}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-6 shrink-0">
              <div className="flex flex-col items-end justify-center">
                <p className="text-[8px] sm:text-[10px] uppercase tracking-widest text-zen-accent/50 font-bold leading-none mb-0.5 sm:mb-1" title="连续修行天数">连续修行</p>
                <p className="text-xs sm:text-lg font-serif font-bold leading-none" title="连续修行天数">
                  {(() => {
                    if (history.length === 0) return "0 天";
                    const dates = history.map(h => {
                      const ts = h.startTime || h.endTime || h.timestamp || h.id;
                      return ts ? new Date(ts).toDateString() : null;
                    }).filter(Boolean) as string[];
                    const uniqueDates = [...new Set(dates)].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
                    
                    let streak = 0;
                    let lastDate = new Date();
                    
                    // Check if practiced today
                    if (uniqueDates[0] === lastDate.toDateString()) {
                      streak = 1;
                      lastDate.setDate(lastDate.getDate() - 1);
                    } else {
                      // Check if practiced yesterday
                      let yesterday = new Date();
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
                </p>
              </div>
              
              <ThoughtCollector className="!p-1.5 sm:!px-3 sm:!py-1.5 !text-xs rounded-full sm:rounded-full" iconOnlyOnMobile={true} />
              <GoodDeedCollector />

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
                className="flex items-center justify-center p-1.5 sm:px-3 sm:py-1.5 bg-white/50 hover:bg-white/80 rounded-full text-xs font-medium text-zen-ink/70 transition-colors border border-zen-accent/10 shrink-0"
                title={isGuest ? '游客登录' : '退出登录'}
              >
                {isGuest ? <Users className="w-4 h-4 sm:w-3.5 sm:h-3.5" /> : <LogOut className="w-4 h-4 sm:w-3.5 sm:h-3.5" />}
                <span className="hidden sm:inline ml-1.5">{isGuest ? '游客登录' : '退出登录'}</span>
              </button>
            </div>
        </div>
      </header>

      {/* Side Menu Drawer */}
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
              className="fixed top-0 left-0 bottom-0 w-[300px] sm:w-80 bg-zen-bg z-[80] shadow-2xl border-r border-zen-accent/10 flex flex-col"
            >
              <div className="p-5 sm:p-6 border-b border-zen-accent/10 flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-zen-accent flex items-center justify-center text-white shrink-0">
                    <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
                  </div>
                  <span className="font-serif font-bold text-base sm:text-lg whitespace-nowrap">愿禅助手</span>
                </div>
                <button 
                  onClick={() => setIsSideMenuOpen(false)}
                  className="p-1.5 sm:p-2 text-zen-accent/60 hover:bg-zen-accent/10 rounded-full transition-colors shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto py-3 sm:py-4 space-y-4 sm:space-y-5">
                {/* Main */}
                <div className="px-3">
                  <button
                    onClick={() => {
                      setActiveTab('dashboard');
                      setIsSideMenuOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all",
                      activeTab === 'dashboard' 
                        ? "bg-zen-accent text-white shadow-md" 
                        : "text-zen-ink/70 hover:bg-zen-accent/10 hover:text-zen-accent"
                    )}
                  >
                    <Home className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                    <span className="font-medium text-sm sm:text-base truncate">{t('tab_dashboard') || '首页'}</span>
                  </button>
                </div>

                {/* Practice */}
                <div className="px-3">
                  <p className="text-[10px] sm:text-xs font-bold text-zen-accent/50 uppercase tracking-wider mb-1.5 px-4">修行</p>
                  <div className="space-y-0.5">
                    {[
                      { id: 'fish', icon: BookOpen, label: t('tab_chant') || '木鱼诵经' },
                      { id: 'meditation', icon: Moon, label: t('tab_meditation') || '静坐冥想' },
                      { id: 'scripture', icon: Book, label: t('tab_scripture') || '经文' },
                      { id: 'vow', icon: Leaf, label: t('tab_vow') || '发愿' },
                    ].map(item => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id as any);
                          setIsSideMenuOpen(false);
                          if (item.id === 'vow') setVowInitialSection('menu');
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all",
                          activeTab === item.id 
                            ? "bg-zen-accent/10 text-zen-accent font-bold" 
                            : "text-zen-ink/70 hover:bg-zen-accent/5 hover:text-zen-accent"
                        )}
                      >
                        <item.icon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                        <span className="font-medium text-sm sm:text-base truncate">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Records */}
                <div className="px-3">
                  <p className="text-[10px] sm:text-xs font-bold text-zen-accent/50 uppercase tracking-wider mb-1.5 px-4">记录</p>
                  <div className="space-y-0.5">
                    {[
                      { id: 'history', icon: History, label: t('tab_history') || '功德簿' },
                      { id: 'merit', icon: Globe, label: t('tab_merit') || '功德地图' },
                    ].map(item => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id as any);
                          setIsSideMenuOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all",
                          activeTab === item.id 
                            ? "bg-zen-accent/10 text-zen-accent font-bold" 
                            : "text-zen-ink/70 hover:bg-zen-accent/5 hover:text-zen-accent"
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
                  <p className="text-[10px] sm:text-xs font-bold text-zen-accent/50 uppercase tracking-wider mb-1.5 px-4">系统</p>
                  <div className="space-y-0.5">
                    {[
                      { id: 'settings', icon: Settings, label: t('tab_settings') || '设置' },
                    ].map(item => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id as any);
                          setIsSideMenuOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all",
                          activeTab === item.id 
                            ? "bg-zen-accent/10 text-zen-accent font-bold" 
                            : "text-zen-ink/70 hover:bg-zen-accent/5 hover:text-zen-accent"
                        )}
                      >
                        <item.icon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                        <span className="font-medium text-sm sm:text-base truncate">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="p-6 border-t border-zen-accent/10 space-y-4 shrink-0">
                <button
                  onClick={() => {
                    setShowInstallModal(true);
                    setIsSideMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 text-zen-ink/70 hover:text-zen-accent transition-colors"
                >
                  <Download className="w-5 h-5 shrink-0" />
                  <span className="font-medium truncate">下载APP到手机</span>
                </button>
                
                <button
                  onClick={() => {
                    setShowExportModal(true);
                    setIsSideMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 text-zen-ink/70 hover:text-zen-accent transition-colors"
                >
                  <Book className="w-5 h-5 shrink-0" />
                  <span className="font-medium truncate">导出修行记录</span>
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
                    className="w-full flex items-center gap-3 text-red-500/70 hover:text-red-500 transition-colors"
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
                    className="w-full flex items-center gap-3 text-zen-accent/70 hover:text-zen-accent transition-colors"
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
          {activeTab === 'dashboard' && <Dashboard onNavigate={(tab) => {
            if (tab === 'assistant' || tab === 'vow-coach') {
              setVowInitialSection('coach');
              setActiveTab('vow');
            } else if (tab === 'vow-wisdom') {
              setVowInitialSection('wisdom');
              setActiveTab('vow');
            } else {
              setActiveTab(tab as any);
            }
          }} />}
          {activeTab === 'fish' && (
            <motion.div
              key="fish"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-start py-2 sm:py-6 space-y-2 sm:space-y-8 min-h-[60vh] sm:min-h-[70vh]"
            >
              <div className="w-full max-w-md space-y-2 sm:space-y-8 flex flex-col h-full">
                {/* Scripture Selection */}
                <div className="bg-white p-4 sm:p-8 rounded-2xl sm:rounded-3xl border border-zen-accent/5 shadow-sm shrink-0">
                  <div className="flex justify-between items-center mb-3 sm:mb-6">
                    <p className="text-xs sm:text-sm uppercase tracking-widest text-zen-accent/50 font-bold">{t('select_scripture')}</p>
                    <button 
                      onClick={() => {
                        setEditingGoalValue(scriptureGoals[activeScriptureId] || 108);
                        setShowGoalModal(true);
                      }}
                      className="text-sm sm:text-base bg-zen-accent/10 text-zen-accent px-3 py-2 rounded-xl hover:bg-zen-accent/20 font-bold flex items-center gap-1.5"
                    >
                      <Trophy className="w-4 h-4" />
                      {t('set_goal') || "定课"}
                    </button>
                  </div>
                  <div className="relative">
                    <select
                      value={activeScriptureId}
                      onChange={(e) => {
                        setActiveScriptureId(e.target.value);
                        const s = allScriptures.find(i => i.id === e.target.value);
                        if (s) setSelectedChant(s.title);
                      }}
                      className="w-full appearance-none bg-zen-bg/50 border border-zen-accent/10 rounded-xl px-4 py-3 sm:px-6 sm:py-4 text-lg sm:text-2xl font-bold text-zen-accent focus:outline-none focus:border-zen-accent/30 pr-12 truncate"
                    >
                      <optgroup label={t('buddha_name')}>
                        {allScriptures.filter(s => s.category === 'name').map(s => (
                          <option key={s.id} value={s.id}>{s.title}</option>
                        ))}
                      </optgroup>
                      <optgroup label={t('scripture_mantra')}>
                        {allScriptures.filter(s => s.category !== 'name' && s.category !== 'meditation').map(s => (
                          <option key={s.id} value={s.id}>{s.title}</option>
                        ))}
                      </optgroup>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zen-accent/50">
                      <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                  </div>
                  
                  {/* Session Control */}
                  {!isSessionActive && (
                    <div className="flex justify-center mt-2 sm:mt-4">
                      {!scriptureGoals[activeScriptureId] ? (
                        <button 
                          onClick={() => {
                            setEditingGoalValue(108);
                            setShowGoalModal(true);
                          }}
                          className="w-full bg-zen-accent/20 text-zen-accent py-2 sm:py-3 rounded-xl font-bold hover:bg-zen-accent/30 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                        >
                          <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />
                          请先设定目标
                        </button>
                      ) : (
                        <button 
                          onClick={startSession}
                          className="w-full bg-zen-accent text-white py-2 sm:py-3 rounded-xl font-bold shadow-lg hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 text-sm sm:text-base"
                        >
                          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                          {t('start_practice') || "开始诵经"}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Scripture Content Display */}
                {activeScripture.category !== 'name' && (
                  <div className="bg-white p-4 sm:p-8 rounded-2xl sm:rounded-3xl border border-zen-accent/5 shadow-sm max-h-48 sm:max-h-80 overflow-y-auto shrink-0">
                    <h3 className="text-center font-serif font-bold text-zen-accent mb-2 sm:mb-6 text-xl sm:text-3xl">{activeScripture.title}</h3>
                    <p className="text-zen-ink/90 font-serif leading-loose whitespace-pre-wrap text-center text-base sm:text-2xl">
                      {activeScripture.content}
                    </p>
                  </div>
                )}

                {/* Session Control */}
                {isSessionActive && (
                  <div className="flex justify-center shrink-0 mt-4 sm:mt-8">
                    <div className="flex flex-col items-center gap-2 sm:gap-6">
                      <div className="flex items-center gap-4 sm:gap-10 bg-white px-6 sm:px-12 py-4 sm:py-6 rounded-full border border-zen-accent/10 shadow-md">
                        <div className="text-center flex flex-col items-center">
                          <p className="text-sm sm:text-base uppercase tracking-widest text-zen-accent/50 font-bold mb-2">{t('session_merit')}</p>
                          <p className="text-6xl sm:text-8xl font-serif font-bold text-zen-accent tracking-tighter leading-none">
                            {sessionCount}
                          </p>
                          <p className="text-3xl sm:text-5xl text-zen-accent/40 font-serif font-bold tracking-tighter mt-1">
                            / {scriptureGoals[activeScriptureId] || 108}
                          </p>
                        </div>
                        <div className="w-px h-12 sm:h-16 bg-zen-accent/10" />
                        <button 
                          onClick={finishSession}
                          className="text-zen-accent font-bold hover:opacity-70 transition-opacity text-sm sm:text-xl px-2"
                        >
                          {t('finish_practice')}
                        </button>
                      </div>
                      <div className="flex items-center gap-6">
                        <button 
                          onClick={() => setSessionCount(0)}
                          className="text-xs sm:text-sm text-zen-accent/40 hover:text-zen-accent/80 transition-colors font-medium"
                        >
                          重置计数
                        </button>
                        <p className="text-xs sm:text-sm text-zen-accent/50 animate-pulse italic font-medium">{t('practicing')}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Wooden Fish */}
                <div className="flex-1 flex items-center justify-center min-h-[150px] sm:min-h-[200px]">
                  <div className="scale-75 sm:scale-90 origin-center">
                    <WoodenFish 
                      onHit={handleHit} 
                      floatingText={activeScripture.category === 'name' ? activeScripture.title : t('merit_plus_one')} 
                      volume={volume} 
                      soundType={soundType} 
                      appearance={woodenFishAppearance}
                      disabled={!isSessionActive}
                      disabledMessage="请先按开始诵经"
                    />
                  </div>
                </div>
                {/*
                <div className="bg-white p-6 rounded-3xl border border-zen-accent/5 shadow-sm">
                  <div className="flex justify-between items-end mb-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-zen-accent/50 font-bold">{t('merit_progress')}</p>
                      <p className="text-sm font-serif mt-1">{count} / 1000</p>
                    </div>
                    <p className="text-xs font-bold text-zen-accent">{Math.round(Math.min(100, (count / 1000) * 100))}%</p>
                  </div>
                  <div className="h-3 w-full bg-zen-bg rounded-full overflow-hidden p-0.5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (count / 1000) * 100)}%` }}
                      transition={{ type: "spring", stiffness: 100, damping: 20 }}
                      className="h-full bg-zen-accent rounded-full shadow-[0_0_10px_rgba(139,94,60,0.3)]"
                    />
                  </div>
                </div>
                */}


                {/* Goal Modal */}
                <AnimatePresence>
                  {showGoalModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/20 backdrop-blur-sm">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-xl"
                      >
                        <h3 className="text-lg font-bold mb-4 text-center">设定每日目标</h3>
                        <p className="text-sm text-center text-zen-accent/60 mb-6">{activeScripture.title}</p>
                        
                        <div className="flex justify-center flex-wrap gap-4 mb-6">
                          {[21, 49, 108, 1000, 10000, 100000].map(val => (
                            <button
                              key={val}
                              onClick={() => setEditingGoalValue(val)}
                              className={cn(
                                "px-4 py-2 rounded-xl text-sm font-bold border transition-colors",
                                editingGoalValue === val 
                                  ? "bg-zen-accent text-white border-zen-accent" 
                                  : "border-zen-accent/20 text-zen-accent/60"
                              )}
                            >
                              {val >= 1000 ? `${val / 1000}k` : val}
                            </button>
                          ))}
                        </div>

                        <input
                          type="number"
                          value={editingGoalValue}
                          onChange={(e) => setEditingGoalValue(parseInt(e.target.value) || 0)}
                          className="w-full text-center text-3xl font-serif font-bold bg-transparent border-b-2 border-zen-accent/10 focus:border-zen-accent outline-none py-2 mb-8"
                        />

                        <div className="flex gap-3">
                          <button
                            onClick={() => setShowGoalModal(false)}
                            className="flex-1 py-3 rounded-xl font-bold text-zen-accent/60 hover:bg-zen-bg transition-colors"
                          >
                            取消
                          </button>
                          <button
                            onClick={handleSaveGoal}
                            className="flex-1 bg-zen-accent text-white py-3 rounded-xl font-bold hover:opacity-90 transition-opacity"
                          >
                            确认
                          </button>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {activeTab === 'meditation' && (
            <motion.div
              key="meditation"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full space-y-8"
            >
              <Meditation onFinish={(session) => {
                const newSession = {
                  id: Date.now(),
                  chant: session.trackTitle,
                  count: Math.floor(session.duration / 60),
                  startTime: Date.now() - session.duration * 1000,
                  endTime: Date.now(),
                  duration: session.duration,
                  dedication: session.dedication,
                  vow: session.vow,
                  type: '禅修',
                  source: '禅修',
                };
                addHistoryItem(newSession);
              }} />
              
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
              <VowPractice 
                initialSection={vowInitialSection} 
                user={user} 
                onLevelUp={triggerLevelUpAnimation} 
              />
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
              <MeritMap theme={theme} />
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto w-full"
            >
              <div className="bg-white rounded-[40px] p-8 shadow-sm border border-zen-accent/5">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-bold">功德簿</h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowAddRecord(!showAddRecord)}
                      className="p-2 bg-zen-accent/10 text-zen-accent rounded-xl hover:bg-zen-accent/20 transition-colors"
                      title="补录功德"
                    >
                      <Plus className="w-5 h-5" />
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
                                <CustomCalendar 
                                  selectedDate={parseISO(selectedDate)} 
                                  onSelectDate={(date) => {
                                    setSelectedDate(format(date, 'yyyy-MM-dd'));
                                    setShowCalendarModal(false);
                                  }}
                                  recordDates={recordDates}
                                />
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
                      <div className="bg-zen-bg/30 rounded-3xl p-6 border border-zen-accent/10">
                        <h3 className="font-bold text-lg mb-4 text-zen-accent">补录功德</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-xs font-bold text-zen-accent/60 mb-1 uppercase tracking-wider">时间</label>
                            <input
                              type="datetime-local"
                              value={newRecordDate}
                              onChange={(e) => setNewRecordDate(e.target.value)}
                              className="w-full bg-white border border-zen-accent/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-zen-accent/30"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-zen-accent/60 mb-1 uppercase tracking-wider">修行内容</label>
                            <select
                              value={newRecordType}
                              onChange={(e) => setNewRecordType(e.target.value as any)}
                              className="w-full bg-white border border-zen-accent/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-zen-accent/30"
                            >
                              <option value="诵经">诵经</option>
                              <option value="禅修">禅修</option>
                              <option value="持咒">持咒</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-zen-accent/60 mb-1 uppercase tracking-wider">具体项目</label>
                            <select
                              value={newRecordChant}
                              onChange={(e) => setNewRecordChant(e.target.value)}
                              className="w-full bg-white border border-zen-accent/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-zen-accent/30"
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
                            <label className="block text-xs font-bold text-zen-accent/60 mb-1 uppercase tracking-wider">数量 (遍/声)</label>
                            <input
                              type="number"
                              min="1"
                              value={newRecordCount}
                              onChange={(e) => setNewRecordCount(parseInt(e.target.value) || 0)}
                              className="w-full bg-white border border-zen-accent/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-zen-accent/30"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-zen-accent/60 mb-1 uppercase tracking-wider">时长 (分钟)</label>
                            <input
                              type="number"
                              min="1"
                              value={newRecordDuration}
                              onChange={(e) => setNewRecordDuration(parseInt(e.target.value) || 0)}
                              className="w-full bg-white border border-zen-accent/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-zen-accent/30"
                            />
                          </div>
                        </div>
                        <div className="space-y-4 mb-4">
                          <div>
                            <label className="block text-xs font-bold text-zen-accent/60 mb-1 uppercase tracking-wider">功德回向 (选填)</label>
                            <textarea
                              value={newRecordDedication}
                              onChange={(e) => setNewRecordDedication(e.target.value)}
                              placeholder="愿以此功德，庄严佛净土..."
                              className="w-full bg-white border border-zen-accent/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-zen-accent/30 resize-none h-20"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-zen-accent/60 mb-1 uppercase tracking-wider">发愿 (选填)</label>
                            <textarea
                              value={newRecordVow}
                              onChange={(e) => setNewRecordVow(e.target.value)}
                              placeholder="我愿..."
                              className="w-full bg-white border border-zen-accent/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-zen-accent/30 resize-none h-20"
                            />
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => setShowAddRecord(false)}
                            className="flex-1 bg-white text-zen-accent/60 py-2 rounded-xl text-sm font-bold hover:bg-zen-accent/5 transition-colors"
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
                            className="flex-1 bg-zen-accent text-white py-2 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
                          >
                            确认补录
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {filteredHistory.length === 0 ? (
                  <div className="text-center py-20 text-zen-accent/30 italic">
                    该日暂无修行记录。
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
                          <p className="font-serif text-lg text-zen-accent">+{item.count}</p>
                          <p className="text-[10px] text-zen-accent/40 uppercase tracking-widest font-bold">功德</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
                <div className="bg-zen-accent/5 rounded-2xl p-3 border border-zen-accent/10 flex gap-2 items-center">
                  <div className="p-1.5 bg-white rounded-lg text-zen-accent shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <p className="text-[10px] text-teal-600 leading-relaxed">
                    随喜赞叹，是修心最快的法门之一。因为当你真心为别人的善而欢喜，你的心已经离开嫉妒，走向慈悲。随喜，是与善同行。赞叹，是让善在世间继续发光。
                  </p>
                </div>

                <div className="bg-white rounded-2xl p-4 shadow-sm border border-zen-accent/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-zen-accent" />
                    <span className="font-bold text-sm text-zen-ink">随喜赞叹</span>
                  </div>
                  <div className="flex gap-4 text-center">
                    <div>
                      <p className="text-[10px] text-zen-accent/50 uppercase tracking-widest font-bold">今日</p>
                      <p className="text-sm font-serif font-semibold">{rejoiceStats.today}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zen-accent/50 uppercase tracking-widest font-bold">本周</p>
                      <p className="text-sm font-serif font-semibold">{rejoiceStats.week}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zen-accent/50 uppercase tracking-widest font-bold">总计</p>
                      <p className="text-sm font-serif font-semibold">{rejoiceStats.total}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between px-2">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-zen-accent" />
                    {t('community_feed')}
                  </h3>
                  <div className="flex items-center gap-2">
                    <select
                      value={communityPeriod}
                      onChange={(e) => setCommunityPeriod(e.target.value as any)}
                      className="bg-zen-bg/50 border border-zen-accent/10 rounded-xl px-3 py-2 text-sm text-zen-ink focus:outline-none focus:border-zen-accent/30 hover:bg-zen-bg transition-colors cursor-pointer"
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
                          className="bg-zen-bg/50 border border-zen-accent/10 rounded-xl px-4 py-2 text-sm text-zen-ink focus:outline-none focus:border-zen-accent/30 flex items-center gap-2 hover:bg-zen-bg transition-colors"
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
                              <CustomCalendar 
                                selectedDate={parseISO(communitySelectedDate)} 
                                onSelectDate={(date) => {
                                  setCommunitySelectedDate(format(date, 'yyyy-MM-dd'));
                                  setShowCommunityCalendarModal(false);
                                }}
                                recordDates={[]}
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                </div>
                {filteredCommunityPosts.length === 0 ? (
                  <div className="text-center py-20 text-zen-accent/30 italic">
                    该时间段暂无共修记录。
                  </div>
                ) : (
                  filteredCommunityPosts.map((post) => (
                    <div key={post.id} className="bg-white rounded-[24px] p-6 shadow-sm border border-zen-accent/5">
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
                          const saved = localStorage.getItem('good_deed_history');
                          const history = saved ? JSON.parse(saved) : [];
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
              <div className="bg-white rounded-[40px] p-8 shadow-sm border border-zen-accent/5">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-zen-accent" />
                  {t('preferences')}
                </h2>

                <div className="space-y-8">
                  {['chewsj07@gmail.com'].includes(auth.currentUser?.email || '') && (
                    <div className="bg-white rounded-[40px] p-8 shadow-sm border border-zen-accent/5">
                      <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <Music className="w-5 h-5 text-zen-accent" />
                        音频管理 (Admin)
                      </h2>
                      <AudioManagement />
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
                            {identityService.isEmailUser() && (
                              <button
                                onClick={() => setShowChangePasswordModal(true)}
                                className="w-full py-3 bg-zen-bg/50 border border-zen-accent/20 text-zen-accent rounded-xl font-bold hover:bg-zen-bg transition-colors flex items-center justify-center gap-2"
                              >
                                修改密码 (Change Password)
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
                              <div className="flex gap-3">
                                {[
                                  { id: 'zen', label: t('theme_zen'), color: '#f5f5f0' },
                                  { id: 'lotus', label: t('theme_lotus'), color: '#fff0f5' },
                                  { id: 'sky', label: t('theme_sky'), color: '#f0f8ff' },
                                  { id: 'dark', label: t('theme_dark'), color: '#1a1a1a' }
                                ].map((t) => (
                                  <button
                                    key={t.id}
                                    onClick={() => setTheme(t.id as any)}
                                    className={cn(
                                      "flex-1 aspect-square rounded-2xl flex flex-col items-center justify-center gap-2 border-2 transition-all",
                                      theme === t.id ? "border-zen-accent scale-105 shadow-md" : "border-transparent hover:scale-105"
                                    )}
                                    style={{ backgroundColor: t.color }}
                                  >
                                    <div className={cn("w-4 h-4 rounded-full", theme === t.id ? "bg-zen-accent" : "bg-black/10")} />
                                    <span className={cn("text-xs font-bold", t.id === 'dark' ? "text-gray-400" : "text-zen-accent")}>{t.label}</span>
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
                                        ? "bg-zen-accent text-white border-zen-accent shadow-md"
                                        : "bg-zen-bg/50 text-zen-accent border-zen-accent/10 hover:border-zen-accent/30"
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
                                        ? "bg-zen-accent text-white border-zen-accent shadow-md"
                                        : "bg-zen-bg/50 text-zen-accent border-zen-accent/10 hover:border-zen-accent/30"
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
                                        ? "bg-zen-accent text-white border-zen-accent"
                                        : "bg-zen-bg/50 text-zen-accent border-zen-accent/10 hover:border-zen-accent/30"
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
                                        ? "bg-zen-accent text-white border-zen-accent shadow-md"
                                        : "bg-zen-bg/50 text-zen-accent border-zen-accent/10 hover:border-zen-accent/30"
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

              {/* AI Zen Master */}
              <div className="bg-white rounded-[40px] p-8 shadow-sm border border-zen-accent/5" ref={aiSettingsRef}>
                <button 
                  onClick={() => setIsAiSettingsExpanded(!isAiSettingsExpanded)}
                  className="w-full flex items-center justify-between text-xl font-bold mb-2 hover:text-zen-accent transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-zen-accent" />
                    AI 禅师 (AI Zen Master)
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
                      <div className="space-y-6 pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-sm font-bold text-zen-accent/70 mb-1">开启 AI 禅师感悟</h3>
                            <p className="text-xs text-zen-accent/50">在修行结束后获取专属的禅意感悟</p>
                          </div>
                          <button
                            onClick={() => {
                              const newVal = !aiEnabled;
                              setAiEnabled(newVal);
                              practiceService.saveSettings({ ...practiceService.getSettings(), aiEnabled: newVal });
                            }}
                            className={cn(
                              "w-12 h-6 rounded-full transition-colors relative",
                              aiEnabled ? "bg-zen-accent" : "bg-zen-accent/20"
                            )}
                          >
                            <motion.div
                              className="w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm"
                              animate={{ left: aiEnabled ? "26px" : "2px" }}
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            />
                          </button>
                        </div>

                        {aiEnabled && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="space-y-4"
                          >
                            <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
                              <p className="text-xs text-amber-800/80 leading-relaxed">
                                <b>提示：</b>为了保证应用永久免费，AI 禅师功能需要您提供自己的 Gemini API Key。
                                <br />
                                您可以前往 <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-amber-600 underline font-bold">Google AI Studio</a> 免费申请一个 Key。
                              </p>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-zen-accent/60 mb-2">您的 Gemini API Key</label>
                              <input
                                type="password"
                                value={aiApiKey}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setAiApiKey(val);
                                  practiceService.saveSettings({ ...practiceService.getSettings(), aiApiKey: val });
                                }}
                                placeholder="AIzaSy..."
                                className="w-full bg-zen-bg/50 border border-zen-accent/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-zen-accent font-mono"
                              />
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Feedback */}
              <div className="bg-white rounded-[40px] p-8 shadow-sm border border-zen-accent/5">
                <button 
                  onClick={() => setIsFeedbackExpanded(!isFeedbackExpanded)}
                  className="w-full flex items-center justify-between text-xl font-bold mb-2 hover:text-zen-accent transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-zen-accent" />
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
                        <p className="text-sm text-zen-ink/70">
                          如果您在使用过程中遇到任何问题，或有任何建议，欢迎告诉我们。您的反馈将帮助我们不断改进。
                        </p>
                        <textarea 
                          placeholder="请在此输入您的反馈意见..." 
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                          className="w-full h-32 bg-zen-bg/50 border border-zen-accent/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-zen-accent resize-none"
                        ></textarea>
                        {feedbackSuccess && (
                          <div className="p-3 bg-green-50 text-green-600 text-sm rounded-xl border border-green-100 flex items-center gap-2">
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
                          className="w-full bg-zen-accent text-white py-3 rounded-2xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
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
              <div className="bg-white rounded-[40px] p-8 shadow-sm border border-zen-accent/5">
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
                              className="flex-1 bg-zen-bg border border-zen-accent/20 text-zen-accent py-3 rounded-2xl font-bold hover:bg-zen-accent/5 transition-colors text-sm"
                            >
                              {t('export_backup')}
                            </button>
                            <label className="flex-1 bg-zen-accent text-white py-3 rounded-2xl font-bold hover:opacity-90 transition-opacity cursor-pointer text-center text-sm">
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
                        <div className="border-t border-zen-accent/10 pt-6">
                          <h3 className="text-sm font-bold text-red-500 mb-3 flex items-center gap-2">
                            <Trash2 className="w-4 h-4" />
                            清除所有数据
                          </h3>
                          <p className="text-xs text-zen-accent/60 mb-4 leading-relaxed">
                            此操作将清除您设备上的所有本地数据（包括功德、历史记录、设置和冥想音频），且不可恢复。如果您已登录，云端数据不会被删除。
                          </p>
                          {!showClearConfirm ? (
                            <button 
                              onClick={() => setShowClearConfirm(true)}
                              className="w-full bg-red-50 border border-red-200 text-red-600 py-3 rounded-2xl font-bold hover:bg-red-100 transition-colors text-sm"
                            >
                              清除所有本地数据
                            </button>
                          ) : (
                            <div className="flex gap-4">
                              <button 
                                onClick={() => setShowClearConfirm(false)}
                                className="flex-1 bg-zen-bg border border-zen-accent/20 text-zen-accent py-3 rounded-2xl font-bold hover:bg-zen-accent/5 transition-colors text-sm"
                              >
                                取消
                              </button>
                              <button 
                                onClick={() => {
                                  localStorage.clear();
                                  indexedDB.deleteDatabase('ZenMeditationDB');
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
                        <div className="border-t border-zen-accent/10 pt-6">
                          {!isGuest ? (
                            <button
                              onClick={async () => {
                                if (fbUser) {
                                  await auth.signOut();
                                }
                                identityService.logout();
                                window.dispatchEvent(new CustomEvent('auth_state_changed'));
                              }}
                              className="w-full bg-zen-bg border border-zen-accent/20 text-zen-accent py-3 rounded-2xl font-bold hover:bg-zen-accent/5 transition-colors text-sm flex items-center justify-center gap-2"
                            >
                              <LogOut className="w-4 h-4" />
                              退出登录 (Logout)
                            </button>
                          ) : (
                            <button
                              onClick={() => setShowAuthModal(true)}
                              className="w-full bg-zen-accent text-white py-3 rounded-2xl font-bold hover:opacity-90 transition-opacity text-sm flex items-center justify-center gap-2"
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
                            <button onClick={() => window.dispatchEvent(new CustomEvent('open-terms-modal'))} className="hover:text-zen-accent underline transition-colors">
                              服务条款 (Terms of Service)
                            </button>
                            <span>|</span>
                            <button onClick={() => window.dispatchEvent(new CustomEvent('open-privacy-modal'))} className="hover:text-zen-accent underline transition-colors">
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
                          <p className="text-xs text-zen-accent/40 font-mono">
                            Version 1.0.0
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
            <motion.div
              key="scripture"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto w-full space-y-6"
            >
              {/* Add New Scripture Button */}
              <div className="flex justify-end">
                <button
                  onClick={() => setShowAddScripture(!showAddScripture)}
                  className="flex items-center gap-2 bg-zen-accent text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:opacity-90 transition-opacity"
                >
                  <Plus className="w-4 h-4" />
                  {t('add_scripture_btn')}
                </button>
              </div>

              {/* Add New Scripture Form */}
              <AnimatePresence>
                {showAddScripture && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-white rounded-[32px] p-6 shadow-sm border border-zen-accent/5 mb-6">
                      <h3 className="font-bold text-lg mb-4">{t('add_new_content')}</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-zen-accent/60 mb-1 uppercase tracking-wider">{t('type')}</label>
                          <div className="flex gap-2">
                            {[
                              { id: 'name', label: t('buddha_name') },
                              { id: 'sutra', label: t('scripture_category_sutra') },
                              { id: 'mantra', label: t('scripture_category_mantra') }
                            ].map(type => (
                              <button
                                key={type.id}
                                onClick={() => setNewScriptureCategory(type.id as any)}
                                className={cn(
                                  "flex-1 py-2 rounded-xl text-sm font-bold transition-colors border",
                                  newScriptureCategory === type.id
                                    ? "bg-zen-accent text-white border-zen-accent"
                                    : "bg-zen-bg/50 text-zen-accent border-zen-accent/10 hover:border-zen-accent/30"
                                )}
                              >
                                {type.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zen-accent/60 mb-1 uppercase tracking-wider">{t('title')}</label>
                          <input
                            type="text"
                            value={newScriptureTitle}
                            onChange={(e) => setNewScriptureTitle(e.target.value)}
                            placeholder={t('title_placeholder')}
                            className="w-full bg-zen-bg/50 border border-zen-accent/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zen-accent/30"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zen-accent/60 mb-1 uppercase tracking-wider">{t('content')}</label>
                          <textarea
                            value={newScriptureContent}
                            onChange={(e) => setNewScriptureContent(e.target.value)}
                            placeholder={t('content_placeholder')}
                            rows={4}
                            className="w-full bg-zen-bg/50 border border-zen-accent/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zen-accent/30 resize-none"
                          />
                        </div>
                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={() => setShowAddScripture(false)}
                            className="flex-1 bg-zen-bg text-zen-accent py-3 rounded-xl font-bold hover:bg-zen-accent/5 transition-colors"
                          >
                            {t('cancel')}
                          </button>
                          <button
                            onClick={() => {
                              if (newScriptureTitle.trim() && newScriptureContent.trim()) {
                                const newScripture: Scripture = {
                                  id: `custom-${Date.now()}`,
                                  title: newScriptureTitle.trim(),
                                  content: newScriptureContent.trim(),
                                  category: newScriptureCategory
                                };
                                setCustomScriptures(prev => [...prev, newScripture]);
                                setNewScriptureTitle("");
                                setNewScriptureContent("");
                                setShowAddScripture(false);
                              }
                            }}
                            className="flex-1 bg-zen-accent text-white py-3 rounded-xl font-bold hover:opacity-90 transition-opacity"
                          >
                            {t('confirm_add')}
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Scripture List */}
              <div className="space-y-4">
                {allScriptures.map((scripture) => (
                  <div 
                    key={scripture.id}
                    className={cn(
                      "bg-white rounded-[32px] p-6 shadow-sm border transition-all",
                      activeScriptureId === scripture.id 
                        ? "border-zen-accent ring-1 ring-zen-accent/20" 
                        : "border-zen-accent/5 hover:border-zen-accent/20"
                    )}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn(
                            "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider",
                            scripture.category === 'name' ? "bg-amber-100 text-amber-700" :
                            scripture.category === 'sutra' ? "bg-blue-100 text-blue-700" :
                            scripture.category === 'mantra' ? "bg-purple-100 text-purple-700" :
                            "bg-gray-100 text-gray-700"
                          )}>
                            {scripture.category === 'name' ? t('buddha_name') : 
                             scripture.category === 'sutra' ? t('scripture_category_sutra') : 
                             scripture.category === 'mantra' ? t('scripture_category_mantra') : t('scripture_category_other')}
                          </span>
                          <h3 className="font-bold text-lg text-zen-ink">{scripture.title}</h3>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {scripture.id.startsWith('custom-') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(t('confirm_delete_scripture'))) {
                                setCustomScriptures(prev => prev.filter(s => s.id !== scripture.id));
                                if (activeScriptureId === scripture.id) {
                                  setActiveScriptureId(allScriptures[0].id);
                                }
                              }
                            }}
                            className="p-2 text-zen-accent/40 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setActiveScriptureId(scripture.id);
                            // Sync legacy
                            setSelectedChant(scripture.title);
                          }}
                          className={cn(
                            "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1",
                            activeScriptureId === scripture.id
                              ? "bg-zen-accent text-white"
                              : "bg-zen-bg text-zen-accent hover:bg-zen-accent/10"
                          )}
                        >
                          {activeScriptureId === scripture.id ? (
                            <>
                              <Check className="w-3 h-3" />
                              {t('chanting_status')}
                            </>
                          ) : (
                            t('select_status')
                          )}
                        </button>
                      </div>
                    </div>
                    
                    <div className="bg-zen-bg/30 rounded-2xl p-4">
                      <p className="text-sm text-zen-ink/70 font-serif line-clamp-3 whitespace-pre-wrap">
                        {scripture.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}


        </AnimatePresence>
      </main>

      {/* Fixed Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-md border-t border-zen-accent/10 pb-safe pt-2 px-4 z-50">
        <div className="flex justify-around items-center max-w-2xl mx-auto">
          {[
            { id: 'dashboard', icon: Target, label: t('tab_dashboard') },
            { id: 'fish', icon: Heart, label: t('tab_chant') },
            { id: 'meditation', icon: Wind, label: t('tab_meditation') },
            { id: 'community', icon: Users, label: t('tab_community') },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                if (tab.id === 'vow') {
                  setVowInitialSection('menu');
                }
              }}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-xl transition-all flex-1 min-w-0",
                activeTab === tab.id 
                  ? "text-zen-accent" 
                  : "text-zen-accent/40 hover:text-zen-accent/60"
              )}
            >
              <tab.icon className={cn("w-6 h-6 shrink-0", activeTab === tab.id && "fill-current")} />
              <span className="text-[10px] font-bold truncate w-full text-center">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
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
          onPractice={(chantTitle) => {
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
      <Toaster />
    </div>
  );
}
