import { useRef, useState, useEffect, useMemo } from 'react';
import { ArrowLeft, MoreHorizontal } from 'lucide-react';
import { MobileAudioPlayer } from './MobileAudioPlayer';
import { cn } from '../../lib/utils';
import { Button } from '../ui';

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
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-md border-b border-border px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-3 flex items-center justify-between">
        <Button
          variant="ghost"
          size="auto"
          type="button"
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted transition-colors"
        >
          <ArrowLeft size={20} className="text-muted-foreground" />
        </Button>

        <div className="flex flex-col items-center">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Listening
          </span>
          <h1 className="text-sm font-black text-foreground truncate max-w-[200px]">{unitTitle}</h1>
        </div>

        <Button
          variant="ghost"
          size="auto"
          type="button"
          className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted transition-colors"
        >
          <MoreHorizontal size={20} className="text-muted-foreground" />
        </Button>
      </div>

      {/* Transcript View */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6 pb-48 space-y-6">
        {transcriptData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <p className="font-bold">No transcript available</p>
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
                    ? 'bg-card shadow-lg shadow-indigo-100 scale-105 border border-indigo-100 opacity-100'
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
