import { useEffect, useRef } from 'react';
import { useFirebase } from '../contexts/FirebaseContext';
import { doc, getDoc, setDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../utils/firebaseErrors';
import { recordVault } from '../services/recordVault';
import { practiceService } from '../services/practiceService';
import { DailyPracticeItem } from '../types/practice';

export function useFirebaseSync(
  userProfile: any, setUserProfile: (data: any) => void,
  history: any[], setHistory: (data: any[]) => void,
  vows: any[], setVows: (data: any[]) => void,
  scriptureGoals: any, setScriptureGoals: (data: any) => void,
  count: number, setCount: (data: number) => void,
  userExp: number, setUserExp: (data: number) => void,
  personalVow: string, setPersonalVow: (data: string) => void,
  selectedChant: string, setSelectedChant: (data: string) => void,
  volume: number, setVolume: (data: number) => void,
  soundType: string, setSoundType: (data: any) => void,
  woodenFishAppearance: string, setWoodenFishAppearance: (data: any) => void,
  customScriptures: any[], setCustomScriptures: (data: any[]) => void,
  dailyPractice: DailyPracticeItem[], setDailyPractice: (data: DailyPracticeItem[]) => void,
  dailyPracticeUpdatedAt: number, setDailyPracticeUpdatedAt: (ts: number) => void
) {
  const { user, isAuthReady } = useFirebase();
  const isInitialSyncDone = useRef(false);
  const isSyncing = useRef(false);

  // Initial fetch from Firebase when user logs in
  useEffect(() => {
    if (!isAuthReady) return;
    
    if (user && !isInitialSyncDone.current) {
      const fetchUserData = async () => {
        isSyncing.current = true;
        try {
          // Fetch Profile
          const profileDoc = await getDoc(doc(db, 'users', user.uid));
          if (profileDoc.exists()) {
            const data = profileDoc.data();
            setUserProfile((prev: any) => ({
              ...prev,
              name: data.name ?? prev.name,
              avatar: data.avatar ?? prev.avatar,
              email: data.email ?? prev.email,
              birthday: data.birthday ?? prev.birthday,
              gender: data.gender ?? prev.gender,
              role: data.role ?? prev.role,
              country: data.country ?? prev.country,
              location: data.location ?? prev.location
            }));
            if (data.personalVow !== undefined) setPersonalVow(data.personalVow);
            if (data.totalMerit !== undefined) setCount(data.totalMerit);
            if (data.userExp !== undefined) setUserExp(data.userExp);
            if (data.selectedChant !== undefined) setSelectedChant(data.selectedChant);
            if (data.volume !== undefined) setVolume(data.volume);
            if (data.soundType !== undefined) setSoundType(data.soundType);
            if (data.woodenFishAppearance !== undefined) setWoodenFishAppearance(data.woodenFishAppearance);
            if (data.scriptureGoals) setScriptureGoals(data.scriptureGoals);
            if (data.customScriptures) setCustomScriptures(data.customScriptures);

            // Merge dailyPractice by dailyPracticeUpdatedAt (whole-list replacement, preserve local if cloud lacks it)
            const localSettings = practiceService.getSettings();
            const localUpdatedAt =
              typeof localSettings.dailyPracticeUpdatedAt === 'number'
                ? localSettings.dailyPracticeUpdatedAt
                : 0;
            const hasRemoteDailyPractice =
              Array.isArray(data.dailyPractice) &&
              typeof data.dailyPracticeUpdatedAt === 'number';

            if (hasRemoteDailyPractice && data.dailyPracticeUpdatedAt > localUpdatedAt) {
              const remoteList: DailyPracticeItem[] = [...data.dailyPractice]
                .filter((item: any) => item && typeof item.scriptureId === 'string')
                .sort((a: any, b: any) => Number(a.order ?? 0) - Number(b.order ?? 0))
                .map((item: any, idx: number) => ({
                  scriptureId: String(item.scriptureId),
                  target: Math.min(100000, Math.max(1, Math.round(Number(item.target) || 1))),
                  unit: item.unit === '遍' ? ('遍' as const) : ('声' as const),
                  order: Number.isInteger(item.order) ? item.order : idx,
                  enabled: Boolean(item.enabled),
                }));

              const savedList = practiceService.saveDailyPracticeList(
                remoteList,
                data.dailyPracticeUpdatedAt
              );
              setDailyPractice(savedList);
              setDailyPracticeUpdatedAt(data.dailyPracticeUpdatedAt);
              setScriptureGoals(practiceService.getSettings().scriptureGoals || {});
            }
          }

          // Fetch History safely with recordVault merge (preserving unit as-is; never mutating legacy records)
          const historySnapshot = await getDocs(collection(db, `users/${user.uid}/history`));
          const remoteHistory = historySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          
          const localRecords = await recordVault.getRecords();
          const map = new Map<string, any>();
          // Remote first
          for (const item of remoteHistory) {
            map.set(String(item.id), item);
          }
          // Merge local (preserves any check-ins done offline or before login)
          for (const item of localRecords) {
            if (!map.has(String(item.id))) {
              map.set(String(item.id), item);
            }
          }
          const merged = Array.from(map.values()).sort((a, b) => {
            const timeA = a.endTime || a.timestamp || Number(a.id) || 0;
            const timeB = b.endTime || b.timestamp || Number(b.id) || 0;
            return timeB - timeA;
          });
          
          if (merged.length > 0) {
            setHistory(merged);
            await recordVault.saveRecords(merged);
            
            // If local had unsynced records, push them to Firestore
            const missingInRemote = merged.filter(m => !remoteHistory.some(r => String(r.id) === String(m.id)));
            if (missingInRemote.length > 0) {
              const batch = writeBatch(db);
              missingInRemote.slice(0, 500).forEach(item => {
                const docRef = doc(db, `users/${user.uid}/history`, String(item.id));
                const cleanItem = Object.fromEntries(Object.entries(item).filter(([_, v]) => v !== undefined));
                batch.set(docRef, cleanItem, { merge: true });
              });
              await batch.commit().catch(e => console.warn('Sync batch error:', e));
            }
          }

          // Fetch Vows
          const vowsSnapshot = await getDocs(collection(db, `users/${user.uid}/vows`));
          const vowsData = vowsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          if (vowsData.length > 0) {
            setVows(vowsData);
            localStorage.setItem('zen_vows', JSON.stringify(vowsData));
          } else if (vows && vows.length > 0) {
            const batch = writeBatch(db);
            vows.forEach(item => {
              const docRef = doc(db, `users/${user.uid}/vows`, item.id.toString());
              const cleanItem = Object.fromEntries(Object.entries(item).filter(([_, v]) => v !== undefined));
              batch.set(docRef, cleanItem);
            });
            await batch.commit();
          }

          // Fetch Deeds
          const deedsSnapshot = await getDocs(collection(db, `users/${user.uid}/goodDeeds`));
          const deedsData = deedsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          if (deedsData.length > 0) {
            localStorage.setItem('good_deed_history', JSON.stringify(deedsData));
          }

          // Fetch Thoughts (preserve any isLocalOnly local records)
          const thoughtsSnapshot = await getDocs(collection(db, `users/${user.uid}/thoughts`));
          const thoughtsData = thoughtsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          if (thoughtsData.length > 0) {
            let localOnlyThoughts: any[] = [];
            try {
              const existingLocal = JSON.parse(localStorage.getItem('zen_thoughts') || '[]');
              if (Array.isArray(existingLocal)) {
                localOnlyThoughts = existingLocal.filter((t: any) => Boolean(t?.isLocalOnly));
              }
            } catch {
              // ignore invalid local json
            }
            const mergedThoughtsMap = new Map<string, any>();
            for (const item of localOnlyThoughts) {
              mergedThoughtsMap.set(String(item.id), item);
            }
            for (const item of thoughtsData) {
              const key = String(item.id);
              if (!mergedThoughtsMap.has(key)) {
                mergedThoughtsMap.set(key, item);
              }
            }
            const mergedThoughts = Array.from(mergedThoughtsMap.values()).sort(
              (a: any, b: any) => Number(b.id || 0) - Number(a.id || 0)
            );
            localStorage.setItem('zen_thoughts', JSON.stringify(mergedThoughts));
          }

          isInitialSyncDone.current = true;
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
        } finally {
          isSyncing.current = false;
        }
      };
      fetchUserData();
    } else if (!user) {
      isInitialSyncDone.current = false;
    }
  }, [user, isAuthReady]);

  // Sync Profile changes to Firebase
  useEffect(() => {
    if (!user || !isInitialSyncDone.current || isSyncing.current) return;
    
    const syncProfile = async () => {
      try {
        const latestSettings = practiceService.getSettings();
        const effectiveUpdatedAt =
          typeof dailyPracticeUpdatedAt === 'number' && dailyPracticeUpdatedAt > 0
            ? dailyPracticeUpdatedAt
            : latestSettings.dailyPracticeUpdatedAt;

        const sanitizedDailyPractice = Array.isArray(dailyPractice)
          ? dailyPractice.slice(0, 50).map((item, idx) => ({
              scriptureId: String(item.scriptureId),
              target: Math.min(100000, Math.max(1, Math.round(Number(item.target) || 1))),
              unit: item.unit === '遍' ? ('遍' as const) : ('声' as const),
              order: Number.isInteger(item.order) ? item.order : idx,
              enabled: Boolean(item.enabled),
            }))
          : undefined;

        await setDoc(doc(db, 'users', user.uid), {
          name: userProfile.name || '',
          avatar: userProfile.avatar || '',
          email: userProfile.email || '',
          birthday: userProfile.birthday || '',
          gender: userProfile.gender || '',
          role: userProfile.role || 'Employee',
          country: userProfile.country || '',
          location: userProfile.location || '',
          personalVow: personalVow || '',
          totalMerit: count || 0,
          userExp: userExp || 0,
          selectedChant: selectedChant || '',
          volume: volume ?? 0.8,
          soundType: soundType || 'standard',
          woodenFishAppearance: woodenFishAppearance || 'standard',
          scriptureGoals: scriptureGoals || {},
          customScriptures: customScriptures || [],
          ...(sanitizedDailyPractice !== undefined ? { dailyPractice: sanitizedDailyPractice } : {}),
          ...(typeof effectiveUpdatedAt === 'number'
            ? { dailyPracticeUpdatedAt: effectiveUpdatedAt }
            : {}),
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
      }
    };

    const timeoutId = setTimeout(syncProfile, 2000); // Debounce
    return () => clearTimeout(timeoutId);
  }, [
    user, isInitialSyncDone, userProfile, personalVow, count, userExp, selectedChant, 
    volume, soundType, woodenFishAppearance, scriptureGoals, customScriptures,
    dailyPractice, dailyPracticeUpdatedAt
  ]);
}
