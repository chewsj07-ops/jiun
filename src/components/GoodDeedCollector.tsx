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
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-[600px] max-h-[90vh] mx-4 z-[110] flex flex-col pointer-events-auto shadow-2xl rounded-3xl sm:rounded-[40px]"
          >
            <div className="flex-1 overflow-y-auto rounded-3xl sm:rounded-[40px]">
              <DailyGoodDeed user={user} onLevelUp={() => {}} onClose={() => setIsOpen(false)} />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};