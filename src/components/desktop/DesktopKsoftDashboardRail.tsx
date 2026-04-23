import { DesktopDailyChallengeCard } from './DesktopDailyChallengeCard';
import { DesktopFriendFeed } from './DesktopFriendFeed';
import { DesktopLeaderboardWidget } from './DesktopLeaderboardWidget';
import { DesktopNextBestAction } from './DesktopNextBestAction';
import { DesktopStudyBuddyCard } from './DesktopStudyBuddyCard';
import { DesktopWeakPointsCard } from './DesktopWeakPointsCard';

export function DesktopKsoftDashboardRail({
  language,
}: Readonly<{
  language: string;
}>) {
  return (
    <aside
      className="hidden xl:block"
      style={{
        position: 'fixed',
        right: 24,
        top: 110,
        width: 330,
        maxHeight: 'calc(100vh - 140px)',
        overflowY: 'auto',
        paddingBottom: 24,
      }}
    >
      <div style={{ display: 'grid', gap: 12 }}>
        <DesktopDailyChallengeCard language={language} />
        <DesktopLeaderboardWidget />
        <DesktopFriendFeed />
        <DesktopStudyBuddyCard />
        <DesktopNextBestAction />
        <DesktopWeakPointsCard language={language} />
      </div>
    </aside>
  );
}
