import React from 'react';
import { Mail, ChevronDown } from 'lucide-react';
import { LocalizedLink } from '../../../components/LocalizedLink';
import type { ProfileLabels, SocialSignInOptions } from '../types';
import { Button, Input } from '../../../components/ui';
interface ProfileSecurityTabProps {
  labels: ProfileLabels;
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
  signIn: (providerId: string, options?: SocialSignInOptions) => Promise<unknown>;
  unlinkAuthProviderMutation: (args: { provider: string }) => Promise<unknown>;
  getAccountButtonClass: (
    isLinked: boolean,
    accountsLoading: boolean,
    disableUnlink: boolean
  ) => string;
  success: (msg: string) => void;
  error: (msg: string) => void;
  toErrorMessage: (err: unknown) => string;
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
    <div className="max-w-xl space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <details className="group bg-card rounded-2xl border border-border shadow-sm overflow-hidden" open>
        <summary className="font-bold text-foreground p-4 cursor-pointer list-none flex justify-between items-center transition-colors">
          {labels.changePassword}
          <ChevronDown className="w-5 h-5 transition-transform group-open:rotate-180 text-muted-foreground" />
        </summary>
        <div className="p-4 pt-1 border-t border-border/50">
          <form onSubmit={handlePasswordChange} className="space-y-4 mt-2">
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                {labels.currentPassword}
              </label>
              <Input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className="w-full !h-auto !p-3 !bg-muted/30 !border-border !rounded-xl focus-visible:!ring-2 focus-visible:!ring-indigo-500 dark:focus-visible:!ring-indigo-300/70 !shadow-none transition-all"
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
                className="w-full !h-auto !p-3 !bg-muted/30 !border-border !rounded-xl focus-visible:!ring-2 focus-visible:!ring-indigo-500 dark:focus-visible:!ring-indigo-300/70 !shadow-none transition-all"
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
                className="w-full !h-auto !p-3 !bg-muted/30 !border-border !rounded-xl focus-visible:!ring-2 focus-visible:!ring-indigo-500 dark:focus-visible:!ring-indigo-300/70 !shadow-none transition-all"
                required
              />
            </div>
            <div className="pt-4">
              <Button
                type="submit"
                variant="default"
                size="auto"
                disabled={!currentPassword || !newPassword || !confirmPassword || isChangingPassword}
                loading={isChangingPassword}
                loadingIconClassName="w-4 h-4"
                className={`w-full py-3 px-4 rounded-xl font-bold transition-all ${
                  !currentPassword || !newPassword || !confirmPassword || isChangingPassword
                    ? 'opacity-70 cursor-not-allowed'
                    : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:scale-[1.01] active:scale-[0.98]'
                }`}
              >
                {labels.profile?.updatePassword || 'Update Password'}
              </Button>
            </div>
          </form>
        </div>
      </details>

      {/* Forgot Password Section */}
      <details className="group bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <summary className="font-bold text-foreground p-4 cursor-pointer list-none flex justify-between items-center transition-colors">
          {labels.forgotPassword || 'Forgot your password?'}
          <ChevronDown className="w-5 h-5 transition-transform group-open:rotate-180 text-muted-foreground" />
        </summary>
        <div className="p-4 pt-1 border-t border-border/50">
          <div className="bg-muted/40 rounded-xl p-4 border border-border mt-2">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-400/15 rounded-lg shrink-0">
                <Mail size={20} className="text-indigo-600 dark:text-indigo-200" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-foreground mb-1">
                  {labels.resetPasswordViaEmail || 'Reset password via email'}
                </h4>
                <p className="text-sm text-muted-foreground mb-4">
                  {labels.forgotPasswordProfileDescription ||
                    "If you've forgotten your current password, you can reset it via email verification."}
                </p>
                <Button
                  asChild
                  variant="default"
                  size="auto"
                  className="inline-flex items-center gap-2 font-bold text-sm h-10 px-4 rounded-xl shadow-sm"
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
      </details>

      <details className="group bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <summary className="font-bold text-foreground p-4 cursor-pointer list-none flex justify-between items-center transition-colors">
          {accountSectionTitle}
          <ChevronDown className="w-5 h-5 transition-transform group-open:rotate-180 text-muted-foreground" />
        </summary>
        <div className="p-4 pt-1 border-t border-border/50">
          <div className="space-y-3 mt-2">
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
                  className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
                >
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <span className="font-bold text-foreground">{provider.label}</span>
                    <span
                      className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-md ${
                        isLinked
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
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
                    className={`px-4 py-2 w-full sm:w-auto rounded-lg text-xs font-bold transition ${getAccountButtonClass(isLinked, accountsLoading, disableUnlink)}`}
                  >
                    {isLinked ? unlinkLabel : linkLabel}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </details>
    </div>
  );
};
