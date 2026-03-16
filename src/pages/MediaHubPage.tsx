import { useSearchParams } from 'react-router-dom';
import { ChevronRight, Headphones, MonitorPlay } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useIsMobile } from '../hooks/useIsMobile';
import { MobileMediaPage } from '../components/mobile/MobileMediaPage';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { Button } from '../components/ui';

type SegmentTab = 'videos' | 'podcasts';

export default function MediaHubPage() {
  const [searchParams] = useSearchParams();
  const activeTab: SegmentTab = searchParams.get('tab') === 'podcasts' ? 'podcasts' : 'videos';
  const isMobile = useIsMobile();
  const navigate = useLocalizedNavigate();
  const { t } = useTranslation();
  const videoReturnTo = encodeURIComponent('/media?tab=videos');
  const podcastReturnTo = encodeURIComponent('/media?tab=podcasts');

  if (isMobile) {
    return <MobileMediaPage />;
  }

  return (
    <section className="mx-auto w-full max-w-5xl space-y-4">
      <header className="mb-2">
        <h1 className="text-3xl font-black text-foreground">
          {t('nav.media', { defaultValue: 'Media' })}
        </h1>
        <p className="text-sm font-semibold text-muted-foreground mt-1">
          {t('media.hub.subtitle', {
            defaultValue: 'Pick a lane: long-form podcasts or short-form videos.',
          })}
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Button
          type="button"
          onClick={() => navigate(`/videos?returnTo=${videoReturnTo}`)}
          variant="ghost"
          size="auto"
          className={`w-full rounded-3xl border bg-gradient-to-br p-5 text-left transition hover:-translate-y-0.5 hover:shadow-lg !block !whitespace-normal !shadow-none ${
            activeTab === 'videos'
              ? 'from-indigo-100 to-blue-100 border-indigo-300'
              : 'from-indigo-50 to-blue-50 border-indigo-200'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-xl bg-card p-2.5 shadow-sm">
                <MonitorPlay size={20} className="text-indigo-600 dark:text-indigo-300" />
              </div>
              <div>
                <h2 className="text-lg font-black text-foreground">
                  {t('nav.videos', { defaultValue: 'Videos' })}
                </h2>
                <p className="mt-1 text-sm font-semibold text-muted-foreground">
                  {t('media.hub.videosDesc', {
                    defaultValue: 'Dialog scenes, subtitles, and replay-based drills.',
                  })}
                </p>
              </div>
            </div>
            <ChevronRight size={18} className="text-muted-foreground" />
          </div>
        </Button>

        <Button
          type="button"
          onClick={() => navigate(`/podcasts?returnTo=${podcastReturnTo}`)}
          variant="ghost"
          size="auto"
          className={`w-full rounded-3xl border bg-gradient-to-br p-5 text-left transition hover:-translate-y-0.5 hover:shadow-lg !block !whitespace-normal !shadow-none ${
            activeTab === 'podcasts'
              ? 'from-emerald-100 to-teal-100 border-emerald-300'
              : 'from-emerald-50 to-teal-50 border-emerald-200'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-xl bg-card p-2.5 shadow-sm">
                <Headphones size={20} className="text-emerald-600 dark:text-emerald-300" />
              </div>
              <div>
                <h2 className="text-lg font-black text-foreground">
                  {t('nav.podcasts', { defaultValue: 'Podcasts' })}
                </h2>
                <p className="mt-1 text-sm font-semibold text-muted-foreground">
                  {t('media.hub.podcastsDesc', {
                    defaultValue: 'Follow channels, keep history, and learn on the move.',
                  })}
                </p>
              </div>
            </div>
            <ChevronRight size={18} className="text-muted-foreground" />
          </div>
        </Button>
      </div>
    </section>
  );
}
