import React from 'react';
import { motion } from 'motion/react';
import { Phone, HeartHandshake } from 'lucide-react';

interface SafetyNetCardProps {
  onMeditate: () => void;
  onContinue?: () => void;
  continueLabel?: string;
}

export const SafetyNetCard: React.FC<SafetyNetCardProps> = ({
  onMeditate,
  onContinue,
  continueLabel = '继续写下去',
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="bg-surface border border-accent-soft rounded-2xl p-6 space-y-5"
    >
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-accent">
          <HeartHandshake size={18} strokeWidth={1.5} />
          <span className="text-caption text-accent">此刻有陪伴</span>
        </div>
        <h3 className="text-title text-ink">
          谢谢你愿意写下来。你现在不必一个人扛着。
        </h3>
        <p className="text-sm leading-relaxed text-ink-2">
          如果你正处在很难受的时刻，请联系一个可以马上陪你说话的人。
        </p>
      </div>

      <div className="bg-surface-2 rounded-2xl p-4 border border-line space-y-3 text-sm">
        <div className="space-y-2">
          <p className="text-caption font-medium text-ink">马来西亚</p>
          <ul className="space-y-2 text-ink-2">
            <li className="flex items-center justify-between gap-3">
              <span>Befrienders KL（24 小时）</span>
              <a
                href="tel:0376272929"
                className="inline-flex items-center gap-1.5 text-accent font-medium underline underline-offset-4 hover:text-accent-hover shrink-0"
              >
                <Phone size={13} strokeWidth={1.5} />
                03-7627 2929
              </a>
            </li>
            <li className="flex items-center justify-between gap-3">
              <span>Talian HEAL（卫生部心理支持热线）</span>
              <a
                href="tel:15555"
                className="inline-flex items-center gap-1.5 text-accent font-medium underline underline-offset-4 hover:text-accent-hover shrink-0"
              >
                <Phone size={13} strokeWidth={1.5} />
                15555
              </a>
            </li>
            <li className="flex items-center justify-between gap-3">
              <span>紧急情况</span>
              <a
                href="tel:999"
                className="inline-flex items-center gap-1.5 text-accent font-medium underline underline-offset-4 hover:text-accent-hover shrink-0"
              >
                <Phone size={13} strokeWidth={1.5} />
                999
              </a>
            </li>
          </ul>
        </div>

        <div className="h-px bg-line" />

        <div className="space-y-1">
          <p className="text-caption font-medium text-ink">其他国家或地区</p>
          <p className="text-ink-2 text-xs leading-relaxed">
            请联系当地的心理支持或紧急热线。
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={onMeditate}
          className="flex-1 h-11 px-4 rounded-full bg-accent hover:bg-accent-hover text-on-accent text-sm font-medium transition-colors"
        >
          我想先静坐几分钟
        </button>
        {onContinue && (
          <button
            type="button"
            onClick={onContinue}
            className="flex-1 h-11 px-4 rounded-full border border-line bg-surface-2 text-ink-2 hover:text-ink text-sm transition-colors"
          >
            {continueLabel}
          </button>
        )}
      </div>
    </motion.div>
  );
};
