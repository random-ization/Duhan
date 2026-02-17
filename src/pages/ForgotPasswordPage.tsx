import React, { useState } from 'react';
import { useAction } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { aRef } from '../utils/convexRefs';
import { useCurrentLanguage } from '../hooks/useLocalizedNavigate';
import { LocalizedLink } from '../components/LocalizedLink';
import { Button } from '../components/ui';
import { Input } from '../components/ui';

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
    <div className="min-h-screen bg-muted flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-card rounded-2xl border border-border shadow-sm p-6">
        <h1 className="text-2xl font-black text-foreground mb-2">
          {t('auth.forgotPassword', { defaultValue: 'Forgot password' })}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {t('auth.forgotPasswordDescription', {
            defaultValue: 'Enter your email and we will send you a password reset link.',
          })}
        </p>

        {submitted ? (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 dark:bg-emerald-400/12 dark:border-emerald-300/40 p-4 text-sm text-emerald-700 dark:text-emerald-200">
            {t('auth.passwordResetEmailSent', {
              defaultValue:
                'If this email exists, a reset link has been sent. Please check your inbox.',
            })}
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={t('auth.placeholderEmail', { defaultValue: 'Email' })}
              className="h-auto w-full rounded-xl shadow-none border border-border px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-300/70"
            />
            {error && <p className="text-sm text-red-600 dark:text-rose-300">{error}</p>}
            <Button
              type="submit"
              variant="ghost"
              size="auto"
              loading={loading}
              loadingText={t('common.loading', { defaultValue: 'Loading...' })}
              className="w-full rounded-xl bg-primary text-primary-foreground font-bold py-3 disabled:opacity-60"
            >
              {t('auth.sendResetLink', { defaultValue: 'Send reset link' })}
            </Button>
          </form>
        )}

        <div className="mt-6 text-sm">
          <Button
            asChild
            variant="ghost"
            size="auto"
            className="text-indigo-600 dark:text-indigo-300 hover:text-indigo-700 dark:hover:text-indigo-200 font-semibold"
          >
            <LocalizedLink to="/login">
              {t('auth.backToLogin', { defaultValue: 'Back to login' })}
            </LocalizedLink>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
