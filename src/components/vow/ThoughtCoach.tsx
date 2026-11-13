import React, { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { practiceService } from '../../services/practiceService';
import { aiGenerate } from '../../services/geminiClient';
import { buildThoughtGuidanceSystemPrompt } from '../../data/zenAssistantPrompt';
import { Loader2, Brain, ArrowRight, Lock } from 'lucide-react';
import { useTranslation } from '../../i18n';
import {
  containsSafetyPauseKeywords,
  matchOfflineGuidance,
} from '../../data/offlineGuidance';
import { SafetyNetCard } from './SafetyNetCard';
import { GuidanceCards, StructuredGuidance } from './GuidanceCards';

const AI_TIMEOUT_MS = 10000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error('AI_TIMEOUT'));
    }, ms);
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

export const ThoughtCoach = () => {
  const { t, language } = useTranslation();
  const [emotion, setEmotion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<StructuredGuidance | null>(null);
  const [showSafetyNet, setShowSafetyNet] = useState(false);
  const [safetyDismissedForEdit, setSafetyDismissedForEdit] = useState(false);

  const handleEmotionChange = (nextValue: string) => {
    setEmotion(nextValue);
    if (containsSafetyPauseKeywords(nextValue)) {
      if (!safetyDismissedForEdit) {
        setShowSafetyNet(true);
        setResponse(null);
      }
    } else {
      setShowSafetyNet(false);
      setSafetyDismissedForEdit(false);
    }
  };

  const applyOfflineFallback = (text: string) => {
    const matched = matchOfflineGuidance({
      freeText: text,
      eventText: text,
    });
    setResponse({
      observe: matched.observe,
      reflect: matched.reflect,
      act: matched.act,
      compassion: matched.compassion,
      verse: matched.verse,
      isOffline: true,
    });
  };

  const handleAnalyze = async () => {
    const trimmed = emotion.trim();
    if (!trimmed) return;

    // Safety Net: never call AI or display 4-step guidance on crisis or severe distress content
    if (containsSafetyPauseKeywords(trimmed)) {
      setResponse(null);
      setShowSafetyNet(true);
      return;
    }

    const settings = practiceService.getSettings();
    if (!settings.aiEnabled) {
      applyOfflineFallback(trimmed);
      return;
    }

    setIsLoading(true);
    setResponse(null);

    try {
      const prompt = `用户输入的心念或情绪感受：\n"${trimmed}"`;

      const text = await withTimeout(
        aiGenerate({
          contents: prompt,
          systemInstruction: buildThoughtGuidanceSystemPrompt(language),
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
          setResponse({
            observe: String(parsed.observation),
            reflect: String(parsed.reflection),
            act: String(parsed.practice),
            compassion: String(parsed.compassion),
            verse: parsed.verse ? String(parsed.verse) : undefined,
            isOffline: false,
          });
          return;
        }
      }
      applyOfflineFallback(trimmed);
    } catch {
      // Silent seamless fallback to offline guidance (no error modal or toast)
      applyOfflineFallback(trimmed);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenThreeMinMeditation = () => {
    window.dispatchEvent(
      new CustomEvent('open-meditation-preset', {
        detail: { duration: 3 },
      })
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1.5 text-caption px-1">
        <Lock size={13} strokeWidth={1.5} className="text-ink-3 shrink-0" />
        <span>这里写下的只存在你的设备里，不会公开。</span>
      </div>

      <div className="bg-surface p-6 rounded-2xl border border-line space-y-4">
        <h3 className="text-title text-ink flex items-center gap-2">
          <Brain className="w-5 h-5 text-accent" strokeWidth={1.5} />
          <span>{t('thought_coach_title')}</span>
        </h3>

        <div className="relative">
          <textarea
            value={emotion}
            onChange={(e) => handleEmotionChange(e.target.value)}
            placeholder={t('thought_coach_placeholder')}
            className="w-full bg-surface-2 p-4 pb-12 rounded-2xl border border-line focus:outline-none focus:border-accent min-h-[120px] resize-none text-ink placeholder:text-ink-3 leading-relaxed"
          />
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={isLoading || !emotion.trim()}
            aria-label="倾听此刻"
            className="absolute bottom-3 right-3 bg-accent text-on-accent hover:bg-accent-hover h-10 px-3.5 rounded-full disabled:opacity-45 transition-all flex items-center gap-1.5 text-xs font-medium"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>观照</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {showSafetyNet && (
          <SafetyNetCard
            key="coach-safety-net"
            onMeditate={handleOpenThreeMinMeditation}
            onContinue={() => {
              setSafetyDismissedForEdit(true);
              setShowSafetyNet(false);
            }}
          />
        )}

        {!showSafetyNet && response && (
          <GuidanceCards key={`coach-guidance-${response.observe.slice(0, 8)}`} guidance={response} />
        )}
      </AnimatePresence>
    </div>
  );
};
