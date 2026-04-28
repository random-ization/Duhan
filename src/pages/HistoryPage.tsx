import { useQuery } from 'convex/react';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { Play } from 'lucide-react';

import { NoArgs, qRef } from '../utils/convexRefs';

const getPodcastMessages = (labels: import('../utils/i18n').Labels) => ({
  HISTORY_TITLE: labels.podcastHistory || 'Listening History',
  EMPTY_HISTORY: labels.noHistory || 'No history yet',
  DASHBOARD_NO_RECOMMENDATIONS: labels.startListening || 'Start listening to some podcasts!',
  ACTION_EXPLORE: labels.explore || 'Explore Podcasts',
});
import { useAuth } from '../contexts/AuthContext';
import { localeFromLanguage } from '../utils/locale';
import { buildMediaPath } from '../utils/mediaRoutes';
import { getLabels } from '../utils/i18n';
import { formatSafeDateLabel } from '../utils/dateLabel';
import { Chip, KT, PageShell, SectionHead } from '../components/mobile/ksoft/ksoft';
import {
  KsoftEmptyState,
  KsoftImmersiveHeader,
  KsoftListRow,
} from '../components/mobile/ksoft/KsoftMobilePrimitives';

export default function HistoryPage() {
  const { language } = useAuth();
  const labels = getLabels(language);
  const podcastMsgs = getPodcastMessages(labels);

  type HistoryItem = {
    id: string;
    episodeGuid: string;
    episodeTitle: string;
    episodeUrl: string;
    channelName: string;
    channelImage?: string;
    playedAt: number;
  };
  const history = useQuery(qRef<NoArgs, HistoryItem[]>('podcasts:getHistory'));
  const loading = history === undefined;
  const navigate = useLocalizedNavigate();

  return (
    <PageShell>
      <KsoftImmersiveHeader
        eyebrow="聲 · HISTORY"
        title={podcastMsgs.HISTORY_TITLE}
        subtitle={podcastMsgs.DASHBOARD_NO_RECOMMENDATIONS}
        seal="聲"
        onBack={() => navigate(buildMediaPath('podcast'))}
      />

      <main style={{ padding: '4px 20px 112px', display: 'grid', gap: 14 }}>
        {loading ? (
          <KsoftEmptyState title={labels.common?.loading || 'Loading...'} />
        ) : !history || history.length === 0 ? (
          <KsoftEmptyState
            title={podcastMsgs.EMPTY_HISTORY}
            description={podcastMsgs.DASHBOARD_NO_RECOMMENDATIONS}
            actionLabel={podcastMsgs.ACTION_EXPLORE}
            onAction={() => navigate(buildMediaPath('podcast'))}
          />
        ) : (
          <section style={{ display: 'grid', gap: 10 }}>
            <SectionHead kanji="聽" title={podcastMsgs.HISTORY_TITLE} />
            {history.map(item => {
              const dateLabel = formatSafeDateLabel(
                item.playedAt,
                localeFromLanguage(language),
                labels.common?.recently || 'Recently'
              );
              return (
                <div key={item.id} style={{ position: 'relative' }}>
                  <KsoftListRow
                    seal="聲"
                    title={item.episodeTitle}
                    subtitle={`${item.channelName} · ${dateLabel}`}
                    onClick={() =>
                      navigate('/podcasts/player', {
                        state: {
                          episode: {
                            guid: item.episodeGuid,
                            title: item.episodeTitle,
                            audioUrl: item.episodeUrl,
                            channel: { title: item.channelName, image: item.channelImage },
                          },
                        },
                      })
                    }
                  />
                  <div
                    style={{
                      position: 'absolute',
                      left: 12,
                      top: 12,
                      width: 42,
                      height: 42,
                      borderRadius: 14,
                      overflow: 'hidden',
                      background: KT.bg2,
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    {item.channelImage ? (
                      <img
                        src={item.channelImage}
                        alt={item.channelName}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <Play size={17} color={KT.crimson} fill={KT.crimson} />
                    )}
                  </div>
                  <div style={{ position: 'absolute', right: 36, bottom: 12 }}>
                    <Chip tone="muted">{dateLabel}</Chip>
                  </div>
                </div>
              );
            })}
          </section>
        )}
      </main>
    </PageShell>
  );
}
