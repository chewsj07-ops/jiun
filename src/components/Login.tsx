import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User, Lock } from 'lucide-react';

interface LoginProps {
  onLogin: (user: any) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [country, setCountry] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const endpoint = isRegister ? '/api/register' : '/api/login';
    const body = isRegister 
      ? { email, password, name, location, country } 
      : { email, password };
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (response.ok) {
      onLogin(data.user);
    } else {
      setError(data.error || 'Authentication failed');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-paper/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-surface w-full max-w-sm rounded-3xl p-8 shadow-float border border-line"
      >
        <h2 className="text-2xl font-serif font-bold text-ink mb-6 text-center">{isRegister ? '注册' : '登录'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-3" />
            <input
              type="email"
              placeholder="邮箱"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface-2 border border-line rounded-2xl pl-10 pr-4 py-3 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-3" />
            <input
              type="password"
              placeholder="密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-surface-2 border border-line rounded-2xl pl-10 pr-4 py-3 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent"
            />
          </div>
          {isRegister && (
            <>
              <input
                type="text"
                placeholder="姓名"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-surface-2 border border-line rounded-2xl px-4 py-3 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent"
              />
              <input
                type="text"
                placeholder="地点"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-surface-2 border border-line rounded-2xl px-4 py-3 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent"
              />
              <input
                type="text"
                placeholder="国家"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full bg-surface-2 border border-line rounded-2xl px-4 py-3 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent"
              />
            </>
          )}
          {error && <p className="text-red-500 text-xs text-center">{error}</p>}
          <button
            type="submit"
            className="w-full bg-accent text-on-accent hover:bg-accent-hover py-3 rounded-2xl font-bold transition-colors"
          >
            {isRegister ? '注册' : '登录'}
          </button>
          <button
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            className="w-full text-ink-2 text-xs font-bold hover:text-accent"
          >
            {isRegister ? '已有账号？去登录' : '没有账号？去注册'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};
