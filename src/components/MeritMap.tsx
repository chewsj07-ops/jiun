import React, { useEffect, useState, useMemo } from 'react';
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { scaleLinear } from "d3-scale";
import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from '../i18n';
import { practiceService } from '../services/practiceService';
import { Sparkles, Globe, Trophy, Zap, Heart } from 'lucide-react';

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface MeritPoint {
  coordinates: [number, number];
  value: number;
  id: string;
}

export const MeritMap: React.FC<{ theme?: 'zen' | 'lotus' | 'sky' | 'dark' }> = ({ theme = 'zen' }) => {
  const { t } = useTranslation();
  const [meritStats, setMeritStats] = useState({ today: 0, week: 0, total: 0 });
  const [globalStats, setGlobalStats] = useState({ today: 0, week: 0, total: 0 });
  const [globalPoints, setGlobalPoints] = useState<MeritPoint[]>([]);
  const [universalVow, setUniversalVow] = useState(() => localStorage.getItem('universal_vow') || "");
  const [userName, setUserName] = useState(() => {
    const saved = localStorage.getItem('zen_user_profile');
    if (saved) {
      try {
        return JSON.parse(saved).name || '修行者';
      } catch (e) {
        return '修行者';
      }
    }
    return '修行者';
  });

  const [currentVowIndex, setCurrentVowIndex] = useState(0);

  const mockVows = useMemo(() => [
    { text: "愿世界和平，永无战争。", author: "无名氏" },
    { text: "愿所有生灵都能得到温暖与庇护。", author: "静心" },
    { text: "愿以此功德，回向给所有受苦的人。", author: "明月" },
    { text: "愿大家都能找到内心的宁静。", author: "行者" },
    { text: "愿地球母亲恢复生机。", author: "自然之友" },
  ], []);

  const allVows = useMemo(() => {
    return [
      { text: universalVow || t('default_universal_vow'), author: userName },
      ...mockVows
    ];
  }, [universalVow, userName, mockVows, t]);

  useEffect(() => {
    const handleVowUpdate = () => {
      setUniversalVow(localStorage.getItem('universal_vow') || "");
      const saved = localStorage.getItem('zen_user_profile');
      if (saved) {
        try {
          setUserName(JSON.parse(saved).name || '修行者');
        } catch (e) {}
      }
    };
    window.addEventListener('vow_updated', handleVowUpdate);
    window.addEventListener('user_profile_updated', handleVowUpdate);
    return () => {
      window.removeEventListener('vow_updated', handleVowUpdate);
      window.removeEventListener('user_profile_updated', handleVowUpdate);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentVowIndex((prev) => (prev + 1) % allVows.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [allVows.length]);

  const themeColors = {
    zen: { bg: 'bg-transparent', accent: '#4A755A', text: 'text-ink', mapFill: '#E6E2D8', mapStroke: '#C9CBC6', cardBg: 'bg-surface', statsBg: 'bg-surface' },
    lotus: { bg: 'bg-transparent', accent: '#9A5470', text: 'text-ink', mapFill: '#EDE0DE', mapStroke: '#DDCBC8', cardBg: 'bg-surface', statsBg: 'bg-surface' },
    sky: { bg: 'bg-transparent', accent: '#3F6E8C', text: 'text-ink', mapFill: '#DEE6E9', mapStroke: '#C9D5DA', cardBg: 'bg-surface', statsBg: 'bg-surface' },
    dark: { bg: 'bg-transparent', accent: '#9CC7A8', text: 'text-ink', mapFill: '#2A302D', mapStroke: '#353C38', cardBg: 'bg-surface', statsBg: 'bg-surface' }
  };

  const colors = themeColors[theme];

  useEffect(() => {
    practiceService.connectRealtime();
    // Load personal stats
    setMeritStats(practiceService.getMeritStats());

    // Load global stats
    const updateGlobal = () => {
      setGlobalStats(practiceService.getGlobalMeritStats());
    };
    updateGlobal();

    // Simulate global points (visual only)
    const generatePoints = () => {
      const points: MeritPoint[] = [];
      for (let i = 0; i < 50; i++) {
        points.push({
          coordinates: [
            Math.random() * 360 - 180,
            Math.random() * 140 - 70
          ],
          value: Math.floor(Math.random() * 10) + 1,
          id: `point-${i}`
        });
      }
      return points;
    };
    setGlobalPoints(generatePoints());

    // Live updates
    const interval = setInterval(() => {
      updateGlobal();
      if (Math.random() > 0.7) {
        setGlobalPoints(prev => [
          ...prev.slice(-49),
          {
            coordinates: [
              Math.random() * 360 - 180,
              Math.random() * 140 - 70
            ],
            value: 5,
            id: `new-${Date.now()}`
          }
        ]);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`flex flex-col h-full space-y-6 overflow-y-auto pb-20 ${colors.bg}`}>
      {/* Header */}
      <div className="text-center space-y-2 pt-4">
        <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 text-amber-600 mb-2`}>
          <Globe className="w-6 h-6" />
        </div>
        <h2 className={`text-2xl font-serif font-bold ${colors.text}`}>{t('merit_map_title')}</h2>
        <p className="text-sm opacity-60">{t('merit_map_subtitle')}</p>
      </div>

      {/* Global Stats Card */}
      <div className="p-6 rounded-2xl border border-line relative overflow-hidden mx-4 bg-accent text-on-accent">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10" />
        
        <div className="relative z-10">
          <div className="text-center mb-6">
            <p className="opacity-80 text-xs uppercase tracking-widest font-bold mb-2">{t('global_merit_today')}</p>
            <div className="text-4xl font-serif font-bold flex items-center justify-center gap-2">
              <Sparkles className="w-6 h-6" />
              {globalStats.today.toLocaleString()}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-white/15 pt-4">
            <div className="text-center">
              <p className="opacity-70 text-[10px] uppercase tracking-wider mb-1">{t('merit_week')}</p>
              <p className="text-lg font-bold">{globalStats.week.toLocaleString()}</p>
            </div>
            <div className="text-center border-l border-white/15">
              <p className="opacity-70 text-[10px] uppercase tracking-wider mb-1">{t('merit_total')}</p>
              <p className="text-lg font-bold">{globalStats.total.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className={`rounded-2xl border border-line overflow-hidden h-[240px] relative mx-4 ${colors.cardBg}`}>
        <ComposableMap
          projectionConfig={{ scale: 140 }}
          className="w-full h-full"
        >
          <Geographies geography={geoUrl}>
            {({ geographies }: { geographies: any[] }) =>
              geographies.map((geo: any) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={colors.mapFill}
                  stroke={colors.mapStroke}
                  strokeWidth={0.5}
                  style={{
                    default: { outline: "none" },
                    hover: { outline: "none" },
                    pressed: { outline: "none" },
                  }}
                />
              ))
            }
          </Geographies>
          {globalPoints.map(({ coordinates, id }) => (
            <Marker key={id} coordinates={coordinates}>
              <motion.circle
                r={6}
                fill={colors.accent}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ 
                  scale: [1, 2, 1], 
                  opacity: [0.8, 0, 0.8],
                  filter: ["blur(0px)", "blur(4px)", "blur(0px)"]
                }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              />
              <circle r={3} fill="#FFFFFF" />
            </Marker>
          ))}
        </ComposableMap>
        
        {/* Quote Overlay */}
        <div className="absolute bottom-4 left-0 right-0 px-4 flex justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentVowIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5 }}
              className="bg-surface/95 backdrop-blur-md px-5 py-2.5 rounded-2xl shadow-float border border-line max-w-full flex flex-col items-center text-center"
            >
              <p className={`text-xs italic ${colors.text} font-medium mb-1 line-clamp-2`}>
                "{allVows[currentVowIndex].text}"
              </p>
              <p className="text-[10px] text-ink-2 font-bold uppercase tracking-widest">
                — {allVows[currentVowIndex].author} —
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Personal Stats */}
      <div className="mx-4 mb-3 mt-8 text-center">
        <p className={`text-sm font-bold ${colors.text} opacity-80 uppercase tracking-widest`}>{t('personal_merit_data')}</p>
      </div>
      <div className="grid grid-cols-3 gap-4 mx-4">
        <div className={`p-4 rounded-2xl border border-line text-center ${colors.statsBg}`}>
          <div className="w-8 h-8 mx-auto bg-accent-mist rounded-full flex items-center justify-center mb-2">
            <Zap className="w-4 h-4 text-gold" />
          </div>
          <div className={`text-xl font-bold ${colors.text}`}>{meritStats.today}</div>
          <div className="text-[10px] text-ink-2 uppercase tracking-wider">{t('merit_today')}</div>
        </div>
        <div className={`p-4 rounded-2xl border border-line text-center ${colors.statsBg}`}>
          <div className="w-8 h-8 mx-auto bg-accent-mist rounded-full flex items-center justify-center mb-2">
            <Trophy className="w-4 h-4 text-gold" />
          </div>
          <div className={`text-xl font-bold ${colors.text}`}>{meritStats.week}</div>
          <div className="text-[10px] text-ink-2 uppercase tracking-wider">{t('merit_week')}</div>
        </div>
        <div className={`p-4 rounded-2xl border border-line text-center ${colors.statsBg}`}>
          <div className="w-8 h-8 mx-auto bg-accent-mist rounded-full flex items-center justify-center mb-2">
            <Heart className="w-4 h-4 text-gold" />
          </div>
          <div className={`text-xl font-bold ${colors.text}`}>{meritStats.total}</div>
          <div className="text-[10px] text-ink-2 uppercase tracking-wider">{t('merit_total')}</div>
        </div>
      </div>
    </div>
  );
};