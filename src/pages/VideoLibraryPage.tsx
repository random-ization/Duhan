import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Video,
    Play,
    Eye,
    Clock,
    Loader2,
    Search,
    Filter
} from 'lucide-react';
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from '../../contexts/AuthContext';
import { getLabels } from '../../utils/i18n';
import { VideoLibrarySkeleton } from '../../components/common';

interface VideoItem {
    id: string;
    title: string;
    description?: string;
    thumbnailUrl?: string;
    level: string;
    duration?: number;
    views: number;
    createdAt: string;
}

const LEVELS_KEYS = [
    { key: '', labelKey: 'all' },
    { key: 'Beginner', labelKey: 'beginner' },
    { key: 'Intermediate', labelKey: 'intermediate' },
    { key: 'Advanced', labelKey: 'advanced' },
];

const VideoLibraryPage: React.FC = () => {
    const navigate = useNavigate();
    const { language } = useAuth();
    const labels = getLabels(language);
    const [videos, setVideos] = useState<VideoItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeLevel, setActiveLevel] = useState('');

    // Convex Integration
    const listVideosApi: any = api.videos.list;
    const convexVideos = useQuery(listVideosApi, activeLevel ? { level: activeLevel } : {});

    useEffect(() => {
        if (convexVideos) {
            setVideos(convexVideos.map(v => ({
                ...v,
                id: v._id,
                thumbnailUrl: v.thumbnailUrl || undefined,
                duration: v.duration || undefined,
                description: v.description || undefined,
                createdAt: new Date(v.createdAt).toISOString() // Convert numeric timestamp to ISO string if needed for display
            })));
            setLoading(false);
        }
    }, [convexVideos]);

    // Early return for loading state - MUST be after all hooks
    if (convexVideos === undefined) {
        return <VideoLibrarySkeleton />;
    }

    // Legacy fetch removed
    /*
    const fetchVideos = async () => {
        try {
            setLoading(true);
            const response = await api.video.list(activeLevel || undefined);
            if (response.success) {
                setVideos(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch videos:', error);
        } finally {
            setLoading(false);
        }
    };
    */

    const formatDuration = (seconds?: number) => {
        if (!seconds) return '--:--';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getLevelStyle = (level: string) => {
        switch (level) {
            case 'Beginner':
                return 'bg-green-100 text-green-700 border-green-200';
            case 'Intermediate':
                return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'Advanced':
                return 'bg-red-100 text-red-700 border-red-200';
            default:
                return 'bg-zinc-100 text-zinc-700 border-zinc-200';
        }
    };

    const getLevelLabel = (level: string) => {
        switch (level) {
            case 'Beginner': return labels.dashboard?.video?.beginner || 'Beginner';
            case 'Intermediate': return labels.dashboard?.video?.intermediate || 'Intermediate';
            case 'Advanced': return labels.dashboard?.video?.advanced || 'Advanced';
            default: return level;
        }
    };

    return (
        <div
            className="min-h-screen"
            style={{
                backgroundImage: 'radial-gradient(#d4d4d8 1px, transparent 1px)',
                backgroundSize: '20px 20px',
                backgroundColor: '#f4f4f5'
            }}
        >
            {/* Header */}
            <div className="bg-[#FDFBF7] border-b-2 border-zinc-900 px-6 py-8">
                <div className="max-w-6xl mx-auto">
                    <h1 className="text-3xl font-black text-zinc-900 flex items-center gap-3">
                        <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center border-2 border-zinc-900">
                            <Video className="w-6 h-6 text-indigo-600" />
                        </div>
                        {labels.dashboard?.video?.title || "Video Center"}
                    </h1>
                    <p className="text-zinc-500 mt-2 ml-15">
                        {labels.dashboard?.video?.subtitle || "Immersive Korean video learning with subtitles and lookup."}
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="max-w-6xl mx-auto px-6 py-6">
                <div className="flex flex-wrap gap-2">
                    {LEVELS_KEYS.map((level) => (
                        <button
                            key={level.key}
                            onClick={() => setActiveLevel(level.key)}
                            className={`px-5 py-2.5 rounded-xl font-bold transition-all border-2 ${activeLevel === level.key
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg'
                                : 'bg-white text-zinc-600 border-zinc-200 hover:border-indigo-300'
                                }`}
                        >
                            {labels.dashboard?.video?.[level.labelKey as any] || level.labelKey}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto px-6 pb-12">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                    </div>
                ) : videos.length === 0 ? (
                    <div className="text-center py-20">
                        <Video className="w-20 h-20 mx-auto mb-4 text-zinc-300" />
                        <p className="text-xl font-bold text-zinc-400">{labels.dashboard?.video?.noVideos || "No Videos"}</p>
                        <p className="text-zinc-400 mt-2">
                            {activeLevel ? (labels.dashboard?.video?.noVideosLevel || 'No videos in this level') : (labels.dashboard?.video?.preparing || 'Content is being prepared...')}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {videos.map((video) => (
                            <div
                                key={video.id}
                                onClick={() => navigate(`/video/${video.id}`)}
                                className="bg-[#FDFBF7] rounded-2xl border-2 border-zinc-900 overflow-hidden cursor-pointer hover:shadow-[6px_6px_0px_0px_#18181B] transition-all group"
                            >
                                {/* Thumbnail */}
                                <div className="aspect-video bg-zinc-200 relative overflow-hidden">
                                    {video.thumbnailUrl ? (
                                        <img
                                            src={video.thumbnailUrl}
                                            alt={video.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100">
                                            <Video className="w-16 h-16 text-indigo-300" />
                                        </div>
                                    )}

                                    {/* Play Button Overlay */}
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
                                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xl">
                                            <Play className="w-7 h-7 text-indigo-600 ml-1" />
                                        </div>
                                    </div>

                                    {/* Duration Badge */}
                                    <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/80 text-white text-xs font-mono rounded-lg">
                                        {formatDuration(video.duration)}
                                    </div>

                                    {/* Level Badge */}
                                    <div className={`absolute top-3 left-3 px-3 py-1 text-xs font-bold rounded-lg border ${getLevelStyle(video.level)}`}>
                                        {getLevelLabel(video.level)}
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-5">
                                    <h3 className="font-black text-lg text-zinc-900 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                                        {video.title}
                                    </h3>
                                    {video.description && (
                                        <p className="text-sm text-zinc-500 mt-2 line-clamp-2">
                                            {video.description}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-4 mt-4 text-sm text-zinc-400">
                                        <span className="flex items-center gap-1">
                                            <Eye className="w-4 h-4" />
                                            {(labels.dashboard?.video?.views || "{count} views").replace('{count}', String(video.views))}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-4 h-4" />
                                            {new Date(video.createdAt).toLocaleDateString(language === 'zh' ? 'zh-CN' : language === 'en' ? 'en-US' : language === 'vi' ? 'vi-VN' : 'mn-MN')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default VideoLibraryPage;
