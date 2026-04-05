import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Book, Wind, Brain, Target } from 'lucide-react';

interface Props {
  showOnboarding: boolean;
  onboardingStep: number;
  onboardingSteps: any[];
  onNext: () => void;
  onFinish: () => void;
}

export const ZenOnboarding: React.FC<Props> = ({ showOnboarding, onboardingStep, onboardingSteps, onNext, onFinish }) => {
  return (
    <AnimatePresence>
      {showOnboarding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-zen-bg/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white w-full max-w-md rounded-[40px] p-10 shadow-2xl border border-zen-accent/5 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-zen-bg">
              <motion.div 
                className="h-full bg-zen-accent"
                initial={{ width: "0%" }}
                animate={{ width: `${((onboardingStep + 1) / onboardingSteps.length) * 100}%` }}
              />
            </div>

            <div className="text-center">
              <motion.div
                key={onboardingStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8 ${onboardingSteps[onboardingStep].color}`}>
                  {React.createElement(onboardingSteps[onboardingStep].icon, { className: "w-10 h-10" })}
                </div>
                <h2 className="text-3xl font-serif font-bold mb-4">{onboardingSteps[onboardingStep].title}</h2>
                <p className="text-zen-ink/70 leading-relaxed mb-10">{onboardingSteps[onboardingStep].description}</p>
                
                <button 
                  onClick={onboardingStep === onboardingSteps.length - 1 ? onFinish : onNext}
                  className="w-full bg-zen-accent text-white py-4 rounded-2xl font-bold hover:opacity-90 transition-opacity"
                >
                  {onboardingStep === onboardingSteps.length - 1 ? "开启修行" : "下一步"}
                </button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};