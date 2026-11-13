import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface ConfirmSheetProps {
  isOpen: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  destructive?: boolean;
  isLoading?: boolean;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
}

export const ConfirmSheet: React.FC<ConfirmSheetProps> = ({
  isOpen,
  title,
  description,
  confirmLabel,
  cancelLabel = '取消',
  secondaryAction,
  destructive = false,
  isLoading = false,
  confirmDisabled = false,
  onConfirm,
  onCancel,
  children,
}) => {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[140] flex items-end sm:items-center justify-center sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              if (!isLoading) onCancel();
            }}
            className="absolute inset-0 bg-black/45 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%', opacity: 0.9 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0.9 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-surface border-t sm:border border-line shadow-float overflow-hidden pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-6"
          >
            <div className="sm:hidden w-10 h-1 rounded-full bg-line-strong mx-auto mt-3 mb-1" />
            <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-3">
              <h3 className="text-title text-ink">{title}</h3>
              <button
                type="button"
                onClick={onCancel}
                disabled={isLoading}
                aria-label="关闭"
                className="p-1.5 text-ink-3 hover:text-ink hover:bg-surface-2 rounded-full transition-colors disabled:opacity-40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 space-y-4">
              {description && (
                <p className="text-sm text-ink-2 leading-relaxed whitespace-pre-line">
                  {description}
                </p>
              )}

              {children}

              <div className="pt-2 space-y-2.5">
                {secondaryAction && (
                  <button
                    type="button"
                    onClick={secondaryAction.onClick}
                    disabled={isLoading}
                    className="w-full py-3 px-4 rounded-2xl bg-surface-2 border border-line text-ink hover:border-line-strong text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {secondaryAction.label}
                  </button>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onCancel}
                    disabled={isLoading}
                    className="flex-1 py-3 px-4 rounded-2xl bg-surface-2 border border-line text-ink-2 hover:text-ink text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {cancelLabel}
                  </button>
                  <button
                    type="button"
                    onClick={onConfirm}
                    disabled={isLoading || confirmDisabled}
                    className={cn(
                      'flex-1 py-3 px-4 rounded-2xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2',
                      destructive
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : 'bg-accent text-on-accent hover:bg-accent-hover'
                    )}
                  >
                    {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>{confirmLabel}</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
