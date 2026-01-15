import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useNavigate } from 'react-router-dom';
import { Play, Calendar } from 'lucide-react';
import { ListeningHistoryItem, User } from '../types';
// import { PODCAST_MESSAGES, getPodcastMessages } from '../constants/podcast-messages';

const getPodcastMessages = (labels: any) => ({
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
    const { user, language } = useAuth();
    const labels = getLabels(language);
    const podcastMsgs = getPodcastMessages(labels);

    const history = useQuery(api.podcasts.getHistory);
    const loading = history === undefined;
    const error = null; // Convex handles errors via ErrorBoundary usually, or returns undefined while loading
    const navigate = useNavigate();

    // Mapping logic if necessary (Convex returns _id, frontend might wait for id)
    // The query returns { ...h, id: h._id } so it should be compatible.
    // However, ListeningHistoryItem type check might be strict.
    // Let's assume the spread in convex/podcasts.ts matches.

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

                {/* Error handling in Convex is usually done via wrapping calls or side effects. 
                    If query failed, it throws. For simple UI, we assume success or handled by ErrorBoundary. 
                */}

                {!loading && (!history || history.length === 0) && (
                    <EmptyState
                        icon={Play}
                        title={podcastMsgs.EMPTY_HISTORY}
                        description={podcastMsgs.DASHBOARD_NO_RECOMMENDATIONS}
                        actionLabel={podcastMsgs.ACTION_EXPLORE}
                        onAction={() => navigate('/podcasts')}
                    />
                )}

                {history?.map((item: any) => (
                    <div
                        key={item.id}
                        onClick={() => navigate('/podcasts/player', {
                            state: {
                                episode: {
                                    guid: item.episodeGuid,
                                    title: item.episodeTitle,
                                    audioUrl: item.episodeUrl,
                                    channel: { title: item.channelName, image: item.channelImage }
                                }
                            }
                        })}
                        className="bg-white p-3 rounded-xl shadow-sm flex items-center gap-4 cursor-pointer active:scale-95 transition hover:shadow-md"
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
                    </div>
                ))}
            </div>
        </div>
    );
}
