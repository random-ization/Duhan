import React, { useRef, useState } from 'react';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { useMutation, useAction, useQuery } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { ExamAttempt, Language, User } from '../types';
import { getLabels } from '../utils/i18n';
import { useAuth } from '../contexts/AuthContext';
import { aRef, mRef, NoArgs, qRef } from '../utils/convexRefs';
import { toErrorMessage } from '../utils/errors';

import toast from 'react-hot-toast';
import { Loading } from '../components/common/Loading';
import { User as UserIcon, BarChart3, Lock, Settings } from 'lucide-react';
import BackButton from '../components/ui/BackButton';
import { ProfileTabButton } from './profile/components/ProfileTabButton';
import { ProfileHeader } from './profile/components/ProfileHeader';
import { ProfileInfoTab } from './profile/tabs/ProfileInfoTab';
import { ProfileStatsTab } from './profile/tabs/ProfileStatsTab';
import { ProfileSecurityTab } from './profile/tabs/ProfileSecurityTab';
import { ProfileSettingsTab } from './profile/tabs/ProfileSettingsTab';
import { useExamStats } from './profile/hooks/useExamStats';
import { useIsMobile } from '../hooks/useIsMobile';
import { MobileProfilePage } from '../components/mobile/MobileProfilePage';
import { uploadAvatarImage, validateAvatarFile } from '../utils/storageUpload';

interface ProfileProps {
  language: Language;
}

const firstString = (...values: Array<string | null | undefined>): string => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value;
  }
  return '';
};

const firstPositiveTimestamp = (...values: Array<number | null | undefined>): number => {
  for (const value of values) {
    if (typeof value === 'number' && value > 0) return value;
  }
  return 0;
};

const buildProfileIdentity = ({
  user,
  labels,
}: {
  user: User & { _id?: string; _creationTime?: number; createdAt?: number; joinDate?: number };
  labels: ReturnType<typeof getLabels>;
}) => {
  const displayName = firstString(
    user.name,
    user.email?.split('@')[0],
    labels.profile?.unnamed,
    'Unnamed'
  );
  const rawUserId = firstString(user.id, user._id, '');
  const userIdDisplay = rawUserId ? rawUserId.slice(0, 8) : '—';
  const joinedTimestamp = firstPositiveTimestamp(
    user.createdAt,
    user.joinDate,
    user._creationTime,
    0
  );

  return {
    displayName,
    userIdDisplay,
    joinedDateLabel: joinedTimestamp ? new Date(joinedTimestamp).toLocaleDateString() : '—',
  };
};

const buildAccountLinkMeta = ({
  labels,
  linkedAccounts,
}: {
  labels: ReturnType<typeof getLabels>;
  linkedAccounts: { provider: string }[] | undefined;
}) => ({
  linkedProviders: new Set(linkedAccounts?.map(account => account.provider) ?? []),
  linkedCount: linkedAccounts?.length ?? 0,
  accountsLoading: linkedAccounts === undefined,
  linkLabel: firstString(labels.profile?.link?.connect, 'Connect'),
  unlinkLabel: firstString(labels.profile?.link?.unlink, 'Unlink'),
  linkedLabel: firstString(labels.profile?.link?.linked, 'Linked'),
  notLinkedLabel: firstString(labels.profile?.link?.notLinked, 'Not linked'),
  accountSectionTitle: firstString(labels.profile?.link?.sectionTitle, 'Social Accounts'),
});

const buildProfileDerived = ({
  user,
  labels,
  linkedAccounts,
}: {
  user: User & { _id?: string; _creationTime?: number; createdAt?: number; joinDate?: number };
  labels: ReturnType<typeof getLabels>;
  linkedAccounts: { provider: string }[] | undefined;
}) => {
  const identity = buildProfileIdentity({ user, labels });
  const accountMeta = buildAccountLinkMeta({ labels, linkedAccounts });

  return {
    ...identity,
    ...accountMeta,
    isProfileIncomplete: !user.name?.trim() || !user.avatar,
  };
};

