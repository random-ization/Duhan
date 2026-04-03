import React, { useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import type { LearnerStatsDto } from '../../../convex/learningStats';
import {
  ArrowLeft,
  User as UserIcon,
  BarChart3,
  Lock,
  Settings,
  Camera,
  LogOut,
  Sparkles,
  Trophy,
  History,
  BookMarked,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { useAuthActions } from '@convex-dev/auth/react';
import { useAuth } from '../../contexts/AuthContext';
import { ProfileInfoTab } from '../../pages/profile/tabs/ProfileInfoTab';
import { ProfileStatsTab } from '../../pages/profile/tabs/ProfileStatsTab';
import { ProfileSecurityTab } from '../../pages/profile/tabs/ProfileSecurityTab';
import { ProfileSettingsTab } from '../../pages/profile/tabs/ProfileSettingsTab';
import toast from 'react-hot-toast';
import { useMutation, useAction, useQuery } from 'convex/react';
import { aRef, mRef, NoArgs, qRef } from '../../utils/convexRefs';
import { useExamStats } from '../../pages/profile/hooks/useExamStats';
import { ExamAttempt } from '../../types';
import { toErrorMessage } from '../../utils/errors';
import { Loading } from '../common/Loading';
import { useTranslation } from 'react-i18next';
import { getLabels } from '../../utils/i18n';
import { Button } from '../ui';
import { Input } from '../ui';
import { isIncorrectPasswordError, validatePasswordChange } from '../../utils/profilePassword';
import {
  resetFileInputSelection,
  uploadAvatarImage,
  validateAvatarFile,
} from '../../utils/storageUpload';
import { hasSafeReturnTo, resolveSafeReturnTo } from '../../utils/navigation';

const MobileAvatarContent = ({
  isUploadingAvatar,
  avatar,
  altLabel,
}: {
  isUploadingAvatar: boolean;
  avatar?: string | null;
  altLabel: string;
}) => {
  if (isUploadingAvatar) return <Loading size="sm" />;
  if (avatar) return <img src={avatar} alt={altLabel} className="w-full h-full object-cover" />;
  return (
    <UserIcon className="w-10 h-10 text-muted-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
  );
};

export const MobileProfilePage: React.FC = () => {
  const { user, updateUser, language, viewerAccess } = useAuth();
  const navigate = useLocalizedNavigate();
  const [searchParams] = useSearchParams();
  const { signOut, signIn } = useAuthActions();
  const { t } = useTranslation();

  // Legacy support for shared tabs
  const labels = getLabels(language);

  // State
  const [activeTab, setActiveTab] = useState<'info' | 'stats' | 'security' | 'settings'>('info');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // -- DATA FETCHING (Copied from ProfilePage) --
  const vocabBookCount = useQuery(
    qRef<{ includeMastered?: boolean }, { count: number }>('vocab:getVocabBookCount'),
    user ? { includeMastered: true } : 'skip'
  );
  const examAttempts = useQuery(
    qRef<{ limit?: number }, ExamAttempt[]>('user:getExamAttempts'),
    user ? { limit: 200 } : 'skip'
  );
  const userStats = useQuery(
    qRef<NoArgs, LearnerStatsDto>('userStats:getStats'),
    user ? {} : 'skip'
  );
  const examHistory = examAttempts ?? [];
  const { examsTaken, averageScore } = useExamStats(examHistory);

  const linkedAccounts = useQuery(
    qRef<NoArgs, { provider: string }[]>('auth:linkedAuthAccounts'),
    user ? {} : 'skip'
  );

  // -- MUTATIONS --
  const changePasswordMutation = useMutation(mRef('auth:changePassword'));
  const unlinkAuthProviderMutation = useMutation(mRef('auth:unlinkAuthProvider'));
  const getUploadUrlAction = useAction(
    aRef<
      { filename: string; contentType: string; fileSize: number; folder?: string },
      { uploadUrl: string; publicUrl: string; key: string; headers: Record<string, string> }
    >('storage:getUploadUrl')
  );

  // -- HANDLERS --
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = e.target.files?.[0];
    const validationError = validateAvatarFile(file);
    if (validationError === 'missing') {
      resetFileInputSelection(input);
      return;
    }
    if (validationError === 'invalid_type') {
      toast.error(labels.profile?.uploadImageError || 'Please upload an image file');
      resetFileInputSelection(input);
      return;
    }
    if (validationError === 'too_large') {
      toast.error(labels.profile?.imageTooLarge || 'Image size must be less than 5MB');
      resetFileInputSelection(input);
      return;
    }

    setIsUploadingAvatar(true);
    try {
      await uploadAvatarImage({
        file: file!,
        getUploadUrl: getUploadUrlAction,
        saveAvatar: async avatarUrl => {
          await updateUser({ avatar: avatarUrl });
        },
      });
      toast.success(t('avatarUpdated', { defaultValue: 'Avatar updated' }));
    } catch (err) {
      console.error(err);
      toast.error(t('profile.uploadAvatarFailed', { defaultValue: 'Failed to upload avatar' }));
    } finally {
      setIsUploadingAvatar(false);
      resetFileInputSelection(input);
    }
  };

  // Password Logic
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

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

  const handleDisplayNameUpdate = async (nextName: string) => {
    if (!nextName.trim() || nextName === user?.name) return;
    await updateUser({ name: nextName });
    toast.success(t('profileUpdated', { defaultValue: 'Profile updated' }));
  };

  if (!user) return <Loading fullScreen />;

  const displayName = user.name || t('profile.unnamed', { defaultValue: 'User' });
  const userIdDisplay = (user as any)._id?.slice(0, 8) || '—';
  const dayStreak = userStats?.streak ?? 0;
  const savedWordsCount = userStats?.totalWordsLearned ?? vocabBookCount?.count ?? 0;
  const averageScoreLabel = averageScore > 0 ? `${averageScore}` : '—';

  const overviewStats = [
    {
      id: 'streak',
      label: t('dashboard.mobile.streakShort', { defaultValue: 'Streak' }),
      value: `${dayStreak}`,
      icon: <Trophy className="w-3.5 h-3.5" />,
      tone: 'text-amber-600 bg-amber-50 dark:text-amber-300 dark:bg-amber-400/10 border-amber-100 dark:border-amber-400/20',
    },
    {
      id: 'words',
      label: t('profile.savedWords', { defaultValue: 'Words' }),
      value: `${savedWordsCount}`,
      icon: <BookMarked className="w-3.5 h-3.5" />,
      tone: 'text-indigo-600 bg-indigo-50 dark:text-indigo-300 dark:bg-indigo-400/10 border-indigo-100 dark:border-indigo-400/20',
    },
    {
      id: 'exams',
      label: t('profile.examsTaken', { defaultValue: 'Exams' }),
      value: `${examsTaken}`,
      icon: <History className="w-3.5 h-3.5" />,
      tone: 'text-emerald-600 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-400/10 border-emerald-100 dark:border-emerald-400/20',
    },
    {
      id: 'score',
      label: t('profile.avgScore', { defaultValue: 'Score' }),
      value: averageScoreLabel,
      icon: <BarChart3 className="w-3.5 h-3.5" />,
      tone: 'text-rose-600 bg-rose-50 dark:text-rose-300 dark:bg-rose-400/10 border-rose-100 dark:border-rose-400/20',
    },
  ];

  // Helper for accounts
  const linkedProviders = new Set(linkedAccounts?.map(a => a.provider) ?? []);
  const getAccountButtonClass = (isLinked: boolean, _loading: boolean, _disable: boolean) =>
    isLinked
      ? 'bg-red-50 text-red-600 dark:bg-red-400/12 dark:text-red-200'
      : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-400/12 dark:text-indigo-200';
  const tabContentByKey = {
    info: (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card p-8 rounded-[2.5rem] border border-border shadow-xl shadow-slate-200/50 dark:shadow-none"
      >
        <ProfileInfoTab
          labels={labels}
          user={user}
          displayName={displayName}
          userIdDisplay={userIdDisplay}
          isPremium={Boolean(viewerAccess?.isPremium)}
          onNameUpdate={handleDisplayNameUpdate}
        />
      </motion.div>
    ),
    stats: (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card p-8 rounded-[2.5rem] border border-border shadow-xl shadow-slate-200/50 dark:shadow-none"
      >
        <ProfileStatsTab
          labels={labels}
          dayStreak={dayStreak}
          savedWordsCount={savedWordsCount}
          examsTaken={examsTaken}
          averageScore={averageScore}
          examHistory={examHistory}
        />
      </motion.div>
    ),
    security: (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card p-8 rounded-[2.5rem] border border-border shadow-xl shadow-slate-200/50 dark:shadow-none"
      >
        <ProfileSecurityTab
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
          linkedProviders={linkedProviders}
          linkedCount={linkedAccounts?.length || 0}
          accountsLoading={linkedAccounts === undefined}
          linkedLabel={labels.profile?.link?.linked || 'Linked'}
          notLinkedLabel={labels.profile?.link?.notLinked || 'Not linked'}
          unlinkLabel={labels.profile?.link?.unlink || 'Unlink'}
          linkLabel={labels.profile?.link?.connect || 'Connect'}
          signIn={signIn}
          unlinkAuthProviderMutation={unlinkAuthProviderMutation}
          getAccountButtonClass={getAccountButtonClass}
          success={toast.success}
          error={toast.error}
          toErrorMessage={toErrorMessage}
        />
      </motion.div>
    ),
    settings: (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card p-8 rounded-[2.5rem] border border-border shadow-xl shadow-slate-200/50 dark:shadow-none"
      >
        <ProfileSettingsTab labels={labels} />
      </motion.div>
    ),
  } as const;

  const tabMetaByKey = {
    info: {
      title: t('profile.tabInfoTitle', { defaultValue: 'Profile details' }),
      subtitle: t('profile.tabInfoSubtitle', {
        defaultValue:
          'Update your identity, avatar, and the personal details tied to your learning.',
      }),
    },
    stats: {
      title: t('profile.tabStatsTitle', { defaultValue: 'Learning overview' }),
      subtitle: t('profile.tabStatsSubtitle', {
        defaultValue: 'Review streaks, exam momentum, and the progress signals that matter most.',
      }),
    },
    security: {
      title: t('profile.tabSecurityTitle', { defaultValue: 'Security and linked accounts' }),
      subtitle: t('profile.tabSecuritySubtitle', {
        defaultValue:
          'Manage password changes and the sign-in providers connected to this account.',
      }),
    },
    settings: {
      title: t('profile.tabSettingsTitle', { defaultValue: 'Preferences' }),
      subtitle: t('profile.tabSettingsSubtitle', {
        defaultValue: 'Tune notifications, language, and product defaults to fit your routine.',
      }),
    },
  } as const;

  const returnTo = searchParams.get('returnTo');
  const shouldShowBack = hasSafeReturnTo(returnTo);

  const handleBack = () => {
    navigate(resolveSafeReturnTo(returnTo, '/dashboard'));
  };

  return (
    <div className="min-h-[100dvh] bg-background pb-mobile-nav">
      {/* Premium Profile Header */}
      <div className="relative overflow-hidden rounded-b-[3rem] bg-card px-6 pb-12 pt-8 shadow-sm">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.15),transparent_60%)]" />

        <div className="relative mb-10 flex items-center justify-between">
          {shouldShowBack ? (
            <Button
              variant="ghost"
              size="auto"
              onClick={handleBack}
              className="h-10 w-10 items-center justify-center rounded-full bg-muted shadow-sm transition-all active:scale-90"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </Button>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50/50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-indigo-600 backdrop-blur-sm dark:border-indigo-400/20 dark:bg-indigo-400/10 dark:text-indigo-200">
              <Sparkles className="w-3 h-3 h-3" />
              {t('nav.profile', { defaultValue: 'Profile' })}
            </div>
          )}
          <Button
            variant="ghost"
            size="auto"
            onClick={() => signOut()}
            className="h-10 rounded-xl border border-border bg-card px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground shadow-sm active:scale-95 transition-all"
          >
            <LogOut className="h-3.5 w-3.5 mr-2" />
            {t('common.signOut', { defaultValue: 'Sign Out' })}
          </Button>
        </div>

        <div className="relative z-10">
          <div className="flex flex-col items-center text-center mb-10">
            <div className="relative mb-6">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="relative h-28 w-28 overflow-hidden rounded-[2.25rem] border-4 border-card shadow-2xl bg-muted"
              >
                <MobileAvatarContent
                  isUploadingAvatar={isUploadingAvatar}
                  avatar={user.avatar}
                  altLabel={displayName}
                />
              </motion.div>
              <Button
                variant="ghost"
                size="auto"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 h-10 w-10 rounded-2xl bg-indigo-600 text-white shadow-xl flex items-center justify-center transition-transform active:scale-90 border-2 border-card"
              >
                <Camera className="w-4 h-4" />
              </Button>
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>

            <h1 className="text-3xl font-black text-foreground tracking-tight italic mb-2 leading-none">
              {displayName}
            </h1>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
              <span className="font-mono text-foreground opacity-80">ID: {userIdDisplay}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {overviewStats.map(stat => (
              <motion.div
                key={stat.id}
                whileTap={{ scale: 0.98 }}
                className={cn('rounded-2xl border p-4 shadow-sm flex flex-col', stat.tone)}
              >
                <div className="flex items-center gap-2 mb-2 opacity-70">
                  {stat.icon}
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {stat.label}
                  </span>
                </div>
                <div className="text-2xl font-black">{stat.value}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Modern Tab Nav */}
      <div className="sticky top-4 z-40 px-6 -mt-8 mb-8">
        <div className="flex justify-between rounded-[2rem] border border-white/20 bg-white/70 dark:bg-zinc-900/70 p-1.5 shadow-2xl backdrop-blur-xl">
          {[
            {
              id: 'info',
              icon: UserIcon,
              label: t('profile.tabInfoShort', { defaultValue: 'Info' }),
            },
            {
              id: 'stats',
              icon: BarChart3,
              label: t('profile.tabStatsShort', { defaultValue: 'Stats' }),
            },
            {
              id: 'security',
              icon: Lock,
              label: t('profile.tabSecurityShort', { defaultValue: 'Security' }),
            },
            {
              id: 'settings',
              icon: Settings,
              label: t('profile.tabSettingsShort', { defaultValue: 'Settings' }),
            },
          ].map(item => {
            const isActive = activeTab === item.id;
            return (
              <Button
                key={item.id}
                variant="ghost"
                size="auto"
                onClick={() => setActiveTab(item.id as any)}
                className={cn(
                  'relative flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-2xl transition-all duration-300',
                  isActive
                    ? 'text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-400/10 shadow-sm'
                    : 'text-muted-foreground'
                )}
              >
                <item.icon className={cn('w-4 h-4', isActive ? 'stroke-[2.5px]' : 'stroke-2')} />
                <span className="text-[9px] font-black uppercase tracking-widest leading-none">
                  {item.label}
                </span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Modern Tab Content Header & Body */}
      <main className="px-6 pb-12">
        <div className="mb-6 px-1">
          <h2 className="text-2xl font-black text-foreground italic tracking-tight mb-2">
            {tabMetaByKey[activeTab].title}
          </h2>
          <p className="text-sm font-semibold text-muted-foreground leading-relaxed">
            {tabMetaByKey[activeTab].subtitle}
          </p>
        </div>

        <AnimatePresence mode="wait">
          <div key={activeTab}>{tabContentByKey[activeTab]}</div>
        </AnimatePresence>
      </main>
    </div>
  );
};
