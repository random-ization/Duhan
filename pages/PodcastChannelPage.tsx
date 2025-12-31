import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Play, Clock, Heart, Share2, ChevronDown, ChevronUp } from 'lucide-react';
import { useAction, useQuery, useMutation } from 'convex/react';
import { api as convexApi } from '../convex/_generated/api';
import { useAuth } from '../contexts/AuthContext';
import BackButton from '../components/ui/BackButton';

interface Episode {
    title: string;
    audioUrl?: string;
    pubDate?: string | Date;
    duration?: string | number;
    description?: string;
}

interface ChannelData {
    title?: string;
    author?: string;
    description?: string;
    image?: string;
}

interface FeedData {
    channel: ChannelData;
    episodes: Episode[];
}

const PodcastChannelPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();

    // Get channel from navigation state or query params
    const stateChannel = (location.state as any)?.channel;
    // 🔥 FIX: Prioritize URL params (survive page refresh)
    const feedUrl = searchParams.get('feedUrl') || stateChannel?.feedUrl;
    const channelId = searchParams.get('id') || stateChannel?.itunesId || stateChannel?.id;

    const [data, setData] = useState<FeedData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDescExpanded, setIsDescExpanded] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);

    // Convex actions and queries
    const getEpisodesAction = useAction(convexApi.podcasts.getEpisodes);
    const subscriptions = useQuery(convexApi.podcasts.getSubscriptions, user ? { userId: user.id } : "skip");
    const toggleSubscriptionMutation = useMutation(convexApi.podcasts.toggleSubscription);

    useEffect(() => {
        if (!feedUrl) {
            if (stateChannel) {
                setLoading(false);
            } else {
                setError('缺少频道 Feed URL');
                setLoading(false);
            }
            return;
        }

        const fetchEpisodes = async () => {
            try {
                const result = await getEpisodesAction({ feedUrl });
                setData(result);
            } catch (err) {
                console.error('Failed to fetch episodes:', err);
                setError('无法加载播客剧集');
            } finally {
                setLoading(false);
            }
        };

        fetchEpisodes();
    }, [feedUrl]);

    // Check subscription status from Convex query
    useEffect(() => {
        if (!channelId || !subscriptions) return;
        const isSub = subscriptions.some((c: any) =>
            String(c.itunesId) === String(channelId) || String(c._id) === String(channelId)
        );
        setIsSubscribed(isSub);
    }, [subscriptions, channelId]);

    const handleToggleSubscribe = async () => {
        if (!user) {
            alert('请先登录');
            return;
        }

        const channelInfo = data?.channel || stateChannel;
        if (!channelId || !channelInfo) {
            console.error('Cannot subscribe: Missing channel info');
            return;
        }

        const oldState = isSubscribed;
        setIsSubscribed(!oldState);

        try {
            await toggleSubscriptionMutation({
                userId: user.id,
                channel: {
                    itunesId: String(channelId),
                    title: channelInfo.title || 'Unknown',
                    author: channelInfo.author || 'Unknown',
                    feedUrl: feedUrl || '',
                    artworkUrl: channelInfo.image || channelInfo.artworkUrl || channelInfo.artwork || '',
                },
            });
        } catch (err: any) {
            setIsSubscribed(oldState);
            console.error('Failed to toggle subscription:', err);
            alert('订阅失败: ' + (err?.message || '请稍后重试'));
        }
    };

    const handlePlayEpisode = (episode: Episode) => {
        const fullEpisode = {
            ...episode,
            channelTitle: data?.channel.title,
            channelArtwork: data?.channel.image,
            // Fallback for missing GUID (use title or audio hash if needed)
            guid: (episode as any).guid || (episode as any).link || (episode as any).id || episode.title
        };

        const params = new URLSearchParams();
        params.set('audioUrl', fullEpisode.audioUrl || '');
        params.set('title', fullEpisode.title);
        if (fullEpisode.guid) params.set('guid', fullEpisode.guid);
        if (fullEpisode.channelTitle) params.set('channelTitle', fullEpisode.channelTitle);
        if (fullEpisode.channelArtwork) params.set('channelArtwork', fullEpisode.channelArtwork);

        navigate(`/podcasts/player?${params.toString()}`, {
            state: {
                episode: fullEpisode,
                // Ensure channel info is passed for subscription check
                channel: {
                    ...stateChannel,
                    ...data?.channel,
                    itunesId: channelId,
                    feedUrl: feedUrl
                }
            }
        });
    };

    const formatDuration = (duration: string | number | undefined) => {
        if (!duration) return '—';
        if (typeof duration === 'number') {
            const mins = Math.floor(duration / 60);
            return `${mins} 分钟`;
        }
        // Already formatted string like "01:23:45" or "23:45"
        return duration;
    };

    const formatDate = (dateStr: string | Date | undefined) => {
        if (!dateStr) return '';
        try {
            const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
            return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', year: 'numeric' });
        } catch {
            return String(dateStr);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-10 w-10 border-3 border-indigo-500 border-t-transparent mx-auto" />
                    <p className="text-slate-500 text-sm">加载剧集中...</p>
                </div>
            </div>
        );
    }

    // Allow rendering if we have data OR stateChannel
    const displayChannel = data?.channel || stateChannel;

    if (error && !displayChannel) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-white space-y-4">
                <p className="text-red-500">{error || '加载失败'}</p>
                <button
                    onClick={() => navigate(-1)}
                    className="text-indigo-600 hover:underline flex items-center gap-1"
                >
                    <ArrowLeft className="w-4 h-4" /> 返回
                </button>
            </div>
        );
    }

    if (!displayChannel) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-white space-y-4">
                <p className="text-slate-500">无法找到频道信息</p>
                <button onClick={() => navigate(-1)} className="text-indigo-600">返回</button>
            </div>
        );
    }

    const channelImage = displayChannel.image || displayChannel.artworkUrl || displayChannel.artwork || 'https://placehold.co/400x400';

    return (
        <div className="min-h-screen bg-white pb-24">
            {/* Header with Blur Effect */}
            <div className="relative h-72 overflow-hidden bg-slate-900 text-white">
                {/* Blurred Background */}
                {channelImage && (
                    <div
                        className="absolute inset-0 bg-cover bg-center blur-2xl scale-110 opacity-40"
                        style={{ backgroundImage: `url(${channelImage})` }}
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60" />

                {/* Back Button */}
                <div className="absolute top-4 left-4 z-20">
                    <BackButton onClick={() => navigate(-1)} className="bg-black/30 backdrop-blur border-white/20 hover:bg-black/50" />
                </div>

                {/* Share Button */}
                <button className="absolute top-4 right-4 z-20 p-2 bg-black/30 backdrop-blur rounded-full hover:bg-black/50 transition-colors">
                    <Share2 className="w-5 h-5" />
                </button>

                {/* Channel Info */}
                <div className="absolute bottom-0 left-0 right-0 z-10 p-6">
                    <div className="flex gap-4 items-end">
                        {channelImage && (
                            <img
                                src={channelImage}
                                alt={data.channel.title}
                                className="w-24 h-24 rounded-xl shadow-2xl border-2 border-white/20"
                            />
                        )}
                        <div className="flex-1 min-w-0">
                            <h1 className="text-2xl font-bold leading-tight mb-1 drop-shadow-lg">
                                {displayChannel.title}
                            </h1>
                            <p className="text-sm opacity-80">{displayChannel.author}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Subscribe Button */}
            <div className="px-4 py-4 border-b border-slate-100">
                <button
                    onClick={handleToggleSubscribe}
                    className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors ${isSubscribed
                        ? 'bg-pink-100 text-pink-600'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}
                >
                    <Heart className={`w-5 h-5 ${isSubscribed ? 'fill-current' : ''}`} />
                    {isSubscribed ? '已订阅' : '订阅频道'}
                </button>
            </div>

            {/* Description */}
            {displayChannel.description && (
                <div className="px-4 py-4 bg-slate-50 border-b border-slate-100">
                    <p className={`text-sm text-slate-600 leading-relaxed ${!isDescExpanded ? 'line-clamp-3' : ''}`}>
                        {displayChannel.description}
                    </p>
                    {displayChannel.description.length > 150 && (
                        <button
                            onClick={() => setIsDescExpanded(!isDescExpanded)}
                            className="mt-2 text-xs text-indigo-600 font-medium flex items-center gap-1"
                        >
                            {isDescExpanded ? (
                                <>收起 <ChevronUp className="w-4 h-4" /></>
                            ) : (
                                <>展开 <ChevronDown className="w-4 h-4" /></>
                            )}
                        </button>
                    )}
                </div>
            )}

            {/* Episode List */}
            <div className="p-4">
                <h2 className="font-bold text-lg text-slate-800 mb-4">
                    剧集 ({data?.episodes?.length || 0})
                </h2>
                {(!data?.episodes || data.episodes.length === 0) && (
                    <div className="text-center py-12 text-slate-400">
                        <p>暂无剧集信息</p>
                        {!feedUrl && <p className="text-xs mt-2">Feed URL 未找到，无法加载剧集</p>}
                    </div>
                )}
                <div className="space-y-3">
                    {data?.episodes?.map((episode, idx) => (
                        <div
                            key={idx}
                            onClick={() => handlePlayEpisode(episode)}
                            className="flex items-center gap-4 p-4 rounded-xl hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer border border-slate-100 hover:border-slate-200 hover:shadow-sm"
                        >
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
                                <Play className="w-5 h-5" fill="currentColor" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-slate-800 line-clamp-2 mb-1">
                                    {episode.title}
                                </h3>
                                <div className="flex items-center gap-3 text-xs text-slate-400">
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {formatDuration(episode.duration)}
                                    </span>
                                    <span>•</span>
                                    <span>{formatDate(episode.pubDate)}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PodcastChannelPage;
