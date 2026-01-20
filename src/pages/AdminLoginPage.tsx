import React, { useState, useEffect } from 'react';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { useAuth } from '../contexts/AuthContext';
import { useAuthActions } from '@convex-dev/auth/react';
import { ShieldCheck, Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react';

import { toErrorMessage } from '../utils/errors';

const AdminLoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { user } = useAuth();
  const { signIn } = useAuthActions();
  const navigate = useLocalizedNavigate();

  // If already logged in as admin, redirect to admin panel
  useEffect(() => {
    if (user?.role === 'ADMIN') {
      navigate('/admin');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn('password', { email, password });
    } catch (err: unknown) {
      console.error('Login error:', toErrorMessage(err));
      setError(toErrorMessage(err) || '服务器内部错误，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundImage: 'radial-gradient(#d4d4d8 1px, transparent 1px)',
        backgroundSize: '20px 20px',
        backgroundColor: '#18181b',
      }}
    >
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-zinc-900 rounded-2xl border-4 border-zinc-700 mb-4">
            <ShieldCheck className="w-10 h-10 text-lime-400" />
          </div>
          <h1 className="text-2xl font-black text-white">管理员登录</h1>
          <p className="text-zinc-500 text-sm mt-1">DuHan 内容管理系统</p>
        </div>

        {/* Login Card */}
        <div className="bg-white border-2 border-zinc-900 rounded-2xl shadow-[8px_8px_0px_0px_#3f3f46] p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border-2 border-red-200 rounded-xl flex items-center gap-2 text-red-600 text-sm">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-2">邮箱地址</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="admin@example.com"
                className="w-full px-4 py-3 border-2 border-zinc-300 rounded-xl font-medium focus:border-zinc-900 focus:outline-none transition"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-2">密码</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-12 border-2 border-zinc-300 rounded-xl font-medium focus:border-zinc-900 focus:outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-1"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full py-4 bg-zinc-900 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-[4px_4px_0px_0px_#a3e635] hover:shadow-[2px_2px_0px_0px_#a3e635] active:shadow-none active:translate-x-1 active:translate-y-1"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  登录中...
                </>
              ) : (
                <>
                  <ShieldCheck size={20} />
                  登录管理后台
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-zinc-200 text-center">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-sm text-zinc-500 hover:text-zinc-700 transition"
            >
              ← 返回首页
            </button>
          </div>
        </div>

        {/* Security Notice */}
        <p className="text-center text-zinc-600 text-xs mt-6">🔒 此页面仅供管理员使用</p>
      </div>
    </div>
  );
};

export default AdminLoginPage;
