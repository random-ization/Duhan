import React from 'react';
import { Mail } from 'lucide-react';
import { LocalizedLink } from '../../../components/LocalizedLink';
import { Button, Input } from '../../../components/ui';
interface ProfileSecurityTabProps {
  labels: any;
  handlePasswordChange: (e: React.FormEvent) => Promise<void>;
  currentPassword: string;
  setCurrentPassword: (val: string) => void;
  newPassword: string;
  setNewPassword: (val: string) => void;
  confirmPassword: string;
  setConfirmPassword: (val: string) => void;
  isChangingPassword: boolean;
  accountSectionTitle: string;
  linkedProviders: Set<string>;
  linkedCount: number;
  accountsLoading: boolean;
  linkedLabel: string;
  notLinkedLabel: string;
  unlinkLabel: string;
  linkLabel: string;
  signIn: (providerId: string, options?: any) => Promise<any>;
  unlinkAuthProviderMutation: (args: { provider: string }) => Promise<any>;
  getAccountButtonClass: (
    isLinked: boolean,
    accountsLoading: boolean,
    disableUnlink: boolean
  ) => string;
  success: (msg: string) => void;
  error: (msg: string) => void;
  toErrorMessage: (err: any) => string;
}

export const ProfileSecurityTab: React.FC<ProfileSecurityTabProps> = ({
  labels,
  handlePasswordChange,
  currentPassword,
  setCurrentPassword,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  isChangingPassword,
  accountSectionTitle,
  linkedProviders,
  linkedCount,
  accountsLoading,
  linkedLabel,
  notLinkedLabel,
  unlinkLabel,
  linkLabel,
  signIn,
  unlinkAuthProviderMutation,
  getAccountButtonClass,
  success,
  error,
  toErrorMessage,
}) => {
  const [pendingProviderId, setPendingProviderId] = React.useState<string | null>(null);

  return (
    <div className="max-w-xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h3 className="text-xl font-bold text-foreground border-b border-border pb-4 mb-6">
        {labels.changePassword}
      </h3>
      <form onSubmit={handlePasswordChange} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
            {labels.currentPassword}
          </label>
          <Input
            type="password"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            className="w-full !h-auto !p-3 !bg-card !border-border !rounded-xl focus-visible:!ring-2 focus-visible:!ring-indigo-500 dark:focus-visible:!ring-indigo-300/70 !shadow-none transition-all"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
            {labels.newPassword}
          </label>
          <Input
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            className="w-full !h-auto !p-3 !bg-card !border-border !rounded-xl focus-visible:!ring-2 focus-visible:!ring-indigo-500 dark:focus-visible:!ring-indigo-300/70 !shadow-none transition-all"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
            {labels.confirmPassword}
          </label>
          <Input
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            className="w-full !h-auto !p-3 !bg-card !border-border !rounded-xl focus-visible:!ring-2 focus-visible:!ring-indigo-500 dark:focus-visible:!ring-indigo-300/70 !shadow-none transition-all"
            required
          />
        </div>
        <div className="pt-4">
          <Button
            type="submit"
            variant="ghost"
            size="auto"
            disabled={!currentPassword || !newPassword || !confirmPassword || isChangingPassword}
            loading={isChangingPassword}
            loadingIconClassName="w-4 h-4"
            className={`w-full py-3 px-4 rounded-xl font-bold text-primary-foreground shadow-lg transition-all ${
              !currentPassword || !newPassword || !confirmPassword || isChangingPassword
                ? 'bg-muted cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-indigo-400 dark:to-violet-400 hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            {labels.profile?.updatePassword || 'Update Password'}
          </Button>
        </div>
      </form>

      {/* Forgot Password Section */}
      <div className="border-t border-border pt-6 mt-6">
        <div className="bg-muted rounded-xl p-4 border border-border">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-400/15 rounded-lg">
              <Mail size={20} className="text-indigo-600 dark:text-indigo-200" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-muted-foreground mb-1">
                {labels.forgotPassword || 'Forgot your password?'}
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                {labels.forgotPasswordProfileDescription ||
                  "If you've forgotten your current password, you can reset it via email verification."}
              </p>
              <Button
                asChild
                variant="ghost"
                size="auto"
                className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-300 font-semibold text-sm hover:text-indigo-700 dark:hover:text-indigo-200 transition-colors"
              >
                <LocalizedLink to="/forgot-password">
                  {labels.resetPasswordViaEmail || 'Reset password via email'}
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </LocalizedLink>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-border pt-6 mt-6">
        <h4 className="font-bold text-muted-foreground mb-3">{accountSectionTitle}</h4>
        <div className="space-y-3">
          {[
            { id: 'google', label: labels.auth?.social?.google || 'Google' },
            { id: 'kakao', label: labels.auth?.social?.kakao || 'Kakao' },
          ].map(provider => {
            const isLinked = linkedProviders.has(provider.id);
            const disableUnlink = isLinked && linkedCount <= 1;
            const isPending = pendingProviderId === provider.id;
            return (
              <div
                key={provider.id}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold text-muted-foreground">{provider.label}</span>
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded-full ${
                      isLinked
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {isLinked ? linkedLabel : notLinkedLabel}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="auto"
                  disabled={accountsLoading || disableUnlink || pendingProviderId !== null}
                  loading={isPending}
                  loadingText={isLinked ? unlinkLabel : linkLabel}
                  loadingIconClassName="w-4 h-4"
                  onClick={async () => {
                    if (pendingProviderId !== null) return;

                    if (!isLinked) {
                      try {
                        setPendingProviderId(provider.id);
                        await signIn(provider.id, { redirectTo: globalThis.location.href });
                      } catch {
                        error(
                          (
                            labels.profile?.connectFailed || `Failed to connect ${provider.label}`
                          ).replace('{provider}', provider.label)
                        );
                      } finally {
                        setPendingProviderId(null);
                      }
                      return;
                    }

                    try {
                      setPendingProviderId(provider.id);
                      await unlinkAuthProviderMutation({ provider: provider.id });
                      success(labels.profile?.unlinkSuccess || 'Account unlinked');
                    } catch (err: unknown) {
                      const message = toErrorMessage(err);
                      if (message.includes('LAST_AUTH_METHOD')) {
                        error(labels.profile?.keepOneLoginMethod || 'Keep one login method');
                        return;
                      }
                      error(labels.profile?.unlinkFailed || 'Failed to unlink account');
                    } finally {
                      setPendingProviderId(null);
                    }
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition ${getAccountButtonClass(isLinked, accountsLoading, disableUnlink)}`}
                >
                  {isLinked ? unlinkLabel : linkLabel}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
