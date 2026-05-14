import React, { Suspense, lazy, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { getLabels } from '../../utils/i18n';
import { useQuery, useMutation, useAction } from 'convex/react';
import { qRef, mRef, NoArgs, aRef } from '../../utils/convexRefs';
import { LearnerStatsDto } from '../../../convex/learningStats';
import { useExamStats } from '../profile/hooks/useExamStats';
import { ExamAttempt } from '../../types';
import { Loading, UserAvatar } from '../../components/common';
import { KT, Card, HanjaSeal, SectionHead } from '../../components/mobile/ksoft/ksoft';
import { ProfileInfoTab } from '../profile/tabs/ProfileInfoTab';
import type { SettingsSection } from '../profile/tabs/ProfileSettingsTab';
import {
  User,
  Shield,
  Settings,
  BarChart3,
  CreditCard,
  ChevronRight,
  LogOut,
  Bell,
  Globe,
  Camera,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { useAuthActions } from '@convex-dev/auth/react';
import { isIncorrectPasswordError, validatePasswordChange } from '../../utils/profilePassword';
import { uploadAvatarImage } from '../../utils/storageUpload';
import { toErrorMessage } from '../../utils/errors';

type ProfileTab = 'account' | 'stats' | 'security' | 'notifications' | 'language' | 'subscription';

const LazyProfileStatsTab = lazy(() =>
  import('../profile/tabs/ProfileStatsTab').then(module => ({
    default: module.ProfileStatsTab,
  }))
);

const LazyProfileSecurityTab = lazy(() =>
  import('../profile/tabs/ProfileSecurityTab').then(module => ({
    default: module.ProfileSecurityTab,
  }))
);

const LazyProfileSettingsTab = lazy(() =>
  import('../profile/tabs/ProfileSettingsTab').then(module => ({
    default: module.ProfileSettingsTab,
  }))
);

const ProfileTabFallback: React.FC = () => (
  <Card pad={24}>
    <div className="py-10 text-center text-sm font-semibold text-k-sub">Loading...</div>
  </Card>
);

export const DesktopProfilePage: React.FC = () => {
  const { user, updateUser, logout, language, viewerAccess } = useAuth();
  const { t } = useTranslation();
  const labels = getLabels(language);
  const navigate = useLocalizedNavigate();
  const [activeTab, setActiveTab] = useState<ProfileTab>('account');

  const userStats = useQuery(
    qRef<NoArgs, LearnerStatsDto>('userStats:getStats'),
    user ? {} : 'skip'
  );
  const examAttempts = useQuery(
    qRef<{ limit?: number }, ExamAttempt[]>('user:getExamAttempts'),
    user ? { limit: 200 } : 'skip'
  );
  const vocabBookCount = useQuery(
    qRef<{ includeMastered?: boolean }, { count: number }>('vocab:getVocabBookCount'),
    user ? { includeMastered: true } : 'skip'
  );
  const linkedAccounts = useQuery(
    qRef<NoArgs, { provider: string }[]>('auth:linkedAuthAccounts'),
    user ? {} : 'skip'
  );

  const { examsTaken, averageScore } = useExamStats(examAttempts ?? []);

  const logoutMutation = useMutation(mRef('auth:logout'));
  const changePasswordMutation = useMutation(mRef('auth:changePassword'));
  const unlinkAuthProviderMutation = useMutation(mRef('auth:unlinkAuthProvider'));
  const getUploadUrlAction = useAction(
    aRef<
      { filename: string; contentType: string; fileSize: number; folder?: string },
      { uploadUrl: string; publicUrl: string; key: string; headers: Record<string, string> }
    >('storage:getUploadUrl')
  );
  const { signIn } = useAuthActions();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  if (!user) return <Loading fullScreen />;

  const displayName = user.name || t('profile.unnamed', { defaultValue: 'User' });
  const dayStreak = userStats?.streak ?? 0;
  const savedWordsCount = userStats?.totalWordsLearned ?? vocabBookCount?.count ?? 0;
  const userIdDisplay = (user as any)._id?.slice(0, 8) || '—';
  const isPremium = Boolean(viewerAccess?.isPremium);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validatePasswordChange(newPassword, confirmPassword);
    if (validationError === 'weak') {
      toast.error(t('weakPassword', { defaultValue: 'Password must be at least 6 characters' }));
      return;
    }
    if (validationError === 'mismatch') {
      toast.error(t('passwordMismatch', { defaultValue: 'Passwords do not match' }));
      return;
    }
    setIsChangingPassword(true);
    try {
      await changePasswordMutation({ currentPassword, newPassword });
      toast.success(t('passwordUpdated', { defaultValue: 'Password updated' }));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (isIncorrectPasswordError(msg)) {
        toast.error(t('wrongPassword', { defaultValue: 'Incorrect password' }));
      } else {
        toast.error(
          t('profile.changePasswordFailed', { defaultValue: 'Failed to change password' })
        );
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      await uploadAvatarImage({
        file,
        getUploadUrl: getUploadUrlAction,
        saveAvatar: async avatarUrl => {
          await updateUser({ avatar: avatarUrl });
        },
      });
      toast.success(t('avatarUpdated', { defaultValue: 'Avatar updated' }));
    } catch (err) {
      toast.error(t('profile.uploadAvatarFailed', { defaultValue: 'Failed to upload avatar' }));
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const sidebarItems = [
    {
      id: 'account',
      label: labels.profile?.accountTitle || 'Account Details',
      icon: User,
      color: KT.mintDeep,
    },
    {
      id: 'stats',
      label: labels.profile?.learningHub?.title || 'Learning Stats',
      icon: BarChart3,
      color: KT.butterDeep,
    },
    {
      id: 'security',
      label: labels.profile?.securityHub?.title || 'Security',
      icon: Shield,
      color: KT.crimson,
    },
    { id: 'notifications', label: 'Notifications', icon: Bell, color: KT.butterDeep },
    { id: 'language', label: 'Language', icon: Globe, color: KT.mintDeep },
    { id: 'subscription', label: 'Subscription', icon: CreditCard, color: KT.pinkDeep },
  ];

  const handleNameUpdate = async (nextName: string) => {
    if (!nextName.trim() || nextName === user?.name) return;
    await updateUser({ name: nextName });
    toast.success(t('profileUpdated', { defaultValue: 'Profile updated' }));
  };

  return (
    <div className="flex-1 flex flex-col bg-k-bg h-full overflow-hidden">
      {/* Header Banner */}
      <div
        className="shrink-0 h-48 relative overflow-hidden flex items-end px-12 pb-8"
        style={{ background: `linear-gradient(135deg, ${KT.mint}60 0%, ${KT.bg} 100%)` }}
      >
        <div className="flex items-center gap-6 z-10">
          <div className="relative group">
            <UserAvatar
              user={user}
              isUploading={isUploadingAvatar}
              className="w-24 h-24 rounded-[28px] border-4 border-k-card shadow-xl transition-transform group-hover:scale-105"
              fallbackClassName="text-3xl"
            />
            <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-[28px] opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
              <Camera size={24} />
              <input
                type="file"
                className="hidden"
                onChange={handleAvatarUpload}
                accept="image/*"
              />
            </label>
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-k-ink">{displayName}</h1>
            <p className="text-k-sub font-semibold mt-1">
              {t('profile.level', { defaultValue: 'Level' })}{' '}
              {Math.max(1, Math.floor(savedWordsCount / 100))} · {dayStreak}{' '}
              {t('profile.dayStreak', { defaultValue: 'day streak' })}
            </p>
          </div>
          {isPremium && (
            <div className="ml-4 px-3 py-1 bg-k-crimson text-white text-xs font-black rounded-full uppercase tracking-wider">
              Premium
            </div>
          )}
        </div>
        {/* Abstract shapes */}
        <div className="absolute top-[-20px] right-[-20px] w-64 h-64 bg-k-butter/20 rounded-full blur-3xl" />
        <div className="absolute bottom-[-40px] left-[20%] w-48 h-48 bg-k-mint/30 rounded-full blur-3xl" />
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Internal Sidebar */}
        <div className="w-72 border-r border-k-line bg-k-card/50 flex flex-col p-6 gap-2">
          {sidebarItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as ProfileTab)}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 group',
                activeTab === item.id
                  ? 'bg-k-ink text-k-bg shadow-lg shadow-k-ink/10 translate-x-1'
                  : 'text-k-sub hover:bg-k-bg2/50 hover:text-k-ink'
              )}
            >
              <item.icon
                size={18}
                className={cn(
                  activeTab === item.id ? 'text-k-bg' : 'text-k-sub group-hover:text-k-ink'
                )}
              />
              <span className="flex-1 text-left font-bold text-sm">{item.label}</span>
              <ChevronRight
                size={14}
                className={cn(
                  'transition-transform',
                  activeTab === item.id
                    ? 'translate-x-0 opacity-100'
                    : 'translate-x-[-4px] opacity-0 group-hover:opacity-100 group-hover:translate-x-0'
                )}
              />
            </button>
          ))}

          <div className="mt-auto pt-6 border-t border-k-line">
            <button
              onClick={() => logout()}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl w-full text-k-crimson hover:bg-red-50 transition-colors"
            >
              <LogOut size={18} />
              <span className="font-bold text-sm">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-12 bg-k-bg/30">
          <div className="max-w-4xl mx-auto">
            {activeTab === 'account' && (
              <ProfileInfoTab
                labels={labels}
                user={user}
                displayName={displayName}
                userIdDisplay={userIdDisplay}
                isPremium={isPremium}
                onNameUpdate={handleNameUpdate}
              />
            )}
            {activeTab === 'stats' && (
              <Suspense fallback={<ProfileTabFallback />}>
                <LazyProfileStatsTab
                  labels={labels}
                  dayStreak={dayStreak}
                  savedWordsCount={savedWordsCount}
                  examsTaken={examsTaken}
                  averageScore={averageScore}
                  examHistory={examAttempts ?? []}
                />
              </Suspense>
            )}
            {activeTab === 'security' && (
              <Suspense fallback={<ProfileTabFallback />}>
                <LazyProfileSecurityTab
                  labels={labels}
                  handlePasswordChange={handlePasswordChange}
                  currentPassword={currentPassword}
                  setCurrentPassword={setCurrentPassword}
                  newPassword={newPassword}
                  setNewPassword={setNewPassword}
                  confirmPassword={confirmPassword}
                  setConfirmPassword={setConfirmPassword}
                  isChangingPassword={isChangingPassword}
                  accountSectionTitle={labels.profile?.link?.sectionTitle || 'Social Accounts'}
                  linkedProviders={new Set(linkedAccounts?.map(a => a.provider) ?? [])}
                  linkedCount={linkedAccounts?.length ?? 0}
                  accountsLoading={linkedAccounts === undefined}
                  linkedLabel={labels.profile?.link?.linked || 'Linked'}
                  notLinkedLabel={labels.profile?.link?.notLinked || 'Not linked'}
                  unlinkLabel={labels.profile?.link?.unlink || 'Unlink'}
                  linkLabel={labels.profile?.link?.connect || 'Connect'}
                  signIn={signIn}
                  unlinkAuthProviderMutation={unlinkAuthProviderMutation}
                  getAccountButtonClass={isLinked =>
                    isLinked ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'
                  }
                  success={toast.success}
                  error={toast.error}
                  toErrorMessage={toErrorMessage}
                />
              </Suspense>
            )}
            {activeTab === 'notifications' && (
              <Suspense fallback={<ProfileTabFallback />}>
                <LazyProfileSettingsTab labels={labels} section="notifications" />
              </Suspense>
            )}
            {activeTab === 'language' && (
              <Suspense fallback={<ProfileTabFallback />}>
                <LazyProfileSettingsTab labels={labels} section="language" />
              </Suspense>
            )}
            {activeTab === 'subscription' && (
              <div className="space-y-6">
                <SectionHead kanji="購" title="Subscription Management" />
                <Card pad={24}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-k-ink">
                        {isPremium ? 'Premium Plan' : 'Free Plan'}
                      </h3>
                      <p className="text-k-sub mt-1">
                        {isPremium
                          ? 'Thank you for supporting Duhan!'
                          : 'Upgrade for unlimited access and offline mode.'}
                      </p>
                    </div>
                    <button
                      onClick={() => navigate('/pricing')}
                      className="px-6 py-2.5 bg-k-crimson text-white font-black rounded-xl hover:opacity-90 transition-opacity"
                    >
                      {isPremium ? 'Manage' : 'Upgrade Now'}
                    </button>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
