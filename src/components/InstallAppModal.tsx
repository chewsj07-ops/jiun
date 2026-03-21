import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Apple, Smartphone } from 'lucide-react';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  // Detect iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  // Detect Android
  const isAndroid = /android/i.test(navigator.userAgent);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-zen-bg w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-zen-accent/20 flex flex-col max-h-[90vh]"
        >
          <div className="p-6 border-b border-zen-accent/10 flex justify-between items-center bg-zen-accent/5 shrink-0">
            <h2 className="text-xl font-bold text-zen-accent flex items-center gap-2">
              <Download className="w-5 h-5" />
              下载APP到手机
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-zen-accent/10 rounded-full transition-colors text-zen-accent/60 hover:text-zen-accent"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6 overflow-y-auto">
            <p className="text-sm text-zen-accent/80 leading-relaxed">
              禅心助手是一款免安装的轻应用（PWA）。您可以直接将它添加到手机桌面，体验与原生APP完全一致，且不占用手机存储空间。
            </p>

            {(!isAndroid || isIOS) && (
              <div className="bg-white/50 rounded-2xl p-5 border border-zen-accent/10">
                <h3 className="font-bold text-zen-accent mb-3 flex items-center gap-2">
                  <Apple className="w-5 h-5" />
                  iOS / 苹果手机安装教程
                </h3>
                <ol className="list-decimal list-inside space-y-3 text-sm text-zen-accent/80">
                  <li>请确保您正在使用 <strong>Safari 浏览器</strong> 打开本网页</li>
                  <li>点击浏览器底部的 <span className="inline-block px-2 py-1 bg-gray-100 rounded border border-gray-200 text-xs mx-1">分享图标 ⍗</span></li>
                  <li>在弹出的菜单中向上滑动，找到并点击 <strong>“添加到主屏幕”</strong></li>
                  <li>点击右上角的 <strong>“添加”</strong> 即可在桌面看到禅心助手</li>
                </ol>
              </div>
            )}

            {(!isIOS || isAndroid) && (
              <div className="bg-white/50 rounded-2xl p-5 border border-zen-accent/10">
                <h3 className="font-bold text-zen-accent mb-3 flex items-center gap-2">
                  <Smartphone className="w-5 h-5" />
                  Android / 安卓手机安装教程
                </h3>
                <ol className="list-decimal list-inside space-y-3 text-sm text-zen-accent/80">
                  <li>请使用 <strong>Chrome 浏览器</strong> 或手机自带浏览器打开本网页</li>
                  <li>点击浏览器右上角的 <span className="inline-block px-2 py-1 bg-gray-100 rounded border border-gray-200 text-xs mx-1">菜单 ⋮</span></li>
                  <li>在弹出的菜单中选择 <strong>“安装应用”</strong> 或 <strong>“添加到主屏幕”</strong></li>
                  <li>确认添加后，即可在手机桌面看到禅心助手</li>
                </ol>
              </div>
            )}
          </div>
          
          <div className="p-6 pt-4 shrink-0 border-t border-zen-accent/10">
            <button
              onClick={onClose}
              className="w-full py-3 bg-zen-accent text-white rounded-xl font-bold hover:bg-zen-accent/90 transition-colors shadow-md"
            >
              我知道了
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
