import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth';
import { auth } from '../firebase';
import { translateFirebaseAuthError } from '../utils/firebaseAuthErrors';

export const ChangePasswordModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleClose = () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setIsLoading(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error('请填写完整密码信息');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('新密码至少需要 8 位');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('两次输入的新密码不一致');
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.email) {
      toast.error('请先使用邮箱登录账号');
      return;
    }

    try {
      setIsLoading(true);
      const credential = EmailAuthProvider.credential(currentUser.email, oldPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);

      toast.success('密码已更新');
      handleClose();
    } catch (err: unknown) {
      console.error('Firebase Change Password Error:', err);
      toast.error(translateFirebaseAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-surface rounded-3xl shadow-float border border-line overflow-hidden max-h-[90vh] flex flex-col my-auto"
        >
          <div className="p-6 sm:p-8 overflow-y-auto">
            <button
              type="button"
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 text-ink-3 hover:text-ink hover:bg-surface-2 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold font-serif text-ink mb-2">修改密码</h2>
              <p className="text-sm text-ink-2">请输入当前密码与新密码（至少 8 位）</p>
            </div>

            <div className="space-y-4">
              <input
                type="password"
                placeholder="当前密码"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full px-4 py-3 bg-surface-2 border border-line rounded-xl text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent"
              />
              <input
                type="password"
                placeholder="新密码（至少 8 位）"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 bg-surface-2 border border-line rounded-xl text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent"
              />
              <input
                type="password"
                placeholder="确认新密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 bg-surface-2 border border-line rounded-xl text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent"
              />

              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading || !oldPassword || !newPassword || !confirmPassword}
                className="w-full py-3 bg-accent text-on-accent hover:bg-accent-hover rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : '确认修改'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
