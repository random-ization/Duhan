import React, { useState } from 'react';
import { useAction } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { aRef } from '../utils/convexRefs';
import { useCurrentLanguage, useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { Mail, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import { KT } from '../components/mobile/ksoft/ksoft';
import { motion } from 'framer-motion';

const PAGE_COPY = {
  en: {
    tagline: 'Read Korean · Rediscover the language', heroTitle: 'Return to your\nlearning journey',
    heroBody: 'We will help you reset your password so you can continue learning Korean.', back: 'Back to sign in',
    title: 'Forgot password', description: 'Enter your registered email and we will send a reset link.',
    email: 'Email address', placeholder: 'Enter your registered email', processing: 'Sending...', send: 'Send reset link →',
    sentTitle: 'Reset email sent', sentBody: 'If this email is registered, a reset link will arrive shortly. Please check your inbox.',
    home: 'Go to home', problem: 'Need help? Contact', support: 'support',
  },
  zh: {
    tagline: '讀韓 · 重新认识韩语', heroTitle: '找回您的\n学习之旅', heroBody: '别担心，我们会协助您重设密码。完成验证后即可继续您的韩语进阶之路。',
    back: '返回登录', title: '忘记密码', description: '输入您的注册邮箱，我们将向您发送重置链接', email: '注册邮箱',
    placeholder: '输入您的注册邮箱', processing: '处理中...', send: '发送重置链接 →', sentTitle: '重置邮件已发送',
    sentBody: '如果该邮箱已注册，您将很快收到包含重置链接的邮件。请检查您的收件箱。', home: '回到首页', problem: '遇到问题？请联系', support: '技术支持',
  },
  vi: {
    tagline: 'Đọc tiếng Hàn · Khám phá lại ngôn ngữ', heroTitle: 'Trở lại hành trình\nhọc tập của bạn',
    heroBody: 'Chúng tôi sẽ giúp bạn đặt lại mật khẩu để tiếp tục học tiếng Hàn.', back: 'Quay lại đăng nhập',
    title: 'Quên mật khẩu', description: 'Nhập email đã đăng ký để nhận liên kết đặt lại mật khẩu.', email: 'Địa chỉ email',
    placeholder: 'Nhập email đã đăng ký', processing: 'Đang gửi...', send: 'Gửi liên kết đặt lại →', sentTitle: 'Đã gửi email đặt lại',
    sentBody: 'Nếu email này đã được đăng ký, bạn sẽ sớm nhận được liên kết đặt lại. Hãy kiểm tra hộp thư đến.',
    home: 'Về trang chủ', problem: 'Bạn cần trợ giúp? Liên hệ', support: 'hỗ trợ',
  },
  mn: {
    tagline: 'Солонгосоор унших · Хэлийг шинээр нээх', heroTitle: 'Суралцах аялалдаа\nэргэн орох',
    heroBody: 'Нууц үгээ шинэчилж, солонгос хэлээ үргэлжлүүлэн сурахад тань тусална.', back: 'Нэвтрэх рүү буцах',
    title: 'Нууц үгээ мартсан', description: 'Бүртгэлтэй имэйлээ оруулбал шинэчлэх холбоос илгээнэ.', email: 'Имэйл хаяг',
    placeholder: 'Бүртгэлтэй имэйлээ оруулна уу', processing: 'Илгээж байна...', send: 'Шинэчлэх холбоос илгээх →',
    sentTitle: 'Шинэчлэх имэйл илгээгдлээ', sentBody: 'Энэ имэйл бүртгэлтэй бол шинэчлэх холбоос удахгүй ирнэ. Ирсэн имэйлээ шалгана уу.',
    home: 'Нүүр хуудас руу', problem: 'Тусламж хэрэгтэй юу?', support: 'Дэмжлэгтэй холбогдох',
  },
} as const;

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
  const copy = PAGE_COPY[language];
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
    <div
      className="min-h-screen flex flex-col md:flex-row bg-white overflow-hidden"
      style={{ fontFamily: KT.font }}
    >
      {/* Left Side: Immersive Hero (Consistent with Auth Page) */}
      <div
        className="hidden md:flex w-1/2 flex-col justify-between p-16 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${KT.crimson} 0%, ${KT.indigo} 100%)` }}
      >
        <div
          className="absolute right-0 top-0 font-sans font-black pointer-events-none select-none opacity-[0.08]"
          style={{
            fontSize: '600px',
            lineHeight: 0.8,
            transform: 'translate(20%, -10%)',
            color: '#fff',
          }}
        >
          韩
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-4">
            <img
              src="/logo.svg"
              alt="Duhan Logo"
              width={56}
              height={56}
              className="rounded-[14px]"
            />
            <div>
              <div className="text-2xl font-black text-white tracking-tight">Duhan</div>
              <div className="text-xs font-medium text-white/60 tracking-widest mt-0.5">
                {copy.tagline}
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <h1 className="text-[64px] font-black text-white leading-tight tracking-tight whitespace-pre-line">{copy.heroTitle}</h1>
          <p className="mt-8 text-lg font-medium text-white/70 leading-relaxed max-w-md">
            {copy.heroBody}
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
            {copy.back}
          </button>

          <div className="mb-10">
            <div className="flex items-baseline gap-3 flex-wrap">
              <h2 className="text-[32px] font-black tracking-tight text-k-ink">{copy.title}</h2>
              <span className="text-[26px] font-serif text-k-crimson opacity-80">
                비밀번호 찾기
              </span>
            </div>
            <p className="mt-2 text-k-sub font-medium">{copy.description}</p>
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
              <h3 className="text-xl font-black text-k-ink mb-4">{copy.sentTitle}</h3>
              <p className="text-k-sub font-medium leading-relaxed mb-8">
                {copy.sentBody}
              </p>
              <button
                onClick={() => navigate('/')}
                style={{ background: KT.ink }}
                className="w-full py-4 rounded-2xl text-white font-black text-lg transition shadow-lg"
              >
                {copy.home}
              </button>
            </motion.div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="password-reset-email" className="text-xs font-black text-k-sub uppercase tracking-widest px-1">
                  {copy.email}
                </label>
                <div className="relative group">
                  <Mail
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-k-sub transition group-focus-within:text-k-ink"
                    size={18}
                  />
                  <input
                    id="password-reset-email"
                    type="email"
                    required
                    placeholder={copy.placeholder}
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
                {loading ? copy.processing : copy.send}
              </button>
            </form>
          )}

          <div className="mt-12 text-center text-[13px] font-medium text-k-sub leading-relaxed">
            {copy.problem}{' '}
            <a href="mailto:support@koreanstudy.me" className="text-k-ink font-bold underline underline-offset-2">{copy.support}</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
