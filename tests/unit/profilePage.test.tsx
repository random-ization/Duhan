import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProfileHubData } from '../../src/pages/profile/hooks/useProfileHubData';
import ProfilePage from '../../src/pages/ProfilePage';

const navigateMock = vi.fn();
const signOutMock = vi.fn();
const updateUserMock = vi.fn();
const useProfileHubDataMock = vi.fn<ProfileHubData, []>();

vi.mock('../../src/hooks/useLocalizedNavigate', () => ({
  useLocalizedNavigate: () => navigateMock,
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'user_12345678',
      name: 'Ryan',
      email: 'ryan@example.com',
      role: 'STUDENT',
      tier: 'FREE',
      joinDate: 1710000000000,
      lastActive: 1710000000000,
      savedWords: [],
      mistakes: [],
      annotations: [],
      examHistory: [],
    },
    language: 'en',
    updateUser: updateUserMock,
    viewerAccess: {
      plan: 'PRO',
      isPremium: true,
      windowStart: 0,
      limits: {
        courseFreeUnits: 3,
        aiCreditsDaily: null,
        vocabNewWordsDaily: null,
        vocabTestDaily: null,
        mediaPlayDaily: null,
      },
      remaining: {
        aiCreditsDaily: null,
        vocabNewWordsDaily: null,
        vocabTestDaily: null,
        mediaPlayDaily: null,
      },
      flags: {
        pdfExport: true,
        mediaSpeedControl: true,
        historyAnalytics: true,
      },
    },
  }),
}));

vi.mock('@convex-dev/auth/react', () => ({
  useAuthActions: () => ({
    signIn: vi.fn(),
    signOut: signOutMock,
  }),
}));

vi.mock('convex/react', () => ({
  useQuery: vi.fn(() => null),
  useMutation: () => vi.fn(),
  useAction: () => vi.fn(),
}));

vi.mock('../../src/pages/profile/hooks/useProfileHubData', () => ({
  useProfileHubData: () => useProfileHubDataMock(),
}));

vi.mock('../../src/utils/i18n', () => ({
  getLabels: () => ({
    common: { signOut: 'Sign Out' },
    profile: {
      dashboard: {
        title: 'Personal Center',
        subtitle: 'A single center for account identity and study context.',
        overviewTab: 'Overview',
        sectionLearning: 'Learning',
        sectionActivity: 'Activity',
        sectionAchievements: 'Milestones',
        sectionSettings: 'Settings',
        sectionSecurity: 'Security',
      },
      accountHub: {
        title: 'Account & Membership',
        subtitle: 'Identity and account controls.',
        tabLabel: 'Account',
      },
      learningHub: {
        title: 'Learning & Achievements',
        subtitle: 'Learning signals that matter.',
        tabLabel: 'Learning',
      },
      activityHub: {
        title: 'Recent Activity',
        subtitle: 'Resume where you left off.',
        tabLabel: 'Activity',
      },
      settingsCenter: {
        title: 'Settings Center',
        subtitle: 'Unified settings.',
        tabLabel: 'Settings',
      },
      securityHub: {
        title: 'Security & Connections',
        subtitle: 'Password and linked providers.',
        tabLabel: 'Security',
      },
      link: {
        connect: 'Connect',
        unlink: 'Unlink',
        linked: 'Linked',
        notLinked: 'Not linked',
        sectionTitle: 'Social Accounts',
      },
    },
  }),
}));

vi.mock('../../src/pages/profile/components/ProfileHeader', () => ({
  ProfileHeader: () => <div>profile-header</div>,
}));

vi.mock('../../src/pages/profile/tabs/ProfileInfoTab', () => ({
  ProfileInfoTab: () => <div>profile-info</div>,
}));

vi.mock('../../src/pages/profile/tabs/ProfileSecurityTab', () => ({
  ProfileSecurityTab: () => <div>profile-security</div>,
}));

vi.mock('../../src/pages/profile/tabs/ProfileSettingsTab', () => ({
  ProfileSettingsTab: () => <div>settings-tab</div>,
}));

vi.mock('../../src/components/profile/AchievementGallery', () => ({
  AchievementGallery: () => <div>achievement-gallery</div>,
}));

const baseHubData = (): ProfileHubData => ({
  identity: {
    displayName: 'Ryan',
    email: 'ryan@example.com',
    avatar: undefined,
    joinedDateLabel: 'Mar 9, 2024',
    joinedTimestamp: 1710000000000,
    userIdDisplay: 'user_123',
    linkedCount: 2,
    isProfileIncomplete: false,
    accountStatus: 'ACTIVE',
  },
  membership: {
    planLabel: 'Premium',
    statusLabel: 'Premium active',
    primaryActionLabel: 'Manage membership',
    primaryActionPath: '/pricing/details?source=profile_hub',
    secondaryActionLabel: 'Edit profile',
    secondaryActionPath: '/profile/account',
    summary: 'Premium access is active.',
  },
  learningSnapshot: [
    {
      id: 'streak',
      label: 'Streak',
      value: '12',
      detail: 'Consecutive learning days',
    },
  ],
  recentActivity: [
    {
      id: 'listen-1',
      kind: 'listen',
      title: 'Resume listen mode',
      subtitle: 'Continue from item 4',
      detail: 'Ready to continue instantly',
      path: '/vocab-book/listen',
      timestamp: 1710001000000,
    },
  ],
  achievements: [
    {
      id: 'streak',
      title: 'Streak milestone',
      description: 'Your learning streak is on track.',
      value: '12/30',
      status: 'next',
    },
  ],
  settingsSummary: [
    {
      id: 'language',
      label: 'Language',
      value: 'English',
      description: 'Display language follows your account everywhere.',
      path: '/profile/settings',
    },
  ],
  securitySummary: [
    {
      id: 'accountStatus',
      label: 'Account status',
      value: 'Active',
      description: 'The account can sign in normally.',
    },
  ],
  examHistory: [],
  podcastHistory: [],
  recentSessions: [],
  linkedAccounts: [{ provider: 'google' }, { provider: 'kakao' }],
  userStats: null,
  isLoading: false,
});

const renderPage = (initialPath: string) =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/:lang/profile/*" element={<ProfilePage language="en" />} />
      </Routes>
    </MemoryRouter>
  );

describe('ProfilePage', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    signOutMock.mockReset();
    updateUserMock.mockReset();
    useProfileHubDataMock.mockReset();
    useProfileHubDataMock.mockReturnValue(baseHubData());
  });

  it.skip('renders the dashboard-first overview with hero CTA', () => {
    renderPage('/en/profile');

    expect(screen.getByText('Personal Center')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Manage membership' })).toBeInTheDocument();
    expect(screen.getByText('Language')).toBeInTheDocument();
    expect(screen.queryByText('Continue review')).not.toBeInTheDocument();
  });

  it.skip('navigates through section tabs without feature shortcuts', () => {
    renderPage('/en/profile');

    fireEvent.click(screen.getAllByRole('button', { name: 'Security' })[0]);

    expect(navigateMock).toHaveBeenCalledWith('/profile/security');
  });

  it.skip('renders the dedicated settings page on the settings route', () => {
    renderPage('/en/profile/settings');

    expect(screen.getByText('Settings Center')).toBeInTheDocument();
    expect(screen.getByText('settings-tab')).toBeInTheDocument();
    expect(screen.queryByText('Continue review')).not.toBeInTheDocument();
  });
});
