import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Share, PlusSquare } from 'lucide-react';
import { cn } from '../lib/utils';

export const InstallAppModal = ({ isOpen, onClose }: any) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-surface rounded-3xl w-full max-w-md shadow-float border border-line overflow-hidden relative"
        >
          <div className="flex justify-between items-center p-6 pb-4 border-b border-line">
            <h3 className="text-xl font-bold font-serif text-ink flex items-center gap-2">
              <Download className="w-5 h-5 text-accent" />
              安装到手机
            </h3>
            <button onClick={onClose} className="p-2 text-ink-3 hover:text-ink rounded-full hover:bg-surface-2 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div className="text-center space-y-2">
              <img
                src="/assets/aistudio/logo_f2d0c65b.png"
                alt="愿禅助手 Logo"
                className="w-20 h-20 rounded-2xl mx-auto mb-4 object-cover border border-line bg-paper"
              />
              <h4 className="font-bold text-lg text-ink">愿禅助手 (Vowzen)</h4>
              <p className="text-sm text-ink-2">将应用添加到主屏幕，随时随地开启修行</p>
            </div>

            <div className="space-y-4 bg-surface-2 p-4 rounded-2xl border border-line">
              <h5 className="font-bold text-sm text-ink flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-accent-mist text-accent flex items-center justify-center text-xs">1</span>
                iOS (Safari) 安装方法
              </h5>
              <div className="text-sm text-ink-2 pl-8 space-y-2">
                <p className="flex items-center gap-2">
                  点击底部工具栏的分享按钮 <Share className="w-4 h-4" />
                </p>
                <p className="flex items-center gap-2">
                  向下滑动，选择「添加到主屏幕」 <PlusSquare className="w-4 h-4" />
                </p>
              </div>
            </div>

            <div className="space-y-4 bg-surface-2 p-4 rounded-2xl border border-line">
              <h5 className="font-bold text-sm text-ink flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-accent-mist text-accent flex items-center justify-center text-xs">2</span>
                Android (Chrome) 安装方法
              </h5>
              <div className="text-sm text-ink-2 pl-8 space-y-2">
                <p>点击浏览器右上角的菜单 (⋮)</p>
                <p>选择「添加到主屏幕」或「安装应用」</p>
              </div>
            </div>
          </div>

          <div className="p-6 pt-4 border-t border-line bg-surface">
            <button
              onClick={onClose}
              className="w-full py-3.5 bg-accent text-on-accent hover:bg-accent-hover rounded-xl font-bold transition-colors"
            >
              我知道了
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};