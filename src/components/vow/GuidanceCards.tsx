import React from 'react';
import { motion } from 'motion/react';

export interface StructuredGuidance {
  observe: string;
  reflect: string;
  act: string;
  compassion: string;
  verse?: string;
  isOffline?: boolean;
}

interface GuidanceCardsProps {
  guidance: StructuredGuidance;
  onBeforeOpenSettings?: () => void;
}

export const GuidanceCards: React.FC<GuidanceCardsProps> = ({
  guidance,
  onBeforeOpenSettings,
}) => {
  const cards = [
    { key: 'observe', title: '观察', content: guidance.observe },
    { key: 'reflect', title: '反思', content: guidance.reflect },
    { key: 'act', title: '行动', content: guidance.act },
    { key: 'compassion', title: '慈悲', content: guidance.compassion },
  ];

  const handleOpenAiSettings = () => {
    onBeforeOpenSettings?.();
    window.dispatchEvent(
      new CustomEvent('navigate_to_settings', {
        detail: { section: 'ai-settings' },
      })
    );
  };

  return (
    <div className="space-y-3">
      {cards.map((card, idx) => (
        <motion.div
          key={card.key}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.45,
            delay: idx * 0.4,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="bg-surface border border-line rounded-2xl p-5"
        >
          <div className="text-caption !text-accent font-medium mb-1.5">
            {card.title}
          </div>
          <p className="text-reading !text-[17px] !leading-[1.85] text-ink">
            {card.content}
          </p>
        </motion.div>
      ))}

      {guidance.verse && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: 0.5,
            delay: 4 * 0.4,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="text-caption italic font-serif text-center pt-2 px-2"
        >
          「{guidance.verse}」
        </motion.p>
      )}

      {guidance.isOffline && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: 0.5,
            delay: 4 * 0.4 + 0.15,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="pt-1 text-center"
        >
          <button
            type="button"
            onClick={handleOpenAiSettings}
            className="text-caption !text-ink-3 hover:!text-accent underline underline-offset-4 transition-colors"
          >
            想要更贴近你的回应？可在设置中开启 AI 教练
          </button>
        </motion.div>
      )}
    </div>
  );
};
