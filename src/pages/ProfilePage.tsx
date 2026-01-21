import React, { useState, useRef } from 'react';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { LocalizedLink } from '../components/LocalizedLink';
import { useMutation, useAction, useQuery } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { ExamAttempt, Language, User } from '../types';
import { getLabels } from '../utils/i18n';
import { useApp } from '../contexts/AppContext';
import { aRef, mRef, NoArgs, qRef } from '../utils/convexRefs';
import { toErrorMessage } from '../utils/errors';

import toast, { Toaster } from 'react-hot-toast';
import { Loading } from '../components/common/Loading';
import {
  User as UserIcon,
  Camera,
  Lock,
  BarChart3,
  Calendar,
  Trophy,
  CheckCircle,
  XCircle,
  Crown,
  Mail,
  Settings,
} from 'lucide-react';
import BackButton from '../components/ui/BackButton';
import { LanguageSwitcher } from '../components/common/LanguageSwitcher';
import { ProfileTabButton } from './profile/components/ProfileTabButton';
import { ProfileInfoTab } from './profile/tabs/ProfileInfoTab';
import { ProfileStatsTab } from './profile/tabs/ProfileStatsTab';
import { useExamStats } from './profile/hooks/useExamStats';

interface ProfileProps {
  language: Language;
}

