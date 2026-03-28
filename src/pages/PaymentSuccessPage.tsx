import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useAction } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { aRef, NoArgs } from '../utils/convexRefs';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { Button } from '../components/ui';
import { trackEvent } from '../utils/analytics';
import { resolveSafeReturnTo } from '../utils/navigation';
import { buildPricingDetailsPath, isCheckoutPlan } from '../utils/subscriptionPlan';

const ACTIVATION_POLL_INTERVAL_MS = 2500;
const ACTIVATION_POLL_MAX_ATTEMPTS = 12;

const PaymentSuccessPage: React.FC = () => {
  const translation = useTranslation();
  const { t } = translation;
  const currentLanguage = translation.i18n?.language ?? 'en';
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const plan = searchParams.get('plan');
  const source = searchParams.get('source') || 'pricing_details';
  const returnTo = resolveSafeReturnTo(searchParams.get('returnTo'), '/dashboard');
  const isReturningToDashboard = returnTo === '/dashboard';
  const navigate = useLocalizedNavigate();
  const [status, setStatus] = useState<'loading' | 'pending' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState(
    t('payment.verifying', { defaultValue: 'Verifying payment...' })
  );
  const [retryVersion, setRetryVersion] = useState(0);
  const redirectTimerRef = useRef<number | null>(null);

  const getSubscriptionActivationStatus = useAction(
    aRef<
      NoArgs,
      {
        isActive: boolean;
        status: 'ACTIVE' | 'PENDING' | 'UNAUTHENTICATED';
        tier: string | null;
        subscriptionType: string | null;
      }
    >('paymentStatus:getSubscriptionActivationStatus')
  );

  useEffect(() => {
    let cancelled = false;

    const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    const authRedirectTarget = `/auth?redirect=${encodeURIComponent(
      `${location.pathname}${location.search}${location.hash}`
    )}`;

    const scheduleRedirect = () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
      redirectTimerRef.current = window.setTimeout(() => {
        navigate(returnTo);
      }, 2500);
    };

    const markPaymentActivationSuccess = () => {
      trackEvent('payment_activation_success', {
        language: currentLanguage,
        provider: 'lemonsqueezy',
      });
    };

    const pollUntilActivated = async (): Promise<'active' | 'pending' | 'unauthenticated'> => {
      let sawActivationResponse = false;

      for (let attempt = 1; attempt <= ACTIVATION_POLL_MAX_ATTEMPTS; attempt += 1) {
        try {
          const activation = await getSubscriptionActivationStatus({});
          if (cancelled) return 'pending';
          sawActivationResponse = true;
          if (activation.isActive) return 'active';
          if (activation.status === 'UNAUTHENTICATED') return 'unauthenticated';
          setStatus('pending');
          setMessage(
            t('payment.activationPending', {
              defaultValue: 'Payment confirmed. Waiting for subscription activation...',
            })
          );
        } catch (error) {
          console.error('Activation status check failed:', error);
          if (cancelled) return 'pending';
        }

        if (attempt < ACTIVATION_POLL_MAX_ATTEMPTS) {
          await wait(ACTIVATION_POLL_INTERVAL_MS);
        }
      }

      if (!sawActivationResponse) {
        throw new Error(
          t('payment.verificationFailed', { defaultValue: 'Payment verification failed.' })
        );
      }

      return 'pending';
    };

    const verifyPayment = async () => {
      setStatus('loading');
      setMessage(t('payment.verifying', { defaultValue: 'Verifying payment...' }));

      try {
        const activationState = await pollUntilActivated();
        if (cancelled) return;
        if (activationState === 'unauthenticated') {
          navigate(authRedirectTarget, { replace: true });
          return;
        }
        if (activationState !== 'active') {
          setStatus('pending');
          setMessage(
            t('payment.activationDelayed', {
              defaultValue:
                'Your payment is complete, but activation is taking longer than expected.',
            })
          );
          return;
        }

        setStatus('success');
        markPaymentActivationSuccess();
        setMessage(
          t('payment.successBody', { defaultValue: 'Your subscription has been activated.' })
        );
        scheduleRedirect();
      } catch (error: unknown) {
        console.error('Verification failed:', error);
        setStatus('error');
        setMessage(
          error instanceof Error
            ? error.message
            : t('payment.verificationFailed', { defaultValue: 'Payment verification failed.' })
        );
      }
    };

    void verifyPayment();

    return () => {
      cancelled = true;
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = null;
      }
    };
  }, [
    location.hash,
    location.pathname,
    location.search,
    plan,
    returnTo,
    navigate,
    getSubscriptionActivationStatus,
    t,
    currentLanguage,
    retryVersion,
  ]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        {status === 'loading' && (
          <div className="flex flex-col items-center">
            <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {t('payment.processing', { defaultValue: 'Processing...' })}
            </h2>
            <p className="text-gray-600">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center">
            <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {t('payment.successTitle', { defaultValue: 'Payment Successful!' })}
            </h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <p className="text-sm text-gray-500">
              {isReturningToDashboard
                ? t('payment.redirecting', { defaultValue: 'Redirecting to dashboard...' })
                : t('payment.redirectingBack', {
                    defaultValue: 'Redirecting you back to your lesson...',
                  })}
            </p>
          </div>
        )}

        {status === 'pending' && (
          <div className="flex flex-col items-center">
            <Loader2 className="w-16 h-16 text-amber-500 animate-spin mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {t('payment.pendingTitle', { defaultValue: 'Payment Received' })}
            </h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <div className="flex w-full gap-2">
              <Button
                onClick={() => setRetryVersion(v => v + 1)}
                variant="outline"
                size="auto"
                className="flex-1"
              >
                {t('payment.checkAgain', { defaultValue: 'Check Again' })}
              </Button>
              <Button
                onClick={() => navigate(returnTo)}
                variant="ghost"
                size="auto"
                className="flex-1 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                {isReturningToDashboard
                  ? t('payment.goDashboard', { defaultValue: 'Go to Dashboard' })
                  : t('payment.goBack', { defaultValue: 'Go Back' })}
              </Button>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center">
            <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {t('payment.errorTitle', { defaultValue: 'Something went wrong' })}
            </h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <Button
              onClick={() =>
                navigate(
                  buildPricingDetailsPath({
                    plan: isCheckoutPlan(plan) ? plan : undefined,
                    source,
                    returnTo,
                  })
                )
              }
              variant="ghost"
              size="auto"
              className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              {t('payment.backToPricing', { defaultValue: 'Back to Pricing' })}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
