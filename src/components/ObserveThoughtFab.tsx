import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Feather } from 'lucide-react';

interface ObserveThoughtFabProps {
  visible: boolean;
}

export const ObserveThoughtFab: React.FC<ObserveThoughtFabProps> = ({ visible }) => {
  const timerRef = useRef<number | null>(null);
  const longPressedRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const [isPressing, setIsPressing] = useState(false);

  const clearPressTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsPressing(false);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    longPressedRef.current = false;
    startPosRef.current = { x: e.clientX, y: e.clientY };
    setIsPressing(true);

    timerRef.current = window.setTimeout(() => {
      longPressedRef.current = true;
      setIsPressing(false);
      navigator.vibrate?.(10);
      window.dispatchEvent(new CustomEvent('open-good-deed-collector'));
      timerRef.current = null;
    }, 500);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!startPosRef.current || timerRef.current === null) return;
    const dx = Math.abs(e.clientX - startPosRef.current.x);
    const dy = Math.abs(e.clientY - startPosRef.current.y);
    if (dx > 10 || dy > 10) {
      clearPressTimer();
    }
  };

  const handlePointerUp = () => {
    clearPressTimer();
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (longPressedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      longPressedRef.current = false;
      return;
    }
    window.dispatchEvent(new CustomEvent('open-thought-collector'));
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.9 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="fixed right-4 z-40 flex items-center gap-2.5 select-none"
          style={{ bottom: 'calc(64px + env(safe-area-inset-bottom) + 16px)' }}
        >
          <span className="px-3 py-1.5 rounded-full bg-surface/90 backdrop-blur-md border border-line shadow-float text-xs font-serif font-medium text-ink pointer-events-none whitespace-nowrap">
            观一念
          </span>

          <motion.button
            type="button"
            aria-label="观一念（点击记录起心动念，长按记录随手行善）"
            title="点击：观一念 · 长按：随手行善"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onClick={handleClick}
            onContextMenu={(e) => e.preventDefault()}
            animate={{ scale: isPressing ? 0.92 : 1 }}
            transition={{ duration: 0.15 }}
            className="w-14 h-14 rounded-full bg-accent hover:bg-accent-hover text-on-accent shadow-float flex items-center justify-center touch-manipulation cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            <Feather size={22} strokeWidth={1.5} />
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
