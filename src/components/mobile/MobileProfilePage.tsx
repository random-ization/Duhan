import React, { useState, useRef } from 'react';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import {
  ArrowLeft,
  User as UserIcon,
  BarChart3,
  Lock,
  Settings,
  Camera,
  LogOut,
} from 'lucide-react';
import { useAuthActions } from '@convex-dev/auth/react';
import { useApp } from '../../contexts/AppContext';
import { ProfileInfoTab } from '../../pages/profile/tabs/ProfileInfoTab';
import { ProfileStatsTab } from '../../pages/profile/tabs/ProfileStatsTab';
import { ProfileSecurityTab } from '../../pages/profile/tabs/ProfileSecurityTab';
import { ProfileSettingsTab } from '../../pages/profile/tabs/ProfileSettingsTab';
import toast, { Toaster } from 'react-hot-toast';
import { useMutation, useAction, useQuery } from 'convex/react';
import { aRef, mRef, NoArgs, qRef } from '../../utils/convexRefs';
import { useExamStats } from '../../pages/profile/hooks/useExamStats';
import { ExamAttempt } from '../../types';
import { toErrorMessage } from '../../utils/errors';
import { Loading } from '../common/Loading';
import { useTranslation } from 'react-i18next';
import { getLabels } from '../../utils/i18n';

export const MobileProfilePage: React.FC = () => {
  const { user, updateUser, language } = useApp();
  const navigate = useLocalizedNavigate();
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
  const examHistory = examAttempts ?? [];
  const { examsTaken, averageScore } = useExamStats(examHistory);

  const linkedAccounts = useQuery(
    qRef<NoArgs, { provider: string }[]>('auth:linkedAuthAccounts'),
    user ? {} : 'skip'
  );

  // -- MUTATIONS --
  const updateProfileMutation = useMutation(mRef('auth:updateProfile'));
  const changePasswordMutation = useMutation(mRef('auth:changePassword'));
  const unlinkAuthProviderMutation = useMutation(mRef('auth:unlinkAuthProvider'));
  const getUploadUrlAction = useAction(aRef('storage:getUploadUrl'));

  // -- HANDLERS --
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      const { uploadUrl, publicUrl } = (await getUploadUrlAction({
        filename: file.name,
        contentType: file.type,
      })) as any;

      await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type, 'x-amz-acl': 'public-read' },
        body: file,
      });

      await updateProfileMutation({ avatar: publicUrl });
      updateUser({ avatar: publicUrl });
      toast.success(t('avatarUpdated') || 'Avatar updated');
    } catch (err) {
      console.error(err);
      toast.error(t('error') || 'Failed');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Password Logic
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error(t('passwordMismatch') || 'Passwords do not match');
      return;
    }
    setIsChangingPassword(true);
    try {
      await changePasswordMutation({ currentPassword, newPassword });
      toast.success(t('passwordUpdated') || 'Password updated');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      toast.error(t('wrongPassword') || 'Failed to update password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (!user) return <Loading fullScreen />;

  const displayName = user.name || 'User';
  const userIdDisplay = (user as any)._id?.slice(0, 8) || '—';

  // Helper for accounts
  const linkedProviders = new Set(linkedAccounts?.map(a => a.provider) ?? []);
  const getAccountButtonClass = (isLinked: boolean, _loading: boolean, _disable: boolean) =>
    isLinked ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600';

  return (
    <div className="min-h-[100dvh] bg-slate-50 pb-20">
      <Toaster position="bottom-center" />

      {/* Header */}
      <div className="bg-white p-6 pb-8 rounded-b-[2.5rem] shadow-sm z-10 relative">
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 -ml-2 bg-slate-50 rounded-full"
          >
            <ArrowLeft className="w-6 h-6 text-slate-900" />
          </button>
          <button onClick={() => signOut()} className="p-2 -mr-2 text-slate-400">
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col items-center">
          <div className="relative mb-4">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg bg-slate-100 relative">
              {(() => {
                if (isUploadingAvatar) return <Loading size="sm" />;
                if (user.avatar)
                  return (
                    <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                  );
                return (
                  <UserIcon className="w-10 h-10 text-slate-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                );
              })()}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-2 bg-indigo-600 rounded-full text-white shadow-md active:scale-95 transition-transform"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-1">{displayName}</h1>
          <p className="text-sm font-bold text-slate-400 font-mono">ID: {userIdDisplay}</p>
        </div>
      </div>

      {/* Tab Nav */}
      <div className="px-4 -mt-6 relative z-20">
        <div className="bg-white/90 backdrop-blur-md p-1.5 rounded-2xl shadow-lg border border-slate-100 flex justify-between">
          {[
            { id: 'info', icon: UserIcon },
            { id: 'stats', icon: BarChart3 },
            { id: 'security', icon: Lock },
            { id: 'settings', icon: Settings },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex-1 flex items-center justify-center py-3 rounded-xl transition-all ${
                activeTab === item.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:bg-slate-50'
              }`}
            >
              <item.icon className="w-5 h-5" />
            </button>
          ))}
        </div>
      </div>

      {/* Content Body */}
      <div className="p-4 pt-6">
        {activeTab === 'info' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <ProfileInfoTab
              labels={labels}
              user={user}
              displayName={displayName}
              userIdDisplay={userIdDisplay}
            />
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <ProfileStatsTab
              labels={labels}
              dayStreak={user.statistics?.dayStreak || 0}
              savedWordsCount={vocabBookCount?.count || 0}
              examsTaken={examsTaken}
              averageScore={averageScore}
              examHistory={examHistory}
            />
          </div>
        )}

        {activeTab === 'security' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
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
              accountSectionTitle="Social Accounts"
              linkedProviders={linkedProviders}
              linkedCount={linkedAccounts?.length || 0}
              accountsLoading={linkedAccounts === undefined}
              linkedLabel="Linked"
              notLinkedLabel="Not linked"
              unlinkLabel="Unlink"
              linkLabel="Connect"
              signIn={signIn}
              unlinkAuthProviderMutation={unlinkAuthProviderMutation}
              getAccountButtonClass={getAccountButtonClass}
              success={toast.success}
              error={toast.error}
              toErrorMessage={toErrorMessage}
            />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <ProfileSettingsTab labels={labels} />
          </div>
        )}
      </div>
    </div>
  );
};
