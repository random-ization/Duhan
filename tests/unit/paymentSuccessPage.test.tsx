import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const navigateMock = vi.fn();
const verifyPaymentSessionMock = vi.fn();
const getSubscriptionActivationStatusMock = vi.fn();
const tMock = (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key;

vi.mock('../../src/hooks/useLocalizedNavigate', () => ({
  useLocalizedNavigate: () => navigateMock,
}));

vi.mock('../../src/utils/convexRefs', async () => {
  const actual = await vi.importActual<typeof import('../../src/utils/convexRefs')>(
    '../../src/utils/convexRefs'
  );
  return {
    ...actual,
    aRef: (name: string) => name,
  };
});

vi.mock('convex/react', () => ({
  useAction: (ref: string) => {
    if (ref === 'payments:verifyPaymentSession') {
      return verifyPaymentSessionMock;
    }
    if (ref === 'payments:getSubscriptionActivationStatus') {
      return getSubscriptionActivationStatusMock;
    }
    throw new Error(`Unexpected action ref: ${ref}`);
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: tMock,
  }),
}));

import PaymentSuccessPage from '../../src/pages/PaymentSuccessPage';

const renderPage = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="*" element={<PaymentSuccessPage />} />
      </Routes>
    </MemoryRouter>
  );

const activeStatus = {
  isActive: true,
  status: 'ACTIVE' as const,
  tier: 'PREMIUM',
  subscriptionType: 'ANNUAL',
};

const pendingStatus = {
  isActive: false,
  status: 'PENDING' as const,
  tier: null,
  subscriptionType: null,
};

describe('PaymentSuccessPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    navigateMock.mockReset();
    verifyPaymentSessionMock.mockReset().mockResolvedValue({ success: true });
    getSubscriptionActivationStatusMock.mockReset().mockResolvedValue(activeStatus);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('shows success and redirects for lemonsqueezy when activation is active', async () => {
    renderPage('/payment/success?provider=lemonsqueezy');

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByText('Payment Successful!')).toBeInTheDocument();
    expect(getSubscriptionActivationStatusMock).toHaveBeenCalled();
    expect(verifyPaymentSessionMock).not.toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith('/dashboard');
  });

  it('redirects back to the preserved return target after successful activation', async () => {
    renderPage('/payment/success?provider=lemonsqueezy&returnTo=%2Ftopik');

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByText('Payment Successful!')).toBeInTheDocument();
    expect(navigateMock).toHaveBeenCalledWith('/topik');
  });

  it('handles missing session id by checking activation status before success', async () => {
    renderPage('/payment/success');

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByText('Payment Successful!')).toBeInTheDocument();
    expect(verifyPaymentSessionMock).not.toHaveBeenCalled();
    expect(getSubscriptionActivationStatusMock).toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith('/dashboard');
  });

  it('shows pending copy when session id is missing and activation is delayed', async () => {
    getSubscriptionActivationStatusMock.mockResolvedValue(pendingStatus);
    renderPage('/payment/success');

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByText('Payment Received')).toBeInTheDocument();
    expect(
      screen.getByText(
        'We are confirming your subscription status. If you just paid, activation may take a moment.'
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check Again' })).toBeInTheDocument();
  });

  it('shows error state when verify payment session fails', async () => {
    verifyPaymentSessionMock.mockResolvedValue({
      success: false,
      error: 'Mock verify failure',
      status: 'FAILED',
    });
    renderPage('/payment/success?session_id=test-session');

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Mock verify failure')).toBeInTheDocument();
    expect(getSubscriptionActivationStatusMock).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalledWith('/dashboard');
  });
});
