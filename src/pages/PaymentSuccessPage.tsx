import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useAction } from 'convex/react';
import { useAuth } from '../contexts/AuthContext';
import { aRef } from '../utils/convexRefs';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { Button } from '../components/ui';

const PaymentSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useLocalizedNavigate();
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying payment...');

  const verifyPaymentSession = useAction(
    aRef<{ sessionId: string }, unknown>('payments:verifyPaymentSession')
  );

  useEffect(() => {
    const verifyPayment = async () => {
      const provider = searchParams.get('provider');
      const sessionId = searchParams.get('session_id');

      // Lemon Squeezy doesn't pass a session_id, it uses webhooks instead
      // We just show success and rely on webhook to update user status
      if (provider === 'lemonsqueezy') {
        setStatus('success');
        setMessage('Payment completed! Your subscription will be activated shortly.');

        // Refresh user profile (webhook may have already updated it)
        try {
          await refreshUser();
        } catch {
          console.log('User refresh pending, webhook may still be processing');
        }

        // Redirect after delay
        setTimeout(() => {
          navigate('/dashboard');
        }, 3000);
        return;
      }

      // Creem flow - requires session_id verification
      if (!sessionId) {
        setStatus('error');
        setMessage('No session ID found.');
        return;
      }

      try {
        // Call backend to verify the session
        await verifyPaymentSession({ sessionId });
        setStatus('success');
        // Refresh user profile to get new subscription status
        await refreshUser();

        // Redirect after delay
        setTimeout(() => {
          navigate('/dashboard');
        }, 3000);
      } catch (error: unknown) {
        console.error('Verification failed:', error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Payment verification failed.');
      }
    };

    verifyPayment();
  }, [searchParams, navigate, refreshUser, verifyPaymentSession]);

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-xl shadow-lg p-8 text-center">
        {status === 'loading' && (
          <div className="flex flex-col items-center">
            <Loader2 className="w-16 h-16 text-indigo-600 dark:text-indigo-300 animate-spin mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Processing...</h2>
            <p className="text-muted-foreground">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center">
            <CheckCircle className="w-16 h-16 text-green-500 dark:text-emerald-300 mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Payment Successful!</h2>
            <p className="text-muted-foreground mb-6">Your subscription has been activated.</p>
            <p className="text-sm text-muted-foreground">Redirecting to dashboard...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center">
            <AlertCircle className="w-16 h-16 text-red-500 dark:text-rose-300 mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-6">{message}</p>
            <Button
              onClick={() => navigate('/pricing/details')}
              variant="ghost"
              size="auto"
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-muted transition-colors"
            >
              Back to Pricing
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
