import React, { useState } from 'react';
import { Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import { auth } from '../firebase';
import { identityService } from '../services/identityService';

export const DeleteAccountPage = () => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to permanently delete your account and all associated data? This action cannot be undone. (您确定要永久删除您的账号和所有关联数据吗？此操作无法撤销。)")) {
      return;
    }

    setStatus('loading');
    try {
      // 1. Clear local storage safely
      identityService.logout();
      
      // 2. Revoke token/logout if applicable
      if (auth.currentUser) {
        try {
          await auth.currentUser.delete();
        } catch (e: any) {
          if (e.code === 'auth/requires-recent-login') {
            throw new Error("Please log in again to delete your account. (请重新登录以删除账号。)");
          }
          throw e;
        }
      }
      
      setStatus('success');
    } catch (error: any) {
      console.error("Error deleting account:", error);
      setStatus('error');
      setErrorMsg(error.message || "An error occurred. Please try again or contact support.");
    }
  };

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-[#F5F2EB] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-xl text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-[#2C2825] mb-4">Account Deleted</h1>
          <p className="text-[#2C2825]/70 mb-8">Your account and all associated data have been successfully deleted.</p>
          <a href="/" className="inline-block bg-[#8C7A6B] text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-opacity">
            Return to Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F2EB] flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-xl">
        <div className="flex items-center justify-center w-16 h-16 bg-red-50 rounded-full mb-6 mx-auto">
          <Trash2 className="w-8 h-8 text-red-500" />
        </div>
        
        <h1 className="text-2xl font-bold text-[#2C2825] mb-2 text-center">Delete Account</h1>
        <p className="text-[#2C2825]/70 text-center mb-8 text-sm">
          Request to permanently delete your Vowzen account and all associated data.
        </p>

        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-8">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
            <div className="text-sm text-orange-800">
              <p className="font-bold mb-1">Warning (警告)</p>
              <p>This action is irreversible. All your practice records, preferences, and personal data will be permanently erased.</p>
              <p className="mt-2 text-xs opacity-80">此操作不可逆。您的所有修行记录、偏好设置和个人数据将被永久清除。</p>
            </div>
          </div>
        </div>

        {status === 'error' && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-200">
            {errorMsg}
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleDelete}
            disabled={status === 'loading'}
            className="w-full bg-red-500 text-white py-3.5 rounded-xl font-bold hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {status === 'loading' ? 'Processing...' : 'Delete My Account (永久删除账号)'}
          </button>
          
          <a
            href="/"
            className="block w-full text-center py-3.5 text-[#2C2825]/60 hover:text-[#2C2825] font-medium transition-colors"
          >
            Cancel and Return (取消并返回)
          </a>
        </div>
      </div>
    </div>
  );
};
