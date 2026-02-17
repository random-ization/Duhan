import { useQuery } from 'convex/react';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { Play, Calendar, ArrowLeft } from 'lucide-react';

import { NoArgs, qRef } from '../utils/convexRefs';

const getPodcastMessages = (labels: import('../utils/i18n').Labels) => ({
  HISTORY_TITLE: labels.podcastHistory || 'Listening History',
  EMPTY_HISTORY: labels.noHistory || 'No history yet',
  DASHBOARD_NO_RECOMMENDATIONS: labels.startListening || 'Start listening to some podcasts!',
  ACTION_EXPLORE: labels.explore || 'Explore Podcasts',
});
import { Button } from '../components/ui';
import { Card, CardContent } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { localeFromLanguage } from '../utils/locale';
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
    <div className="min-h-screen bg-muted pb-20">
      <div className="bg-card p-4 sticky top-0 z-10 border-b flex items-center gap-4">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => navigate(-1)}
          className="w-12 h-12 border-2 border-foreground rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all duration-150"
          aria-label={labels.errors?.backToHome || 'Back'}
        >
          <ArrowLeft className="w-5 h-5 text-foreground" strokeWidth={2.5} />
        </Button>
        <h1 className="text-xl font-bold">{podcastMsgs.HISTORY_TITLE}</h1>
      </div>

      <div className="p-4 space-y-3">
        {loading && (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 dark:border-indigo-300 border-t-transparent" />
          </div>
        )}

        {!loading && (!history || history.length === 0) && (
          <Card className="text-center">
            <CardContent className="py-16 flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-400/12 dark:text-indigo-200 flex items-center justify-center">
                <Play size={20} className="fill-current" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-muted-foreground">{podcastMsgs.EMPTY_HISTORY}</p>
                <p className="text-sm text-muted-foreground">
                  {podcastMsgs.DASHBOARD_NO_RECOMMENDATIONS}
                </p>
              </div>
              <Button type="button" onClick={() => navigate('/podcasts')}>
                {podcastMsgs.ACTION_EXPLORE}
              </Button>
            </CardContent>
          </Card>
        )}

        {history?.map(item => (
          <Button
            key={item.id}
            size="auto"
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
            variant="ghost"
            className="w-full text-left bg-card p-3 rounded-xl shadow-sm flex items-center gap-4 cursor-pointer active:scale-95 transition hover:shadow-md font-normal"
          >
            <img
              src={item.channelImage || '/placeholder-podcast.png'}
              alt={item.channelName}
              className="w-14 h-14 rounded-lg bg-muted object-cover"
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-muted-foreground line-clamp-1">{item.episodeTitle}</h3>
              <p className="text-xs text-muted-foreground mb-1">{item.channelName}</p>
              <div className="flex items-center text-xs text-muted-foreground gap-1">
                <Calendar size={12} />
                {new Date(item.playedAt).toLocaleDateString(localeFromLanguage(language))}
              </div>
            </div>
            <div className="bg-indigo-50 dark:bg-indigo-400/12 p-2 rounded-full text-indigo-600 dark:text-indigo-200">
              <Play size={16} fill="currentColor" />
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
}
