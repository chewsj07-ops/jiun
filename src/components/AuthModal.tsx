import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Loader2, LogOut, ArrowLeft } from 'lucide-react';
import { cn } from '../lib/utils';
import { identityService } from '../services/identityService';
import { useTranslation } from '../i18n';
import { Country, City } from 'country-state-city';
import { auth } from '../firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const ALL_COUNTRIES = Country.getAllCountries();

type AuthView = 'login' | 'signup' | 'forgot_password' | 'verify_code' | 'reset_password';

export const AuthModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { t } = useTranslation();
  const [view, setView] = useState<AuthView>('login');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const availableCities = React.useMemo(() => {
    return countryCode ? City.getCitiesOfCountry(countryCode) : [];
  }, [countryCode]);

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    setCountryCode(code);
    const selectedCountry = ALL_COUNTRIES.find(c => c.isoCode === code);
    setCountry(selectedCountry ? selectedCountry.name : '');
    setCity('');
  };

  const handleGoogleAuth = async (isSignUp: boolean) => {
    if (isSignUp && !agreedToTerms) {
      setError(t('auth_error_agree'));
      return;
    }
    try {
      setIsLoading(true);
      setError('');
      
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      if (result.user) {
        localStorage.setItem('zen_agreed_to_terms', 'true');
        window.dispatchEvent(new CustomEvent('auth_state_changed'));
        onClose();
      }
    } catch (err: any) {
      console.error('Firebase Auth Error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('登录已取消 (Login cancelled)');
      } else if (err.code === 'auth/popup-blocked') {
        setError('弹窗被浏览器拦截，请允许弹出窗口 (Popup blocked by browser)');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('域名未授权，请联系管理员在 Firebase 控制台添加此域名 (Unauthorized domain)');
      } else {
        setError(err.message || t('auth_error_google'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!email || !email.includes('@')) {
      setError(t('auth_error_email'));
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }
    
    try {
      setIsLoading(true);
      setError('');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch('/api/auth/email/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error('Invalid credentials');
      
      const data = await res.json();
      identityService.setUserId(data.user.id);
      localStorage.setItem('zen_agreed_to_terms', 'true');
      
      // Save email to user profile
      const savedProfile = localStorage.getItem('zen_user_profile');
      let profile = savedProfile ? JSON.parse(savedProfile) : { name: '', email: '', birthday: '', gender: '', role: 'Employee' };
      profile.email = email;
      localStorage.setItem('zen_user_profile', JSON.stringify(profile));
      window.dispatchEvent(new CustomEvent('user_profile_updated'));

      window.dispatchEvent(new CustomEvent('auth_state_changed'));
      onClose();
    } catch (err) {
      setError('Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignup = async () => {
    if (!agreedToTerms) {
      setError(t('auth_error_agree'));
      return;
    }
    if (!email || !email.includes('@')) {
      setError(t('auth_error_email'));
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!/(?=.*[a-zA-Z])(?=.*[0-9])/.test(password)) {
      setError('Password must contain at least one letter and one number');
      return;
    }
    if (!country || !city || !name) {
      setError('Please fill in all required fields');
      return;
    }
    
    try {
      setIsLoading(true);
      setError('');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch('/api/auth/email/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, mode: 'signup' }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to send code');
      }
      setView('verify_code');
    } catch (err: any) {
      setError(err.message || t('auth_error_send'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code || code.length < 6) {
      setError(t('auth_error_code'));
      return;
    }
    try {
      setIsLoading(true);
      setError('');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch('/api/auth/email/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, password, country, city, name }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error('Invalid code');
      
      const data = await res.json();
      identityService.setUserId(data.user.id);
      localStorage.setItem('zen_agreed_to_terms', 'true');
      
      // Save country, city, and name to user profile
      const savedProfile = localStorage.getItem('zen_user_profile');
      let profile = savedProfile ? JSON.parse(savedProfile) : { name: '', email: '', birthday: '', gender: '', role: 'Employee' };
      profile.email = email;
      profile.country = country;
      profile.location = city;
      profile.name = name;
      localStorage.setItem('zen_user_profile', JSON.stringify(profile));
      window.dispatchEvent(new CustomEvent('user_profile_updated'));

      window.dispatchEvent(new CustomEvent('auth_state_changed'));
      onClose();
    } catch (err) {
      setError(t('auth_error_verify'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email || !email.includes('@')) {
      setError(t('auth_error_email'));
      return;
    }
    try {
      setIsLoading(true);
      setError('');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch('/api/auth/email/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error('Failed to send reset code');
      
      setSuccessMsg('Reset code sent to your email');
      setView('reset_password');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!code || code.length < 6) {
      setError(t('auth_error_code'));
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    try {
      setIsLoading(true);
      setError('');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch('/api/auth/email/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword: password }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Invalid reset code');
      }
      
      setSuccessMsg('Password reset successfully. Please log in.');
      setView('login');
      setPassword('');
      setConfirmPassword('');
      setCode('');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        identityService.setUserId(event.data.user.id);
        localStorage.setItem('zen_agreed_to_terms', 'true');
        
        // Save name to user profile
        const savedProfile = localStorage.getItem('zen_user_profile');
        let profile = savedProfile ? JSON.parse(savedProfile) : { name: '', email: '', birthday: '', gender: '', role: 'Employee' };
        if (event.data.user.name) {
          profile.name = event.data.user.name;
        }
        if (event.data.user.email) {
          profile.email = event.data.user.email;
        }
        localStorage.setItem('zen_user_profile', JSON.stringify(profile));
        window.dispatchEvent(new CustomEvent('user_profile_updated'));

        window.dispatchEvent(new CustomEvent('auth_state_changed'));
        onClose();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onClose]);

  const handleClose = () => {
    setIsLoading(false);
    setError('');
    setSuccessMsg('');
    setView('login');
    setCode('');
    setPassword('');
    setConfirmPassword('');
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col my-auto"
        >
          <div className="flex justify-between items-center p-6 pb-2 shrink-0">
            <div className="flex items-center gap-3">
              {view !== 'login' && view !== 'signup' && (
                <button 
                  onClick={() => {
                    setError('');
                    setSuccessMsg('');
                    if (view === 'verify_code') setView('signup');
                    else if (view === 'reset_password') setView('forgot_password');
                    else setView('login');
                  }}
                  className="p-1.5 text-zen-ink/60 hover:text-zen-ink rounded-full hover:bg-zen-bg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <h3 className="text-xl font-bold font-serif text-zen-ink">
                {view === 'login' ? '登录 (Log In)' : 
                 view === 'signup' ? '注册 (Sign Up)' : 
                 view === 'forgot_password' ? '忘记密码 (Forgot Password)' : 
                 view === 'reset_password' ? '重置密码 (Reset Password)' :
                 '验证邮箱 (Verify Email)'}
              </h3>
            </div>
            <button onClick={handleClose} className="p-2 text-zen-ink/40 hover:text-zen-ink rounded-full hover:bg-zen-bg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 pt-2 overflow-y-auto">
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
                {error}
              </div>
            )}
            {successMsg && (
              <div className="mb-4 p-3 bg-green-50 text-green-600 text-sm rounded-xl border border-green-100">
                {successMsg}
              </div>
            )}

            {view === 'login' && (
              <div className="space-y-4">
                <button
                  onClick={() => handleGoogleAuth(false)}
                  disabled={isLoading}
                  className="w-full py-3 bg-white border border-zen-accent/20 text-zen-ink rounded-xl font-bold hover:bg-zen-bg transition-colors flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>}
                  使用 Google 登录
                </button>
                
                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-zen-accent/10"></div>
                  <span className="flex-shrink-0 mx-4 text-zen-ink/40 text-xs">或使用邮箱</span>
                  <div className="flex-grow border-t border-zen-accent/10"></div>
                </div>

                <input
                  type="email"
                  placeholder={t('auth_email_placeholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-zen-bg/50 border border-zen-accent/20 rounded-xl text-sm focus:outline-none focus:border-zen-accent/50"
                />
                <input
                  type="password"
                  placeholder="密码 (Password)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-zen-bg/50 border border-zen-accent/20 rounded-xl text-sm focus:outline-none focus:border-zen-accent/50"
                />
                
                <button
                  onClick={handleEmailLogin}
                  disabled={isLoading || !email || !password}
                  className="w-full py-3 bg-zen-accent text-white rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : '登录 (Log In)'}
                </button>
                
                <div className="flex justify-between items-center pt-2">
                  <button
                    onClick={() => { setView('forgot_password'); setError(''); }}
                    className="text-xs text-zen-ink/60 hover:text-zen-accent transition-colors"
                  >
                    忘记密码？
                  </button>
                  <button
                    onClick={() => { setView('signup'); setError(''); }}
                    className="text-xs text-zen-accent hover:underline font-bold"
                  >
                    没有账号？去注册
                  </button>
                </div>
              </div>
            )}

            {view === 'signup' && (
              <div className="space-y-4">
                <button
                  onClick={() => handleGoogleAuth(true)}
                  disabled={isLoading}
                  className="w-full py-3 bg-white border border-zen-accent/20 text-zen-ink rounded-xl font-bold hover:bg-zen-bg transition-colors flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>}
                  使用 Google 注册
                </button>
                
                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-zen-accent/10"></div>
                  <span className="flex-shrink-0 mx-4 text-zen-ink/40 text-xs">或使用邮箱</span>
                  <div className="flex-grow border-t border-zen-accent/10"></div>
                </div>

                <input
                  type="email"
                  placeholder={t('auth_email_placeholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-zen-bg/50 border border-zen-accent/20 rounded-xl text-sm focus:outline-none focus:border-zen-accent/50"
                />
                <input
                  type="password"
                  placeholder="密码 (Password)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-zen-bg/50 border border-zen-accent/20 rounded-xl text-sm focus:outline-none focus:border-zen-accent/50"
                />
                <input
                  type="password"
                  placeholder="确认密码 (Confirm Password)"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-zen-bg/50 border border-zen-accent/20 rounded-xl text-sm focus:outline-none focus:border-zen-accent/50"
                />
                <input
                  type="text"
                  placeholder={t('name')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-zen-bg/50 border border-zen-accent/20 rounded-xl text-sm focus:outline-none focus:border-zen-accent/50"
                />
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={handleCountryChange}
                    className="w-1/2 px-4 py-3 bg-zen-bg/50 border border-zen-accent/20 rounded-xl text-sm focus:outline-none focus:border-zen-accent/50 appearance-none"
                  >
                    <option value="">国家 (Country)</option>
                    {ALL_COUNTRIES.map(c => (
                      <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
                    ))}
                  </select>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    disabled={!countryCode}
                    className="w-1/2 px-4 py-3 bg-zen-bg/50 border border-zen-accent/20 rounded-xl text-sm focus:outline-none focus:border-zen-accent/50 disabled:opacity-50 appearance-none"
                  >
                    <option value="">城市 (City)</option>
                    {availableCities && availableCities.map(c => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-start gap-3 mt-2">
                  <div className="flex items-center h-5">
                    <input
                      id="terms"
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => {
                        setAgreedToTerms(e.target.checked);
                        if (e.target.checked) setError('');
                      }}
                      className="w-4 h-4 border border-zen-accent/30 rounded text-zen-accent focus:ring-zen-accent/50 bg-white"
                    />
                  </div>
                  <label htmlFor="terms" className="text-xs text-zen-ink/70 leading-relaxed">
                    {t('auth_agree_prefix')}
                    <button 
                      onClick={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent('open-terms-modal')); }}
                      className="text-zen-accent hover:underline mx-1"
                    >
                      {t('auth_terms')}
                    </button>
                    {t('auth_and')}
                    <button 
                      onClick={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent('open-privacy-modal')); }}
                      className="text-zen-accent hover:underline mx-1"
                    >
                      {t('auth_privacy')}
                    </button>
                  </label>
                </div>

                <button
                  onClick={handleEmailSignup}
                  disabled={isLoading || !email || !password || !country || !city || !name || !confirmPassword || !agreedToTerms}
                  className="w-full py-3 bg-zen-accent text-white rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('auth_get_code')}
                </button>

                <div className="text-center pt-2">
                  <button
                    onClick={() => { setView('login'); setError(''); }}
                    className="text-xs text-zen-accent hover:underline font-bold"
                  >
                    已有账号？去登录
                  </button>
                </div>
              </div>
            )}

            {view === 'verify_code' && (
              <div className="space-y-4">
                <p className="text-xs text-zen-ink/60 text-center">{t('auth_code_sent')} {email}</p>
                <p className="text-xs text-zen-accent text-center mt-1 font-bold">测试验证码 (Test Code): 123456</p>
                <input
                  type="text"
                  placeholder={t('auth_code_placeholder')}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  maxLength={6}
                  className="w-full px-4 py-3 bg-zen-bg/50 border border-zen-accent/20 rounded-xl text-sm focus:outline-none focus:border-zen-accent/50 text-center tracking-[0.5em] font-mono"
                />
                <button
                  onClick={handleVerifyCode}
                  disabled={isLoading || code.length < 6}
                  className="w-full py-3 bg-zen-accent text-white rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('auth_verify_btn')}
                </button>
              </div>
            )}

            {view === 'forgot_password' && (
              <div className="space-y-4">
                <p className="text-sm text-zen-ink/60 text-center mb-4">请输入您的注册邮箱，我们将发送验证码以重置密码。</p>
                <input
                  type="email"
                  placeholder={t('auth_email_placeholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-zen-bg/50 border border-zen-accent/20 rounded-xl text-sm focus:outline-none focus:border-zen-accent/50"
                />
                <button
                  onClick={handleForgotPassword}
                  disabled={isLoading || !email}
                  className="w-full py-3 bg-zen-accent text-white rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : '发送验证码 (Send Code)'}
                </button>
              </div>
            )}

            {view === 'reset_password' && (
              <div className="space-y-4">
                <p className="text-xs text-zen-ink/60 text-center">{t('auth_code_sent')} {email}</p>
                <p className="text-xs text-zen-accent text-center mt-1 font-bold">测试验证码 (Test Code): 123456</p>
                <input
                  type="text"
                  placeholder={t('auth_code_placeholder')}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  maxLength={6}
                  className="w-full px-4 py-3 bg-zen-bg/50 border border-zen-accent/20 rounded-xl text-sm focus:outline-none focus:border-zen-accent/50 text-center tracking-[0.5em] font-mono"
                />
                <input
                  type="password"
                  placeholder="新密码 (New Password)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-zen-bg/50 border border-zen-accent/20 rounded-xl text-sm focus:outline-none focus:border-zen-accent/50"
                />
                <input
                  type="password"
                  placeholder="确认新密码 (Confirm New Password)"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-zen-bg/50 border border-zen-accent/20 rounded-xl text-sm focus:outline-none focus:border-zen-accent/50"
                />
                <button
                  onClick={handleResetPassword}
                  disabled={isLoading || code.length < 6 || !password || !confirmPassword}
                  className="w-full py-3 bg-zen-accent text-white rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : '重置密码 (Reset Password)'}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
