import React, { Suspense, lazy, useMemo, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import type { LearnerStatsDto } from '../../../convex/learningStats';
import { ArrowLeft, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthActions } from '@convex-dev/auth/react';
import { useAuth } from '../../contexts/AuthContext';
import { ProfileInfoTab } from '../../pages/profile/tabs/ProfileInfoTab';
import { type SettingsSection } from '../../pages/profile/tabs/ProfileSettingsTab';
import toast from 'react-hot-toast';
import { useMutation, useAction, useQuery } from 'convex/react';
import { aRef, mRef, NoArgs, qRef } from '../../utils/convexRefs';
import { useExamStats } from '../../pages/profile/hooks/useExamStats';
import { ExamAttempt } from '../../types';
import { toErrorMessage } from '../../utils/errors';
import { Loading, UserAvatar } from '../common';
import { useTranslation } from 'react-i18next';
import { getLabels } from '../../utils/i18n';
import { Input } from '../ui';
import { isIncorrectPasswordError, validatePasswordChange } from '../../utils/profilePassword';
import {
  resetFileInputSelection,
  uploadAvatarImage,
  validateAvatarFile,
} from '../../utils/storageUpload';
import { appendReturnToPath, hasSafeReturnTo, resolveSafeReturnTo } from '../../utils/navigation';
import { getPathWithoutLang } from '../../utils/pathname';
import { KT, Chip, Card, HanjaSeal, SectionHead, PageShell } from './ksoft/ksoft';

type LegacyTab = 'info' | 'stats' | 'security' | 'settings';

const LazyProfileStatsTab = lazy(() =>
  import('../../pages/profile/tabs/ProfileStatsTab').then(module => ({
    default: module.ProfileStatsTab,
  }))
);

const LazyProfileSecurityTab = lazy(() =>
  import('../../pages/profile/tabs/ProfileSecurityTab').then(module => ({
    default: module.ProfileSecurityTab,
  }))
);

const LazyProfileSettingsTab = lazy(() =>
  import('../../pages/profile/tabs/ProfileSettingsTab').then(module => ({
    default: module.ProfileSettingsTab,
  }))
);

const LegacyTabFallback: React.FC = () => (
  <Card pad={24}>
    <div className="py-10 text-center text-sm font-semibold text-k-sub">Loading...</div>
  </Card>
);

const settingsSectionFromParam = (raw: string | null): SettingsSection => {
  if (raw === 'notifications' || raw === 'language') return raw;
  return 'all';
};

const tabFromParam = (raw: string | null): LegacyTab | null => {
  if (raw === 'info' || raw === 'stats' || raw === 'security' || raw === 'settings') return raw;
  return null;
};

export const MobileProfilePage: React.FC = () => {
  const { user, updateUser, logout, language, viewerAccess } = useAuth();
  const navigate = useLocalizedNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { signIn } = useAuthActions();
  const { t } = useTranslation();
  const labels = getLabels(language);

  const pathWithoutLang = getPathWithoutLang(location.pathname);
  const profileRouteSegments = pathWithoutLang
    .replace(/^\/profile\/?/, '')
    .split('/')
    .filter(Boolean);
  const legacyTabFromRoute = tabFromParam(profileRouteSegments[0] ?? null);
  const settingsSectionFromRoute =
    legacyTabFromRoute === 'settings'
      ? settingsSectionFromParam(profileRouteSegments[1] ?? null)
      : 'all';
  const legacyTabFromQuery = tabFromParam(searchParams.get('tab'));
  const settingsSectionFromQuery = settingsSectionFromParam(searchParams.get('section'));
  const legacyTab = legacyTabFromRoute ?? legacyTabFromQuery;
  const settingsSection =
    legacyTabFromRoute === 'settings'
      ? settingsSectionFromRoute
      : legacyTab === 'settings'
        ? settingsSectionFromQuery
        : 'all';
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const changePasswordMutation = useMutation(mRef('auth:changePassword'));
  const unlinkAuthProviderMutation = useMutation(mRef('auth:unlinkAuthProvider'));
  const getUploadUrlAction = useAction(
    aRef<
      { filename: string; contentType: string; fileSize: number; folder?: string },
      { uploadUrl: string; publicUrl: string; key: string; headers: Record<string, string> }
    >('storage:getUploadUrl')
  );

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

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

  const copy = getMyCopy(language);

  const legacyMeta = useMemo(
    () =>
      legacyTab
        ? {
            info: {
              title: labels.profile?.accountHub?.detailsTitle || 'Profile details',
              subtitle:
                labels.profile?.accountHub?.detailsDescription ||
                'Update your identity, avatar, and the personal details tied to your learning.',
            },
            stats: {
              title: labels.profile?.learningHub?.snapshotTitle || 'Learning overview',
              subtitle:
                labels.profile?.learningHub?.snapshotDescription ||
                'Review streaks, exam momentum, and the progress signals that matter most.',
            },
            security: {
              title: labels.profile?.securityHub?.title || 'Security and linked accounts',
              subtitle:
                labels.profile?.securityHub?.subtitle ||
                'Manage password changes and the sign-in providers connected to this account.',
            },
            settings: {
              title:
                settingsSection === 'notifications'
                  ? copy.notificationsTitle
                  : settingsSection === 'language'
                    ? copy.languageTitle
                    : labels.profile?.settingsCenter?.title || 'Preferences',
              subtitle:
                settingsSection === 'notifications'
                  ? copy.notificationsSub
                  : settingsSection === 'language'
                    ? copy.languageSub
                    : labels.profile?.settingsCenter?.subtitle ||
                      'Tune notifications, language, and product defaults to fit your routine.',
            },
          }[legacyTab]
        : null,
    [
      copy.languageSub,
      copy.languageTitle,
      copy.notificationsSub,
      copy.notificationsTitle,
      labels,
      legacyTab,
      settingsSection,
    ]
  );

  if (!user) return <Loading fullScreen />;

  const displayName = user.name || t('profile.unnamed', { defaultValue: 'User' });
  const dayStreak = userStats?.streak ?? 0;
  const savedWordsCount = userStats?.totalWordsLearned ?? vocabBookCount?.count ?? 0;
  const grammarMastered = userStats?.grammarStats.mastered ?? 0;
  const totalMinutes = userStats?.totalMinutes ?? 0;
  const totalHours = Math.round(totalMinutes / 60);
  const isPremium = Boolean(viewerAccess?.isPremium);

  const buildProfilePath = (tab?: LegacyTab, section?: Exclude<SettingsSection, 'all'>) => {
    const next = new URLSearchParams(searchParams);
    next.delete('tab');
    next.delete('section');
    let nextPath = '/profile';
    if (tab) {
      nextPath += `/${tab}`;
      if (tab === 'settings' && section) {
        nextPath += `/${section}`;
      }
    }
    const query = next.toString();
    return query ? `${nextPath}?${query}` : nextPath;
  };

  const closeLegacy = () => {
    navigate(buildProfilePath());
  };

  const openLegacyTab = (tab: LegacyTab) => {
    navigate(buildProfilePath(tab));
  };

  const openSettingsSection = (section: Exclude<SettingsSection, 'all'>) => {
    navigate(buildProfilePath('settings', section));
  };

  const scrollToSection = (sectionId: string) => {
    if (typeof globalThis.window === 'undefined' || typeof globalThis.document === 'undefined') {
      return;
    }
    globalThis.window.requestAnimationFrame(() => {
      globalThis.window.requestAnimationFrame(() => {
        globalThis.document.getElementById(sectionId)?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      });
    });
  };

  const stats = [
    {
      n: `${savedWordsCount}`,
      l: copy.statsWords,
      k: '詞',
    },
    {
      n: `${grammarMastered}`,
      l: copy.statsGrammar,
      k: '法',
    },
    {
      n: totalHours > 0 ? `${totalHours}h` : `${totalMinutes}m`,
      l: copy.statsTime,
      k: '時',
    },
  ];

  const linkedMethodCount = linkedAccounts?.length ?? 0;
  const accountItems = [
    {
      k: '人',
      l: copy.profileDetailsTitle,
      s: copy.profileDetailsSub(displayName, user.email),
      tone: 'mintDeep',
      onClick: () => openLegacyTab('info'),
    },
    {
      k: '學',
      l:
        labels.profile?.learningHub?.tabLabel ||
        labels.profile?.learningHub?.title ||
        'Learning overview',
      s:
        labels.profile?.learningHub?.subtitle ||
        `${copy.streakChip(dayStreak)} · ${examsTaken} ${labels.examsTaken || 'exams'}`,
      tone: 'butterDeep',
      onClick: () => openLegacyTab('stats'),
    },
    {
      k: '鑰',
      l: copy.securityTitle,
      s: copy.securitySub(linkedMethodCount),
      tone: 'crimson',
      onClick: () => openLegacyTab('security'),
    },
  ];

  const libraryItems = [
    {
      k: '詞',
      l: copy.vocabTitle,
      s: copy.vocabSub(savedWordsCount, userStats?.vocabStats.dueReviews ?? 0),
      tone: 'pinkDeep',
      onClick: () =>
        navigate(appendReturnToPath('/vocab-book', `${location.pathname}${location.search}`)),
    },
    {
      k: '誤',
      l: copy.wrongTitle,
      s: copy.wrongSub(userStats?.reviewStats.dueNow ?? 0),
      tone: 'crimson',
      onClick: () => navigate('/review'),
    },
    {
      k: '記',
      l: copy.notesTitle,
      s: copy.notesSub,
      tone: 'butterDeep',
      onClick: () =>
        navigate(appendReturnToPath('/notebook', `${location.pathname}${location.search}`)),
    },
    {
      k: '旗',
      l: copy.achievementsTitle,
      s: copy.achievementsSub(examsTaken),
      tone: 'mintDeep',
      onClick: () => navigate('/achievements'),
    },
  ];

  const settingsItems = [
    {
      l: copy.subInfoTitle,
      s: isPremium ? copy.subPremium : copy.subFree,
      onClick: () => navigate('/pricing'),
    },
    {
      l: copy.notificationsTitle,
      s: copy.notificationsSub,
      onClick: () => openSettingsSection('notifications'),
    },
    {
      l: copy.languageTitle,
      s: copy.languageSub,
      onClick: () => openSettingsSection('language'),
    },
    {
      l: copy.supportTitle,
      s: copy.supportSub,
      onClick: () => scrollToSection('mobile-profile-contact'),
    },
    {
      l: copy.signOutTitle,
      s: copy.signOutSub,
      onClick: () => {
        void logout();
      },
    },
  ];

  const contactItems = [
    {
      l: t('footer.contactSupport', { defaultValue: 'Contact support' }),
      s: 'support@koreanstudy.me',
      onClick: () => {
        if (typeof globalThis.window !== 'undefined') {
          globalThis.window.location.href = 'mailto:support@koreanstudy.me';
        }
      },
    },
    {
      l: t('privacyPolicy', { defaultValue: 'Privacy Policy' }),
      s: t('profile.mobile.legalPrivacyHint', { defaultValue: 'View data and privacy details' }),
      onClick: () => navigate('/privacy'),
    },
    {
      l: t('termsOfService', { defaultValue: 'Terms of Service' }),
      s: t('profile.mobile.legalTermsHint', { defaultValue: 'View platform terms and rules' }),
      onClick: () => navigate('/terms'),
    },
    {
      l: t('refundPolicy', { defaultValue: 'Refund Policy' }),
      s: t('profile.mobile.legalRefundHint', { defaultValue: 'View subscription refund details' }),
      onClick: () => navigate('/refund'),
    },
    {
      l: t('footer.joinDiscord', { defaultValue: 'Join our Discord' }),
      s: t('profile.mobile.discordHint', { defaultValue: 'Join the community and share feedback' }),
      onClick: () => {
        if (typeof globalThis.window !== 'undefined') {
          globalThis.window.open('https://discord.gg/XBURUx5eav', '_blank', 'noopener,noreferrer');
        }
      },
    },
  ];

  const returnTo = searchParams.get('returnTo');
  const shouldShowBack = hasSafeReturnTo(returnTo);
  const handleBack = () => {
    navigate(resolveSafeReturnTo(returnTo, '/dashboard'));
  };

  const getAccountButtonClass = (isLinked: boolean) =>
    isLinked
      ? 'bg-red-50 text-red-600 dark:bg-red-400/12 dark:text-red-200'
      : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-400/12 dark:text-indigo-200';

  if (legacyTab && legacyMeta) {
    const userIdDisplay = (user as unknown as { _id?: string })._id?.slice(0, 8) || '—';
    const linkedProviders = new Set(linkedAccounts?.map(a => a.provider) ?? []);

    return (
      <PageShell>
        <div
          style={{
            padding: '14px 18px 10px',
            paddingTop: 'calc(env(safe-area-inset-top) + 14px)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={closeLegacy}
            style={{
              width: 40,
              height: 40,
              borderRadius: 14,
              border: `1px solid ${KT.line}`,
              background: KT.card,
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              color: KT.ink,
              flexShrink: 0,
            }}
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: KT.ink,
                letterSpacing: -0.4,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {legacyMeta.title}
            </div>
            <div
              style={{
                fontSize: 12,
                color: KT.sub,
                marginTop: 2,
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {legacyMeta.subtitle}
            </div>
          </div>
        </div>

        <main className="px-5 pb-mobile-nav">
          <AnimatePresence mode="wait">
            <motion.div
              key={legacyTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              style={
                legacyTab === 'settings'
                  ? {
                      minHeight: 'calc(100dvh - 128px)',
                    }
                  : {
                      background: KT.card,
                      padding: 24,
                      borderRadius: 28,
                      boxShadow: KT.sh,
                    }
              }
            >
              {legacyTab === 'info' && (
                <ProfileInfoTab
                  labels={labels}
                  user={user}
                  displayName={displayName}
                  userIdDisplay={userIdDisplay}
                  isPremium={isPremium}
                  onNameUpdate={handleDisplayNameUpdate}
                />
              )}
              {legacyTab === 'stats' && (
                <Suspense fallback={<LegacyTabFallback />}>
                  <LazyProfileStatsTab
                    labels={labels}
                    dayStreak={dayStreak}
                    savedWordsCount={savedWordsCount}
                    examsTaken={examsTaken}
                    averageScore={averageScore}
                    examHistory={examHistory}
                  />
                </Suspense>
              )}
              {legacyTab === 'security' && (
                <Suspense fallback={<LegacyTabFallback />}>
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
                </Suspense>
              )}
              {legacyTab === 'settings' && (
                <Suspense fallback={<LegacyTabFallback />}>
                  <LazyProfileSettingsTab labels={labels} section={settingsSection} />
                </Suspense>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {/* Warm gradient header */}
      <div
        style={{
          padding: '18px 22px 24px',
          paddingTop: 'calc(env(safe-area-inset-top) + 18px)',
          background: `linear-gradient(180deg, ${KT.mint}40 0%, ${KT.bg} 100%)`,
        }}
      >
        {shouldShowBack && (
          <button
            type="button"
            onClick={handleBack}
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              border: `1px solid ${KT.line}`,
              background: KT.card,
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              color: KT.ink,
              marginBottom: 12,
              boxShadow: KT.shSm,
            }}
            aria-label="Back"
          >
            <ArrowLeft size={16} />
          </button>
        )}
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <UserAvatar
              user={user}
              isUploading={isUploadingAvatar}
              className="w-[68px] h-[68px] rounded-[20px] shadow-k-sh"
              fallbackClassName="text-[28px]"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                position: 'absolute',
                right: -4,
                bottom: -4,
                width: 28,
                height: 28,
                borderRadius: 10,
                background: KT.ink,
                color: KT.bg,
                border: `2px solid ${KT.bg}`,
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
              }}
              aria-label="Change avatar"
            >
              <Camera size={13} />
            </button>
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: KT.ink,
                letterSpacing: -0.5,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {displayName}
            </div>
            <div style={{ fontSize: 12, color: KT.sub, marginTop: 2 }}>
              {copy.levelLabel} · Lv.{Math.max(1, Math.floor(savedWordsCount / 100))}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              {isPremium && <Chip tone="crimson">{copy.premium}</Chip>}
              <Chip tone="muted">{copy.streakChip(dayStreak)}</Chip>
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 8,
            marginTop: 20,
          }}
        >
          {stats.map((s, i) => (
            <div
              key={i}
              style={{
                background: KT.card,
                padding: 12,
                borderRadius: 16,
                boxShadow: KT.shSm,
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontFamily: KT.serif,
                  fontSize: 11,
                  color: KT.crimson,
                  marginBottom: 2,
                  fontWeight: 500,
                }}
              >
                {s.k}
              </div>
              <div
                style={{
                  fontSize: 19,
                  fontWeight: 800,
                  color: KT.ink,
                  letterSpacing: -0.4,
                }}
              >
                {s.n}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: KT.sub,
                  fontWeight: 600,
                  marginTop: 2,
                }}
              >
                {s.l}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '18px 18px 28px' }}>
        <SectionHead kanji="帳" title={copy.accountTitle} />
        <Card pad={0}>
          {accountItems.map((m, i) => {
            const bg = (KT[m.tone as keyof typeof KT] as string) || KT.ink;
            return (
              <button
                key={m.l}
                type="button"
                onClick={m.onClick}
                style={{
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  borderBottom: i < accountItems.length - 1 ? `1px solid ${KT.line}` : 'none',
                  background: 'transparent',
                  border: 'none',
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  width: '100%',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: KT.font,
                }}
              >
                <HanjaSeal c={m.k} size={36} bg={bg} round={9} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 800,
                      color: KT.ink,
                      letterSpacing: -0.2,
                    }}
                  >
                    {m.l}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: KT.sub,
                      marginTop: 2,
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {m.s}
                  </div>
                </div>
                <div style={{ color: KT.subLight, fontSize: 18 }}>›</div>
              </button>
            );
          })}
        </Card>
      </div>

      <div style={{ padding: '18px 18px 28px' }}>
        <SectionHead kanji="庫" title={copy.libraryTitle} />
        <Card pad={0}>
          {libraryItems.map((m, i) => {
            const bg = (KT[m.tone as keyof typeof KT] as string) || KT.ink;
            return (
              <button
                key={i}
                type="button"
                onClick={m.onClick}
                style={{
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  borderBottom: i < libraryItems.length - 1 ? `1px solid ${KT.line}` : 'none',
                  background: 'transparent',
                  border: 'none',
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  width: '100%',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: KT.font,
                }}
              >
                <HanjaSeal c={m.k} size={36} bg={bg} round={9} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 800,
                      color: KT.ink,
                      letterSpacing: -0.2,
                    }}
                  >
                    {m.l}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: KT.sub,
                      marginTop: 2,
                      fontWeight: 600,
                    }}
                  >
                    {m.s}
                  </div>
                </div>
                <div style={{ color: KT.subLight, fontSize: 18 }}>›</div>
              </button>
            );
          })}
        </Card>
      </div>

      <div style={{ padding: '0 18px 28px' }}>
        <SectionHead kanji="設" title={copy.settingsTitle} />
        <Card pad={0}>
          {settingsItems.map((m, i) => (
            <button
              key={i}
              type="button"
              onClick={m.onClick}
              style={{
                padding: '14px 18px',
                borderBottom: i < settingsItems.length - 1 ? `1px solid ${KT.line}` : 'none',
                background: 'transparent',
                border: 'none',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                width: '100%',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: KT.font,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: KT.ink }}>{m.l}</div>
                {m.s && (
                  <div
                    style={{
                      fontSize: 11,
                      color: KT.sub,
                      marginTop: 2,
                      fontWeight: 600,
                    }}
                  >
                    {m.s}
                  </div>
                )}
              </div>
              <div style={{ color: KT.subLight, fontSize: 18 }}>›</div>
            </button>
          ))}
        </Card>
      </div>

      <div id="mobile-profile-contact" style={{ padding: '0 18px 28px' }}>
        <SectionHead kanji="絡" title={copy.supportTitle} />
        <Card pad={0}>
          {contactItems.map((item, index) => (
            <button
              key={item.l}
              type="button"
              onClick={item.onClick}
              style={{
                padding: '14px 18px',
                borderBottom: index < contactItems.length - 1 ? `1px solid ${KT.line}` : 'none',
                background: 'transparent',
                border: 'none',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                width: '100%',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: KT.font,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: KT.ink }}>{item.l}</div>
                <div
                  style={{
                    fontSize: 11,
                    color: KT.sub,
                    marginTop: 2,
                    fontWeight: 600,
                  }}
                >
                  {item.s}
                </div>
              </div>
              <div style={{ color: KT.subLight, fontSize: 18 }}>›</div>
            </button>
          ))}
        </Card>
      </div>
    </PageShell>
  );
};

