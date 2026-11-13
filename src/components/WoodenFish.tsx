import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { playWoodenFishHit } from '../utils/zenAudio';

export interface WoodenFishHandle {
  triggerHit: () => void;
}

interface WoodenFishProps {
  onHit: () => void;
  className?: string;
  floatingText?: string;
  showFloatingText?: boolean;
  volume?: number;
  soundType?: 'standard' | 'crisp' | 'deep';
  appearance?: 'fish' | 'lotus' | 'bowl';
  disabled?: boolean;
  disabledMessage?: string;
  metronomeBpm?: 40 | 60 | 80 | null;
  onSlowPaceWarning?: () => void;
  sizePx?: number | string;
}

export const WoodenFish = forwardRef<WoodenFishHandle, WoodenFishProps>(
  (
    {
      onHit,
      className,
      floatingText = '功德 +1',
      showFloatingText = false,
      volume = 0.8,
      soundType = 'standard',
      appearance = 'lotus',
      disabled = false,
      disabledMessage = '请先开始诵经',
      metronomeBpm = null,
      onSlowPaceWarning,
      sizePx,
    },
    ref
  ) => {
    const [isHitting, setIsHitting] = useState(false);
    const [showDisabledMsg, setShowDisabledMsg] = useState(false);
    const [ripples, setRipples] = useState<{ id: number }[]>([]);
    const [floatingTexts, setFloatingTexts] = useState<{ id: number; x: number }[]>([]);

    // Rhythm awareness (replaces Combo): detect 5 consecutive intervals < 400ms
    const lastHitTimeRef = useRef<number>(0);
    const fastStreakRef = useRef<number>(0);
    const lastWarningTimeRef = useRef<number>(0);

    const handleHit = () => {
      if (disabled) {
        setShowDisabledMsg(true);
        setTimeout(() => setShowDisabledMsg(false), 2000);
        return;
      }

      const now = Date.now();
      if (lastHitTimeRef.current > 0) {
        const interval = now - lastHitTimeRef.current;
        if (interval < 400) {
          fastStreakRef.current += 1;
          if (
            fastStreakRef.current >= 5 &&
            now - lastWarningTimeRef.current >= 180_000
          ) {
            lastWarningTimeRef.current = now;
            fastStreakRef.current = 0;
            onSlowPaceWarning?.();
          }
        } else {
          fastStreakRef.current = 0;
        }
      }
      lastHitTimeRef.current = now;

      setIsHitting(true);
      setTimeout(() => setIsHitting(false), 140);

      // Gentle synchronized audio (no combo pitch boost)
      playWoodenFishHit({
        appearance,
        soundType,
        volume,
        isCombo: false,
      });

      // Gentle 8ms haptic pulse
      navigator.vibrate?.(8);

      // Center ripple (max 3 simultaneous)
      const id = now + Math.random();
      setRipples((prev) => [...prev.slice(-2), { id }]);
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 950);

      // Optional subtle floating merit text (disabled by default)
      if (showFloatingText) {
        const floatId = id + 0.1;
        setFloatingTexts((prev) => [
          ...prev.slice(-3),
          { id: floatId, x: Math.random() * 24 - 12 },
        ]);
        setTimeout(() => {
          setFloatingTexts((prev) => prev.filter((t) => t.id !== floatId));
        }, 550);
      }

      onHit();
    };

    useImperativeHandle(ref, () => ({
      triggerHit: handleHit,
    }));

    const instrumentStyle = sizePx
      ? { width: sizePx, height: sizePx }
      : { width: 'min(62vw, 260px)', height: 'min(62vw, 260px)' };

    return (
      <div
        className={cn(
          'relative flex items-center justify-center select-none pointer-events-none',
          className
        )}
      >
        {/* Metronome Guide Halo (when enabled) */}
        {metronomeBpm && (
          <motion.div
            key={`metronome-${metronomeBpm}`}
            aria-hidden="true"
            animate={{ scale: [1, 1.08, 1], opacity: [0.22, 0.52, 0.22] }}
            transition={{
              duration: 60 / metronomeBpm,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={instrumentStyle}
            className="absolute rounded-full border-2 border-accent-soft bg-accent-soft/10 pointer-events-none"
          />
        )}

        {/* Center Ripples (max 3 simultaneous, 900ms, ease-zen) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {ripples.map((r) => (
            <motion.div
              key={r.id}
              initial={{ scale: 0.6, opacity: 0.45 }}
              animate={{ scale: 1.8, opacity: 0 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              style={{
                width: sizePx || 'min(62vw, 260px)',
                height: sizePx || 'min(62vw, 260px)',
                background:
                  'radial-gradient(circle, var(--theme-accent-soft) 0%, transparent 70%)',
              }}
              className="absolute rounded-full pointer-events-none"
            />
          ))}
        </div>

        {/* Optional Merit Float Text (only when setting enabled) */}
        <AnimatePresence>
          {showFloatingText &&
            floatingTexts.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0.6, y: 0 }}
                animate={{ opacity: 0, y: -16 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="absolute -top-4 text-[13px] font-medium text-gold pointer-events-none whitespace-nowrap z-20"
                style={{ transform: `translateX(${item.x}px)` }}
              >
                {floatingText}
              </motion.div>
            ))}
        </AnimatePresence>

        {/* Disabled Notice */}
        <AnimatePresence>
          {showDisabledMsg && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute -top-10 bg-surface text-ink border border-line px-4 py-1.5 rounded-full text-xs shadow-float z-20 whitespace-nowrap"
            >
              {disabledMessage}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Instrument Visual (scale 1 -> 0.97 -> 1, 140ms) */}
        <motion.div
          animate={{ scale: isHitting ? 0.97 : 1 }}
          transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
          style={instrumentStyle}
          className="relative flex items-center justify-center"
        >
          {appearance === 'fish' && (
            <svg
              viewBox="0 0 220 180"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full text-accent drop-shadow-sm"
            >
              <defs>
                <radialGradient id="fishGradient" cx="50%" cy="40%" r="60%" fx="50%" fy="30%">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0.82" />
                  <stop offset="100%" stopColor="currentColor" />
                </radialGradient>
              </defs>
              <path
                d="M190 90C190 130 155 155 110 155C65 155 30 130 30 90C30 50 65 25 110 25C155 25 190 50 190 90Z"
                fill="url(#fishGradient)"
              />
              <path
                d="M170 85C170 115 145 135 110 135C75 135 50 115 50 85C50 55 75 35 110 35C145 35 170 55 170 85Z"
                fill="white"
                fillOpacity="0.1"
              />
              <path
                d="M60 95C80 105 140 105 160 95"
                stroke="rgba(0,0,0,0.28)"
                strokeWidth="6"
                strokeLinecap="round"
                opacity="0.8"
              />
              <circle cx="155" cy="70" r="4" fill="rgba(0,0,0,0.28)" opacity="0.6" />
              <rect x="85" y="145" width="50" height="12" rx="6" fill="rgba(0,0,0,0.28)" opacity="0.4" />
              <circle cx="110" cy="90" r="40" stroke="white" strokeWidth="1" strokeDasharray="4 8" opacity="0.12" />
            </svg>
          )}

          {appearance === 'lotus' && (
            <svg
              viewBox="0 0 200 200"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full text-accent drop-shadow-sm"
            >
              <defs>
                <linearGradient id="lotusGrad1" x1="100" y1="20" x2="100" y2="180" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0.4" />
                </linearGradient>
                <linearGradient id="lotusGrad2" x1="100" y1="50" x2="100" y2="180" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0.3" />
                </linearGradient>
                <linearGradient id="lotusGrad3" x1="100" y1="80" x2="100" y2="180" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0.2" />
                </linearGradient>
              </defs>

              <g transform="translate(0, 10)">
                <path d="M 100 160 C 70 130, 50 80, 60 40 C 75 70, 85 110, 100 160 Z" fill="url(#lotusGrad3)" />
                <path d="M 100 160 C 130 130, 150 80, 140 40 C 125 70, 115 110, 100 160 Z" fill="url(#lotusGrad3)" />
                <path d="M 100 160 C 50 150, 10 110, 15 70 C 35 100, 65 130, 100 160 Z" fill="url(#lotusGrad3)" />
                <path d="M 100 160 C 150 150, 190 110, 185 70 C 165 100, 135 130, 100 160 Z" fill="url(#lotusGrad3)" />
                <path d="M 100 160 C 60 140, 30 90, 35 50 C 55 85, 75 120, 100 160 Z" fill="url(#lotusGrad2)" />
                <path d="M 100 160 C 140 140, 170 90, 165 50 C 145 85, 125 120, 100 160 Z" fill="url(#lotusGrad2)" />
                <path d="M 100 160 C 70 150, 40 110, 45 70 C 65 105, 80 135, 100 160 Z" fill="url(#lotusGrad1)" />
                <path d="M 100 160 C 130 150, 160 110, 155 70 C 135 105, 120 135, 100 160 Z" fill="url(#lotusGrad1)" />
                <path d="M 100 160 C 80 110, 85 50, 100 20 C 115 50, 120 110, 100 160 Z" fill="url(#lotusGrad1)" />
                <path d="M 100 160 C 70 170, 30 165, 20 145 C 45 155, 75 160, 100 160 Z" fill="url(#lotusGrad3)" />
                <path d="M 100 160 C 130 170, 170 165, 180 145 C 155 155, 125 160, 100 160 Z" fill="url(#lotusGrad3)" />
                <path d="M 85 160 C 95 165, 105 165, 115 160 C 105 168, 95 168, 85 160 Z" fill="currentColor" fillOpacity="0.8" />
              </g>
            </svg>
          )}

          {appearance === 'bowl' && (
            <svg
              viewBox="0 0 200 160"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full text-accent drop-shadow-sm"
            >
              <defs>
                <linearGradient id="bowlGradient" x1="100" y1="40" x2="100" y2="160" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="currentColor" />
                </linearGradient>
              </defs>
              <path d="M20 60 C20 130 60 150 100 150 C140 150 180 130 180 60 L180 50 L20 50 Z" fill="url(#bowlGradient)" />
              <ellipse cx="100" cy="50" rx="80" ry="15" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="2" />
              <path d="M40 80 C40 120 70 130 100 130" stroke="white" strokeWidth="2" strokeOpacity="0.2" strokeLinecap="round" />
              <rect x="80" y="10" width="140" height="20" rx="10" transform="rotate(-15 100 20)" fill="#8B4513" />
            </svg>
          )}
        </motion.div>
      </div>
    );
  }
);

WoodenFish.displayName = 'WoodenFish';
