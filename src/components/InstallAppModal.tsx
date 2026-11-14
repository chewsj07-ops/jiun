import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Download,
  Share,
  PlusSquare,
  CheckCircle2,
  Copy,
  ExternalLink,
  Smartphone,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({ isOpen, onClose }) => {
  const {
    isInstallable,
    isStandalone,
    isIOS,
    isAndroid,
    isInIframe,
    isInAppBrowser,
    inAppBrowserName,
    isPrompting,
    install,
  } = usePWAInstall();

  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const handleDirectInstall = async () => {
    const result = await install();
    if (result === 'accepted') {
      onClose();
    } else if (result === 'unavailable') {
      toast.info('当前浏览器暂未弹出自动安装窗口，请按下方步骤手动添加到主屏幕');
    }
  };

  const handleCopyUrl = async () => {
    if (!appUrl) return;
    try {
      await navigator.clipboard.writeText(appUrl);
      toast.success('已复制应用网址，请在手机 Chrome 或 Safari 浏览器中粘贴打开');
    } catch {
      toast.info(`请复制网址并在浏览器打开：${appUrl}`);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-surface rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col shadow-float border border-line overflow-hidden relative"
          >
            <div className="flex justify-between items-center p-6 pb-4 border-b border-line shrink-0">
              <h3 className="text-xl font-bold font-serif text-ink flex items-center gap-2">
                <Download className="w-5 h-5 text-accent" />
                安装到手机 / 桌面
              </h3>
              <button
                type="button"
                onClick={onClose}
                aria-label="关闭安装说明"
                className="p-2 text-ink-3 hover:text-ink rounded-full hover:bg-surface-2 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto">
              <div className="text-center space-y-2">
                <img
                  src="/pwa-192x192.png"
                  alt="愿禅助手 Logo"
                  className="w-20 h-20 rounded-2xl mx-auto mb-3 object-cover border border-line bg-paper shadow-sm"
                />
                <h4 className="font-bold text-lg text-ink">愿禅助手 (Vowzen)</h4>
                <p className="text-sm text-ink-2">
                  添加到主屏幕后可全屏离线使用木鱼、静坐与每日修行
                </p>
              </div>

              {/* Standalone Already Installed */}
              {isStandalone && (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-accent-mist border border-accent/25 text-ink">
                  <CheckCircle2 className="w-5 h-5 text-accent shrink-0" />
                  <div className="text-sm">
                    <p className="font-bold text-accent">已安装为独立应用</p>
                    <p className="text-xs text-ink-2 mt-0.5">
                      你当前正以桌面 / 主屏幕应用模式运行「愿禅助手」。
                    </p>
                  </div>
                </div>
              )}

              {/* Direct Native Install Button (Android Chrome / Desktop Chrome / Edge) */}
              {!isStandalone && isInstallable && (
                <div className="p-4 rounded-2xl bg-accent-mist border border-accent/30 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-accent">
                    <Smartphone className="w-4 h-4 shrink-0" />
                    <span>当前浏览器支持一键安装</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDirectInstall}
                    disabled={isPrompting}
                    className="w-full py-3.5 px-4 bg-accent text-on-accent hover:bg-accent-hover rounded-xl font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isPrompting ? '正在唤起安装窗口...' : '立即安装「愿禅助手」'}</span>
                  </button>
                </div>
              )}

              {/* Embedded Iframe or In-App WebView Notice */}
              {!isStandalone && (isInIframe || isInAppBrowser) && (
                <div className="p-4 rounded-2xl bg-surface-2 border border-gold/40 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                    <div className="text-xs text-ink-2 leading-relaxed space-y-1">
                      <p className="font-bold text-gold">
                        {isInAppBrowser
                          ? `当前正在「${inAppBrowserName}」内置浏览器中打开`
                          : '当前处于内嵌预览窗口中'}
                      </p>
                      <p>
                        {isInAppBrowser
                          ? '内置浏览器不允许直接安装桌面应用。请点击右上角「···」选择「在浏览器中打开（Safari 或 Chrome）」，即可一键安装。'
                          : '内嵌预览框中浏览器会拦截应用安装弹窗。请先在新窗口打开正式网址，再点击安装或添加到主屏幕。'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleCopyUrl}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-surface border border-line hover:border-line-strong text-xs font-bold text-ink flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5 text-accent" />
                      <span>复制网址</span>
                    </button>
                    {isInIframe && appUrl && (
                      <a
                        href={appUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2.5 px-3 rounded-xl bg-accent text-on-accent hover:bg-accent-hover text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>新窗口打开</span>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* iOS Safari Guide */}
              <div
                className={cn(
                  'space-y-3 bg-surface-2 p-4 rounded-2xl border',
                  isIOS ? 'border-accent/40' : 'border-line'
                )}
              >
                <h5 className="font-bold text-sm text-ink flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-accent-mist text-accent flex items-center justify-center text-xs shrink-0">
                    1
                  </span>
                  <span>iPhone / iPad (必须用 Safari)</span>
                </h5>
                <div className="text-sm text-ink-2 pl-8 space-y-2">
                  <p className="flex items-center gap-2 flex-wrap">
                    <span>点击底部工具栏的「分享」按钮</span>
                    <Share className="w-4 h-4 text-accent inline shrink-0" />
                  </p>
                  <p className="flex items-center gap-2 flex-wrap">
                    <span>向下滑动，点击「添加到主屏幕」</span>
                    <PlusSquare className="w-4 h-4 text-accent inline shrink-0" />
                  </p>
                  <p className="text-xs text-ink-3">
                    注意：苹果手机上用微信、Chrome 等其他浏览器打开时看不到该按钮，请用 Safari。
                  </p>
                </div>
              </div>

              {/* Android / Desktop Guide */}
              <div
                className={cn(
                  'space-y-3 bg-surface-2 p-4 rounded-2xl border',
                  isAndroid ? 'border-accent/40' : 'border-line'
                )}
              >
                <h5 className="font-bold text-sm text-ink flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-accent-mist text-accent flex items-center justify-center text-xs shrink-0">
                    2
                  </span>
                  <span>Android 手机 / 电脑 (Chrome / Edge)</span>
                </h5>
                <div className="text-sm text-ink-2 pl-8 space-y-2">
                  <p>点击浏览器右上角菜单（⋮）或地址栏右侧的安装图标</p>
                  <p>选择「安装应用」或「添加到主屏幕」</p>
                  {!isInstallable && !isStandalone && !isInIframe && !isInAppBrowser && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={handleCopyUrl}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>复制当前应用网址到 Chrome 打开</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 pt-4 border-t border-line bg-surface shrink-0">
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  'w-full py-3.5 rounded-xl font-bold transition-colors',
                  isInstallable && !isStandalone
                    ? 'bg-surface-2 text-ink hover:bg-surface border border-line'
                    : 'bg-accent text-on-accent hover:bg-accent-hover'
                )}
              >
                {isInstallable && !isStandalone ? '稍后再说' : '我知道了'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};