import { useMemo, useState } from 'react';
import { ArrowLeft, PlayCircle, Settings2, Sparkles, BookOpen } from 'lucide-react';
import { cn } from '../../lib/utils';
import { InteractiveWordChip } from './InteractiveWordChip';
import { Button } from '../ui';

interface MobileReadingModuleProps {
  readonly unitTitle: string;
  readonly unitData: any; // Type as needed, mainly needs chunks/paragraphs
  readonly onBack: () => void;
  readonly onWordClick: (word: string) => void;
}

export function MobileReadingModule({
  unitTitle,
  unitData, // Should contain readingText
  onBack,
  onWordClick,
}: MobileReadingModuleProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  // Parse text into "bubbles"
  const textSegments = useMemo(() => {
    if (!unitData?.readingText) return [];
    const rawText = unitData.readingText;

    return rawText
      .split('\n')
      .filter((line: string) => line.trim().length > 0)
      .map((line: string, index: number) => {
        // Basic speaker detection for styling (Right/Left alignment)
        const match = /^([A-Za-z가-힣0-9]+)[:：]/.exec(line);
        const speaker = match ? match[1] : null;
        const content = match ? line.substring(match[0].length).trim() : line;

        return {
          id: index,
          speaker,
          content,
          type: 'message' as const,
        };
      });
  }, [unitData]);

  return (
    <div className="flex flex-col min-h-screen bg-muted font-sans">
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
            Reading Practice
          </span>
          <h1 className="text-sm font-black text-foreground truncate max-w-[200px]">{unitTitle}</h1>
        </div>

        <Button
          variant="ghost"
          size="auto"
          type="button"
          className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted transition-colors"
        >
          <Settings2 size={20} className="text-muted-foreground" />
        </Button>
      </div>

      {/* Chat Stream */}
      <div className="flex-1 p-4 pb-32 space-y-6">
        {/* Intro Card */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-6 text-white shadow-lg shadow-indigo-200 mb-8">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-card/20 flex items-center justify-center backdrop-blur-sm">
              <BookOpen size={24} className="text-white" />
            </div>
            <span className="bg-card/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold border border-white/10">
              LEVEL 1
            </span>
          </div>
          <h2 className="text-2xl font-black mb-2 opacity-90 leading-tight">
            Let&apos;s read today&apos;s story.
          </h2>
          <p className="text-sm opacity-80 font-medium">
            Tap any underlined word to see its meaning.
          </p>
        </div>

        {textSegments.length === 0 && (
          <div className="text-center text-muted-foreground py-10 font-bold">
            No text content available.
          </div>
        )}

        {textSegments.map((segment: any) => (
          <div
            key={segment.id}
            className="group animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both"
            style={{ animationDelay: `${segment.id * 100}ms` }}
          >
            {segment.speaker && (
              <div className="ml-4 mb-1 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {segment.speaker}
              </div>
            )}
            <div
              className={cn(
                'relative p-5 rounded-[24px] text-lg font-medium leading-relaxed shadow-sm border border-border',
                'bg-card text-muted-foreground'
              )}
            >
              {/* Content - Word Chip logic */}
              <div className="leading-[1.8] flex flex-wrap items-center content-start">
                {segment.content.split(' ').map((word: string, i: number) => (
                  <InteractiveWordChip key={i} word={word} onClick={onWordClick} />
                ))}
              </div>

              {/* Inline Action Button (Translation/Audio) */}
              <div className="absolute -right-2 -bottom-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity scale-90 group-hover:scale-100">
                <Button
                  variant="ghost"
                  size="auto"
                  type="button"
                  className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-md"
                >
                  <PlayCircle size={14} className="fill-current" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Action Bar (Sticky) */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border p-4 pb-[calc(env(safe-area-inset-bottom)+16px)] z-20 flex gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <Button
          variant="ghost"
          size="auto"
          type="button"
          onClick={() => setIsPlaying(!isPlaying)}
          className="flex-1 h-14 bg-primary rounded-full flex items-center justify-center gap-3 text-white font-black text-lg active:scale-95 transition-transform shadow-xl shadow-slate-900/20"
        >
          {isPlaying ? (
            <>Stop Audio</>
          ) : (
            <>
              <PlayCircle className="fill-current" /> Play Full Audio
            </>
          )}
        </Button>

        <Button
          variant="ghost"
          size="auto"
          type="button"
          className="h-14 w-14 rounded-full bg-muted border border-border flex items-center justify-center active:scale-95 transition-transform"
        >
          <Sparkles size={24} className="text-indigo-500" />
        </Button>
      </div>
    </div>
  );
}
