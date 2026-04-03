import { useRef, useState, useEffect, useMemo } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MobileAudioPlayer } from './MobileAudioPlayer';
import { cn } from '../../lib/utils';
import { Button } from '../ui';
import { MobileWorkspaceHeader } from './MobileWorkspaceHeader';

interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  translation?: string;
}

interface MobileListeningModuleProps {
  readonly unitTitle: string;
  readonly audioUrl: string;
  readonly transcriptData?: TranscriptSegment[];
  readonly onBack: () => void;
  readonly onWordClick?: (word: string) => void;
}

export function MobileListeningModule({
  unitTitle,
  audioUrl,
  transcriptData = [],
  onBack,
  onWordClick: _onWordClick,
}: MobileListeningModuleProps) {
  const { t } = useTranslation();
  const [currentTime, setCurrentTime] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeSegmentRef = useRef<HTMLDivElement>(null);

  // Karaoke Logic
  const activeSegmentIndex = useMemo(() => {
    if (!transcriptData) return -1;
    return transcriptData.findIndex(seg => currentTime >= seg.start && currentTime <= seg.end);
  }, [currentTime, transcriptData]);

  // Auto-scroll to active segment
  useEffect(() => {
    if (activeSegmentIndex >= 0 && activeSegmentRef.current) {
      activeSegmentRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center',
      });
    }
  }, [activeSegmentIndex]);

  return (
    <div className="flex flex-col h-screen bg-muted">
      <MobileWorkspaceHeader
        title={unitTitle}
        subtitle={t('mobileListeningModule.followAlong', {
          defaultValue: 'Follow the transcript while the active line stays in focus.',
        })}
        eyebrow={t('mobileListeningModule.listening', { defaultValue: 'Listening' })}
        onBack={onBack}
        backLabel={t('common.back', { defaultValue: 'Back' })}
        actions={
          <Button
            variant="ghost"
            size="auto"
            type="button"
            className="grid h-11 w-11 place-items-center rounded-2xl border border-border bg-card shadow-sm active:scale-95"
          >
            <MoreHorizontal size={18} className="text-muted-foreground" />
          </Button>
        }
      />

      {/* Transcript View */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-6 pb-[calc(var(--mobile-safe-bottom)+9rem)] space-y-6"
      >
        {transcriptData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <p className="font-bold">
              {t('mobileListeningModule.noTranscript', { defaultValue: 'No transcript available' })}
            </p>
          </div>
        ) : (
          transcriptData.map((segment, index) => {
            const isActive = index === activeSegmentIndex;
            return (
              <div
                key={index}
                ref={isActive ? activeSegmentRef : null}
                className={cn(
                  'transition-all duration-500 p-4 rounded-2xl',
                  isActive
                    ? 'bg-card shadow-lg shadow-primary/10 scale-105 border border-primary/20 opacity-100'
                    : 'opacity-60 grayscale-[0.5] scale-100'
                )}
              >
                <p
                  className={cn(
                    'text-lg font-medium leading-relaxed mb-2 transition-colors',
                    isActive ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {segment.text}
                </p>
                {segment.translation && isActive && (
                  <p className="text-sm text-indigo-500 font-medium animate-in fade-in slide-in-from-top-1">
                    {segment.translation}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Mobile Player */}
      {audioUrl && (
        <MobileAudioPlayer
          audioUrl={audioUrl}
          onTimeUpdate={setCurrentTime}
          initialTime={0} // Could wire up seeking
        />
      )}
    </div>
  );
}
