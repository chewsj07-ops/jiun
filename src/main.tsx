import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './index.css';
import { FirebaseProvider } from './contexts/FirebaseContext';
import { ErrorBoundary } from './components/ErrorBoundary';

// Register PWA Service Worker for installability & offline readiness
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onRegistered(registration) {
      if (registration) {
        setInterval(() => {
          registration.update().catch(() => {});
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.warn('Service Worker registration error:', error);
    },
  });
}

// Global iOS and mobile Safari fallback protection
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (event.message && (event.message.includes('WebSocket') || event.message.includes('ResizeObserver') || event.message.includes('Script error'))) {
      return;
    }
    console.warn('Window error detected:', event.error || event.message);
    const root = document.getElementById('root');
    if (root && (!root.innerHTML || root.innerHTML.trim() === '')) {
      root.innerHTML = `
        <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #FAF9F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; text-align: center;">
          <div style="background: #FFFEFB; padding: 32px 24px; border-radius: 24px; border: 1px solid #E6E2D8; max-width: 360px; width: 100%;">
            <div style="width: 48px; height: 48px; background: #4A755A; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 20px;">愿</div>
            <h2 style="color: #2B2F2C; font-size: 18px; font-weight: 600; margin-bottom: 8px;">愿禅助手</h2>
            <p style="color: #56635C; font-size: 13px; line-height: 1.5; margin-bottom: 20px;">页面正在恢复连接，请点击下方按钮重新加载。</p>
            <button onclick="window.location.reload()" style="width: 100%; background: #4A755A; color: #ffffff; border: none; padding: 12px; border-radius: 14px; font-size: 15px; font-weight: 600; cursor: pointer;">重新加载应用</button>
          </div>
        </div>
      `;
    }
  });
}

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <FirebaseProvider>
          <App />
        </FirebaseProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
}
