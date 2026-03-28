import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const navigateMock = vi.fn();
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
    if (ref === 'paymentStatus:getSubscriptionActivationStatus') {
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

const unauthenticatedStatus = {
  isActive: false,
  status: 'UNAUTHENTICATED' as const,
  tier: null,
  subscriptionType: null,
};

describe('PaymentSuccessPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    navigateMock.mockReset();
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

  it('activates successfully without relying on a checkout session id', async () => {
    renderPage('/payment/success');

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByText('Payment Successful!')).toBeInTheDocument();
    expect(getSubscriptionActivationStatusMock).toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith('/dashboard');
  });

  it('shows pending copy when activation is delayed', async () => {
    getSubscriptionActivationStatusMock.mockResolvedValue(pendingStatus);
    renderPage('/payment/success');

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByText('Payment Received')).toBeInTheDocument();
    expect(
      screen.getByText('Your payment is complete, but activation is taking longer than expected.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check Again' })).toBeInTheDocument();
  });

  it('returns to the originally selected pricing plan from the error state', async () => {
    getSubscriptionActivationStatusMock.mockRejectedValue(new Error('Activation lookup failed'));
    renderPage('/payment/success?plan=LIFETIME&returnTo=%2Ftopik');

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Back to Pricing' }));

    expect(navigateMock).toHaveBeenCalledWith(
      '/pricing/details?plan=LIFETIME&source=pricing_details&returnTo=%2Ftopik'
    );
  });

  it('redirects to auth when activation status says the user is unauthenticated', async () => {
    getSubscriptionActivationStatusMock.mockResolvedValue(unauthenticatedStatus);
    renderPage('/payment/success?plan=ANNUAL&returnTo=%2Ftopik');

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(navigateMock).toHaveBeenCalledWith(
      '/auth?redirect=%2Fpayment%2Fsuccess%3Fplan%3DANNUAL%26returnTo%3D%252Ftopik',
      { replace: true }
    );
  });
});
