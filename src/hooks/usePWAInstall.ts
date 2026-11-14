import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Module-level store so early beforeinstallprompt events fired before modal mount are never lost
let cachedDeferredPrompt: BeforeInstallPromptEvent | null = null;
let cachedIsInstalled = false;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((cb) => cb());
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    cachedDeferredPrompt = e as BeforeInstallPromptEvent;
    notifyListeners();
  });

  window.addEventListener('appinstalled', () => {
    cachedDeferredPrompt = null;
    cachedIsInstalled = true;
    notifyListeners();
    toast.success('「愿禅助手」已成功添加到桌面 / 主屏幕');
  });
}

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    (window.navigator as any).standalone === true
  );
}

function detectIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isClassicIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return isClassicIOS || isIPadOS;
}

function detectAndroid(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent || '');
}

function detectInIframe(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function detectInAppBrowser(): { isInAppBrowser: boolean; inAppBrowserName: string } {
  if (typeof navigator === 'undefined') {
    return { isInAppBrowser: false, inAppBrowserName: '' };
  }
  const ua = navigator.userAgent || '';
  if (/MicroMessenger/i.test(ua)) return { isInAppBrowser: true, inAppBrowserName: '微信' };
  if (/wxwork/i.test(ua)) return { isInAppBrowser: true, inAppBrowserName: '企业微信' };
  if (/QQ\//i.test(ua)) return { isInAppBrowser: true, inAppBrowserName: 'QQ' };
  if (/Line\//i.test(ua)) return { isInAppBrowser: true, inAppBrowserName: 'LINE' };
  if (/WhatsApp/i.test(ua)) return { isInAppBrowser: true, inAppBrowserName: 'WhatsApp' };
  if (/FBAN|FBAV/i.test(ua)) return { isInAppBrowser: true, inAppBrowserName: 'Facebook' };
  if (/Instagram/i.test(ua)) return { isInAppBrowser: true, inAppBrowserName: 'Instagram' };
  return { isInAppBrowser: false, inAppBrowserName: '' };
}

export function usePWAInstall() {
  const [, setTick] = useState(0);
  const [isStandalone, setIsStandalone] = useState<boolean>(detectStandalone);
  const [isPrompting, setIsPrompting] = useState(false);

  useEffect(() => {
    const forceUpdate = () => {
      setIsStandalone(detectStandalone());
      setTick((t) => t + 1);
    };
    listeners.add(forceUpdate);

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const onDisplayModeChange = () => forceUpdate();
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', onDisplayModeChange);
    }

    return () => {
      listeners.delete(forceUpdate);
      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', onDisplayModeChange);
      }
    };
  }, []);

  const install = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!cachedDeferredPrompt) return 'unavailable';
    setIsPrompting(true);
    try {
      await cachedDeferredPrompt.prompt();
      const choiceResult = await cachedDeferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        cachedDeferredPrompt = null;
        cachedIsInstalled = true;
        notifyListeners();
      }
      return choiceResult.outcome;
    } catch (err) {
      console.warn('PWA install prompt failed:', err);
      return 'unavailable';
    } finally {
      setIsPrompting(false);
    }
  }, []);

  const { isInAppBrowser, inAppBrowserName } = detectInAppBrowser();

  return {
    isInstallable: Boolean(cachedDeferredPrompt) && !isStandalone && !cachedIsInstalled,
    isStandalone: isStandalone || cachedIsInstalled,
    isIOS: detectIOS(),
    isAndroid: detectAndroid(),
    isInIframe: detectInIframe(),
    isInAppBrowser,
    inAppBrowserName,
    isPrompting,
    install,
  };
}
