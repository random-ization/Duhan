import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useAction } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { aRef, NoArgs } from '../utils/convexRefs';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { Button } from '../components/ui';
import { trackEvent } from '../utils/analytics';

const ACTIVATION_POLL_INTERVAL_MS = 2500;
const ACTIVATION_POLL_MAX_ATTEMPTS = 12;

const PaymentSuccessPage: React.FC = () => {
  const translation = useTranslation();
  const { t } = translation;
  const currentLanguage = translation.i18n?.language ?? 'en';
  const [searchParams] = useSearchParams();
  const provider = searchParams.get('provider');
  const sessionId = searchParams.get('session_id');
  const navigate = useLocalizedNavigate();
  const [status, setStatus] = useState<'loading' | 'pending' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState(
    t('payment.verifying', { defaultValue: 'Verifying payment...' })
  );
  const [retryVersion, setRetryVersion] = useState(0);
  const redirectTimerRef = useRef<number | null>(null);

  const verifyPaymentSession = useAction(
    aRef<{ sessionId: string }, { success?: boolean; status?: string; error?: string }>(
      'payments:verifyPaymentSession'
    )
  );
  const getSubscriptionActivationStatus = useAction(
    aRef<
      NoArgs,
      {
        isActive: boolean;
        status: 'ACTIVE' | 'PENDING' | 'UNAUTHENTICATED';
        tier: string | null;
        subscriptionType: string | null;
      }
    >('payments:getSubscriptionActivationStatus')
  );

  useEffect(() => {
    let cancelled = false;

    const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const scheduleRedirect = () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
      redirectTimerRef.current = window.setTimeout(() => {
        navigate('/dashboard');
      }, 2500);
    };

    const markPaymentActivationSuccess = () => {
      const normalizedProvider =
        provider === 'lemonsqueezy' || provider === 'creem' ? provider : 'unknown';
      trackEvent('payment_activation_success', {
        language: currentLanguage,
        provider: normalizedProvider,
      });
    };

    const pollUntilActivated = async () => {
      for (let attempt = 1; attempt <= ACTIVATION_POLL_MAX_ATTEMPTS; attempt += 1) {
        try {
          const activation = await getSubscriptionActivationStatus({});
          if (cancelled) return false;
          if (activation.isActive) return true;
        } catch (error) {
          console.error('Activation status check failed:', error);
          if (cancelled) return false;
        }

        setStatus('pending');
        setMessage(
          t('payment.activationPending', {
            defaultValue: 'Payment confirmed. Waiting for subscription activation...',
          })
        );

        if (attempt < ACTIVATION_POLL_MAX_ATTEMPTS) {
          await wait(ACTIVATION_POLL_INTERVAL_MS);
        }
      }
      return false;
    };

    const verifyPayment = async () => {
      setStatus('loading');
      setMessage(t('payment.verifying', { defaultValue: 'Verifying payment...' }));

      try {
        if (provider === 'lemonsqueezy') {
          const activated = await pollUntilActivated();
          if (cancelled) return;
          if (!activated) {
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
          return;
        }

        if (!sessionId) {
          const activated = await pollUntilActivated();
          if (cancelled) return;
          if (!activated) {
            setStatus('pending');
            setMessage(
              t('payment.activationPendingNoSession', {
                defaultValue:
                  'We are confirming your subscription status. If you just paid, activation may take a moment.',
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
          return;
        }

        const verifyResult = await verifyPaymentSession({ sessionId });
        if (verifyResult.success === false) {
          const statusLabel = verifyResult.status ? ` (${verifyResult.status})` : '';
          throw new Error(
            verifyResult.error ||
              t('payment.verificationFailed', { defaultValue: 'Payment verification failed.' }) +
                statusLabel
          );
        }

        const activated = await pollUntilActivated();
        if (cancelled) return;
        if (!activated) {
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
    provider,
    sessionId,
    navigate,
    verifyPaymentSession,
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
              {t('payment.redirecting', { defaultValue: 'Redirecting to dashboard...' })}
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
                onClick={() => navigate('/dashboard')}
                variant="ghost"
                size="auto"
                className="flex-1 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                {t('payment.goDashboard', { defaultValue: 'Go to Dashboard' })}
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
              onClick={() => navigate('/pricing/details')}
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
