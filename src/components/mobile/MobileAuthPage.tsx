import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthActions } from '@convex-dev/auth/react';
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  HelpCircle,
  Loader2,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { LocalizedLink } from '../../components/LocalizedLink';
import { getLocalizedPath, useCurrentLanguage } from '../../hooks/useLocalizedNavigate';

export const MobileAuthPage: React.FC = () => {
  const { t } = useTranslation();
  const { signIn } = useAuthActions();
  const currentLanguage = useCurrentLanguage();

  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

  const postAuthRedirectPath = getLocalizedPath('/dashboard', currentLanguage);
  const postAuthRedirectUrl = `${globalThis.location.origin}${postAuthRedirectPath}`;

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      await signIn('google', { redirectTo: postAuthRedirectUrl });
    } catch {
      setError(t('auth.googleLoginFailed'));
      setLoading(false);
    }
  };

  const handleKakaoLogin = async () => {
    try {
      setLoading(true);
      await signIn('kakao', { redirectTo: postAuthRedirectUrl });
    } catch {
      setError(t('auth.loginFailed'));
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        await signIn('password', {
          email: formData.email,
          password: formData.password,
          flow: 'signIn',
          redirectTo: postAuthRedirectUrl,
        });
      } else {
        await signIn('password', {
          email: formData.email,
          password: formData.password,
          name: formData.name,
          flow: 'signUp',
          redirectTo: postAuthRedirectUrl,
        });
      }
    } catch (err: any) {
      console.error(err);
      setError(isLogin ? t('auth.loginFailed') : t('auth.signupFailed'));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center px-4 py-8">
      <div className="max-w-md mx-auto w-full bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
        {/* Header / Brand Area */}
        <div className="bg-indigo-600 p-8 text-center relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, #000 0, #000 2px, transparent 2px, transparent 10px)',
            }}
          ></div>

          <div className="relative z-10">
            <div className="w-16 h-16 bg-white rounded-2xl mx-auto mb-4 shadow-lg flex items-center justify-center">
              {/* <span className="font-black text-2xl text-slate-900">HG</span> */}
              <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain" />
            </div>
            <h1 className="text-2xl font-black text-white mb-1">{t('auth.brand')}</h1>
            <p className="text-indigo-200 font-bold text-xs tracking-wide">{t('auth.slogan')}</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Toggle Title */}
          <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
            {isLogin ? t('auth.welcomeBack') : t('auth.createCharacter')}
            <Sparkles className="w-4 h-4 text-yellow-400 fill-current" />
          </h2>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 flex items-start gap-2 text-xs font-bold text-red-600">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Field (Hidden on Login, Shown on Register) */}
            {!isLogin && (
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input
                  type="text"
                  placeholder={t('auth.placeholderName')}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-3 pl-12 pr-4 font-bold text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all placeholder:text-slate-400"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required={!isLogin}
                />
              </div>
            )}

            {/* Email */}
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type="email"
                placeholder={t('auth.placeholderEmail')}
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-3 pl-12 pr-4 font-bold text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all placeholder:text-slate-400"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            {/* Password */}
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type="password"
                placeholder={t('auth.placeholderPassword')}
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-3 pl-12 pr-4 font-bold text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all placeholder:text-slate-400"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>

            {/* Forgot Password */}
            {isLogin && (
              <div className="flex justify-end">
                <LocalizedLink
                  to="/forgot-password"
                  className="text-xs font-bold text-slate-400 hover:text-indigo-600 flex items-center gap-1 transition-colors"
                >
                  <HelpCircle className="w-3 h-3" /> {t('auth.forgotPassword')}
                </LocalizedLink>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 text-white font-black py-4 rounded-xl border-b-4 border-slate-950 hover:border-b-0 hover:translate-y-1 hover:mb-1 transition-all shadow-xl active:shadow-none active:scale-95 flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>{isLogin ? t('auth.loginButton') : t('auth.signupButton')}</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-8">
            <div className="h-px bg-slate-200 flex-1"></div>
            <span className="text-xs font-bold text-slate-400 uppercase">
              {t('auth.orContinue')}
            </span>
            <div className="h-px bg-slate-200 flex-1"></div>
          </div>

          {/* Socials */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleGoogleLogin}
              type="button"
              className="flex items-center justify-center gap-2 py-3 border-2 border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <img
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                className="w-5 h-5"
                alt="Google"
              />
              <span className="text-sm">{t('auth.social.google')}</span>
            </button>
            <button
              onClick={handleKakaoLogin}
              type="button"
              className="flex items-center justify-center gap-2 py-3 border-2 border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <span className="bg-[#FEE500] text-black font-black text-[10px] w-5 h-5 rounded flex items-center justify-center">
                K
              </span>
              <span className="text-sm">{t('auth.social.kakao')}</span>
            </button>
          </div>

          {/* Toggle Mode */}
          <div className="mt-8 text-center text-xs font-bold text-slate-400">
            {isLogin ? t('auth.noAccount') : t('auth.hasAccount')}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-indigo-600 hover:underline uppercase ml-1"
            >
              {isLogin ? t('auth.registerAction') : t('auth.loginAction')}
            </button>
          </div>
        </div>
      </div>

      <p className="text-center text-slate-400 text-xs font-bold mt-8">
        &copy; {new Date().getFullYear()} {t('auth.brand')} All rights reserved.
      </p>
    </div>
  );
};
