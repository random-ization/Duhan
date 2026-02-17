import { Navigate, useSearchParams } from 'react-router-dom';
import { useIsMobile } from '../hooks/useIsMobile';
import { MobileMediaPage } from '../components/mobile/MobileMediaPage';

type SegmentTab = 'videos' | 'podcasts';

export default function MediaHubPage() {
  const [searchParams] = useSearchParams();
  const activeTab: SegmentTab = searchParams.get('tab') === 'podcasts' ? 'podcasts' : 'videos';
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileMediaPage />;
  }

  return <Navigate to={activeTab === 'podcasts' ? '/podcasts' : '/videos'} replace />;
}
