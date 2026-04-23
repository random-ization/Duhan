import { useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Button, Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '../ui';

interface TranscriptLine {
  readonly start: number;
  readonly end: number;
  readonly text: string;
  readonly translation: string;
  readonly words?: { word: string; start: number; end: number }[];
}

interface VirtualizedTranscriptProps {
  readonly transcript: TranscriptLine[];
  readonly activeLineIndex: number;
  readonly currentTime: number;
  readonly showTranslation: boolean;
  readonly noTranslationText: string;
  readonly analyzeLabel: string;
  readonly onSeek: (time: number) => void;
  readonly onAnalyze: (line: TranscriptLine) => void;
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function TranscriptLineRow({
  line,
  index,
  activeLineIndex,
  currentTime,
  showTranslation,
  noTranslationText,
  analyzeLabel,
  onSeek,
  onAnalyze,
}: Readonly<{
  line: TranscriptLine;
  index: number;
  activeLineIndex: number;
  currentTime: number;
  showTranslation: boolean;
  noTranslationText: string;
  analyzeLabel: string;
  onSeek: (time: number) => void;
  onAnalyze: (line: TranscriptLine) => void;
}>) {
  const isActive = index === activeLineIndex;

  return (
    <div
      id={`line-${index}`}
      className={`group relative rounded-xl border-l-4 p-3 transition-all duration-300 md:rounded-2xl md:p-6 ${
        isActive
          ? 'z-10 border-indigo-500 bg-card shadow-lg dark:border-indigo-300/50'
          : 'border-transparent bg-transparent hover:border-border hover:bg-card/60'
      }`}
    >
      <div className="flex items-start gap-3 md:gap-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onSeek(line.start)}
          className={`flex-none rounded-md px-2 py-1 text-[10px] font-bold transition-colors md:text-[11px] ${
            isActive
              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200'
              : 'bg-muted text-muted-foreground group-hover:bg-muted'
          }`}
        >
          {formatTime(line.start)}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="auto"
          onClick={() => onSeek(line.start)}
          className="h-auto w-full min-w-0 flex-1 items-start whitespace-normal px-0 py-0 text-left font-normal"
        >
          <div className="flex w-full flex-col items-start space-y-2">
            <div
              className={`flex flex-wrap gap-x-1 break-words text-base leading-relaxed [overflow-wrap:anywhere] md:text-xl ${
                isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
              }`}
            >
              {line.words && line.words.length > 0 ? (
                line.words.map((word, wordIndex) => {
                  const isWordActive = currentTime >= word.start && currentTime < word.end;
                  return (
                    <span
                      key={`${word.start}-${word.word}-${wordIndex}`}
                      className={`rounded px-0.5 transition-all duration-75 ${
                        isWordActive
                          ? 'scale-105 bg-indigo-600 text-white shadow-sm dark:bg-indigo-500 dark:text-primary-foreground'
                          : 'hover:bg-indigo-50 dark:hover:bg-indigo-500/15'
                      }`}
                    >
                      {word.word}
                    </span>
                  );
                })
              ) : (
                <span>{line.text}</span>
              )}
            </div>

            {showTranslation && (
              <p
                className={`border-l-2 pl-2.5 text-sm leading-relaxed break-words [overflow-wrap:anywhere] md:pl-3 md:text-base ${
                  isActive
                    ? 'border-indigo-200 text-indigo-600/80 dark:border-indigo-400/40 dark:text-indigo-300'
                    : 'border-border text-muted-foreground'
                }`}
              >
                {line.translation || (
                  <span className="text-sm italic text-muted-foreground">{noTranslationText}</span>
                )}
              </p>
            )}
          </div>
        </Button>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={analyzeLabel}
              onClick={event => {
                event.stopPropagation();
                onAnalyze(line);
              }}
              className={`flex-none rounded-full p-1.5 transition-all md:p-2 ${
                isActive
                  ? 'bg-indigo-100 text-indigo-600 opacity-100 dark:bg-indigo-500/20 dark:text-indigo-200'
                  : 'border border-border bg-card text-muted-foreground opacity-0 shadow-sm group-hover:opacity-100'
              } hover:scale-110 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-500 dark:hover:text-primary-foreground`}
            >
              <Sparkles className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipContent side="top">{analyzeLabel}</TooltipContent>
          </TooltipPortal>
        </Tooltip>
      </div>
    </div>
  );
}

export default function VirtualizedTranscript({
  transcript,
  activeLineIndex,
  currentTime,
  showTranslation,
  noTranslationText,
  analyzeLabel,
  onSeek,
  onAnalyze,
}: VirtualizedTranscriptProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: transcript.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => (showTranslation ? 132 : 88),
    measureElement: element =>
      element?.getBoundingClientRect().height ?? (showTranslation ? 132 : 88),
  });

  useEffect(() => {
    if (activeLineIndex >= 0 && activeLineIndex < transcript.length) {
      virtualizer.scrollToIndex(activeLineIndex, {
        align: 'auto',
        behavior: 'smooth',
      });
    }
  }, [activeLineIndex, transcript.length, virtualizer]);

  const items = virtualizer.getVirtualItems();

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto" data-testid="virtualized-transcript">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {items.map(virtualItem => {
          const line = transcript[virtualItem.index];
          if (!line) return null;

          return (
            <div
              key={`${line.start}-${line.text}-${virtualItem.index}`}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
              data-index={virtualItem.index}
            >
              <TranscriptLineRow
                line={line}
                index={virtualItem.index}
                activeLineIndex={activeLineIndex}
                currentTime={currentTime}
                showTranslation={showTranslation}
                noTranslationText={noTranslationText}
                analyzeLabel={analyzeLabel}
                onSeek={onSeek}
                onAnalyze={onAnalyze}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
