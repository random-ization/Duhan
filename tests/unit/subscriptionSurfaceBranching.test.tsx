import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const useIsMobileMock = vi.fn();
const usePublicMembershipSnapshotMock = vi.fn();

vi.mock('../../src/hooks/useIsMobile', () => ({
  useIsMobile: () => useIsMobileMock(),
}));

vi.mock('../../src/hooks/usePublicMembershipSnapshot', () => ({
  usePublicMembershipSnapshot: () => usePublicMembershipSnapshotMock(),
}));

vi.mock('../../src/pages/DesktopSubscriptionPage', () => ({
  default: () => <div>desktop subscription surface</div>,
}));

vi.mock('../../src/components/mobile/MobileSubscriptionPage', () => ({
  MobileSubscriptionPage: () => <div>mobile subscription surface</div>,
}));

vi.mock('../../src/components/subscription/MemberSubscriptionManagement', () => ({
  MemberSubscriptionManagement: ({
    variant,
  }: {
    variant: 'desktop' | 'mobile';
  }) => <div>{`member management ${variant}`}</div>,
}));

import SubscriptionPage from '../../src/pages/SubscriptionPage';

describe('SubscriptionPage premium branching', () => {
  beforeEach(() => {
    useIsMobileMock.mockReset();
    usePublicMembershipSnapshotMock.mockReset().mockReturnValue({
      user: null,
      viewerAccess: null,
      hasStoredSession: false,
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
  });

  it('shows the desktop purchase surface for free users', () => {
    useIsMobileMock.mockReturnValue(false);

    render(<SubscriptionPage />);

    expect(screen.getByText('desktop subscription surface')).toBeInTheDocument();
    expect(screen.queryByText('member management desktop')).not.toBeInTheDocument();
  });

  it('shows desktop member management for premium members', () => {
    useIsMobileMock.mockReturnValue(false);
    usePublicMembershipSnapshotMock.mockReturnValue({
      user: { id: 'user-1' },
      viewerAccess: { isPremium: true },
      hasStoredSession: true,
      loading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(<SubscriptionPage />);

    expect(screen.getByText('member management desktop')).toBeInTheDocument();
    expect(screen.queryByText('desktop subscription surface')).not.toBeInTheDocument();
  });

  it('shows mobile member management for premium members on mobile', () => {
    useIsMobileMock.mockReturnValue(true);
    usePublicMembershipSnapshotMock.mockReturnValue({
      user: { id: 'user-1' },
      viewerAccess: { isPremium: true },
      hasStoredSession: true,
      loading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(<SubscriptionPage />);

    expect(screen.getByText('member management mobile')).toBeInTheDocument();
    expect(screen.queryByText('mobile subscription surface')).not.toBeInTheDocument();
  });
});
