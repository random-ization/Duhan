import React, { useState } from 'react';
import { useAction } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { aRef } from '../utils/convexRefs';
import { useCurrentLanguage, useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { Mail, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import { KT, HanjaSeal } from '../components/mobile/ksoft/ksoft';
import { motion } from 'framer-motion';

const getErrorMessage = (error: unknown): string | undefined => {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === 'string' ? message : undefined;
  }
  return undefined;
};

const ForgotPasswordPage: React.FC = () => {
  const { t } = useTranslation();
  const language = useCurrentLanguage();
  const navigate = useLocalizedNavigate();
  const requestPasswordReset = useAction(
    aRef<{ email: string; language?: string }, { success: boolean }>(
      'accountRecovery:requestPasswordReset'
    )
  );

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await requestPasswordReset({ email, language });
      setSubmitted(true);
    } catch (err: unknown) {
      setError(
        getErrorMessage(err) || t('common.error', { defaultValue: 'Something went wrong.' })
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white overflow-hidden" style={{ fontFamily: KT.font }}>
      {/* Left Side: Immersive Hero (Consistent with Auth Page) */}
      <div 
        className="hidden md:flex w-1/2 flex-col justify-between p-16 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${KT.crimson} 0%, ${KT.indigo} 100%)` }}
      >
        <div 
          className="absolute right-0 top-0 font-sans font-black pointer-events-none select-none opacity-[0.08]"
          style={{ fontSize: '600px', lineHeight: 0.8, transform: 'translate(20%, -10%)', color: '#fff' }}
        >
          韩
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-4">
            <img src="/logo.svg" alt="Duhan Logo" width={56} height={56} className="rounded-[14px]" />
            <div>
              <div className="text-2xl font-black text-white tracking-tight">Duhan</div>
              <div className="text-xs font-medium text-white/60 tracking-widest mt-0.5">讀韓 · 重新认识韩语</div>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <h1 className="text-[64px] font-black text-white leading-tight tracking-tight">
            找回您的<br/>学习之旅
          </h1>
          <p className="mt-8 text-lg font-medium text-white/70 leading-relaxed max-w-md">
            别担心，我们会协助您重设密码。完成验证后即可继续您的韩语进阶之路。
          </p>
        </div>
      </div>

      {/* Right Side: Reset Form */}
      <div className="w-full md:w-1/2 min-h-screen flex flex-col items-center justify-center p-8 md:p-24 overflow-y-auto bg-white">
        <div className="w-full max-w-md">
          <button 
            onClick={() => navigate('/login')}
            className="flex items-center gap-2 text-k-sub hover:text-k-ink font-bold transition mb-12"
          >
            <ArrowLeft size={18} />
            返回登录
          </button>

          <div className="mb-10">
            <div className="flex items-baseline gap-3 flex-wrap">
              <h2 className="text-[32px] font-black tracking-tight text-k-ink">
                忘记密码
              </h2>
              <span className="text-[26px] font-serif text-k-crimson opacity-80">
                비밀번호 찾기
              </span>
            </div>
            <p className="mt-2 text-k-sub font-medium">
              输入您的注册邮箱，我们将向您发送重置链接
            </p>
          </div>

          {submitted ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-8 rounded-[32px] bg-k-bg border-2 border-k-line text-center"
            >
              <div className="w-16 h-16 bg-k-mint/20 text-k-mintDeep rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-xl font-black text-k-ink mb-4">重置邮件已发送</h3>
              <p className="text-k-sub font-medium leading-relaxed mb-8">
                如果该邮箱已注册，您将很快收到包含重置链接的邮件。请检查您的收件箱。
              </p>
              <button
                onClick={() => navigate('/login')}
                style={{ background: KT.ink }}
                className="w-full py-4 rounded-2xl text-white font-black text-lg transition shadow-lg"
              >
                回到首页
              </button>
            </motion.div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-k-sub uppercase tracking-widest px-1">注册邮箱</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-k-sub transition group-focus-within:text-k-ink" size={18} />
                  <input
                    type="email"
                    required
                    placeholder="输入您的注册邮箱"
                    className="w-full bg-white px-12 py-4 rounded-2xl border-2 border-k-line font-bold text-k-ink placeholder:text-k-sub focus:border-k-ink outline-none transition shadow-sm"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <div className="p-4 rounded-2xl border border-red-100 bg-red-50 text-red-600 text-sm font-bold flex items-center gap-2">
                  <AlertCircle size={18} />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{ background: KT.crimson }}
                className="w-full py-5 rounded-2xl text-white font-black text-lg flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition shadow-lg shadow-k-crimson/20 disabled:opacity-50"
              >
                {loading ? '处理中...' : '发送重置链接 →'}
              </button>
            </form>
          )}

          <div className="mt-12 text-center text-[13px] font-medium text-k-sub leading-relaxed">
            遇到问题？请联系 <button className="text-k-ink font-bold underline underline-offset-2">技术支持</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