const Profile: React.FC<ProfileProps> = ({ language }) => {
  const { user, updateUser } = useApp();
  const navigate = useLocalizedNavigate();
  const labels = getLabels(language);
  const success = toast.success;
  const error = toast.error;
  const { signIn } = useAuthActions();

  const savedWordsCount = useQuery(
    qRef<Record<string, never>, { count: number }>('user:getSavedWordsCount'),
    user ? {} : 'skip'
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
  const updateProfileMutation = useMutation(
    mRef<{ name?: string; avatar?: string }, void>('auth:updateProfile')
  );
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
      { filename: string; contentType: string; folder?: string },
      { uploadUrl: string; publicUrl: string; key: string; headers: Record<string, string> }
    >('storage:getUploadUrl')
  );
  const linkedAccounts = useQuery(
    qRef<NoArgs, { provider: string }[]>('auth:linkedAuthAccounts'),
    user ? {} : 'skip'
  );

  if (!user) return <Loading fullScreen size="lg" />;

  const displayName =
    user.name || user.email?.split('@')[0] || (language === 'zh' ? '未命名用户' : 'Unnamed');
  const userMeta = user as User & {
    _id?: string;
    _creationTime?: number;
    createdAt?: number;
    joinDate?: number;
  };
  const rawUserId = userMeta.id || userMeta._id || '';
  const userIdDisplay = rawUserId ? rawUserId.slice(0, 8) : '—';
  const joinedTimestamp = userMeta.createdAt || userMeta.joinDate || userMeta._creationTime || 0;
  const joinedDateLabel = joinedTimestamp ? new Date(joinedTimestamp).toLocaleDateString() : '—';
  const linkedProviders = new Set(linkedAccounts?.map(account => account.provider) ?? []);
  const linkedCount = linkedAccounts?.length ?? 0;
  const accountsLoading = linkedAccounts === undefined;
  const linkLabel = language === 'zh' ? '绑定' : 'Connect';
  const unlinkLabel = language === 'zh' ? '解绑' : 'Unlink';
  const linkedLabel = language === 'zh' ? '已连接' : 'Linked';
  const notLinkedLabel = language === 'zh' ? '未连接' : 'Not linked';
  const accountSectionTitle = language === 'zh' ? '社交账号绑定' : 'Social Accounts';
  const isProfileIncomplete = !user.name?.trim() || !user.avatar;

  const handleNameUpdate = async () => {
    if (!newName.trim() || newName === user.name) {
      setIsEditingName(false);
      return;
    }
    try {
      // await api.updateProfile({ name: newName });
      await updateProfileMutation({ name: newName });
      updateUser({ name: newName });
      success(labels.profileUpdated || (language === 'zh' ? '名字已更新' : 'Profile updated'));
      setIsEditingName(false);
    } catch (err) {
      console.error(err);
      error(
        labels.profile?.updateNameFailed ||
          (language === 'zh' ? '更新名字失败' : 'Failed to update name')
      );
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      error(
        labels.profile?.uploadImageError ||
          (language === 'zh' ? '请上传图片文件' : 'Please upload an image file')
      );
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      error(
        labels.profile?.imageTooLarge ||
          (language === 'zh' ? '图片大小不能超过 5MB' : 'Image size must be less than 5MB')
      );
      return;
    }
    setIsUploadingAvatar(true);
    try {
      // 1. Get Upload URL
      const { uploadUrl, publicUrl } = (await getUploadUrlAction({
        filename: file.name,
        contentType: file.type,
      })) as { uploadUrl: string; publicUrl: string };

      // 2. Upload to S3
      await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
          'x-amz-acl': 'public-read',
        },
        body: file,
      });

      // 3. Update Profile with new Avatar URL (Fixes persistence bug)
      await updateProfileMutation({ avatar: publicUrl });

      // 4. Update local state
      updateUser({ avatar: publicUrl });
      success(labels.avatarUpdated || (language === 'zh' ? '头像已更新' : 'Avatar updated'));
    } catch (err) {
      console.error('Avatar upload failed:', err);
      error(
        labels.profile?.uploadAvatarFailed ||
          (language === 'zh' ? '上传头像失败' : 'Failed to upload avatar')
      );
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
      // await api.changePassword({ currentPassword, newPassword });
      await changePasswordMutation({
        currentPassword,
        newPassword,
      });
      success(labels.passwordUpdated || (language === 'zh' ? '密码已更新' : 'Password updated'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
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
        error(labels.wrongPassword || (language === 'zh' ? '密码不正确' : 'Incorrect password'));
      } else {
        error(
          labels.profile?.changePasswordFailed ||
            (language === 'zh' ? '修改密码失败' : 'Failed to change password')
        );
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="max-w-[1000px] mx-auto pb-20">
      <Toaster position="bottom-center" />

      {/* Back Button */}
      <div className="mb-6">
        <BackButton onClick={() => navigate('/dashboard')} />
      </div>

      {/* Header Profile Card */}
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm mb-8 flex flex-col md:flex-row items-center gap-8">
        <div className="relative group">
          <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-br from-indigo-500 to-purple-600">
            <div className="w-full h-full rounded-full bg-white p-1 overflow-hidden relative">
              {isUploadingAvatar ? (
                <Loading size="md" />
              ) : user.avatar ? (
                <img
                  src={user.avatar}
                  alt={displayName}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <UserIcon size={48} />
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 bg-slate-900 text-white p-2.5 rounded-full shadow-lg hover:scale-110 transition-transform cursor-pointer"
          >
            <Camera size={16} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            className="hidden"
          />
        </div>

        <div className="text-center md:text-left flex-1">
          <div className="flex flex-col md:flex-row items-center gap-3 mb-2">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleNameUpdate()}
                  className="border-b-2 border-indigo-500 text-2xl font-bold text-slate-900 outline-none bg-transparent w-40"
                  autoFocus
                />
                <button onClick={handleNameUpdate}>
                  <CheckCircle size={20} className="text-green-500" />
                </button>
                <button onClick={() => setIsEditingName(false)}>
                  <XCircle size={20} className="text-red-500" />
                </button>
              </div>
            ) : (
              <h1 className="text-3xl font-extrabold text-slate-900">{displayName}</h1>
            )}
            {!isEditingName && (
              <button
                onClick={() => setIsEditingName(true)}
                className="text-slate-400 hover:text-indigo-600 transition-colors"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            )}
            {user.tier === 'PAID' && (
              <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full flex items-center gap-1">
                <Crown size={12} className="fill-current" />{' '}
                {labels.profile?.premiumBadge || 'Premium'}
              </span>
            )}
          </div>
          <p className="text-slate-500 font-medium">{user.email}</p>
          {isProfileIncomplete && (
            <div className="mt-3 flex flex-wrap gap-2 justify-center md:justify-start">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const result = await syncProfileFromIdentityMutation();
                    if (result.updated) {
                      success(language === 'zh' ? '已导入社交账号资料' : 'Imported social profile');
                    } else {
                      error(
                        language === 'zh'
                          ? '未能导入资料，请手动设置'
                          : 'Could not import profile, please set manually'
                      );
                    }
                  } catch {
                    error(language === 'zh' ? '导入失败' : 'Import failed');
                  }
                }}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition"
              >
                {language === 'zh' ? '导入社交账号资料' : 'Import social profile'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/profile')}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
              >
                {language === 'zh' ? '自己创建' : 'Create manually'}
              </button>
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-4 justify-center md:justify-start">
            <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
              <Calendar size={14} className="text-indigo-500" />
              {labels.profile?.joined || 'Joined'} {joinedDateLabel}
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
              <Trophy size={14} className="text-orange-500" />
              {examsTaken} {labels.profile?.examsCompleted || 'exams completed'}
            </div>
          </div>
        </div>
      </div>

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
          label={labels.generalSettings || 'General'}
          active={activeTab === 'settings'}
          onSelect={setActiveTab}
        />
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm min-h-[400px]">
        {activeTab === 'info' && (
          <ProfileInfoTab
            labels={labels}
            user={user}
            displayName={displayName}
            userIdDisplay={userIdDisplay}
          />
        )}

        {activeTab === 'security' && (
          <div className="max-w-xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-4 mb-6">
              {labels.changePassword}
            </h3>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  {labels.currentPassword}
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  {labels.newPassword}
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  {labels.confirmPassword}
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  required
                />
              </div>
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={
                    !currentPassword || !newPassword || !confirmPassword || isChangingPassword
                  }
                  className={`w-full py-3 px-4 rounded-xl font-bold text-white shadow-lg transition-all ${
                    !currentPassword || !newPassword || !confirmPassword || isChangingPassword
                      ? 'bg-slate-300 cursor-not-allowed'
                      : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:scale-[1.02] active:scale-[0.98]'
                  }`}
                >
                  {isChangingPassword ? (
                    <Loading size="sm" />
                  ) : (
                    labels.profile?.updatePassword || 'Update Password'
                  )}
                </button>
              </div>
            </form>

            {/* Forgot Password Section */}
            <div className="border-t border-slate-100 pt-6 mt-6">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <Mail size={20} className="text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-800 mb-1">
                      {labels.forgotPassword || 'Forgot your password?'}
                    </h4>
                    <p className="text-sm text-slate-500 mb-3">
                      {labels.forgotPasswordProfileDescription ||
                        "If you've forgotten your current password, you can reset it via email verification."}
                    </p>
                    <LocalizedLink
                      to="/forgot-password"
                      className="inline-flex items-center gap-2 text-indigo-600 font-semibold text-sm hover:text-indigo-700 transition-colors"
                    >
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
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6 mt-6">
              <h4 className="font-bold text-slate-800 mb-3">{accountSectionTitle}</h4>
              <div className="space-y-3">
                {[
                  { id: 'google', label: labels.auth?.social?.google || 'Google' },
                  { id: 'kakao', label: labels.auth?.social?.kakao || 'Kakao' },
                ].map(provider => {
                  const isLinked = linkedProviders.has(provider.id);
                  const disableUnlink = isLinked && linkedCount <= 1;
                  return (
                    <div
                      key={provider.id}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-800">{provider.label}</span>
                        <span
                          className={`text-xs font-bold px-2 py-1 rounded-full ${
                            isLinked
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {isLinked ? linkedLabel : notLinkedLabel}
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={accountsLoading || disableUnlink}
                        onClick={async () => {
                          if (!isLinked) {
                            try {
                              await signIn(provider.id, { redirectTo: window.location.href });
                            } catch {
                              error(
                                language === 'zh'
                                  ? '绑定失败'
                                  : `Failed to connect ${provider.label}`
                              );
                            }
                            return;
                          }

                          try {
                            await unlinkAuthProviderMutation({ provider: provider.id });
                            success(language === 'zh' ? '解绑成功' : 'Account unlinked');
                          } catch (err: unknown) {
                            const message = toErrorMessage(err);
                            if (message.includes('LAST_AUTH_METHOD')) {
                              error(
                                language === 'zh' ? '至少保留一种登录方式' : 'Keep one login method'
                              );
                              return;
                            }
                            error(language === 'zh' ? '解绑失败' : 'Failed to unlink account');
                          }
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
                          accountsLoading || disableUnlink
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : isLinked
                              ? 'bg-red-50 text-red-600 hover:bg-red-100'
                              : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                        }`}
                      >
                        {isLinked ? unlinkLabel : linkLabel}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <ProfileStatsTab
            labels={labels}
            dayStreak={user.statistics?.dayStreak || 0}
            savedWordsCount={savedWordsCount?.count || 0}
            examsTaken={examsTaken}
            averageScore={averageScore}
            examHistory={examHistory}
          />
        )}

        {activeTab === 'settings' && (
          <div className="max-w-xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-4 mb-6">
              {labels.profile?.settingsTitle || 'General Settings'}
            </h3>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  {labels.profile?.displayLanguage || 'Display Language'}
                </label>
                <div className="p-1">
                  {/* Using LanguageSelector but styled slightly differently via props if needed, or just container */}
                  <div className="max-w-xs">
                    <LanguageSwitcher />
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    {labels.profile?.languageDesc ||
                      'Choose the language for the interface and learning materials.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
