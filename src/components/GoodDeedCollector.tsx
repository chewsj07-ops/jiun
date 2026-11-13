import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, X } from 'lucide-react';
import { DailyGoodDeed } from './vow/DailyGoodDeed';
import { useFirebase } from '../contexts/FirebaseContext';

export const GoodDeedCollector = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useFirebase();

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-good-deed-collector', handleOpen);
    return () => window.removeEventListener('open-good-deed-collector', handleOpen);
  }, []);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center pointer-events-none">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
          />
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full sm:max-w-[600px] max-h-[88vh] sm:mx-4 z-[110] flex flex-col pointer-events-auto shadow-float bg-surface border-t sm:border border-line rounded-t-3xl sm:rounded-3xl overflow-hidden"
          >
            <div className="sm:hidden w-10 h-1 rounded-full bg-line-strong mx-auto mt-3 mb-1 shrink-0" />
            <div className="flex-1 overflow-y-auto">
              <DailyGoodDeed user={user} onLevelUp={() => {}} onClose={() => setIsOpen(false)} />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};