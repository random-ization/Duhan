import React, { useState } from 'react';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { Video, Play, Eye, Clock } from 'lucide-react';
import { useQuery } from 'convex/react';
import { useAuth } from '../contexts/AuthContext';
import { getLabels } from '../utils/i18n';
import { VideoLibrarySkeleton } from '../components/common';
import { qRef } from '../utils/convexRefs';
import { Button } from '../components/ui';

type ConvexVideoItem = {
  _id: string;
  title: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  level: string;
  duration?: number | null;
  views: number;
  createdAt: number;
};

const LEVELS_KEYS = [
  { key: '', labelKey: 'all' },
  { key: 'Beginner', labelKey: 'beginner' },
  { key: 'Intermediate', labelKey: 'intermediate' },
  { key: 'Advanced', labelKey: 'advanced' },
];

const VideoLibraryPage: React.FC = () => {
  const navigate = useLocalizedNavigate();
  const { language } = useAuth();
  const labels = getLabels(language);
  const [activeLevel, setActiveLevel] = useState('');

  // Convex Integration
  const convexVideos = useQuery(
    qRef<{ level?: string }, ConvexVideoItem[]>('videos:list'),
    activeLevel ? { level: activeLevel } : {}
  );

  // Derived Data State
  const videoData = React.useMemo(() => {
    if (!convexVideos) return [];
    return convexVideos.map((v: ConvexVideoItem) => ({
      ...v,
      id: v._id,
      thumbnailUrl: v.thumbnailUrl || undefined,
      duration: v.duration || undefined,
      description: v.description || undefined,
      createdAt: new Date(v.createdAt).toISOString(),
    }));
  }, [convexVideos]);

  const videos = videoData;
  const loading = convexVideos === undefined;

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getLevelStyle = (level: string) => {
    switch (level) {
      case 'Beginner':
        return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-400/12 dark:text-green-200 dark:border-green-300/25';
      case 'Intermediate':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-400/12 dark:text-yellow-200 dark:border-yellow-300/25';
      case 'Advanced':
        return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-400/12 dark:text-red-200 dark:border-red-300/25';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getLevelLabel = (level: string) => {
    switch (level) {
      case 'Beginner':
        return labels.dashboard?.video?.beginner || 'Beginner';
      case 'Intermediate':
        return labels.dashboard?.video?.intermediate || 'Intermediate';
      case 'Advanced':
        return labels.dashboard?.video?.advanced || 'Advanced';
      default:
        return level;
    }
  };

  const getLocale = (lang: string) => {
    if (lang === 'zh') return 'zh-CN';
    if (lang === 'en') return 'en-US';
    if (lang === 'vi') return 'vi-VN';
    return 'mn-MN';
  };

  if (loading) {
    return <VideoLibrarySkeleton />;
  }

  const renderContent = () => {
    if (videos.length === 0) {
      return (
        <div className="text-center py-20">
          <Video className="w-20 h-20 mx-auto mb-4 text-muted-foreground" />
          <p className="text-xl font-bold text-muted-foreground">
            {labels.dashboard?.video?.noVideos || 'No Videos'}
          </p>
          <p className="text-muted-foreground mt-2">
            {activeLevel
              ? labels.dashboard?.video?.noVideosLevel || 'No videos in this level'
              : labels.dashboard?.video?.preparing || 'Content is being prepared...'}
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map(video => (
          <Button
            key={video.id}
            onClick={() => navigate(`/video/${video.id}`)}
            variant="ghost"
            size="auto"
            className="bg-[#FDFBF7] dark:bg-card rounded-2xl border-2 border-foreground dark:border-border overflow-hidden cursor-pointer hover:shadow-[6px_6px_0px_0px_#18181B] dark:hover:shadow-[6px_6px_0px_0px_rgba(148,163,184,0.28)] transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary text-left w-full p-0 block !shadow-none !whitespace-normal"
          >
            {/* Thumbnail */}
            <div className="aspect-video bg-muted relative overflow-hidden">
              {video.thumbnailUrl ? (
                <img
                  src={video.thumbnailUrl}
                  alt={video.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-400/15 dark:to-purple-400/15">
                  <Video className="w-16 h-16 text-indigo-300 dark:text-indigo-200" />
                </div>
              )}

              {/* Play Button Overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
                <div className="w-16 h-16 bg-card rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xl">
                  <Play className="w-7 h-7 text-indigo-600 dark:text-indigo-300 ml-1" />
                </div>
              </div>

              {/* Duration Badge */}
              <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/80 text-white text-xs font-mono rounded-lg">
                {formatDuration(video.duration)}
              </div>

              {/* Level Badge */}
              <div
                className={`absolute top-3 left-3 px-3 py-1 text-xs font-bold rounded-lg border ${getLevelStyle(video.level)}`}
              >
                {getLevelLabel(video.level)}
              </div>
            </div>

            {/* Content */}
            <div className="p-5">
              <h3 className="font-black text-lg text-foreground line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                {video.title}
              </h3>
              {video.description && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                  {video.description}
                </p>
              )}
              <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {(labels.dashboard?.video?.views || '{count} views').replace(
                    '{count}',
                    String(video.views)
                  )}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {new Date(video.createdAt).toLocaleDateString(getLocale(language))}
                </span>
              </div>
            </div>
          </Button>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background bg-[radial-gradient(#d4d4d8_1px,transparent_1px)] bg-[length:20px_20px] dark:bg-background dark:bg-[radial-gradient(hsl(var(--border))_1px,transparent_1px)] dark:bg-[length:20px_20px]">
      {/* Header */}
      <div className="bg-[#FDFBF7] dark:bg-card/95 border-b-2 border-foreground dark:border-border px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-black text-foreground flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-400/15 rounded-2xl flex items-center justify-center border-2 border-foreground dark:border-border">
              <Video className="w-6 h-6 text-indigo-600 dark:text-indigo-300" />
            </div>
            {labels.dashboard?.video?.title || 'Video Center'}
          </h1>
          <p className="text-muted-foreground mt-2 ml-15">
            {labels.dashboard?.video?.subtitle ||
              'Immersive Korean video learning with subtitles and lookup.'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex flex-wrap gap-2">
          {LEVELS_KEYS.map(level => (
            <Button
              key={level.key}
              onClick={() => setActiveLevel(level.key)}
              variant="ghost"
              size="auto"
              className={`px-5 py-2.5 rounded-xl font-bold transition-all border-2 ${
                activeLevel === level.key
                  ? 'bg-indigo-600 text-primary-foreground border-indigo-600 shadow-lg dark:bg-indigo-400/80 dark:border-indigo-300/35'
                  : 'bg-card text-muted-foreground border-border hover:border-indigo-300 dark:hover:border-indigo-300/35'
              }`}
            >
              {(labels.dashboard?.video as Record<string, string> | undefined)?.[level.labelKey] ||
                level.labelKey}
            </Button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 pb-12">{renderContent()}</div>
    </div>
  );
};

export default VideoLibraryPage;
