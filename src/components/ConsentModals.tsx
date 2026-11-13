import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Cloud, Lock, X } from 'lucide-react';
import { consentService } from '../services/consentService';

interface MindConsentSheetProps {
  isOpen: boolean;
  onConsentAccepted: () => void;
  onCancel: () => void;
}

export const MindConsentSheet: React.FC<MindConsentSheetProps> = ({
  isOpen,
  onConsentAccepted,
  onCancel,
}) => {
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (isOpen) setChecked(false);
  }, [isOpen]);

  if (typeof document === 'undefined') return null;

  const handleConfirm = async () => {
    if (!checked) return;
    await consentService.grantMindConsent();
    onConsentAccepted();
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[135] flex items-end sm:items-center justify-center sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
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
            <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-3 border-b border-line">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-accent-mist text-accent flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <h3 className="text-title text-ink">写下心声之前，先说明我们怎么保护它</h3>
              </div>
              <button
                type="button"
                onClick={onCancel}
                aria-label="关闭"
                className="p-1.5 text-ink-3 hover:text-ink hover:bg-surface-2 rounded-full transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 pt-4 space-y-4">
              <ul className="space-y-2.5 text-sm text-ink-2 leading-relaxed list-disc pl-5">
                <li>
                  观心内容会在你的设备本机加密保存；开启云端同步后，仅同步加密后的密文至你的账号云端。
                </li>
                <li>
                  如果内容出现自我伤害或严重危机求助字词，系统仅在本机显示求助资源，绝不上传云端，也不发送给 AI。
                </li>
                <li>
                  启用 AI 觉察陪伴时，当前输入会经由服务端转发给 Google Gemini 生成回应（应用服务器不保存你的对话日志）。
                </li>
              </ul>

              <div>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('open-privacy-policy'))}
                  className="text-xs font-medium text-accent hover:underline"
                >
                  查看完整《隐私说明》
                </button>
              </div>

              <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-surface-2 border border-line cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setChecked(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-line-strong text-accent focus:ring-accent bg-surface shrink-0"
                />
                <span className="text-xs text-ink leading-relaxed">
                  我已阅读并同意《隐私说明》中关于观心记录加密保存与 AI 处理的方式。
                </span>
              </label>

              <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={onCancel}
                  className="w-full sm:w-auto sm:flex-1 py-3 px-4 rounded-2xl bg-surface-2 border border-line text-ink-2 hover:text-ink text-sm font-medium transition-colors"
                >
                  暂不使用观心
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!checked}
                  className="w-full sm:w-auto sm:flex-1 py-3 px-4 rounded-2xl bg-accent text-on-accent hover:bg-accent-hover text-sm font-bold transition-colors disabled:opacity-45 disabled:cursor-not-allowed"
                >
                  同意并继续使用观心
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

interface CloudConsentSheetProps {
  isOpen: boolean;
  onConsentAccepted: () => void;
  onOptOut: () => void;
}

export const CloudConsentSheet: React.FC<CloudConsentSheetProps> = ({
  isOpen,
  onConsentAccepted,
  onOptOut,
}) => {
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (isOpen) setChecked(false);
  }, [isOpen]);

  if (typeof document === 'undefined') return null;

  const handleConfirm = async () => {
    if (!checked) return;
    await consentService.grantCloudConsent();
    onConsentAccepted();
  };

  const handleOptOut = () => {
    consentService.optOutCloudSync();
    onOptOut();
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[135] flex items-end sm:items-center justify-center sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
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
            <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-3 border-b border-line">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-accent-mist text-accent flex items-center justify-center shrink-0">
                  <Cloud className="w-4 h-4" />
                </div>
                <h3 className="text-title text-ink">是否开启云端同步？</h3>
              </div>
              <button
                type="button"
                onClick={handleOptOut}
                aria-label="暂不同步"
                className="p-1.5 text-ink-3 hover:text-ink hover:bg-surface-2 rounded-full transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 pt-4 space-y-4">
              <p className="text-sm text-ink-2 leading-relaxed">
                开启云端同步后，你的个人资料、每日定课清单、功德历史、愿力与加密观心记录会上传至 Google Firebase / Cloud Firestore，让你可以在不同设备之间同步。
              </p>
              <p className="text-sm text-ink-2 leading-relaxed">
                若暂时不想上传任何个人资料，你可以选择只在本机使用——你的登录状态仍会保留，也不会上传或下载云端个人数据。
              </p>

              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-accent shrink-0" />
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('open-privacy-policy'))}
                  className="text-xs font-medium text-accent hover:underline"
                >
                  阅读《隐私说明》了解云端同步与跨境存储详情
                </button>
              </div>

              <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-surface-2 border border-line cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setChecked(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-line-strong text-accent focus:ring-accent bg-surface shrink-0"
                />
                <span className="text-xs text-ink leading-relaxed">
                  我已阅读并同意《隐私说明》，允许将我的修行资料同步与跨境存储于云端。
                </span>
              </label>

              <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleOptOut}
                  className="w-full sm:w-auto sm:flex-1 py-3 px-4 rounded-2xl bg-surface-2 border border-line text-ink-2 hover:text-ink text-sm font-medium transition-colors"
                >
                  暂不同步，只在本机使用
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!checked}
                  className="w-full sm:w-auto sm:flex-1 py-3 px-4 rounded-2xl bg-accent text-on-accent hover:bg-accent-hover text-sm font-bold transition-colors disabled:opacity-45 disabled:cursor-not-allowed"
                >
                  同意并开启云端同步
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
