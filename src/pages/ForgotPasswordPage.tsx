import React, { useState } from 'react';
import { useAction } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { aRef } from '../utils/convexRefs';
import { useCurrentLanguage } from '../hooks/useLocalizedNavigate';
import { LocalizedLink } from '../components/LocalizedLink';
import { Button } from '../components/ui';
import { Input } from '../components/ui';

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
    <div className="min-h-[100dvh] bg-background flex flex-col sm:justify-center sm:py-12 sm:px-6">
      <div className="flex-1 sm:flex-initial flex flex-col w-full max-w-md mx-auto bg-card sm:rounded-[2rem] sm:border sm:shadow-2xl overflow-y-auto mt-0 px-6 py-12 sm:p-8">
        <h1 className="text-2xl font-black text-foreground mb-2 mt-4 sm:mt-0 tracking-tight">
          {t('auth.forgotPassword', { defaultValue: 'Forgot password' })}
        </h1>
        <p className="text-sm font-medium text-muted-foreground mb-8">
          {t('auth.forgotPasswordDescription', {
            defaultValue: 'Enter your email and we will send you a password reset link.',
          })}
        </p>

        {submitted ? (
          <div className="rounded-[14px] bg-secondary border border-border p-4 text-sm font-medium text-secondary-foreground mb-4">
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
              className="w-full bg-accent/50 border-2 border-border/80 rounded-[14px] h-[52px] px-4 font-bold text-base text-foreground focus:outline-none focus:border-primary focus:bg-background transition-colors placeholder:text-muted-foreground placeholder:font-medium"
            />
            {error && <p className="text-sm font-bold text-destructive">{error}</p>}
            <Button
              type="submit"
              variant="default"
              size="auto"
              loading={loading}
              loadingText={t('common.loading', { defaultValue: 'Loading...' })}
              className="w-full h-[54px] rounded-[16px] flex items-center justify-center gap-2 mt-2 font-bold text-[15px]"
            >
              {t('auth.sendResetLink', { defaultValue: 'Send reset link' })}
            </Button>
          </form>
        )}

        <div className="mt-8 text-[13px] font-semibold text-muted-foreground flex items-center justify-center gap-1">
          <Button
            asChild
            variant="link"
            size="auto"
            className="h-auto p-0 font-bold"
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
