import { useQuery } from 'convex/react';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { Play, Calendar } from 'lucide-react';

import { NoArgs, qRef } from '../utils/convexRefs';

const getPodcastMessages = (labels: import('../utils/i18n').Labels) => ({
  HISTORY_TITLE: labels.podcastHistory || 'Listening History',
  EMPTY_HISTORY: labels.noHistory || 'No history yet',
  DASHBOARD_NO_RECOMMENDATIONS: labels.startListening || 'Start listening to some podcasts!',
  ACTION_EXPLORE: labels.explore || 'Explore Podcasts',
});
import BackButton from '../components/ui/BackButton';
import EmptyState from '../components/common/EmptyState';
import { useAuth } from '../contexts/AuthContext';
import { getLabels } from '../utils/i18n';

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
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="bg-white p-4 sticky top-0 z-10 border-b flex items-center gap-4">
        <BackButton onClick={() => navigate(-1)} />
        <h1 className="text-xl font-bold">{podcastMsgs.HISTORY_TITLE}</h1>
      </div>

      <div className="p-4 space-y-3">
        {loading && (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
          </div>
        )}

        {!loading && (!history || history.length === 0) && (
          <EmptyState
            icon={Play}
            title={podcastMsgs.EMPTY_HISTORY}
            description={podcastMsgs.DASHBOARD_NO_RECOMMENDATIONS}
            actionLabel={podcastMsgs.ACTION_EXPLORE}
            onAction={() => navigate('/podcasts')}
          />
        )}

        {history?.map(item => (
          <button
            key={item.id}
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
            className="w-full text-left bg-white p-3 rounded-xl shadow-sm flex items-center gap-4 cursor-pointer active:scale-95 transition hover:shadow-md"
          >
            <img
              src={item.channelImage || '/placeholder-podcast.png'}
              alt={item.channelName}
              className="w-14 h-14 rounded-lg bg-gray-200 object-cover"
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-800 line-clamp-1">{item.episodeTitle}</h3>
              <p className="text-xs text-slate-500 mb-1">{item.channelName}</p>
              <div className="flex items-center text-xs text-slate-400 gap-1">
                <Calendar size={12} />
                {new Date(item.playedAt).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US')}
              </div>
            </div>
            <div className="bg-indigo-50 p-2 rounded-full text-indigo-600">
              <Play size={16} fill="currentColor" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
