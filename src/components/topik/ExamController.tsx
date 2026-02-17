import React, { useState, useEffect, useRef } from 'react';
import {
  MediaPlayer,
  MediaProvider,
  PlayButton,
  VolumeSlider,
  TimeSlider,
  SeekButton,
} from '@vidstack/react';
import {
  Play,
  Pause,
  Grid, // Overview icon
  Check, // Submit icon
  FastForward,
  Rewind,
  LogOut, // Exit icon
} from 'lucide-react';
import { TopikExam, TopikQuestion } from '../../types';
import { Button } from '../ui';
import { DialogPortal } from '../ui';
import { Popover, PopoverAnchor, PopoverContent } from '../ui';

interface ExamControllerProps {
  exam: TopikExam;
  questions: TopikQuestion[];
  userAnswers: Record<number, number>;
  currentQuestionIndex: number;
  onQuestionSelect: (index: number) => void;
  onSubmit: () => void;
  onExit?: () => void;
  timeLeft: number;
  audioUrl?: string;
}

export const ExamController: React.FC<ExamControllerProps> = ({
  exam: _exam,
  questions,
  userAnswers,
  currentQuestionIndex,
  onQuestionSelect,
  onSubmit,
  onExit,
  timeLeft,
  audioUrl,
}) => {
  const [showOverview, setShowOverview] = useState(false);

  // Auto-scroll the question list to keep current question in view
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector(
        `[data-question-index="${currentQuestionIndex}"]`
      ) as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentQuestionIndex]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const isLowTime = timeLeft < 300; // 5 minutes warning

  const renderAudioControls = () => (
    <div className="flex flex-col items-center gap-3 my-1 w-full px-2">
      {/* Volume Slider (Vertical) */}
      <div className="h-20 py-2 group/volume flex justify-center w-full relative">
        <VolumeSlider.Root
          className="relative flex flex-col items-center select-none touch-none w-6 h-full group/volume cursor-pointer"
          orientation="vertical"
        >
          <VolumeSlider.Track className="relative w-1.5 h-full bg-muted rounded-full overflow-hidden">
            <VolumeSlider.TrackFill className="absolute bottom-0 w-full bg-indigo-500 rounded-full will-change-[height] h-[var(--slider-fill)]" />
          </VolumeSlider.Track>
          <VolumeSlider.Thumb className="absolute w-3 h-3 bg-indigo-600 rounded-full shadow-md opacity-0 group-hover/volume:opacity-100 left-1/2 -translate-x-1/2 focus:opacity-100" />
        </VolumeSlider.Root>

        {/* Playback speed label (decoration) */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-4 text-[9px] font-mono text-muted-foreground font-bold whitespace-nowrap">
          Vol
        </div>
      </div>

      <div className="w-full px-1 flex flex-col items-center gap-2 mt-4">
        {/* Progress Bar (Horizontal) */}
        <TimeSlider.Root className="group relative flex items-center w-full h-4 cursor-pointer touch-none select-none">
          <TimeSlider.Track className="relative w-full h-1 bg-muted rounded-full overflow-hidden">
            <TimeSlider.TrackFill className="absolute h-full bg-indigo-500 rounded-full will-change-[width] w-[var(--slider-fill)]" />
            <TimeSlider.Progress className="absolute h-full bg-indigo-300 rounded-full w-[var(--slider-progress)] will-change-[width]" />
          </TimeSlider.Track>
          <TimeSlider.Thumb className="absolute w-2.5 h-2.5 bg-indigo-600 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity ring-2 ring-indigo-500/50" />
        </TimeSlider.Root>

        {/* Seek Buttons Row */}
        <div className="flex items-center justify-between w-full px-1">
          <SeekButton
            seconds={-10}
            className="text-muted-foreground hover:text-muted-foreground transition-colors"
          >
            <Rewind className="w-3 h-3" />
          </SeekButton>
          <SeekButton
            seconds={10}
            className="text-muted-foreground hover:text-muted-foreground transition-colors"
          >
            <FastForward className="w-3 h-3" />
          </SeekButton>
        </div>

        {/* Play/Pause Button */}
        <PlayButton className="w-12 h-12 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 transition-all flex items-center justify-center shrink-0 shadow-pop active:scale-95 group mt-1">
          {/* Show Play when PAUSED (data-paused present) */}
          <Play className="w-5 h-5 ml-0.5 fill-current hidden group-data-[paused]:block" />
          {/* Show Pause when PLAYING (data-paused NOT present) */}
          <Pause className="w-5 h-5 fill-current block group-data-[paused]:hidden" />
        </PlayButton>
      </div>
    </div>
  );

  const renderContent = () => (
    <div className="flex flex-col h-full w-full items-center py-4 text-muted-foreground select-none">
      {/* 1. Question Navigation List (Vertical Scroll) */}
      <div
        ref={listRef}
        className="flex-1 w-full overflow-y-auto scrollbar-hide flex flex-col items-center gap-2.5 px-1 mb-2 mask-linear-gradient"
        style={{ maxHeight: audioUrl ? '25vh' : '50vh', minHeight: '100px' }}
      >
        {questions.map((question, idx) => {
          const isActive = currentQuestionIndex === idx;
          const isAnswered = userAnswers[idx] !== undefined;

          return (
            <Button
              key={question.id}
              data-question-index={idx}
              type="button"
              variant="ghost"
              size="auto"
              onClick={() => onQuestionSelect(idx)}
              className={`
                w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all shrink-0 shadow-sm
                ${getQuestionButtonClass(isActive, isAnswered)}
              `}
            >
              {idx + 1}
            </Button>
          );
        })}
      </div>

      {/* Divider */}
      {audioUrl && <div className="w-12 h-[1px] bg-muted my-3 shrink-0" />}

      {/* 2. Audio Controls */}
      {audioUrl && renderAudioControls()}
    </div>
  );

  return (
    <DialogPortal>
      <div className="fixed right-6 top-1/2 -translate-y-1/2 z-[50] flex flex-col items-center gap-4">
        {/* Timer Badge (Floating above) */}
        <div
          className={`
            px-3 py-1.5 rounded-full bg-card/90 backdrop-blur-md border border-border shadow-sm
            text-xs font-mono font-bold mb-2
            ${
              isLowTime
                ? 'text-red-500 dark:text-red-300 animate-pulse border-red-200 dark:border-red-400/30 bg-red-50 dark:bg-red-500/10'
                : 'text-muted-foreground'
            }
          `}
        >
          {formatTime(timeLeft)}
        </div>

        {/* Main Controller Capsule */}
        <Popover open={showOverview} onOpenChange={setShowOverview}>
          <div className="relative">
            <PopoverAnchor>
              <div className="relative border border-border shadow-xl rounded-[40px] w-[90px] transition-all duration-300 ease-out flex flex-col overflow-hidden bg-card">
                {audioUrl ? (
                  <MediaPlayer src={audioUrl} className="w-full h-full flex flex-col">
                    <MediaProvider />
                    {renderContent()}
                  </MediaPlayer>
                ) : (
                  renderContent()
                )}
              </div>
            </PopoverAnchor>

            {/* Overview Popover (Appears to the LEFT of the controller) */}
            <PopoverContent
              unstyled
              forceMount
              className="absolute top-0 right-[105px] w-[280px] bg-card/95 backdrop-blur-xl border border-border rounded-3xl shadow-xl overflow-hidden transition-all duration-300 origin-right data-[state=open]:opacity-100 data-[state=open]:scale-100 data-[state=open]:translate-x-0 data-[state=closed]:opacity-0 data-[state=closed]:scale-95 data-[state=closed]:translate-x-4 data-[state=closed]:invisible data-[state=closed]:pointer-events-none"
              style={{ maxHeight: '600px', height: 'auto' }}
            >
              {/* Popover Header */}
              <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-muted/50">
                <span className="text-muted-foreground font-bold text-sm">题目概览</span>

                <div className="text-xs font-mono text-muted-foreground">
                  <span className="text-emerald-600 font-bold">
                    {Object.keys(userAnswers).length}
                  </span>
                  <span className="mx-1 text-muted-foreground">/</span>
                  <span>{questions.length}</span>
                  <span className="ml-1 text-[10px] uppercase opacity-70">Done</span>
                </div>
              </div>

              {/* Popover Grid */}
              <div className="p-4 grid grid-cols-5 gap-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                {questions.map((question, idx) => {
                  const isActive = currentQuestionIndex === idx;
                  const isAnswered = userAnswers[idx] !== undefined;
                  return (
                    <Button
                      key={question.id}
                      type="button"
                      variant="ghost"
                      size="auto"
                      onClick={() => {
                        onQuestionSelect(idx);
                      }}
                      className={`
                          aspect-square rounded-lg flex items-center justify-center font-bold text-xs transition-all border
                          ${getOverviewButtonClass(isActive, isAnswered)}
                        `}
                    >
                      {idx + 1}
                    </Button>
                  );
                })}
              </div>

              {/* Popover Footer Legend */}
              <div className="px-5 py-3 bg-muted border-t border-border text-[10px] text-muted-foreground flex justify-between items-center">
                <div className="flex gap-3">
                  <span className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-indigo-600"></div>当前
                  </span>
                  <span className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-100 border border-emerald-300"></div>
                    已做
                  </span>
                  <span className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full border border-border bg-card"></div>未做
                  </span>
                </div>

                {/* Close button inside popover */}
                <Button
                  type="button"
                  variant="ghost"
                  size="auto"
                  onClick={() => setShowOverview(false)}
                  className="hover:text-foreground transition-colors font-medium"
                >
                  Close
                </Button>
              </div>
            </PopoverContent>
          </div>
        </Popover>

        {/* Detached Action Buttons (Below Main Capsule) */}
        <div className="flex flex-col gap-3">
          {/* Overview Trigger Toggle */}
          <Button
            type="button"
            variant="ghost"
            size="auto"
            onClick={() => setShowOverview(!showOverview)}
            className={`
              w-14 h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 shadow-sm border transition-all
              ${
                showOverview
                  ? 'bg-indigo-50 dark:bg-indigo-500/15 border-indigo-200 dark:border-indigo-400/30 text-indigo-600 dark:text-indigo-300'
                  : 'bg-card border-border text-muted-foreground hover:scale-105 active:scale-95 hover:text-indigo-600 dark:hover:text-indigo-300 hover:border-indigo-100 dark:hover:border-indigo-400/30'
              }
              `}
          >
            <Grid className="w-5 h-5" />
            <span className="text-[9px] font-bold">概览</span>
          </Button>

          {/* Submit Button */}
          <Button
            type="button"
            size="auto"
            onClick={onSubmit}
            className="w-14 h-14 rounded-full bg-indigo-600 dark:bg-indigo-500 border-2 border-indigo-100 dark:border-indigo-300/30 flex flex-col items-center justify-center gap-0.5 text-white shadow-pop hover:scale-105 active:scale-95 transition-all group"
          >
            <Check className="w-6 h-6 stroke-[3]" />
            <span className="text-[9px] font-bold opacity-90 group-hover:opacity-100">交卷</span>
          </Button>

          {/* Exit Button (Optional) */}
          {onExit && (
            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={onExit}
              className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 shadow-sm border border-border bg-card text-muted-foreground hover:bg-red-50 dark:hover:bg-red-500/15 hover:text-red-500 dark:hover:text-red-300 hover:border-red-200 dark:hover:border-red-400/30 hover:scale-105 active:scale-95 transition-all mt-2"
            >
              <LogOut className="w-5 h-5 ml-0.5" />
              <span className="text-[9px] font-bold">退出</span>
            </Button>
          )}
        </div>
      </div>
    </DialogPortal>
  );
};

// Helper functions for class names
const getQuestionButtonClass = (isActive: boolean, isAnswered: boolean) => {
  if (isActive) return 'bg-indigo-600 dark:bg-indigo-500 text-white scale-110 shadow-pop-sm z-10';
  if (isAnswered)
    return 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-400/30';
  return 'bg-card text-muted-foreground border border-border hover:border-border hover:text-muted-foreground';
};

const getOverviewButtonClass = (isActive: boolean, isAnswered: boolean) => {
  if (isActive)
    return 'bg-indigo-600 dark:bg-indigo-500 border-indigo-500 dark:border-indigo-300/40 text-white shadow-pop-sm';
  if (isAnswered)
    return 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-400/30 text-emerald-600 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-500/20';
  return 'bg-card border-border text-muted-foreground hover:border-border hover:text-muted-foreground';
};
