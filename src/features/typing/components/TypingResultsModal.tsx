import React from 'react';
import { Ghost, Clock, Target, Zap } from 'lucide-react';

interface TypingResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry: () => void;

  // Stats
  wpm: number;
  accuracy: number;
  errorCount: number;
  duration: number; // in seconds

  // Target
  targetWpm: number;
  highestWpm: number;

  // User
  userAvatar?: string;
}

export const TypingResultsModal: React.FC<TypingResultsModalProps> = ({
  isOpen,
  onClose,
  onRetry,
  wpm,
  accuracy,
  errorCount,
  duration,
  targetWpm,
  highestWpm,
  userAvatar,
}) => {
  if (!isOpen) return null;

  const isTargetAchieved = wpm >= targetWpm;
  const formattedTime = `${Math.floor(duration / 60)
    .toString()
    .padStart(2, '0')}:${(duration % 60).toString().padStart(2, '0')}`;

  // Calculate progress percentages for visual bars
  const wpmProgress = Math.min((wpm / targetWpm) * 100, 100);
  const accuracyProgress = accuracy;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header with Ghost */}
        <div className="bg-gradient-to-b from-slate-100 to-white pt-8 pb-6 flex flex-col items-center relative">
          {/* Lightning bolts */}
          <div className="absolute left-8 top-8 text-2xl opacity-30">⚡</div>
          <div className="absolute right-8 top-12 text-xl opacity-20">⚡</div>
          <div className="absolute left-12 bottom-4 text-lg opacity-25">⚡</div>
          <div className="absolute right-10 bottom-8 text-2xl opacity-30">⚡</div>

          {/* User Avatar / Ghost Icon */}
          <div className="w-24 h-24 bg-slate-600 rounded-full flex items-center justify-center mb-4 shadow-lg overflow-hidden">
            {userAvatar ? (
              <img src={userAvatar} alt="User" className="w-full h-full object-cover" />
            ) : (
              <Ghost className="w-14 h-14 text-white" />
            )}
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-slate-800">
            {targetWpm}타 {isTargetAchieved ? '달성!' : '미달성'}
          </h2>
        </div>

        {/* Stats Section */}
        <div className="px-6 py-6 space-y-5">
          {/* WPM */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-slate-600 flex items-center gap-1">
                <Zap className="w-4 h-4" />
                타수(타/분)
              </span>
              <span className="text-xs text-slate-400">최고 {highestWpm} 타</span>
            </div>
            <div className="relative">
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${wpmProgress}%` }}
                />
              </div>
              <div
                className="absolute -top-1 left-0"
                style={{ left: `${Math.min(wpmProgress, 98)}%` }}
              >
                <div className="w-5 h-5 bg-blue-500 rounded-full border-2 border-white shadow flex items-center justify-center">
                  <span className="text-[8px] text-white">✓</span>
                </div>
              </div>
            </div>
            <div className="text-right mt-1">
              <span className="text-2xl font-bold text-cyan-500">{wpm}타</span>
            </div>
          </div>

          {/* Accuracy */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-slate-600 flex items-center gap-1">
                <Target className="w-4 h-4" />
                정확도(%)
              </span>
              <span className="text-xs text-slate-400">오타수 {errorCount} 개</span>
            </div>
            <div className="relative">
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-slate-300 to-slate-400 rounded-full transition-all duration-500"
                  style={{ width: `${accuracyProgress}%` }}
                />
              </div>
            </div>
            <div className="text-right mt-1">
              <span className="text-2xl font-bold text-cyan-500">{accuracy.toFixed(2)}%</span>
            </div>
          </div>

          {/* Time */}
          <div className="flex justify-between items-center py-3 border-t border-slate-100">
            <span className="text-sm text-slate-600 flex items-center gap-1">
              <Clock className="w-4 h-4" />
              소요 시간
            </span>
            <span className="text-lg font-mono font-bold text-slate-800 flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-400" />
              {formattedTime}
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div className="px-6 pb-8 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 px-6 rounded-2xl text-slate-500 font-bold hover:bg-slate-100 transition-colors"
          >
            그만하기
          </button>
          <button
            onClick={onRetry}
            className="flex-[2] py-3.5 px-6 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg shadow-blue-500/30 rounded-2xl font-bold transition-all transform active:scale-95"
          >
            다시 하기
          </button>
        </div>
      </div>
    </div>
  );
};
