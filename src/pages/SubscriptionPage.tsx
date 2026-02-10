import React from 'react';
import { useIsMobile } from '../hooks/useIsMobile';
import DesktopSubscriptionPage from './DesktopSubscriptionPage';
import { MobileSubscriptionPage } from '../components/mobile/MobileSubscriptionPage';

const SubscriptionPage: React.FC = () => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileSubscriptionPage />;
  }

  return <DesktopSubscriptionPage />;
};

export default SubscriptionPage;
