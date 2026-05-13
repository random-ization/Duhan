import React, { useRef } from 'react';
import { useQuery } from 'convex/react';
import { CheckCircle } from 'lucide-react';
import { VOCAB } from '../../../utils/convexRefs';
import type { UnitProgressDto } from '../../../../convex/vocab/vocabTypes';

interface UnitListViewProps {
  courseId: string;
  onSelectUnit: (unitId: number) => void;
}

/**
 * UnitListView displays a scrollable list of units with progress indicators.
 * Shows three visual states: completed (100%), in progress (1-99%), and not started (0%).
 */
export function UnitListView({ courseId, onSelectUnit }: UnitListViewProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Fetch unit progress data reactively
  const unitProgress = useQuery(VOCAB.getUnitProgress, { courseId });

  // Loading state - skeleton placeholder
  if (unitProgress === undefined) {
    return (
      <div className="space-y-0">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between px-4 py-3.5 animate-pulse"
            style={{ borderBottom: i < 5 ? '1px solid var(--color-k-line)' : 'none' }}
          >
            <div className="flex items-center gap-3">
              <div className="h-4 w-16 bg-k-line/50 rounded" />
              <div className="h-3 w-12 bg-k-line/50 rounded" />
            </div>
            <div className="h-3 w-20 bg-k-line/50 rounded" />
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (!unitProgress || unitProgress.length === 0) {
    return (
      <div className="py-12 text-center text-[14px] font-semibold text-k-sub">
        暂无单元数据
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      className="max-h-[320px] overflow-y-auto"
    >
      {unitProgress.map((unit, index, arr) => (
        <UnitRow
          key={unit.unitId}
          unit={unit}
          isLast={index === arr.length - 1}
          onClick={() => onSelectUnit(unit.unitId)}
        />
      ))}
    </div>
  );
}

interface UnitRowProps {
  unit: UnitProgressDto;
  isLast: boolean;
  onClick: () => void;
}

function UnitRow({ unit, isLast, onClick }: UnitRowProps) {
  const { unitId, totalWords, masteredWords, progressPercent } = unit;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-k-bg2 text-left"
      style={{ borderBottom: isLast ? 'none' : '1px solid var(--color-k-line)' }}
    >
      {/* Unit number and word count */}
      <div className="flex items-center gap-3">
        <span className="text-[13px] font-extrabold text-k-ink">
          Unit {unitId}
        </span>
        <span className="text-[11px] font-semibold text-k-sub">
          {totalWords} 词
        </span>
      </div>

      {/* Progress indicator - three visual states */}
      <ProgressIndicator
        progressPercent={progressPercent}
        masteredWords={masteredWords}
        totalWords={totalWords}
      />
    </button>
  );
}

interface ProgressIndicatorProps {
  progressPercent: number;
  masteredWords: number;
  totalWords: number;
}

function ProgressIndicator({ progressPercent, masteredWords, totalWords }: ProgressIndicatorProps) {
  // State 1: Completed (100%)
  if (progressPercent === 100) {
    return (
      <CheckCircle className="w-5 h-5 text-k-crimson" />
    );
  }

  // State 2: Not started (0%)
  if (progressPercent === 0) {
    return (
      <span className="text-[11px] font-semibold text-k-sub">
        未学习
      </span>
    );
  }

  // State 3: In progress (1-99%)
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-[6px] bg-k-line rounded-full overflow-hidden">
        <div
          className="h-full bg-k-crimson rounded-full transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <span className="text-[11px] font-semibold text-k-sub">
        {masteredWords}/{totalWords}
      </span>
    </div>
  );
}

export default UnitListView;
