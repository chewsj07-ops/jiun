import React from 'react';
import { Sparkles } from 'lucide-react';
import { useTranslation } from '../../i18n';

export const ZenWisdom = () => {
  const { t } = useTranslation();
  
  const quotes = [
    "心如止水，鉴常明。",
    "诸行无常，是生灭法。",
    "应无所住，而生其心。",
    "万法唯心造。",
    "放下，即是自在。"
  ];
  
  const quote = quotes[Math.floor(Math.random() * quotes.length)];

  return (
    <div className="bg-surface rounded-2xl p-8 border border-line text-center space-y-6">
      <div className="w-16 h-16 bg-accent-mist rounded-full flex items-center justify-center text-accent mx-auto">
        <Sparkles className="w-8 h-8" />
      </div>
      <h2 className="text-2xl font-serif font-bold text-ink">{t('zen_wisdom_card_title')}</h2>
      <p className="text-lg font-serif italic text-ink-2 leading-relaxed">
        "{quote}"
      </p>
    </div>
  );
};
