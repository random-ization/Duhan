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
import api from '../../services/api';

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

const LEVELS = [
    { key: '', label: '全部' },
    { key: 'Beginner', label: '初级' },
    { key: 'Intermediate', label: '中级' },
    { key: 'Advanced', label: '高级' },
];

const VideoLibraryPage: React.FC = () => {
    const navigate = useNavigate();
    const [videos, setVideos] = useState<VideoItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeLevel, setActiveLevel] = useState('');

    useEffect(() => {
        fetchVideos();
    }, [activeLevel]);

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
            case 'Beginner': return '初级';
            case 'Intermediate': return '中级';
            case 'Advanced': return '高级';
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
                        视频中心
                    </h1>
                    <p className="text-zinc-500 mt-2 ml-15">
                        沉浸式韩语视频学习，配有同步字幕和查词功能
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="max-w-6xl mx-auto px-6 py-6">
                <div className="flex flex-wrap gap-2">
                    {LEVELS.map((level) => (
                        <button
                            key={level.key}
                            onClick={() => setActiveLevel(level.key)}
                            className={`px-5 py-2.5 rounded-xl font-bold transition-all border-2 ${activeLevel === level.key
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg'
                                : 'bg-white text-zinc-600 border-zinc-200 hover:border-indigo-300'
                                }`}
                        >
                            {level.label}
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
                        <p className="text-xl font-bold text-zinc-400">暂无视频</p>
                        <p className="text-zinc-400 mt-2">
                            {activeLevel ? '该等级下暂无视频' : '视频内容正在准备中...'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                                            {video.views} 次观看
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-4 h-4" />
                                            {new Date(video.createdAt).toLocaleDateString('zh-CN')}
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
