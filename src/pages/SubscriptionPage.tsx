import React from 'react';
import { useIsMobile } from '../hooks/useIsMobile';
import { usePublicMembershipSnapshot } from '../hooks/usePublicMembershipSnapshot';
import { MemberSubscriptionManagement } from '../components/subscription/MemberSubscriptionManagement';
import DesktopSubscriptionPage from './DesktopSubscriptionPage';
import { MobileSubscriptionPage } from '../components/mobile/MobileSubscriptionPage';

const SubscriptionPage: React.FC = () => {
  const isMobile = useIsMobile();
  const membership = usePublicMembershipSnapshot();

  if (membership.hasStoredSession && (membership.loading || membership.viewerAccess?.isPremium)) {
    return (
      <MemberSubscriptionManagement
        user={membership.user}
        viewerAccess={membership.viewerAccess}
        variant={isMobile ? 'mobile' : 'desktop'}
        loading={membership.loading}
        error={membership.error}
        onRefresh={membership.refresh}
      />
    );
  }

  if (isMobile) {
    return <MobileSubscriptionPage />;
  }

  return <DesktopSubscriptionPage />;
};

export default SubscriptionPage;