type MyCopy = {
  levelLabel: string;
  premium: string;
  streakChip: (n: number) => string;
  statsWords: string;
  statsGrammar: string;
  statsTime: string;
  accountTitle: string;
  profileDetailsTitle: string;
  profileDetailsSub: (name: string, email: string) => string;
  securityTitle: string;
  securitySub: (linkedCount: number) => string;
  libraryTitle: string;
  vocabTitle: string;
  vocabSub: (total: number, due: number) => string;
  wrongTitle: string;
  wrongSub: (n: number) => string;
  notesTitle: string;
  notesSub: string;
  achievementsTitle: string;
  achievementsSub: (n: number) => string;
  settingsTitle: string;
  subInfoTitle: string;
  subPremium: string;
  subFree: string;
  notificationsTitle: string;
  notificationsSub: string;
  supportTitle: string;
  supportSub: string;
  languageTitle: string;
  languageSub: string;
  signOutTitle: string;
  signOutSub: string;
};

const getMyCopy = (language: string): MyCopy => {
  if (language.startsWith('zh')) {
    return {
      levelLabel: 'TOPIK 学习者',
      premium: '高级会员',
      streakChip: n => `${n} 天连续`,
      statsWords: '认识单词',
      statsGrammar: '掌握语法',
      statsTime: '学习时长',
      accountTitle: '账号管理',
      profileDetailsTitle: '资料与邮箱',
      profileDetailsSub: (name, email) => `${name} · ${email}`,
      securityTitle: '登录与安全',
      securitySub: linkedCount => `密码、Google、Kakao · 已绑定 ${linkedCount} 种方式`,
      libraryTitle: '我的资料',
      vocabTitle: '单词本',
      vocabSub: (total, due) => `${total} 个单词 · ${due} 待复习`,
      wrongTitle: '错题本',
      wrongSub: n => `${n} 题 · FSRS 复习`,
      notesTitle: '笔记本',
      notesSub: '收藏与笔记',
      achievementsTitle: '成就与徽章',
      achievementsSub: n => (n > 0 ? `${n} 次考试 · 查看徽章墙` : '查看你的徽章墙'),
      settingsTitle: '设置',
      subInfoTitle: '订阅管理',
      subPremium: '高级版 · 感谢支持',
      subFree: '免费版 · 升级获得更多',
      notificationsTitle: '提醒与通知',
      notificationsSub: '学习提醒和系统消息',
      supportTitle: '帮助与反馈',
      supportSub: '联系支持团队',
      languageTitle: '显示语言',
      languageSub: '切换界面和学习内容的显示语言。',
      signOutTitle: '退出登录',
      signOutSub: '结束当前账号会话',
    };
  }
  if (language.startsWith('vi')) {
    return {
      levelLabel: 'Học viên TOPIK',
      premium: 'Premium',
      streakChip: n => `${n} ngày liên tiếp`,
      statsWords: 'Từ đã học',
      statsGrammar: 'Ngữ pháp',
      statsTime: 'Thời gian',
      accountTitle: 'Tài khoản',
      profileDetailsTitle: 'Hồ sơ & email',
      profileDetailsSub: (name, email) => `${name} · ${email}`,
      securityTitle: 'Đăng nhập & bảo mật',
      securitySub: linkedCount => `Mật khẩu, Google, Kakao · ${linkedCount} phương thức`,
      libraryTitle: 'Thư viện của tôi',
      vocabTitle: 'Sổ từ',
      vocabSub: (total, due) => `${total} từ · ${due} chờ ôn`,
      wrongTitle: 'Sổ câu sai',
      wrongSub: n => `${n} câu · FSRS`,
      notesTitle: 'Ghi chú',
      notesSub: 'Lưu & ghi chú',
      achievementsTitle: 'Huy hiệu & thành tựu',
      achievementsSub: n => (n > 0 ? `${n} lần thi · xem bộ sưu tập` : 'Xem bộ sưu tập huy hiệu'),
      settingsTitle: 'Cài đặt',
      subInfoTitle: 'Gói đăng ký',
      subPremium: 'Premium · cảm ơn',
      subFree: 'Miễn phí · nâng cấp',
      notificationsTitle: 'Thông báo',
      notificationsSub: 'Nhắc học và thông báo hệ thống',
      supportTitle: 'Trợ giúp & phản hồi',
      supportSub: 'Liên hệ đội hỗ trợ',
      languageTitle: 'Ngôn ngữ hiển thị',
      languageSub: 'Đổi ngôn ngữ giao diện và nội dung học tập.',
      signOutTitle: 'Đăng xuất',
      signOutSub: 'Kết thúc phiên đăng nhập hiện tại',
    };
  }
  if (language.startsWith('mn')) {
    return {
      levelLabel: 'TOPIK суралцагч',
      premium: 'Премиум',
      streakChip: n => `${n} өдөр дараалан`,
      statsWords: 'Үг мэдлэг',
      statsGrammar: 'Дүрэм',
      statsTime: 'Хугацаа',
      accountTitle: 'Бүртгэл',
      profileDetailsTitle: 'Профайл ба имэйл',
      profileDetailsSub: (name, email) => `${name} · ${email}`,
      securityTitle: 'Нэвтрэх ба аюулгүй байдал',
      securitySub: linkedCount => `Нууц үг, Google, Kakao · ${linkedCount} арга`,
      libraryTitle: 'Миний сан',
      vocabTitle: 'Үгсийн дэвтэр',
      vocabSub: (total, due) => `${total} үг · ${due} давтах`,
      wrongTitle: 'Алдааны дэвтэр',
      wrongSub: n => `${n} асуулт · FSRS`,
      notesTitle: 'Тэмдэглэл',
      notesSub: 'Хадгалсан & тэмдэглэл',
      achievementsTitle: 'Амжилт ба тэмдэг',
      achievementsSub: n => (n > 0 ? `${n} шалгалт · тэмдгийн сан` : 'Тэмдгийн сангаа харах'),
      settingsTitle: 'Тохиргоо',
      subInfoTitle: 'Захиалга',
      subPremium: 'Премиум · баярлалаа',
      subFree: 'Үнэгүй · шинэчлэх',
      notificationsTitle: 'Мэдэгдэл',
      notificationsSub: 'Суралцах сануулга ба системийн мэдэгдэл',
      supportTitle: 'Тусламж ба санал',
      supportSub: 'Дэмжлэгтэй холбогдох',
      languageTitle: 'Харагдах хэл',
      languageSub: 'Интерфейс ба сургалтын хэлээ солих.',
      signOutTitle: 'Гарах',
      signOutSub: 'Одоогийн бүртгэлээс гарах',
    };
  }
  return {
    levelLabel: 'TOPIK learner',
    premium: 'Premium',
    streakChip: n => `${n} day streak`,
    statsWords: 'Words known',
    statsGrammar: 'Grammar',
    statsTime: 'Study time',
    accountTitle: 'Account',
    profileDetailsTitle: 'Profile & email',
    profileDetailsSub: (name, email) => `${name} · ${email}`,
    securityTitle: 'Login & security',
    securitySub: linkedCount => `Password, Google, Kakao · ${linkedCount} linked methods`,
    libraryTitle: 'My library',
    vocabTitle: 'Vocab book',
    vocabSub: (total, due) => `${total} words · ${due} due`,
    wrongTitle: 'Wrong answers',
    wrongSub: n => `${n} items · FSRS`,
    notesTitle: 'Notebook',
    notesSub: 'Saves & notes',
    achievementsTitle: 'Achievements & badges',
    achievementsSub: n => (n > 0 ? `${n} exams taken · open gallery` : 'Open your badge gallery'),
    settingsTitle: 'Settings',
    subInfoTitle: 'Subscription',
    subPremium: 'Premium · thank you',
    subFree: 'Free · upgrade',
    notificationsTitle: 'Notifications',
    notificationsSub: 'Study reminders and system alerts',
    supportTitle: 'Help & feedback',
    supportSub: 'Contact support',
    languageTitle: 'Display language',
    languageSub: 'Change the language for the interface and learning content.',
    signOutTitle: 'Sign out',
    signOutSub: 'End the current account session',
  };
};
