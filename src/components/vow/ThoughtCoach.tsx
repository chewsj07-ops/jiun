import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { practiceService } from '../../services/practiceService';
import { Loader2, Sparkles, Brain, Heart, Leaf, ArrowRight } from 'lucide-react';
import { useTranslation } from '../../i18n';

export const ThoughtCoach = () => {
  const { t, language } = useTranslation();
  const [emotion, setEmotion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<{
    observation: string;
    reflection: string;
    practice: string;
    compassion: string;
  } | null>(null);

  const handleAnalyze = async () => {
    if (!emotion.trim()) return;
    
    const settings = practiceService.getSettings();
    if (!settings.aiEnabled || !settings.aiApiKey) {
      alert("AI 禅师未开启或未配置 API Key。请前往「设置」->「AI 禅师」中开启。");
      return;
    }

    setIsLoading(true);
    setResponse(null);

    try {
      const ai = new GoogleGenAI({ apiKey: settings.aiApiKey });
      const prompt = `
        User is feeling: "${emotion}".
        Current language: "${language}".
        Act as a gentle, non-judgmental mindfulness coach inspired by Ksitigarbha's compassion.
        Provide a response in JSON format with exactly these 4 fields:
        1. observation: Acknowledge the feeling gently (e.g., "Anger seems to be arising").
        2. reflection: A brief Buddhist-inspired philosophical insight (non-self, impermanence).
        3. practice: A simple, immediate mindfulness action (breathing, noting).
        4. compassion: A short wish for the user and others.
        
        Keep it concise, warm, and soothing.
        Response must be valid JSON.
        IMPORTANT: The response content MUST be in the "${language}" language.
      `;

      const result = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      if (result.text) {
        setResponse(JSON.parse(result.text));
      }
    } catch (error) {
      console.error("AI Error:", error);
      // Fallback
      setResponse({
        observation: "This feeling is present right now.",
        reflection: "Like clouds in the sky, emotions come and go.",
        practice: "Take three deep breaths and watch the feeling change.",
        compassion: "May you be free from suffering and find peace."
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white/50 p-6 rounded-3xl border border-zen-accent/5 backdrop-blur-sm">
        <h3 className="text-lg font-bold text-zen-accent mb-4 flex items-center gap-2">
          <Brain className="w-5 h-5" />
          {t('thought_coach_title')}
        </h3>
        
        <div className="relative">
          <textarea
            value={emotion}
            onChange={(e) => setEmotion(e.target.value)}
            placeholder={t('thought_coach_placeholder')}
            className="w-full bg-white p-4 rounded-2xl border border-zen-accent/10 focus:outline-none focus:border-zen-accent/30 min-h-[100px] resize-none text-zen-ink"
          />
          <button
            onClick={handleAnalyze}
            disabled={isLoading || !emotion.trim()}
            className="absolute bottom-3 right-3 bg-zen-accent text-white p-2 rounded-xl disabled:opacity-50 hover:scale-105 transition-transform"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {response && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <div className="bg-white p-6 rounded-3xl border border-zen-accent/10 shadow-sm space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-zen-accent/60 text-xs font-bold uppercase tracking-wider">
                  <Leaf className="w-4 h-4" />
                  {t('coach_observation')}
                </div>
                <p className="text-zen-ink font-serif text-lg">{response.observation}</p>
              </div>

              <div className="h-px bg-zen-accent/5" />

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-zen-accent/60 text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" />
                  {t('coach_reflection')}
                </div>
                <p className="text-zen-ink/80 italic">{response.reflection}</p>
              </div>

              <div className="bg-zen-bg/50 p-4 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-zen-accent/60 text-xs font-bold uppercase tracking-wider">
                  <Wind className="w-4 h-4" />
                  {t('coach_practice')}
                </div>
                <p className="text-zen-accent font-medium">{response.practice}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-zen-accent/60 text-xs font-bold uppercase tracking-wider">
                  <Heart className="w-4 h-4" />
                  {t('coach_compassion')}
                </div>
                <p className="text-zen-ink font-serif">{response.compassion}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Helper icon
function Wind(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" />
      <path d="M9.6 4.6A2 2 0 1 1 11 8H2" />
      <path d="M12.6 19.4A2 2 0 1 0 14 16H2" />
    </svg>
  )
}
