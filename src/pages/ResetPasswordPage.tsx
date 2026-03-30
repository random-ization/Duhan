import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAction } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { aRef } from '../utils/convexRefs';
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

const ResetPasswordPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token')?.trim() || '', [searchParams]);

  const confirmPasswordReset = useAction(
    aRef<{ token: string; newPassword: string }, { success: boolean }>(
      'accountRecovery:confirmPasswordReset'
    )
  );

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!token) {
      setError(t('auth.invalidResetToken', { defaultValue: 'Invalid or missing reset token.' }));
      return;
    }
    if (newPassword.length < 8) {
      setError(
        t('auth.passwordTooShort', {
          defaultValue: 'Password must be at least 8 characters long.',
        })
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('auth.passwordsNotMatch', { defaultValue: 'Passwords do not match.' }));
      return;
    }

    setLoading(true);
    try {
      await confirmPasswordReset({ token, newPassword });
      setSuccess(true);
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err);
      const message =
        errorMessage === 'INVALID_OR_EXPIRED_TOKEN'
          ? t('auth.invalidResetToken', { defaultValue: 'Invalid or expired reset token.' })
          : errorMessage === 'WEAK_PASSWORD'
            ? t('auth.passwordTooShort', {
                defaultValue: 'Password must be at least 8 characters long.',
              })
            : errorMessage || t('common.error', { defaultValue: 'Something went wrong.' });
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col sm:justify-center sm:py-12 sm:px-6">
      <div className="flex-1 sm:flex-initial flex flex-col w-full max-w-md mx-auto bg-card sm:rounded-[2rem] sm:border sm:shadow-2xl overflow-y-auto mt-0 px-6 py-12 sm:p-8">
        <h1 className="text-2xl font-black text-foreground mb-2 mt-4 sm:mt-0 tracking-tight">
          {t('auth.resetPassword', { defaultValue: 'Reset password' })}
        </h1>
        <p className="text-sm font-medium text-muted-foreground mb-8">
          {t('auth.resetPasswordDescription', {
            defaultValue: 'Set a new password for your account.',
          })}
        </p>

        {success ? (
          <div className="space-y-4">
            <div className="rounded-[14px] bg-secondary border border-border p-4 text-sm font-medium text-secondary-foreground">
              {t('auth.passwordResetSuccess', {
                defaultValue: 'Your password has been reset successfully.',
              })}
            </div>
            <Button
              asChild
              variant="default"
              size="auto"
              className="h-[54px] rounded-[16px] flex items-center justify-center w-full font-bold text-[15px]"
            >
              <LocalizedLink to="/login">
                {t('auth.backToLogin', { defaultValue: 'Back to login' })}
              </LocalizedLink>
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              type="password"
              required
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder={t('auth.newPasswordLabel', { defaultValue: 'New Password' })}
              className="w-full bg-accent/50 border-2 border-border/80 rounded-[14px] h-[52px] px-4 font-bold text-base text-foreground focus:outline-none focus:border-primary focus:bg-background transition-colors placeholder:text-muted-foreground placeholder:font-medium"
            />
            <Input
              type="password"
              required
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder={t('auth.confirmPasswordLabel', { defaultValue: 'Confirm Password' })}
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
              {t('auth.resetPassword', { defaultValue: 'Reset password' })}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
