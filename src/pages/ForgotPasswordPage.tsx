import React, { useState } from 'react';
import { useAction } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { aRef } from '../utils/convexRefs';
import { useCurrentLanguage } from '../hooks/useLocalizedNavigate';
import { LocalizedLink } from '../components/LocalizedLink';

const ForgotPasswordPage: React.FC = () => {
  const { t } = useTranslation();
  const language = useCurrentLanguage();
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
    } catch (err: any) {
      setError(err?.message || t('common.error', { defaultValue: 'Something went wrong.' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h1 className="text-2xl font-black text-slate-900 mb-2">
          {t('auth.forgotPassword', { defaultValue: 'Forgot password' })}
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          {t('auth.forgotPasswordDescription', {
            defaultValue: 'Enter your email and we will send you a password reset link.',
          })}
        </p>

        {submitted ? (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700">
            {t('auth.passwordResetEmailSent', {
              defaultValue:
                'If this email exists, a reset link has been sent. Please check your inbox.',
            })}
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={t('auth.placeholderEmail', { defaultValue: 'Email' })}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-slate-900 text-white font-bold py-3 disabled:opacity-60"
            >
              {loading
                ? t('common.loading', { defaultValue: 'Loading...' })
                : t('auth.sendResetLink', { defaultValue: 'Send reset link' })}
            </button>
          </form>
        )}

        <div className="mt-6 text-sm">
          <LocalizedLink
            to="/login"
            className="text-indigo-600 hover:text-indigo-700 font-semibold"
          >
            {t('auth.backToLogin', { defaultValue: 'Back to login' })}
          </LocalizedLink>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
