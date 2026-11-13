export function translateFirebaseAuthError(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code || '')
      : '';

  switch (code) {
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return '邮箱或密码不正确';
    case 'auth/user-not-found':
      return '该邮箱尚未注册，请先注册账号';
    case 'auth/email-already-in-use':
      return '这个邮箱已经注册过，请直接登录';
    case 'auth/too-many-requests':
      return '尝试次数太多，请稍后再试';
    case 'auth/invalid-email':
      return '请输入有效的邮箱地址';
    case 'auth/weak-password':
      return '密码至少需要 8 位';
    case 'auth/requires-recent-login':
      return '为了账号安全，请重新登录后再试';
    case 'auth/network-request-failed':
      return '网络连接不稳定，请稍后再试';
    case 'auth/user-disabled':
      return '此账号已被停用，如有疑问请联系支持';
    case 'auth/operation-not-allowed':
      return '登录方式尚未开启，请在控制台启用电子邮件/密码登录';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return '已取消登录';
    case 'auth/popup-blocked':
      return '弹窗被浏览器拦截，请允许弹出窗口';
    case 'auth/unauthorized-domain':
      return '当前网址尚未加入 Firebase 授权网域';
    default:
      return '操作未能完成，请稍后再试';
  }
}