const Profile: React.FC<ProfileProps> = ({ language }) => {
  const { user, updateUser } = useAuth();
  const navigate = useLocalizedNavigate();
  const isMobile = useIsMobile();
  const labels = getLabels(language);
  const success = toast.success;
  const error = toast.error;
  const { signIn } = useAuthActions();

  const vocabBookCount = useQuery(
    qRef<{ includeMastered?: boolean }, { count: number }>('vocab:getVocabBookCount'),
    user ? { includeMastered: true } : 'skip'
  );
  const examAttempts = useQuery(
    qRef<{ limit?: number }, ExamAttempt[]>('user:getExamAttempts'),
    user ? { limit: 200 } : 'skip'
  );
  const examHistory = examAttempts ?? [];
  const { examsTaken, averageScore } = useExamStats(examHistory);

  const [activeTab, setActiveTab] = useState<'info' | 'security' | 'stats' | 'settings'>('info');
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.name || '');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Convex Mutations & Actions
  const changePasswordMutation = useMutation(
    mRef<{ currentPassword: string; newPassword: string }, void>('auth:changePassword')
  );
  const unlinkAuthProviderMutation = useMutation(
    mRef<{ provider: string }, { success: boolean }>('auth:unlinkAuthProvider')
  );
  const syncProfileFromIdentityMutation = useMutation(
    mRef<NoArgs, { updated: boolean }>('auth:syncProfileFromIdentity')
  );
  const getUploadUrlAction = useAction(
    aRef<
      { filename: string; contentType: string; fileSize: number; folder?: string },
      { uploadUrl: string; publicUrl: string; key: string; headers: Record<string, string> }
    >('storage:getUploadUrl')
  );
  const linkedAccounts = useQuery(
    qRef<NoArgs, { provider: string }[]>('auth:linkedAuthAccounts'),
    user ? {} : 'skip'
  );

  if (!user) return <Loading fullScreen size="lg" />;

  if (isMobile) {
    return <MobileProfilePage />;
  }

  const userMeta = user as User & {
    _id?: string;
    _creationTime?: number;
    createdAt?: number;
    joinDate?: number;
  };
  const {
    displayName,
    userIdDisplay,
    joinedDateLabel,
    linkedProviders,
    linkedCount,
    accountsLoading,
    linkLabel,
    unlinkLabel,
    linkedLabel,
    notLinkedLabel,
    accountSectionTitle,
    isProfileIncomplete,
  } = buildProfileDerived({ user: userMeta, labels, linkedAccounts });
  const dayStreak = user.statistics?.dayStreak ?? 0;
  const savedWordsCount = vocabBookCount?.count ?? 0;
  const settingsTabLabel = firstString(labels.generalSettings, 'General');

  const handleNameUpdate = async () => {
    if (!newName.trim() || newName === user.name) {
      setIsEditingName(false);
      return;
    }
    try {
      await updateUser({ name: newName });
      success(labels.profileUpdated || 'Profile updated');
      setIsEditingName(false);
    } catch (err) {
      console.error(err);
      error(labels.profile?.updateNameFailed || 'Failed to update name');
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const validationError = validateAvatarFile(file);
    if (validationError === 'missing') return;
    if (validationError === 'invalid_type') {
      error(labels.profile?.uploadImageError || 'Please upload an image file');
      return;
    }
    if (validationError === 'too_large') {
      error(labels.profile?.imageTooLarge || 'Image size must be less than 5MB');
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
      success(labels.avatarUpdated || 'Avatar updated');
    } catch (err) {
      console.error('Avatar upload failed:', err);
      error(labels.profile?.uploadAvatarFailed || 'Failed to upload avatar');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      error(labels.weakPassword);
      return;
    }
    if (newPassword !== confirmPassword) {
      error(labels.passwordMismatch);
      return;
    }
    setIsChangingPassword(true);
    try {
      await changePasswordMutation({
        currentPassword,
        newPassword,
      });
      success(labels.passwordUpdated || 'Password updated');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const msg = (err as Error).message || '';
      if (
        msg.includes('incorrect') ||
        msg.includes('wrong') ||
        msg.includes('INCORRECT_PASSWORD')
      ) {
        error(labels.wrongPassword || 'Incorrect password');
      } else {
        error(labels.profile?.changePasswordFailed || 'Failed to change password');
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const renderAvatar = () => {
    if (isUploadingAvatar) return <Loading size="md" />;
    if (user.avatar) {
      return (
        <img
          src={user.avatar}
          alt={displayName}
          className="w-full h-full object-cover rounded-full"
        />
      );
    }
    return (
      <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
        <UserIcon size={48} />
      </div>
    );
  };

  const getAccountButtonClass = (
    isLinked: boolean,
    accountsLoading: boolean,
    disableUnlink: boolean
  ) => {
    if (accountsLoading || disableUnlink) {
      return 'bg-muted text-muted-foreground cursor-not-allowed';
    }
    if (isLinked) {
      return 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-400/12 dark:text-red-200 dark:hover:bg-red-400/18';
    }
    return 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-400/12 dark:text-indigo-200 dark:hover:bg-indigo-400/18';
  };

  const tabContentByKey = {
    info: (
      <ProfileInfoTab
        labels={labels}
        user={user}
        displayName={displayName}
        userIdDisplay={userIdDisplay}
      />
    ),
    security: (
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
        accountSectionTitle={accountSectionTitle}
        linkedProviders={linkedProviders}
        linkedCount={linkedCount}
        accountsLoading={accountsLoading}
        linkedLabel={linkedLabel}
        notLinkedLabel={notLinkedLabel}
        unlinkLabel={unlinkLabel}
        linkLabel={linkLabel}
        signIn={signIn}
        unlinkAuthProviderMutation={unlinkAuthProviderMutation}
        getAccountButtonClass={getAccountButtonClass}
        success={success}
        error={error}
        toErrorMessage={toErrorMessage}
      />
    ),
    stats: (
      <ProfileStatsTab
        labels={labels}
        dayStreak={dayStreak}
        savedWordsCount={savedWordsCount}
        examsTaken={examsTaken}
        averageScore={averageScore}
        examHistory={examHistory}
      />
    ),
    settings: <ProfileSettingsTab labels={labels} />,
  } as const;

  return (
    <div className="max-w-[1000px] mx-auto pb-20">
      {/* Back Button */}
      <div className="mb-6">
        <BackButton onClick={() => navigate('/dashboard')} />
      </div>

      {/* Header Profile Card */}
      <ProfileHeader
        user={user}
        labels={labels}
        displayName={displayName}
        isEditingName={isEditingName}
        setIsEditingName={setIsEditingName}
        newName={newName}
        setNewName={setNewName}
        handleNameUpdate={handleNameUpdate}
        renderAvatar={renderAvatar}
        fileInputRef={fileInputRef}
        handleAvatarUpload={handleAvatarUpload}
        syncProfileFromIdentityMutation={syncProfileFromIdentityMutation}
        examsTaken={examsTaken}
        joinedDateLabel={joinedDateLabel}
        isProfileIncomplete={isProfileIncomplete}
        success={success}
        error={error}
        navigate={navigate}
      />

      {/* Tabs Navigation */}
      <div className="flex justify-center md:justify-start gap-4 mb-8 overflow-x-auto pb-2">
        <ProfileTabButton
          id="info"
          icon={UserIcon}
          label={labels.personalInfo}
          active={activeTab === 'info'}
          onSelect={setActiveTab}
        />
        <ProfileTabButton
          id="stats"
          icon={BarChart3}
          label={labels.learningStats}
          active={activeTab === 'stats'}
          onSelect={setActiveTab}
        />
        <ProfileTabButton
          id="security"
          icon={Lock}
          label={labels.securitySettings}
          active={activeTab === 'security'}
          onSelect={setActiveTab}
        />
        <ProfileTabButton
          id="settings"
          icon={Settings}
          label={settingsTabLabel}
          active={activeTab === 'settings'}
          onSelect={setActiveTab}
        />
      </div>

      {/* Content Area */}
      <div className="bg-card rounded-3xl p-8 border border-border shadow-sm min-h-[400px]">
        {tabContentByKey[activeTab]}
      </div>
    </div>
  );
};

export default Profile;
