import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, Wind, Music, Volume2, Timer, Sparkles, Upload, FileAudio, Trash2, Edit2, ArrowUpDown, SortAsc, Clock, Check, X, Link as LinkIcon } from 'lucide-react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { cn } from '../lib/utils';
import { useTranslation } from '../i18n';
import { practiceService } from '../services/practiceService';

const TRACKS: any[] = [];

export const Meditation: React.FC<{ onFinish?: (session: any) => void }> = ({ onFinish }) => {
  const { t } = useTranslation();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(15 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [breathingText, setBreathingText] = useState(t('inhale'));
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [localTracks, setLocalTracks] = useState<any[]>([]);
  const [firestoreTracks, setFirestoreTracks] = useState<any[]>([]);
  const [lastSavedProgress, setLastSavedProgress] = useState<Record<string, { currentTime: number, timeLeft: number }>>({});
  const [selectedDuration, setSelectedDuration] = useState(15); // Default 15 mins
  const [volume, setVolume] = useState(0.7);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [sortOrder, setSortOrder] = useState<'newest' | 'name'>('newest');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isLooping, setIsLooping] = useState(true);
  const [showDedicationModal, setShowDedicationModal] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sound effect for completion
  const completionSoundRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    completionSoundRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); // Gentle bell sound
    completionSoundRef.current.volume = 0.5;
  }, []);
  const DB_NAME = 'ZenMeditationDB';
  const STORE_NAME = 'tracks';

  const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  };

  const saveTrackToDB = async (track: any, blob: Blob) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.put({ ...track, blob });
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
    });
  };

  const loadTracksFromDB = async () => {
    const db = await initDB();
    return new Promise<any[]>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => {
        const tracks = request.result.map(item => ({
          ...item,
          url: URL.createObjectURL(item.blob)
        }));
        resolve(tracks);
      };
      request.onerror = () => reject(request.error);
    });
  };

  const deleteTrackFromDB = async (id: string) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.delete(id);
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
    });
  };

  // Load tracks from DB on mount
  useEffect(() => {
    loadTracksFromDB().then(tracks => {
      setLocalTracks(tracks);
      if (tracks.length > 0) {
        selectTrack(tracks[0]);
      }
    });
  }, []);

  // Load tracks from Firestore
  useEffect(() => {
    const q = query(collection(db, 'audioResources'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setFirestoreTracks(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        url: doc.data().audioUrl,
        isUrl: true
      })));
    });
    return () => unsubscribe();
  }, []);

  // Load progress from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('meditation_progress');
    if (saved) {
      try {
        setLastSavedProgress(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved progress", e);
      }
    }
  }, []);

  // Save progress to localStorage (throttled)
  const lastSaveTimeRef = useRef<number>(0);
  const saveTrackProgress = (trackId: string, currentTime: number, timeLeft: number) => {
    const now = Date.now();
    if (now - lastSaveTimeRef.current < 2000) return; // Save every 2 seconds max
    
    lastSaveTimeRef.current = now;
    const newProgress = {
      ...lastSavedProgress,
      [trackId]: { currentTime, timeLeft }
    };
    setLastSavedProgress(newProgress);
    localStorage.setItem('meditation_progress', JSON.stringify(newProgress));
  };

  const allTracks = [...firestoreTracks, ...localTracks, ...TRACKS].sort((a, b) => {
    if (sortOrder === 'name') {
      return a.title.localeCompare(b.title);
    }
    // Default: newest first (based on id which contains timestamp for local tracks)
    return b.id.localeCompare(a.id);
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      setAudioError(t('invalid_audio'));
      return;
    }

    const url = URL.createObjectURL(file);
    const newTrack = {
      id: `local-${file.name}-${file.size}`,
      title: file.name.replace(/\.[^/.]+$/, ""),
      description: t('local_upload'),
      url: url,
      duration: t('unknown_duration'),
      isLocal: true
    };

    // Save to IndexedDB for persistence
    try {
      await saveTrackToDB(newTrack, file);
    } catch (err) {
      console.error("Failed to save track to DB", err);
    }

    setLocalTracks(prev => {
      const exists = prev.find(t => t.id === newTrack.id);
      if (exists) return prev;
      return [newTrack, ...prev];
    });
    
    selectTrack(newTrack);
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeTrack = async (trackId: string) => {
    const trackToRemove = localTracks.find(t => t.id === trackId);
    if (trackToRemove) {
      URL.revokeObjectURL(trackToRemove.url);
    }
    
    try {
      await deleteTrackFromDB(trackId);
    } catch (err) {
      console.error("Failed to delete track from DB", err);
    }
    
    if (String(currentTrack?.id) === String(trackId)) {
      const remainingTracks = localTracks.filter(t => t.id !== trackId);
      if (remainingTracks.length > 0) {
        selectTrack(remainingTracks[0]);
      } else {
        setCurrentTrack(null);
        setIsPlaying(false);
        setIsTimerRunning(false);
      }
    }
    
    setLocalTracks(prev => prev.filter(t => t.id !== trackId));
    
    const newProgress = { ...lastSavedProgress };
    delete newProgress[trackId];
    setLastSavedProgress(newProgress);
    localStorage.setItem('meditation_progress', JSON.stringify(newProgress));
  };

  const renameTrack = async (trackId: string, title: string) => {
    if (!title.trim()) return;
    
    const track = localTracks.find(t => t.id === trackId);
    if (!track) return;

    const updatedTrack = { ...track, title };
    
    // Update state
    setLocalTracks(prev => prev.map(t => t.id === trackId ? updatedTrack : t));
    if (currentTrack?.id === trackId) {
      setCurrentTrack(updatedTrack);
    }

    // Update IndexedDB
    try {
      const db = await initDB();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(trackId);
      request.onsuccess = () => {
        const data = request.result;
        if (data) {
          data.title = title;
          store.put(data);
        }
      };
    } catch (err) {
      console.error("Failed to rename track in DB", err);
    }

    setRenamingId(null);
  };

  const fixGoogleDriveUrl = (url: string) => {
    if (url.includes('drive.google.com')) {
      const match = url.match(/\/file\/d\/([^\/]+)/) || url.match(/id=([^\&]+)/);
      if (match && match[1]) {
        return `https://drive.google.com/uc?export=download&id=${match[1]}`;
      }
    }
    return url;
  };

  const handleUrlImport = async () => {
    if (!importUrl.trim()) return;
    
    const fixedUrl = fixGoogleDriveUrl(importUrl.trim());
    const newTrack = {
      id: `url-${Date.now()}`,
      title: t('import_audio') + " " + new Date().toLocaleTimeString(),
      description: t('network_import'),
      url: fixedUrl,
      duration: t('unknown_duration'),
      isLocal: true,
      isUrl: true
    };

    // For URLs, we don't save the blob to IndexedDB, just the metadata
    try {
      const db = await initDB();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.put(newTrack);
    } catch (err) {
      console.error("Failed to save URL track to DB", err);
    }

    setLocalTracks(prev => [newTrack, ...prev]);
    selectTrack(newTrack);
    setImportUrl("");
    setShowUrlInput(false);
  };

  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setBreathingText(prev => prev === t('inhale') ? t('exhale') : t('inhale'));
      }, 4000); // 4 seconds inhale, 4 seconds exhale
    } else {
      setBreathingText(t('inhale'));
    }
    return () => clearInterval(interval);
  }, [isPlaying, t]);

  useEffect(() => {
    let interval: any;
    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      setIsPlaying(false);
      if (audioRef.current) audioRef.current.pause();
      
      // Play completion sound
      if (completionSoundRef.current) {
        completionSoundRef.current.play().catch(e => {
          console.error("Failed to play completion sound", e);
          // Fallback: try playing a new audio instance if the ref one fails
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          audio.play().catch(e2 => console.error("Fallback sound failed", e2));
        });
      }

      // Record practice progress
      practiceService.updateActivity('meditation', selectedDuration);
      practiceService.logMerit('meditation');

      // Show dedication modal
      setSessionDuration(selectedDuration);
      setShowDedicationModal(true);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeLeft, selectedDuration]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
    setIsTimerRunning(!isPlaying);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const selectTrack = (track: any) => {
    setCurrentTrack(track);
    
    const saved = lastSavedProgress[track.id];
    
    if (saved) {
      setTimeLeft(saved.timeLeft);
    } else {
      setTimeLeft(selectedDuration * 60);
    }
    
    setIsPlaying(false);
    setIsTimerRunning(false);
    setAudioError(null);
    setIsLoading(true);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.load();
    }
  };

  const handleDurationChange = (mins: number) => {
    setSelectedDuration(mins);
    if (!isPlaying) {
      setTimeLeft(mins * 60);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current && currentTrack) {
      setAudioCurrentTime(audioRef.current.currentTime);
      if (isPlaying) {
        saveTrackProgress(currentTrack.id, audioRef.current.currentTime, timeLeft);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setAudioCurrentTime(time);
    }
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    let isMounted = true;

    const handlePlay = async () => {
      try {
        if (isPlaying) {
          setAudioError(null);
          // Add a small delay and user interaction check
          await audio.play();
        } else {
          audio.pause();
        }
      } catch (err: any) {
        if (isMounted && isPlaying) {
          // AbortError is expected when play() is interrupted by pause()
          if (err.name !== 'AbortError') {
            console.error("Audio play failed:", err.message);
            // If autoplay is blocked, show a message or try to recover
            if (err.name === 'NotAllowedError') {
                setAudioError(t('click_to_play' as any));
            } else {
                setAudioError(t('play_failed' as any) + err.message);
            }
            setIsPlaying(false);
            setIsTimerRunning(false);
          }
        }
      }
    };

    handlePlay();

    return () => {
      isMounted = false;
    };
  }, [isPlaying]);

  return (
    <div className="w-full max-w-4xl mx-auto">
      <AnimatePresence>
        {showDedicationModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-[40px] p-8 shadow-2xl border border-zen-accent/10 relative max-h-[85vh] flex flex-col"
            >
              <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-zen-accent/5 to-transparent pointer-events-none" />
              
              <div className="text-center mb-8 relative z-10 flex-shrink-0">
                <div className="w-16 h-16 bg-zen-accent text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-zen-accent/20">
                  <Check className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-serif font-bold text-zen-ink mb-2">{t('meditation_completed')}</h2>
                <p className="text-zen-accent/60 text-sm">{t('meditation_title')}</p>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-6 relative z-10">
                <div className="bg-zen-bg/50 p-6 rounded-3xl text-center">
                  <p className="text-xs text-zen-accent/50 uppercase tracking-widest font-bold mb-2">{t('session_duration')}</p>
                  <p className="text-3xl font-serif font-bold text-zen-accent">{sessionDuration} {t('minutes')}</p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-center font-bold text-zen-accent/80 text-sm">{t('dedication')}</h3>
                  <div className="bg-zen-bg/30 p-4 rounded-2xl border border-zen-accent/5">
                    <p className="text-center font-serif text-zen-ink/80 whitespace-pre-wrap leading-relaxed text-sm">
                      {JSON.parse(localStorage.getItem('zen_meditation_dedications') || '[]').find((d: any) => d.isDefault)?.content || t('default_meditation_dedication')}
                    </p>
                  </div>
                  
                  <h3 className="text-center font-bold text-zen-accent/80 text-sm mt-4">发愿</h3>
                  <div className="bg-zen-bg/30 p-4 rounded-2xl border border-zen-accent/5">
                    <p className="text-center font-serif text-zen-ink/80 whitespace-pre-wrap leading-relaxed text-sm">
                      {JSON.parse(localStorage.getItem('zen_vows') || '[]').find((v: any) => v.isDefault)?.content || '愿以此禅修功德，回向法界众生，身心清净，福慧增长。'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-6 mt-auto flex-shrink-0 relative z-10">
                <button
                  onClick={() => {
                    practiceService.updateActivity('dedication', true);
                    setShowDedicationModal(false);
                    if (onFinish) {
                      const dedication = JSON.parse(localStorage.getItem('zen_meditation_dedications') || '[]').find((d: any) => d.isDefault)?.content || t('default_meditation_dedication');
                      const vow = JSON.parse(localStorage.getItem('zen_vows') || '[]').find((v: any) => v.isDefault)?.content || '愿以此禅修功德，回向法界众生，身心清净，福慧增长。';
                      onFinish({
                        duration: sessionDuration,
                        trackTitle: currentTrack?.title || '未知音频',
                        dedication: dedication,
                        vow: vow
                      });
                    }
                  }}
                  className="w-full bg-zen-accent text-white py-4 rounded-2xl font-bold hover:opacity-90 transition-opacity shadow-lg shadow-zen-accent/20"
                >
                  {t('finish')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {currentTrack && (
        <audio 
          ref={audioRef} 
          src={currentTrack.url} 
          loop={isLooping}
          preload="auto"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={() => {
            if (audioRef.current) {
              setAudioDuration(audioRef.current.duration);
            }
          }}
          onEnded={() => {
            setIsPlaying(false);
            setIsTimerRunning(false);
          }}
          onLoadStart={() => setIsLoading(true)}
          onCanPlay={() => {
            setAudioError(null);
            setIsLoading(false);
            if (audioRef.current) {
              setAudioDuration(audioRef.current.duration);
              setAudioCurrentTime(audioRef.current.currentTime);
            }
            // Only set resume position if we are not already playing and it's a fresh load
            if (lastSavedProgress[currentTrack.id] && audioRef.current && audioRef.current.currentTime === 0) {
              audioRef.current.currentTime = lastSavedProgress[currentTrack.id].currentTime;
              setAudioCurrentTime(lastSavedProgress[currentTrack.id].currentTime);
            }
          }}
          onError={(e) => {
            const target = e.target as HTMLAudioElement;
            const error = target.error;
            console.error("Audio element error:", error?.message || "Unknown error");
            
            let message = t('audio_load_fail');
            if (error?.code === 4 || (currentTrack.url.includes('drive.google.com') && !isLoading)) { 
              message = t('audio_format_error');
            }
            
            setAudioError(message);
            setIsPlaying(false);
            setIsTimerRunning(false);
            setIsLoading(false);
          }}
        />
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Player & Breathing Guide */}
        <div className="space-y-8">
          <div className="bg-white rounded-[40px] p-10 shadow-sm border border-zen-accent/5 flex flex-col items-center text-center relative overflow-hidden min-h-[500px] justify-center">
            {/* Breathing Circle Animation */}
            <AnimatePresence>
              {isPlaying && (
                <>
                  {/* Outer Glow */}
                  <motion.div
                    animate={{ 
                      scale: [1, 1.8, 1],
                      opacity: [0.05, 0.15, 0.05]
                    }}
                    transition={{ 
                      duration: 8, 
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="absolute w-64 h-64 bg-zen-accent rounded-full blur-3xl"
                  />
                  {/* Main Breathing Circle */}
                  <motion.div
                    animate={{ 
                      scale: [1, 1.4, 1],
                    }}
                    transition={{ 
                      duration: 8, 
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="absolute w-48 h-48 border-2 border-zen-accent/20 rounded-full"
                  />
                  {/* Inner Label */}
                  <motion.div
                    animate={{ 
                      opacity: [0.4, 1, 0.4],
                      y: [0, -5, 0]
                    }}
                    transition={{ 
                      duration: 4, 
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
                  >
                    <span className="text-2xl font-serif font-bold text-zen-accent tracking-[0.5em] ml-[0.5em]">
                      {breathingText}
                    </span>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            <div className="relative z-10 w-full group">
              {!isPlaying && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-8"
                >
                  <div className="w-20 h-20 bg-zen-accent/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <Wind className="w-10 h-10 text-zen-accent" />
                  </div>
                  <h2 className="text-3xl font-serif font-bold mb-2">{currentTrack?.title || t('please_upload')}</h2>
                  <p className="text-zen-accent/60 italic mb-2">{currentTrack?.description || t('click_to_upload')}</p>
                  {currentTrack && lastSavedProgress[currentTrack.id] && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-[10px] text-zen-accent/40 font-bold flex flex-col items-center justify-center gap-1"
                    >
                      <div className="flex items-center gap-1">
                        <Timer className="w-2.5 h-2.5" />
                        <span>{t('restore_progress')}</span>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (audioRef.current) audioRef.current.currentTime = 0;
                          setTimeLeft(selectedDuration * 60);
                        }}
                        className="text-[9px] underline opacity-60 hover:opacity-100"
                      >
                        {t('start_from_beginning')}
                      </button>
                    </motion.div>
                  )}
                </motion.div>
              )}
              
              <div className={cn(
                "font-serif font-light tracking-tighter mb-8 tabular-nums transition-all duration-700",
                isPlaying ? "text-4xl text-zen-accent/40" : "text-5xl sm:text-6xl text-zen-ink/90"
              )}>
                {formatTime(timeLeft)}
              </div>

              {!isPlaying && (
                <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
                  {[5, 10, 15, 20, 30, 45, 60].map(mins => (
                    <button
                      key={mins}
                      onClick={() => handleDurationChange(mins)}
                      className={cn(
                        "px-4 py-2 rounded-2xl text-xs font-bold transition-all",
                        selectedDuration === mins 
                          ? "bg-zen-accent text-white shadow-md" 
                          : "bg-zen-accent/5 text-zen-accent/60 hover:bg-zen-accent/10"
                      )}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              )}

              <div className={cn(
                "transition-opacity duration-500",
                isPlaying ? "opacity-0 group-hover:opacity-100" : "opacity-100"
              )}>
                <div className="flex items-center justify-center gap-6 mb-8">
                  <button 
                    onClick={togglePlay}
                    disabled={!currentTrack || !!audioError || isLoading}
                    className={cn(
                      "w-20 h-20 rounded-full flex items-center justify-center shadow-xl hover:scale-105 transition-transform relative z-30",
                      (!currentTrack || audioError || isLoading) ? "bg-gray-300 cursor-not-allowed" : "bg-zen-accent text-white"
                    )}
                  >
                    {isLoading ? (
                      <div className="flex flex-col items-center gap-2">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full"
                        />
                        <span className="text-[10px] font-bold opacity-50">{t('loading')}</span>
                      </div>
                    ) : isPlaying ? (
                      <Pause className="w-8 h-8 fill-current" />
                    ) : (
                      <Play className="w-8 h-8 fill-current ml-1" />
                    )}
                  </button>
                </div>

                {/* Audio Progress Bar & Controls - Moved here */}
                {currentTrack && audioDuration > 0 && (
                  <div className="w-full max-w-xs mx-auto space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-bold text-zen-accent/40 tabular-nums">
                        <span>{formatTime(Math.floor(audioCurrentTime))}</span>
                        <span>{formatTime(Math.floor(audioDuration))}</span>
                      </div>
                      <div className="relative group/bar h-6 flex items-center">
                        <input 
                          type="range"
                          min="0"
                          max={audioDuration}
                          step="0.1"
                          value={audioCurrentTime}
                          onChange={handleSeek}
                          className="w-full h-1 bg-zen-bg rounded-full appearance-none cursor-pointer accent-zen-accent group-hover/bar:h-1.5 transition-all"
                        />
                      </div>
                    </div>
                    
                    {/* Loop Toggle */}
                    <div className="flex justify-center">
                      <button
                        onClick={() => setIsLooping(!isLooping)}
                        className={cn(
                          "flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold transition-colors",
                          isLooping ? "bg-zen-accent/10 text-zen-accent" : "text-zen-accent/40 hover:text-zen-accent/60"
                        )}
                      >
                        <ArrowUpDown className="w-3 h-3" />
                        {isLooping ? t('loop_play') : t('single_play')}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {audioError && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs"
                >
                  <p className="mb-2">{audioError}</p>
                  <p className="mb-4 text-[10px] opacity-70 leading-relaxed">
                    {t('audio_load_fail')}
                  </p>
                  <div className="flex flex-col gap-2">
                    <a 
                      href={currentTrack.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 bg-red-600 text-white py-2 px-4 rounded-xl font-bold hover:bg-red-700 transition-colors"
                    >
                      {t('open_in_new_tab')}
                    </a>
                    <button 
                      onClick={() => {
                        setAudioError(null);
                        setIsLoading(true);
                        if (audioRef.current) audioRef.current.load();
                      }}
                      className="text-[10px] text-red-600/60 underline"
                    >
                      {t('retry_after_auth')}
                    </button>
                  </div>
                </motion.div>
              )}

              {!isPlaying && (
                <div className="mt-12 flex items-center justify-center gap-2 text-xs text-zen-accent/40 font-bold uppercase tracking-widest">
                  <Sparkles className="w-3 h-3" />
                  <span>{t('meditation_ready')}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white/50 p-6 rounded-3xl border border-zen-accent/5 flex items-center gap-4">
            <Volume2 className="w-5 h-5 text-zen-accent/40" />
            <input 
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="flex-1 h-1 bg-zen-bg rounded-full appearance-none cursor-pointer accent-zen-accent/40"
            />
          </div>
        </div>

        {/* Right: Track List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold">{t('meditation_title')}</h3>
              <div className="flex items-center bg-zen-bg rounded-lg p-1">
                <button 
                  onClick={() => setSortOrder('newest')}
                  className={cn(
                    "p-1.5 rounded-md transition-all",
                    sortOrder === 'newest' ? "bg-white text-zen-accent shadow-sm" : "text-zen-accent/40 hover:text-zen-accent/60"
                  )}
                  title={t('sort_by_time')}
                >
                  <Clock className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => setSortOrder('name')}
                  className={cn(
                    "p-1.5 rounded-md transition-all",
                    sortOrder === 'name' ? "bg-white text-zen-accent shadow-sm" : "text-zen-accent/40 hover:text-zen-accent/60"
                  )}
                  title={t('sort_by_name')}
                >
                  <SortAsc className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept="audio/*" 
                className="hidden" 
              />
              {/* Import Link button hidden as requested */}
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 bg-zen-accent/10 text-zen-accent px-3 py-1.5 rounded-xl text-[10px] font-bold hover:bg-zen-accent/20 transition-colors"
              >
                <Upload className="w-3 h-3" />
                {t('upload_audio')}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {showUrlInput && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-white p-4 rounded-3xl border border-zen-accent/10 flex gap-2">
                  <input
                    type="text"
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                    placeholder={t('paste_audio_link')}
                    className="flex-1 bg-zen-bg border-none rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-zen-accent outline-none"
                  />
                  <button
                    onClick={handleUrlImport}
                    className="bg-zen-accent text-white px-4 py-2 rounded-xl text-xs font-bold hover:opacity-90 transition-opacity"
                  >
                    {t('import_btn')}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

                  <div className="space-y-3">
                    {allTracks.length > 0 ? (
                      allTracks.map(track => (
                        <div
                          key={track.id}
                          onClick={() => selectTrack(track)}
                          className={cn(
                            "w-full p-6 rounded-[32px] border transition-all text-left flex items-center justify-between group cursor-pointer",
                            currentTrack?.id === track.id
                              ? "bg-white border-zen-accent shadow-md"
                              : "bg-white/40 border-transparent hover:bg-white/60"
                          )}
                        >
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                              currentTrack?.id === track.id ? "bg-zen-accent text-white" : "bg-zen-bg text-zen-accent/40 group-hover:bg-white"
                            )}>
                              {track.isUrl ? <LinkIcon className="w-5 h-5" /> : track.isLocal ? <FileAudio className="w-5 h-5" /> : <Music className="w-5 h-5" />}
                            </div>
                            <div>
                              {renamingId === track.id ? (
                                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                  <input
                                    autoFocus
                                    type="text"
                                    value={newTitle}
                                    onChange={e => setNewTitle(e.target.value)}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') renameTrack(track.id, newTitle);
                                      if (e.key === 'Escape') setRenamingId(null);
                                    }}
                                    className="bg-white border border-zen-accent/20 rounded-lg px-2 py-1 text-sm font-bold focus:outline-none focus:border-zen-accent w-32"
                                  />
                                  <button onClick={() => renameTrack(track.id, newTitle)} className="text-green-500 hover:text-green-600">
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => setRenamingId(null)} className="text-red-400 hover:text-red-500">
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <p className="font-bold text-sm">{track.title}</p>
                              )}
                              <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-xs text-zen-accent/60">{track.duration} · {track.description}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {track.isLocal && renamingId !== track.id && (
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRenamingId(track.id);
                                    setNewTitle(track.title);
                                  }}
                                  className="p-2 rounded-xl text-zen-accent/40 hover:bg-zen-accent/5 hover:text-zen-accent transition-colors"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeTrack(track.id);
                                  }}
                                  className="p-2 rounded-xl text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                            {currentTrack?.id === track.id && isPlaying && (
                              <div className="flex gap-1 items-end h-4">
                                {[0, 1, 2].map(i => (
                                  <motion.div
                                    key={i}
                                    animate={{ height: [4, 16, 4] }}
                                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                                    className="w-1 bg-zen-accent rounded-full"
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-10 border-2 border-dashed border-zen-accent/10 rounded-[40px] text-center">
                        <Music className="w-10 h-10 text-zen-accent/10 mx-auto mb-4" />
                        <p className="text-xs text-zen-accent/40 font-bold">{t('no_track')}</p>
                      </div>
                    )}
                  </div>

          <div className="bg-zen-accent/5 p-8 rounded-[40px] border border-zen-accent/10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Timer className="w-5 h-5 text-zen-accent" />
                <h4 className="font-bold text-sm">{t('meditation_guide_title')}</h4>
              </div>
              <div className="flex items-center gap-1 bg-zen-accent/10 px-2 py-1 rounded-lg text-[8px] font-bold text-zen-accent animate-pulse">
                <Sparkles className="w-2 h-2" />
                <span>NEW</span>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-zen-accent/70 italic mb-6">
              {t('meditation_guide_text')}
            </p>
            <div className="pt-6 border-t border-zen-accent/10">
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
