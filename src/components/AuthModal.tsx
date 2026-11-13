import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import {
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../firebase';
import { useTranslation } from '../i18n';
import { Country, City } from '../utils/locationData';
import { translateFirebaseAuthError } from '../utils/firebaseAuthErrors';

const ALL_COUNTRIES = Country.getAllCountries();

type AuthView = 'login' | 'signup' | 'forgot_password';

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

  const [isLoading, setIsLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const availableCities = React.useMemo(() => {
    return countryCode ? City.getCitiesOfCountry(countryCode) : [];
  }, [countryCode]);

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    setCountryCode(code);
    const selectedCountry = ALL_COUNTRIES.find((c) => c.isoCode === code);
    setCountry(selectedCountry ? selectedCountry.name : '');
    setCity('');
  };

  const handleClose = () => {
    setIsLoading(false);
    setView('login');
    setPassword('');
    setConfirmPassword('');
    onClose();
  };

  const handleGoogleAuth = async (isSignUp: boolean) => {
    if (isSignUp && !agreedToTerms) {
      toast.error(t('auth_error_agree'));
      return;
    }
    try {
      setIsLoading(true);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      if (result.user) {
        localStorage.setItem('zen_agreed_to_terms', 'true');
        toast.success('登录成功');
        handleClose();
      }
    } catch (err: unknown) {
      console.error('Firebase Google Auth Error:', err);
      toast.error(translateFirebaseAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      toast.error('请输入有效的邮箱地址');
      return;
    }
    if (!password) {
      toast.error('请输入密码');
      return;
    }

    try {
      setIsLoading(true);
      await signInWithEmailAndPassword(auth, trimmedEmail, password);
      localStorage.setItem('zen_agreed_to_terms', 'true');

      try {
        const savedProfile = localStorage.getItem('zen_user_profile');
        const profile = savedProfile
          ? JSON.parse(savedProfile)
          : { name: '', email: '', birthday: '', gender: '', role: 'employee' };
        if (!profile.email) {
          profile.email = trimmedEmail;
          localStorage.setItem('zen_user_profile', JSON.stringify(profile));
          window.dispatchEvent(new CustomEvent('user_profile_updated'));
        }
      } catch {
        // ignore malformed local profile
      }

      toast.success('登录成功');
      handleClose();
    } catch (err: unknown) {
      console.error('Firebase Email Login Error:', err);
      toast.error(translateFirebaseAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignup = async () => {
    if (!agreedToTerms) {
      toast.error(t('auth_error_agree'));
      return;
    }
    const trimmedEmail = email.trim();
    const trimmedName = name.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      toast.error('请输入有效的邮箱地址');
      return;
    }
    if (!password || password.length < 8) {
      toast.error('密码至少需要 8 位');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('两次输入的密码不一致');
      return;
    }
    if (!trimmedName || !country || !city) {
      toast.error('请填写昵称并选择国家与城市');
      return;
    }

    try {
      setIsLoading(true);
      const credential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);

      localStorage.setItem('zen_agreed_to_terms', 'true');
      try {
        const savedProfile = localStorage.getItem('zen_user_profile');
        const profile = savedProfile
          ? JSON.parse(savedProfile)
          : { name: '', email: '', birthday: '', gender: '', role: 'employee' };
        profile.email = trimmedEmail;
        profile.country = country;
        profile.location = city;
        profile.name = trimmedName;
        localStorage.setItem('zen_user_profile', JSON.stringify(profile));
        window.dispatchEvent(new CustomEvent('user_profile_updated'));
      } catch {
        // ignore local profile write failure
      }

      if (credential.user) {
        await updateProfile(credential.user, { displayName: trimmedName }).catch(() => {});
        try {
          await sendEmailVerification(credential.user);
          toast.success('验证邮件已发送，请到邮箱点击链接');
        } catch (verifyErr) {
          console.warn('sendEmailVerification notice:', verifyErr);
          toast.success('注册成功，请稍后在设置中重新发送验证邮件');
        }
      }

      handleClose();
    } catch (err: unknown) {
      console.error('Firebase Email Signup Error:', err);
      toast.error(translateFirebaseAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      toast.error('请输入有效的邮箱地址');
      return;
    }
    try {
      setIsLoading(true);
      await sendPasswordResetEmail(auth, trimmedEmail);
      toast.success('重设密码的邮件已发送');
      setView('login');
      setPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      console.error('Firebase Password Reset Error:', err);
      toast.error(translateFirebaseAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-surface rounded-3xl w-full max-w-sm shadow-float border border-line overflow-hidden relative max-h-[90vh] flex flex-col my-auto"
        >
          <div className="flex justify-between items-center p-6 pb-2 shrink-0">
            <div className="flex items-center gap-3">
              {view !== 'login' && view !== 'signup' && (
                <button
                  type="button"
                  onClick={() => setView('login')}
                  className="p-1.5 text-ink-2 hover:text-ink rounded-full hover:bg-surface-2 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <h3 className="text-xl font-bold font-serif text-ink">
                {view === 'login'
                  ? '登录'
                  : view === 'signup'
                  ? '注册'
                  : '忘记密码'}
              </h3>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="p-2 text-ink-3 hover:text-ink rounded-full hover:bg-surface-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 pt-2 overflow-y-auto">
            {view === 'login' && (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => handleGoogleAuth(false)}
                  disabled={isLoading}
                  className="w-full py-3 bg-surface-2 border border-line text-ink rounded-xl font-bold hover:bg-accent-mist transition-colors flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                  )}
                  使用 Google 登录
                </button>

                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-line"></div>
                  <span className="flex-shrink-0 mx-4 text-ink-3 text-xs">或使用邮箱</span>
                  <div className="flex-grow border-t border-line"></div>
                </div>

                <input
                  type="email"
                  placeholder={t('auth_email_placeholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-2 border border-line rounded-xl text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent"
                />
                <input
                  type="password"
                  placeholder="密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-2 border border-line rounded-xl text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent"
                />

                <button
                  type="button"
                  onClick={handleEmailLogin}
                  disabled={isLoading || !email || !password}
                  className="w-full py-3 bg-accent text-on-accent hover:bg-accent-hover rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : '登录'}
                </button>

                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={() => setView('forgot_password')}
                    className="text-xs text-ink-2 hover:text-accent transition-colors"
                  >
                    忘记密码？
                  </button>
                  <button
                    type="button"
                    onClick={() => setView('signup')}
                    className="text-xs text-accent hover:underline font-bold"
                  >
                    没有账号？去注册
                  </button>
                </div>
              </div>
            )}

            {view === 'signup' && (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => handleGoogleAuth(true)}
                  disabled={isLoading}
                  className="w-full py-3 bg-surface-2 border border-line text-ink rounded-xl font-bold hover:bg-accent-mist transition-colors flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                  )}
                  使用 Google 注册
                </button>

                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-line"></div>
                  <span className="flex-shrink-0 mx-4 text-ink-3 text-xs">或使用邮箱</span>
                  <div className="flex-grow border-t border-line"></div>
                </div>

                <input
                  type="email"
                  placeholder={t('auth_email_placeholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-2 border border-line rounded-xl text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent"
                />
                <input
                  type="password"
                  placeholder="设置密码（至少 8 位）"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-2 border border-line rounded-xl text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent"
                />
                <input
                  type="password"
                  placeholder="确认密码"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-2 border border-line rounded-xl text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent"
                />
                <input
                  type="text"
                  placeholder={t('name')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-2 border border-line rounded-xl text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent"
                />
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={handleCountryChange}
                    className="w-1/2 px-4 py-3 bg-surface-2 border border-line rounded-xl text-sm text-ink focus:outline-none focus:border-accent appearance-none"
                  >
                    <option value="">国家 (Country)</option>
                    {ALL_COUNTRIES.map((c) => (
                      <option key={c.isoCode} value={c.isoCode}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    disabled={!countryCode}
                    className="w-1/2 px-4 py-3 bg-surface-2 border border-line rounded-xl text-sm text-ink focus:outline-none focus:border-accent disabled:opacity-50 appearance-none"
                  >
                    <option value="">城市 (City)</option>
                    {availableCities &&
                      availableCities.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>

                <p className="text-xs text-ink-2 leading-relaxed">
                  观心内容会加密保存，只有你能看见。
                </p>

                <div className="flex items-start gap-3 mt-2">
                  <div className="flex items-center h-5">
                    <input
                      id="terms"
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="w-4 h-4 border border-line-strong rounded text-accent focus:ring-accent bg-surface"
                    />
                  </div>
                  <label htmlFor="terms" className="text-xs text-ink-2 leading-relaxed">
                    {t('auth_agree_prefix')}
                    <button
                      type="button"
                      onClick={() => window.dispatchEvent(new CustomEvent('open-terms-modal'))}
                      className="text-accent hover:underline mx-1"
                    >
                      {t('auth_terms')}
                    </button>
                    {t('auth_and')}
                    <button
                      type="button"
                      onClick={() => window.dispatchEvent(new CustomEvent('open-privacy-modal'))}
                      className="text-accent hover:underline mx-1"
                    >
                      {t('auth_privacy')}
                    </button>
                  </label>
                </div>

                <button
                  type="button"
                  onClick={handleEmailSignup}
                  disabled={
                    isLoading ||
                    !email ||
                    !password ||
                    !confirmPassword ||
                    !name ||
                    !country ||
                    !city ||
                    !agreedToTerms
                  }
                  className="w-full py-3 bg-accent text-on-accent hover:bg-accent-hover rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : '注册账号'}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setView('login')}
                    className="text-xs text-accent hover:underline font-bold"
                  >
                    已有账号？去登录
                  </button>
                </div>
              </div>
            )}

            {view === 'forgot_password' && (
              <div className="space-y-4">
                <p className="text-sm text-ink-2 text-center mb-4">
                  请输入您的注册邮箱，我们将向您发送重设密码邮件。
                </p>
                <input
                  type="email"
                  placeholder={t('auth_email_placeholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-2 border border-line rounded-xl text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent"
                />
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={isLoading || !email}
                  className="w-full py-3 bg-accent text-on-accent hover:bg-accent-hover rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    '发送重设邮件'
                  )}
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