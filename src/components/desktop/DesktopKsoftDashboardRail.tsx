import { DesktopDailyChallengeCard } from './DesktopDailyChallengeCard';
import { DesktopFriendFeed } from './DesktopFriendFeed';
import { DesktopLeaderboardWidget } from './DesktopLeaderboardWidget';
import { DesktopNextBestAction } from './DesktopNextBestAction';
import { DesktopStudyBuddyCard } from './DesktopStudyBuddyCard';
import { DesktopWeakPointsCard } from './DesktopWeakPointsCard';

export function DesktopKsoftDashboardRail({
  language,
  className,
}: Readonly<{
  language: string;
  className?: string;
}>) {
  return (
    <aside className={className}>
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
