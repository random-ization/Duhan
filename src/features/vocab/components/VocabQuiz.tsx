import React, { useState, memo, useRef, useEffect, useCallback } from 'react';
import { Trophy, RefreshCw, Settings, X, Check, ChevronRight } from 'lucide-react';
import type { Id } from '../../../../convex/_generated/dataModel';
import { useTTS } from '../../../hooks/useTTS';
import { getLabels, Labels } from '../../../utils/i18n';
import { Language } from '../../../types';
import { logger } from '../../../utils/logger';
import { notify } from '../../../utils/notify';
import { Dialog, DialogContent, DialogOverlay, DialogPortal } from '../../../components/ui';
import { Button, Checkbox, Input, Radio } from '../../../components/ui';
import { useFSRSProgress } from '../hooks/useVocabProgress';

interface VocabItem {
  readonly id: string;
  readonly korean: string;
  readonly english: string;
  readonly unit: number;
}

interface QuizSettings {
  readonly multipleChoice: boolean;
  readonly writingMode: boolean;
  readonly mcDirection: 'KR_TO_NATIVE' | 'NATIVE_TO_KR';
  readonly writingDirection: 'KR_TO_NATIVE' | 'NATIVE_TO_KR';
  readonly autoTTS: boolean;
  readonly soundEffects: boolean;
}

interface VocabQuizProps {
  readonly words: readonly VocabItem[];
  readonly courseId?: string;
  readonly onComplete?: (stats: { readonly correct: number; readonly total: number }) => void;
  readonly hasNextUnit?: boolean;
  readonly onNextUnit?: () => void;
  readonly currentUnitLabel?: string;
  readonly userId?: string; // For recording progress
  readonly onFsrsReview?: (wordId: string, isCorrect: boolean) => void;
  readonly language?: Language;
  readonly variant?: 'quiz' | 'learn';
  readonly presetSettings?: Partial<QuizSettings>;
  readonly settingsLocked?: boolean;
}

type QuestionType = 'MULTIPLE_CHOICE' | 'WRITING';

export interface QuizQuestion {
  readonly type: QuestionType;
  readonly targetWord: VocabItem;
  readonly direction: 'KR_TO_NATIVE' | 'NATIVE_TO_KR';
  readonly options?: readonly VocabItem[];
  readonly correctIndex?: number;
}

export type OptionState = 'normal' | 'selected' | 'correct' | 'wrong';
type GameState = 'PLAYING' | 'COMPLETE';
export type WritingState = 'INPUT' | 'CORRECT' | 'WRONG';
export type PendingAdvanceReason = 'WRONG' | 'DONT_KNOW' | null;

// Shuffle helper
const shuffleArray = <T,>(array: readonly T[]): T[] => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

interface SettingsModalProps {
  readonly showSettings: boolean;
  readonly settingsLocked: boolean;
  readonly setShowSettings: (show: boolean) => void;
  readonly labels: Labels;
  readonly modeLabel: string;
  readonly settings: QuizSettings;
  readonly setSettings: React.Dispatch<React.SetStateAction<QuizSettings>>;
  readonly applySettings: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  showSettings,
  settingsLocked,
  setShowSettings,
  labels,
  modeLabel,
  settings,
  setSettings,
  applySettings,
}) => {
  if (settingsLocked || !showSettings) return null;

  return (
    <Dialog open={showSettings} onOpenChange={setShowSettings}>
      <DialogPortal>
        <DialogOverlay unstyled className="fixed inset-0 z-50 bg-black/50" />
        <DialogContent
          unstyled
          closeOnEscape={false}
          lockBodyScroll={false}
          className="fixed inset-0 z-[51] flex items-center justify-center p-4 pointer-events-none"
        >
          <div className="pointer-events-auto bg-card rounded-2xl p-6 w-full max-w-md shadow-2xl relative z-10">
            <SettingsModalHeader
              labels={labels}
              modeLabel={modeLabel}
              onClose={() => setShowSettings(false)}
            />
            <QuestionTypeSection labels={labels} settings={settings} setSettings={setSettings} />
            <McDirectionSection labels={labels} settings={settings} setSettings={setSettings} />
            <WritingDirectionSection
              labels={labels}
              settings={settings}
              setSettings={setSettings}
            />
            <AudioSettingsSection labels={labels} settings={settings} setSettings={setSettings} />
            <ApplySettingsButton labels={labels} settings={settings} onClick={applySettings} />
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};

const SettingsModalHeader: React.FC<{
  labels: Labels;
  modeLabel: string;
  onClose: () => void;
}> = ({ labels, modeLabel, onClose }) => (
  <div className="flex items-center justify-between mb-6">
    <h2 className="text-xl font-black text-foreground">
      🎯 {labels.dashboard?.quiz?.quizSettings || `${modeLabel} Settings`}
    </h2>
    <Button
      variant="ghost"
      size="auto"
      type="button"
      onClick={onClose}
      className="p-2 hover:bg-muted rounded-full transition-colors"
    >
      <X className="w-5 h-5 text-muted-foreground" />
    </Button>
  </div>
);

const QuestionTypeSection: React.FC<{
  labels: Labels;
  settings: QuizSettings;
  setSettings: React.Dispatch<React.SetStateAction<QuizSettings>>;
}> = ({ labels, settings, setSettings }) => (
  <div className="mb-5">
    <h3 className="text-xs font-bold text-muted-foreground uppercase mb-2">
      {labels.dashboard?.quiz?.questionType || 'Question Type'}
    </h3>
    <div className="space-y-2">
      <label
        htmlFor="mc-toggle"
        className="flex items-center justify-between p-3 bg-muted rounded-xl cursor-pointer hover:bg-muted"
      >
        <span className="font-bold text-muted-foreground">
          {labels.dashboard?.quiz?.multipleChoice || '📝 Multiple Choice'}
        </span>
        <Checkbox
          id="mc-toggle"
          checked={settings.multipleChoice}
          onChange={e => setSettings(state => ({ ...state, multipleChoice: e.target.checked }))}
          className="w-5 h-5 accent-blue-500"
        />
      </label>
      <label
        htmlFor="writing-toggle"
        className="flex items-center justify-between p-3 bg-muted rounded-xl cursor-pointer hover:bg-muted"
      >
        <span className="font-bold text-muted-foreground">
          {labels.dashboard?.quiz?.writingFill || '✏️ Writing Fill'}
        </span>
        <Checkbox
          id="writing-toggle"
          checked={settings.writingMode}
          onChange={e => setSettings(state => ({ ...state, writingMode: e.target.checked }))}
          className="w-5 h-5 accent-blue-500"
        />
      </label>
    </div>
  </div>
);

const McDirectionSection: React.FC<{
  labels: Labels;
  settings: QuizSettings;
  setSettings: React.Dispatch<React.SetStateAction<QuizSettings>>;
}> = ({ labels, settings, setSettings }) => {
  if (!settings.multipleChoice) return null;
  return (
    <div className="mb-5">
      <h3 className="text-xs font-bold text-muted-foreground uppercase mb-2">
        {labels.dashboard?.quiz?.mcDirection || 'MC Direction'}
      </h3>
      <div className="space-y-2">
        <label
          htmlFor="mc-dir-kr-native"
          className={`flex items-center p-3 rounded-xl cursor-pointer ${settings.mcDirection === 'KR_TO_NATIVE' ? 'bg-blue-50 border-2 border-blue-300' : 'bg-muted border-2 border-transparent'}`}
        >
          <Radio
            id="mc-dir-kr-native"
            name="mc-dir"
            checked={settings.mcDirection === 'KR_TO_NATIVE'}
            onChange={() => setSettings(state => ({ ...state, mcDirection: 'KR_TO_NATIVE' }))}
            className="mr-3"
          />
          <span className="font-medium">
            {labels.dashboard?.quiz?.krToNative || 'Korean → Meaning'}
          </span>
        </label>
        <label
          htmlFor="mc-dir-native-kr"
          className={`flex items-center p-3 rounded-xl cursor-pointer ${settings.mcDirection === 'NATIVE_TO_KR' ? 'bg-blue-50 border-2 border-blue-300' : 'bg-muted border-2 border-transparent'}`}
        >
          <Radio
            id="mc-dir-native-kr"
            name="mc-dir"
            checked={settings.mcDirection === 'NATIVE_TO_KR'}
            onChange={() => setSettings(state => ({ ...state, mcDirection: 'NATIVE_TO_KR' }))}
            className="mr-3"
          />
          <span className="font-medium">
            {labels.dashboard?.quiz?.nativeToKr || 'Meaning → Korean'}
          </span>
        </label>
      </div>
    </div>
  );
};

const WritingDirectionSection: React.FC<{
  labels: Labels;
  settings: QuizSettings;
  setSettings: React.Dispatch<React.SetStateAction<QuizSettings>>;
}> = ({ labels, settings, setSettings }) => {
  if (!settings.writingMode) return null;
  return (
    <div className="mb-5">
      <h3 className="text-xs font-bold text-muted-foreground uppercase mb-2">
        {labels.dashboard?.quiz?.writingDirection || 'Writing Direction'}
      </h3>
      <div className="space-y-2">
        <label
          htmlFor="writing-dir-kr-native"
          className={`flex items-center p-3 rounded-xl cursor-pointer ${settings.writingDirection === 'KR_TO_NATIVE' ? 'bg-purple-50 border-2 border-purple-300' : 'bg-muted border-2 border-transparent'}`}
        >
          <Radio
            id="writing-dir-kr-native"
            name="writing-dir"
            checked={settings.writingDirection === 'KR_TO_NATIVE'}
            onChange={() => setSettings(state => ({ ...state, writingDirection: 'KR_TO_NATIVE' }))}
            className="mr-3"
          />
          <span className="font-medium">
            {labels.dashboard?.quiz?.krToNative || 'Korean → Meaning'}
          </span>
        </label>
        <label
          htmlFor="writing-dir-native-kr"
          className={`flex items-center p-3 rounded-xl cursor-pointer ${settings.writingDirection === 'NATIVE_TO_KR' ? 'bg-purple-50 border-2 border-purple-300' : 'bg-muted border-2 border-transparent'}`}
        >
          <Radio
            id="writing-dir-native-kr"
            name="writing-dir"
            checked={settings.writingDirection === 'NATIVE_TO_KR'}
            onChange={() => setSettings(state => ({ ...state, writingDirection: 'NATIVE_TO_KR' }))}
            className="mr-3"
          />
          <span className="font-medium">
            {labels.dashboard?.quiz?.nativeToKr || 'Meaning → Korean'}
          </span>
        </label>
      </div>
    </div>
  );
};

type AudioSettingsText = {
  sectionTitle: string;
  autoReadTitle: string;
  autoReadDescription: string;
  soundEffectsTitle: string;
  soundEffectsDescription: string;
};

function getAudioSettingsText(labels: Labels): AudioSettingsText {
  return {
    sectionTitle: labels.dashboard?.quiz?.audioSettings || 'Audio Settings',
    autoReadTitle: labels.dashboard?.quiz?.autoRead || '🔊 Auto Read Words',
    autoReadDescription:
      labels.dashboard?.quiz?.autoReadDesc || 'Auto play Korean pronunciation each question',
    soundEffectsTitle: labels.dashboard?.quiz?.soundEffects || '🎵 Sound Effects',
    soundEffectsDescription:
      labels.dashboard?.quiz?.soundEffectsDesc || 'Correct/incorrect feedback sounds',
  };
}

const AudioToggleRow: React.FC<{
  id: string;
  checked: boolean;
  title: string;
  description: string;
  onToggle: (checked: boolean) => void;
}> = ({ id, checked, title, description, onToggle }) => (
  <label
    htmlFor={id}
    className="flex items-center justify-between p-3 bg-muted rounded-xl cursor-pointer hover:bg-muted"
    aria-label={title}
  >
    <span className="flex flex-col">
      <span className="font-bold text-muted-foreground">{title}</span>
      <span className="text-xs text-muted-foreground">{description}</span>
    </span>
    <Checkbox
      id={id}
      checked={checked}
      onChange={e => onToggle(e.target.checked)}
      className="w-5 h-5 accent-green-500"
      aria-label={title}
    />
  </label>
);

const AudioSettingsSection: React.FC<{
  labels: Labels;
  settings: QuizSettings;
  setSettings: React.Dispatch<React.SetStateAction<QuizSettings>>;
}> = ({ labels, settings, setSettings }) => {
  const text = getAudioSettingsText(labels);
  return (
    <div className="mb-5">
      <h3 className="text-xs font-bold text-muted-foreground uppercase mb-2">
        {text.sectionTitle}
      </h3>
      <div className="space-y-2">
        <AudioToggleRow
          id="auto-read-toggle"
          checked={settings.autoTTS}
          title={text.autoReadTitle}
          description={text.autoReadDescription}
          onToggle={checked => setSettings(state => ({ ...state, autoTTS: checked }))}
        />
        <AudioToggleRow
          id="sound-effects-toggle"
          checked={settings.soundEffects}
          title={text.soundEffectsTitle}
          description={text.soundEffectsDescription}
          onToggle={checked => setSettings(state => ({ ...state, soundEffects: checked }))}
        />
      </div>
    </div>
  );
};

const ApplySettingsButton: React.FC<{
  labels: Labels;
  settings: QuizSettings;
  onClick: () => void;
}> = ({ labels, settings, onClick }) => (
  <Button
    variant="ghost"
    size="auto"
    type="button"
    onClick={onClick}
    disabled={!settings.multipleChoice && !settings.writingMode}
    className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-muted disabled:opacity-50"
  >
    {labels.dashboard?.quiz?.applyRestart || 'Apply & Restart'}
  </Button>
);

interface WritingInputProps {
  inputRef: React.RefObject<HTMLInputElement | null>;
  writingInput: string;
  setWritingInput: (value: string) => void;
  writingState: WritingState;
  handleWritingSubmit: () => void;
  direction: 'KR_TO_NATIVE' | 'NATIVE_TO_KR';
  targetWord: VocabItem;
  labels: Labels;
  isLearn: boolean;
}

function getWritingPlaceholder(direction: 'KR_TO_NATIVE' | 'NATIVE_TO_KR', labels: Labels): string {
  if (direction === 'KR_TO_NATIVE') {
    return labels.dashboard?.quiz?.enterMeaning || 'Enter meaning...';
  }
  return labels.dashboard?.quiz?.enterKorean || 'Enter Korean...';
}

function getWritingCorrectAnswer(
  direction: 'KR_TO_NATIVE' | 'NATIVE_TO_KR',
  targetWord: VocabItem
): string {
  return direction === 'KR_TO_NATIVE' ? targetWord.english : targetWord.korean;
}

const WritingFeedback: React.FC<{
  writingState: WritingState;
  direction: 'KR_TO_NATIVE' | 'NATIVE_TO_KR';
  targetWord: VocabItem;
  labels: Labels;
}> = ({ writingState, direction, targetWord, labels }) => {
  if (writingState === 'CORRECT') {
    return (
      <div className="mt-4 text-center text-green-600 font-bold flex items-center justify-center gap-2">
        <Check className="w-6 h-6" /> {labels.dashboard?.quiz?.correct || 'Correct'}!
      </div>
    );
  }

  if (writingState !== 'WRONG') return null;

  return (
    <div className="mt-4 text-center">
      <p className="text-red-600 font-bold mb-2">✕ {labels.dashboard?.quiz?.wrong || 'Wrong'}</p>
      <p className="text-muted-foreground">
        {labels.dashboard?.quiz?.correctAnswer || 'Correct Answer'}:{' '}
        <strong className="text-green-600">{getWritingCorrectAnswer(direction, targetWord)}</strong>
      </p>
    </div>
  );
};

const WritingSubmitButton: React.FC<{
  writingState: WritingState;
  writingInput: string;
  handleWritingSubmit: () => void;
  labels: Labels;
}> = ({ writingState, writingInput, handleWritingSubmit, labels }) => {
  if (writingState !== 'INPUT') return null;
  return (
    <Button
      variant="ghost"
      size="auto"
      type="button"
      onClick={handleWritingSubmit}
      disabled={!writingInput.trim()}
      className="w-full mt-4 py-4 bg-primary text-white font-black rounded-xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-1 transition-all disabled:opacity-50"
    >
      {labels.dashboard?.quiz?.submit || 'Submit Answer'}
    </Button>
  );
};

const WritingInput: React.FC<WritingInputProps> = ({
  inputRef,
  writingInput,
  setWritingInput,
  writingState,
  handleWritingSubmit,
  direction,
  targetWord,
  labels,
  isLearn,
}) => {
  const placeholder = getWritingPlaceholder(direction, labels);

  const getWritingStateClass = (state: WritingState) => {
    if (state === 'CORRECT') return 'bg-green-50 border-green-400';
    if (state === 'WRONG') return 'bg-red-50 border-red-400';
    return 'bg-muted border-border';
  };

  return (
    <div className="mb-6">
      <div
        className={`rounded-2xl border-2 ${isLearn ? 'p-5' : 'p-6'} ${getWritingStateClass(writingState)}`}
      >
        <Input
          ref={inputRef}
          type="text"
          value={writingInput}
          onChange={e => setWritingInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && writingState === 'INPUT' && handleWritingSubmit()}
          placeholder={placeholder}
          disabled={writingState !== 'INPUT'}
          className={`w-full !h-auto !px-0 !py-0 !border-0 !bg-transparent !shadow-none ${isLearn ? 'text-xl' : 'text-2xl'} font-bold text-center outline-none focus-visible:!ring-0`}
          autoFocus
        />
        <WritingFeedback
          writingState={writingState}
          direction={direction}
          targetWord={targetWord}
          labels={labels}
        />
      </div>
      <WritingSubmitButton
        writingState={writingState}
        writingInput={writingInput}
        handleWritingSubmit={handleWritingSubmit}
        labels={labels}
      />
    </div>
  );
};

interface MCOptionsProps {
  options: readonly VocabItem[];
  direction: 'KR_TO_NATIVE' | 'NATIVE_TO_KR';
  optionStates: readonly OptionState[];
  handleOptionClick: (index: number) => void;
  isLocked: boolean;
  isLearn: boolean;
}

const MCOptions: React.FC<MCOptionsProps> = ({
  options,
  direction,
  optionStates,
  handleOptionClick,
  isLocked,
  isLearn,
}) => {
  const getOptionStateClass = (state: OptionState) => {
    if (state === 'correct') return 'bg-green-200 text-green-700';
    if (state === 'wrong') return 'bg-red-200 text-red-600';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 ${isLearn ? 'gap-3' : 'gap-4'} mb-6`}>
      {options.map((option, index) => {
        const state = optionStates[index];
        const displayText = direction === 'KR_TO_NATIVE' ? option.english : option.korean;
        let btnClass = `w-full bg-card border-2 border-foreground border-b-[6px] rounded-2xl text-foreground ${
          isLearn ? 'p-4' : 'p-5'
        } flex items-center gap-4 text-left transition-all`;
        if (state === 'normal')
          btnClass += ' hover:bg-muted active:border-b-2 active:translate-y-1';
        else if (state === 'selected') btnClass += ' bg-yellow-50 border-yellow-400';
        else if (state === 'correct') btnClass += ' bg-green-50 border-green-500 text-green-700';
        else if (state === 'wrong')
          btnClass += ' bg-red-50 border-red-500 text-red-600 animate-shake';

        return (
          <Button
            variant="ghost"
            size="auto"
            key={`${option.id}:${index}`}
            onClick={() => handleOptionClick(index)}
            disabled={isLocked}
            className={btnClass}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${getOptionStateClass(state)}`}
            >
              {String.fromCodePoint(65 + index)}
            </div>
            <span className={`font-bold ${isLearn ? 'text-base' : 'text-lg'}`}>{displayText}</span>
            {state === 'correct' && <span className="ml-auto text-2xl">✓</span>}
            {state === 'wrong' && <span className="ml-auto text-2xl">✕</span>}
          </Button>
        );
      })}
    </div>
  );
};

interface PendingAdvanceBannerProps {
  language: Language;
  onContinue: () => void;
}

const PendingAdvanceBanner: React.FC<PendingAdvanceBannerProps> = ({ language, onContinue }) => (
  <div className="mt-6 pt-4 border-t border-border flex items-center justify-between gap-4">
    <div className="min-w-0">
      <div className="text-sm font-black text-muted-foreground">
        {getLabels(language).vocabQuiz?.pendingTitle || "No worries — you're learning!"}
      </div>
      <div className="text-xs font-bold text-muted-foreground mt-1">
        {getLabels(language).vocabQuiz?.pendingSubtitle ||
          'We’ll practice this again later. Click Continue or press any key.'}
      </div>
    </div>
    <Button
      variant="ghost"
      size="auto"
      type="button"
      onClick={onContinue}
      className="px-6 py-3 rounded-full bg-blue-600 text-white font-black hover:bg-blue-700"
    >
      {getLabels(language).vocabQuiz?.continue || 'Continue'}
    </Button>
  </div>
);

interface QuestionDisplayProps {
  promptText: string;
  questionText: string;
  isLearn: boolean;
}

const QuestionDisplay: React.FC<QuestionDisplayProps> = ({ promptText, questionText, isLearn }) => (
  <div className={`text-center ${isLearn ? 'mb-8' : 'mb-10'}`}>
    <p className={`text-sm text-muted-foreground font-bold uppercase ${isLearn ? 'mb-3' : 'mb-4'}`}>
      {promptText}
    </p>
    <h2 className={`${isLearn ? 'text-4xl sm:text-5xl' : 'text-6xl'} font-black text-foreground`}>
      {questionText}
    </h2>
  </div>
);

interface ScoreBadgeProps {
  correctCount: number;
  labels: Labels;
  isWriting: boolean;
  isLearn: boolean;
}

const ScoreBadge: React.FC<ScoreBadgeProps> = ({ correctCount, labels, isWriting, isLearn }) => (
  <div
    className={`text-center flex items-center justify-center gap-3 ${isLearn ? 'mb-3' : 'mb-4'}`}
  >
    <span className="px-4 py-1 bg-green-100 text-green-700 rounded-full font-bold text-sm">
      ✓ {correctCount} {labels.dashboard?.quiz?.correct || 'Correct'}
    </span>
    <span
      className={`px-3 py-1 rounded-full font-bold text-xs ${isWriting ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}
    >
      {isWriting
        ? `✏️ ${labels.dashboard?.quiz?.writing || 'Writing'}`
        : `📝 ${labels.dashboard?.quiz?.select || 'Select'}`}
    </span>
  </div>
);

interface ProgressHeaderProps {
  labels: Labels;
  currentBatchNum: number;
  questionIndex: number;
  totalQuestions: number;
  settingsLocked: boolean;
  setShowSettings: (show: boolean) => void;
  isLearn: boolean;
}

const ProgressHeader: React.FC<ProgressHeaderProps> = ({
  labels,
  currentBatchNum,
  questionIndex,
  totalQuestions,
  settingsLocked,
  setShowSettings,
  isLearn,
}) => (
  <div className={isLearn ? 'mb-6' : 'mb-8'}>
    <div className="flex justify-between items-center text-xs font-bold text-muted-foreground mb-1">
      <div className="flex items-center gap-2">
        <span>{labels.dashboard?.quiz?.progress || 'Progress'}</span>
        {currentBatchNum > 1 && (
          <span className="px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full text-[10px]">
            {labels.dashboard?.quiz?.round?.replace('{n}', currentBatchNum.toString()) ||
              `Round ${currentBatchNum}`}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span>
          {questionIndex + 1} / {totalQuestions}
        </span>
        {!settingsLocked && (
          <Button
            variant="ghost"
            size="auto"
            type="button"
            onClick={() => setShowSettings(true)}
            className="p-1.5 text-muted-foreground hover:text-muted-foreground hover:bg-muted rounded-lg transition-colors"
          >
            <Settings className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
    <div className="h-2 bg-muted rounded-full overflow-hidden">
      <div
        className="h-full bg-[#4ADE80] transition-all"
        style={{ width: `${((questionIndex + 1) / totalQuestions) * 100}%` }}
      />
    </div>
  </div>
);

interface CompleteScreenProps {
  correctCount: number;
  totalQuestionsAnswered: number;
  totalQuestions: number;
  labels: Labels;
  variant: 'quiz' | 'learn';
  hasNextUnit?: boolean;
  onNextUnit?: () => void;
  restartGame: () => void;
}

function getCompleteTitle(labels: Labels, variant: 'quiz' | 'learn'): string {
  const configuredTitle = labels.dashboard?.quiz?.complete as unknown as string;
  if (configuredTitle) return configuredTitle;
  if (variant === 'learn') {
    return labels.vocabQuiz?.learnCompleteTitle || '🎉 Learning Complete!';
  }
  return '🎉 Quiz Complete!';
}

function getFinishedText(labels: Labels, variant: 'quiz' | 'learn'): string {
  const configuredText = labels.dashboard?.quiz?.youFinished as unknown as string;
  if (configuredText) return configuredText;
  if (variant === 'learn') {
    return labels.vocabQuiz?.learnCompleteSubtitle || 'You finished this learning round!';
  }
  return 'You finished all questions!';
}

const CompleteScreen: React.FC<CompleteScreenProps> = ({
  correctCount,
  totalQuestionsAnswered,
  totalQuestions,
  labels,
  variant,
  hasNextUnit,
  onNextUnit,
  restartGame,
}) => {
  // Use totalQuestionsAnswered for accurate percentage across all rounds
  const finalTotal = totalQuestionsAnswered > 0 ? totalQuestionsAnswered : totalQuestions;
  const percentage = Math.round((correctCount / finalTotal) * 100);
  const completeTitle = getCompleteTitle(labels, variant);
  const finishedText = getFinishedText(labels, variant);

  return (
    <div className="bg-card rounded-[2.5rem] border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] p-8 text-center relative overflow-hidden">
      <div className="absolute inset-0 bg-green-50" />
      <div className="relative z-10">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
          <Trophy className="w-12 h-12 text-green-600" />
        </div>
        <h2 className="text-4xl font-black text-foreground mb-2">{completeTitle}</h2>
        <p className="text-muted-foreground mb-6">{finishedText}</p>
        <div className="grid grid-cols-2 gap-4 mb-8 max-w-sm mx-auto">
          <div className="bg-card border-2 border-border rounded-xl p-4">
            <div className="text-3xl font-black text-foreground">
              {correctCount}/{finalTotal}
            </div>
            <div className="text-xs text-muted-foreground font-bold">
              {labels.dashboard?.quiz?.correctCount || 'Correct'}
            </div>
          </div>
          <div className="bg-card border-2 border-border rounded-xl p-4">
            <div className="text-3xl font-black text-foreground">{percentage}%</div>
            <div className="text-xs text-muted-foreground font-bold">
              {labels.dashboard?.quiz?.accuracy || 'Accuracy'}
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="ghost"
            size="auto"
            onClick={restartGame}
            className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-card border-2 border-foreground text-foreground font-black rounded-xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-1 transition-all"
          >
            <RefreshCw className="w-5 h-5" /> {labels.dashboard?.quiz?.again || 'Try Again'}
          </Button>
          {hasNextUnit && onNextUnit && (
            <Button
              variant="ghost"
              size="auto"
              onClick={onNextUnit}
              className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-green-500 border-2 border-green-600 text-white font-black rounded-xl shadow-[4px_4px_0px_0px_rgba(22,163,74,1)] hover:-translate-y-1 transition-all"
            >
              {labels.dashboard?.quiz?.nextUnit || 'Next Unit'} <ChevronRight className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

const useQuizGame = ({
  words,
  settings,
  isLearn,
  onComplete,
  recordProgress,
  playCorrectSound,
  playWrongSound,
  userId,
  onFsrsReview,
  onProgressSyncError,
}: {
  words: readonly VocabItem[];
  settings: QuizSettings;
  isLearn: boolean;
  onComplete?: (stats: { correct: number; total: number }) => void;
  recordProgress: (wordId: string, isCorrect: boolean) => Promise<void>;
  playCorrectSound: () => void;
  playWrongSound: () => void;
  userId?: string;
  onFsrsReview?: (wordId: string, isCorrect: boolean) => void;
  onProgressSyncError?: (wordId: string, isCorrect: boolean) => void;
}) => {
  const [gameState, setGameState] = useState<GameState>('PLAYING');
  const [questions, setQuestions] = useState<readonly QuizQuestion[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [optionStates, setOptionStates] = useState<readonly OptionState[]>([
    'normal',
    'normal',
    'normal',
    'normal',
  ]);
  const [isLocked, setIsLocked] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [pendingAdvanceReason, setPendingAdvanceReason] = useState<PendingAdvanceReason>(null);

  const [writingInput, setWritingInput] = useState('');
  const [writingState, setWritingState] = useState<WritingState>('INPUT');
  const [wrongWords, setWrongWords] = useState<readonly VocabItem[]>([]);
  const [masteredWordIds, setMasteredWordIds] = useState<Set<string>>(new Set());
  const [currentBatchNum, setCurrentBatchNum] = useState(1);
  const [totalQuestionsAnswered, setTotalQuestionsAnswered] = useState(0);

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextQuestionRef = useRef<() => void>(() => {});

  useEffect(() => {
    return () => {
      timersRef.current.forEach(timer => clearTimeout(timer));
      timersRef.current = [];
    };
  }, []);

  const generateQuestions = useCallback(
    (currentSettings: QuizSettings) => {
      if (words.length < 4) return [];
      const shuffledWords = shuffleArray(words);
      const generated: QuizQuestion[] = [];

      shuffledWords.forEach((targetWord, idx) => {
        let questionType: QuestionType;
        if (currentSettings.multipleChoice && currentSettings.writingMode) {
          questionType = idx % 2 === 0 ? 'MULTIPLE_CHOICE' : 'WRITING';
        } else if (currentSettings.writingMode) {
          questionType = 'WRITING';
        } else {
          questionType = 'MULTIPLE_CHOICE';
        }

        const direction =
          questionType === 'MULTIPLE_CHOICE'
            ? currentSettings.mcDirection
            : currentSettings.writingDirection;

        if (questionType === 'MULTIPLE_CHOICE') {
          const others = words.filter(w => w.id !== targetWord.id);
          const distractors = shuffleArray(others).slice(0, 3);
          const options = shuffleArray([targetWord, ...distractors]);
          const correctIndex = options.findIndex(o => o.id === targetWord.id);
          generated.push({ type: 'MULTIPLE_CHOICE', targetWord, direction, options, correctIndex });
        } else {
          generated.push({ type: 'WRITING', targetWord, direction });
        }
      });
      return generated;
    },
    [words]
  );

  const generateQuestionsFromWords = useCallback(
    (retryWords: readonly VocabItem[], currentSettings: QuizSettings) => {
      if (retryWords.length === 0) return [];
      const shuffledWords = shuffleArray(retryWords);
      const generated: QuizQuestion[] = [];

      shuffledWords.forEach((targetWord, idx) => {
        let questionType: QuestionType;
        if (currentSettings.multipleChoice && currentSettings.writingMode) {
          questionType = idx % 2 === 0 ? 'MULTIPLE_CHOICE' : 'WRITING';
        } else if (currentSettings.writingMode) {
          questionType = 'WRITING';
        } else {
          questionType = 'MULTIPLE_CHOICE';
        }

        const direction =
          questionType === 'MULTIPLE_CHOICE'
            ? currentSettings.mcDirection
            : currentSettings.writingDirection;

        if (questionType === 'MULTIPLE_CHOICE') {
          const others = words.filter(w => w.id !== targetWord.id);
          const distractors = shuffleArray(others).slice(0, 3);
          const options = shuffleArray([targetWord, ...distractors]);
          const correctIndex = options.findIndex(o => o.id === targetWord.id);
          generated.push({ type: 'MULTIPLE_CHOICE', targetWord, direction, options, correctIndex });
        } else {
          generated.push({ type: 'WRITING', targetWord, direction });
        }
      });
      return generated;
    },
    [words]
  );

  const currentQuestion = questions[questionIndex];
  const totalQuestions = questions.length;
  const pendingAdvance = isLearn && pendingAdvanceReason !== null;

  const commitProgress = useCallback(
    (wordId: string, isCorrect: boolean) => {
      if (onFsrsReview) {
        onFsrsReview(wordId, isCorrect);
        return;
      }
      if (userId) {
        void recordProgress(wordId, isCorrect).catch(() => {
          onProgressSyncError?.(wordId, isCorrect);
        });
      }
    },
    [onFsrsReview, onProgressSyncError, recordProgress, userId]
  );

  const nextQuestion = useCallback(() => {
    setTotalQuestionsAnswered(t => t + 1);
    setPendingAdvanceReason(null);

    if (questionIndex >= totalQuestions - 1) {
      const remainingNewWords = words.filter(
        w => !masteredWordIds.has(w.id) && !wrongWords.some(ww => ww.id === w.id)
      );

      if (wrongWords.length > 0 || remainingNewWords.length > 0) {
        const batchSize = 20;
        const wrongToInclude = [...wrongWords];
        const newWordsNeeded = Math.max(0, batchSize - wrongToInclude.length);
        const newWordsToAdd = shuffleArray(remainingNewWords).slice(0, newWordsNeeded);

        const nextBatchWords = shuffleArray([...wrongToInclude, ...newWordsToAdd]);

        if (nextBatchWords.length > 0) {
          const nextQuestions = generateQuestionsFromWords(nextBatchWords, settings);
          setQuestions(nextQuestions);
          setQuestionIndex(0);
          setOptionStates(['normal', 'normal', 'normal', 'normal']);
          setIsLocked(false);
          setPendingAdvanceReason(null);
          setWritingInput('');
          setWritingState('INPUT');
          setWrongWords([]);
          setCurrentBatchNum(b => b + 1);
          return;
        }
      }

      setGameState('COMPLETE');
      onComplete?.({ correct: correctCount, total: totalQuestionsAnswered + 1 });
    } else {
      setQuestionIndex(q => q + 1);
      setOptionStates(['normal', 'normal', 'normal', 'normal']);
      setIsLocked(false);
      setPendingAdvanceReason(null);
      setWritingInput('');
      setWritingState('INPUT');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [
    questionIndex,
    totalQuestions,
    words,
    masteredWordIds,
    wrongWords,
    generateQuestionsFromWords,
    settings,
    onComplete,
    correctCount,
    totalQuestionsAnswered,
  ]);

  useEffect(() => {
    nextQuestionRef.current = nextQuestion;
  });

  const handleCorrectMC = useCallback(
    (index: number) => {
      if (!currentQuestion) return;
      setOptionStates(prev => prev.map((_, i) => (i === index ? 'correct' : 'normal')));
      setCorrectCount(c => c + 1);
      playCorrectSound();
      if (currentQuestion.targetWord.id) {
        commitProgress(currentQuestion.targetWord.id, true);
      }
      setMasteredWordIds(prev => new Set([...prev, currentQuestion.targetWord.id]));
    },
    [commitProgress, currentQuestion, playCorrectSound]
  );

  const handleWrongMC = useCallback(
    (index: number) => {
      if (!currentQuestion) return;
      if (isLearn) setPendingAdvanceReason('WRONG');
      setOptionStates(prev =>
        prev.map((_, i) => {
          if (i === index) return 'wrong';
          if (i === currentQuestion.correctIndex) return 'correct';
          return 'normal';
        })
      );
      playWrongSound();
      if (currentQuestion.targetWord.id) {
        commitProgress(currentQuestion.targetWord.id, false);
      }
      setWrongWords(prev => {
        if (!prev.some(w => w.id === currentQuestion.targetWord.id)) {
          return [...prev, currentQuestion.targetWord];
        }
        return prev;
      });
    },
    [commitProgress, currentQuestion, isLearn, playWrongSound]
  );

  const handleOptionClick = useCallback(
    (index: number) => {
      if (isLocked || currentQuestion?.type !== 'MULTIPLE_CHOICE') return;
      setIsLocked(true);
      setPendingAdvanceReason(null);
      const isCorrect = index === currentQuestion.correctIndex;
      setOptionStates(prev => prev.map((_, i) => (i === index ? 'selected' : 'normal')));

      const timer1 = setTimeout(() => {
        if (isCorrect) {
          handleCorrectMC(index);
        } else {
          handleWrongMC(index);
        }
        if (!isLearn || isCorrect) {
          const timer2 = setTimeout(() => nextQuestion(), 1000);
          timersRef.current.push(timer2);
        }
      }, 400);
      timersRef.current.push(timer1);
    },
    [isLocked, currentQuestion, handleCorrectMC, handleWrongMC, isLearn, nextQuestion, timersRef]
  );

  const handleDontKnow = useCallback(() => {
    if (isLocked || currentQuestion?.type !== 'MULTIPLE_CHOICE') return;
    if (!isLearn) return;
    setIsLocked(true);
    setPendingAdvanceReason('DONT_KNOW');
    const correctIndex = currentQuestion.correctIndex ?? -1;
    setOptionStates(prev => prev.map((_, i) => (i === correctIndex ? 'correct' : 'normal')));
    if (currentQuestion.targetWord.id) {
      commitProgress(currentQuestion.targetWord.id, false);
    }
    setWrongWords(prev => {
      if (!prev.some(w => w.id === currentQuestion.targetWord.id)) {
        return [...prev, currentQuestion.targetWord];
      }
      return prev;
    });
  }, [commitProgress, currentQuestion, isLearn, isLocked]);

  const handleWritingSubmit = useCallback(() => {
    if (currentQuestion?.type !== 'WRITING') return;
    if (writingState !== 'INPUT') return;
    setIsLocked(true);
    setPendingAdvanceReason(null);
    const correctAnswer =
      currentQuestion.direction === 'KR_TO_NATIVE'
        ? currentQuestion.targetWord.english
        : currentQuestion.targetWord.korean;
    const userAnswer = writingInput.trim();
    const isCorrect =
      currentQuestion.direction === 'KR_TO_NATIVE'
        ? userAnswer.toLowerCase() === correctAnswer.toLowerCase()
        : userAnswer === correctAnswer;

    if (isCorrect) {
      setWritingState('CORRECT');
      setCorrectCount(c => c + 1);
      playCorrectSound();
      if (currentQuestion.targetWord.id) {
        commitProgress(currentQuestion.targetWord.id, true);
      }
      setMasteredWordIds(prev => new Set([...prev, currentQuestion.targetWord.id]));
    } else {
      setWritingState('WRONG');
      playWrongSound();
      if (currentQuestion.targetWord.id) {
        commitProgress(currentQuestion.targetWord.id, false);
      }
      setWrongWords(prev => {
        if (!prev.some(w => w.id === currentQuestion.targetWord.id)) {
          return [...prev, currentQuestion.targetWord];
        }
        return prev;
      });
    }
    if (!isLearn || isCorrect) {
      const timer = setTimeout(() => nextQuestion(), 1500);
      timersRef.current.push(timer);
    } else {
      setPendingAdvanceReason('WRONG');
    }
  }, [
    currentQuestion,
    writingState,
    writingInput,
    playCorrectSound,
    playWrongSound,
    commitProgress,
    isLearn,
    nextQuestion,
    timersRef,
  ]);

  const restartGame = useCallback(() => {
    setQuestions(generateQuestions(settings));
    setQuestionIndex(0);
    setCorrectCount(0);
    setTotalQuestionsAnswered(0);
    setOptionStates(['normal', 'normal', 'normal', 'normal']);
    setIsLocked(false);
    setPendingAdvanceReason(null);
    setWritingInput('');
    setWritingState('INPUT');
    setWrongWords([]);
    setMasteredWordIds(new Set());
    setCurrentBatchNum(1);
    setGameState('PLAYING');
  }, [generateQuestions, settings]);

  const applySettings = useCallback(() => {
    setQuestions(generateQuestions(settings));
    setQuestionIndex(0);
    setCorrectCount(0);
    setOptionStates(['normal', 'normal', 'normal', 'normal']);
    setIsLocked(false);
    setPendingAdvanceReason(null);
    setWritingInput('');
    setWritingState('INPUT');
    setGameState('PLAYING');
  }, [generateQuestions, settings]);

  return {
    gameState,
    setGameState,
    questions,
    setQuestions,
    questionIndex,
    setQuestionIndex,
    optionStates,
    setOptionStates,
    isLocked,
    setIsLocked,
    correctCount,
    setCorrectCount,
    pendingAdvanceReason,
    setPendingAdvanceReason,
    writingInput,
    setWritingInput,
    writingState,
    setWritingState,
    wrongWords,
    setWrongWords,
    masteredWordIds,
    setMasteredWordIds,
    currentBatchNum,
    setCurrentBatchNum,
    totalQuestionsAnswered,
    setTotalQuestionsAnswered,
    timersRef,
    currentQuestion,
    totalQuestions,
    pendingAdvance,
    generateQuestions,
    generateQuestionsFromWords,
    nextQuestion,
    handleOptionClick,
    handleDontKnow,
    handleWritingSubmit,
    restartGame,
    applySettings,
    inputRef,
    nextQuestionRef,
  };
};

const useQuizProgress = (courseId?: string) => {
  const { updateProgressFSRS } = useFSRSProgress(courseId);

  const recordProgress = useCallback(
    async (wordId: string, isCorrect: boolean) => {
      const result = await updateProgressFSRS({
        wordId: wordId as Id<'words'>,
        isCorrect,
      });
      await result.syncPromise;
    },
    [updateProgressFSRS]
  );

  return { recordProgress };
};

const useQuizSounds = (enabled: boolean) => {
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      const w = globalThis as Window &
        typeof globalThis & {
          webkitAudioContext?: typeof AudioContext;
        };
      const Ctor = globalThis.AudioContext ?? w.webkitAudioContext;
      if (!Ctor) {
        throw new Error('AudioContext not supported');
      }
      audioContextRef.current = new Ctor();
    }
    return audioContextRef.current;
  }, []);

  const playCorrectSound = useCallback(() => {
    if (!enabled) return;
    try {
      const ctx = getAudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.setValueAtTime(523.25, ctx.currentTime);
      oscillator.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
    } catch (e) {
      logger.warn('Sound effect failed:', e);
    }
  }, [enabled, getAudioContext]);

  const playWrongSound = useCallback(() => {
    if (!enabled) return;
    try {
      const ctx = getAudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.setValueAtTime(200, ctx.currentTime);
      oscillator.frequency.setValueAtTime(150, ctx.currentTime + 0.1);
      oscillator.type = 'sawtooth';

      gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.25);
    } catch (e) {
      logger.warn('Sound effect failed:', e);
    }
  }, [enabled, getAudioContext]);

  return { playCorrectSound, playWrongSound };
};

const useQuizTTS = (autoTTS: boolean, speakTTS: (text: string) => void) => {
  const speakWord = useCallback(
    (text: string, force: boolean = false) => {
      if (!force && !autoTTS) return;
      speakTTS(text);
    },
    [autoTTS, speakTTS]
  );

  return { speakWord };
};

interface NotEnoughWordsProps {
  wordsCount: number;
  labels: Labels;
  variant: 'quiz' | 'learn';
}

const NotEnoughWords: React.FC<NotEnoughWordsProps> = ({ wordsCount, labels, variant }) => {
  if (wordsCount >= 4) return null;

  let minWordsMessage: string;
  const minWordsLabel = labels.dashboard?.quiz?.minWords;

  if (typeof minWordsLabel === 'string') {
    minWordsMessage = minWordsLabel;
  } else if (variant === 'learn') {
    minWordsMessage = labels.vocabQuiz?.minWordsLearn || 'Need at least 4 words to start learning';
  } else {
    minWordsMessage = labels.vocabQuiz?.minWordsQuiz || 'Need at least 4 words to start quiz';
  }

  return (
    <div className="bg-card rounded-[2.5rem] border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] p-12 text-center">
      <p className="text-muted-foreground font-medium">{minWordsMessage}</p>
    </div>
  );
};

const NUMBER_KEY_TO_OPTION_INDEX: Record<string, number> = {
  '1': 0,
  '2': 1,
  '3': 2,
  '4': 3,
  Numpad1: 0,
  Numpad2: 1,
  Numpad3: 2,
  Numpad4: 3,
};

function isModifierOnlyKey(key: string): boolean {
  return key === 'Shift' || key === 'Control' || key === 'Alt' || key === 'Meta';
}

function shouldIgnoreQuizHotkey(params: {
  event: KeyboardEvent;
  showSettings: boolean;
  isInputTarget: (target: EventTarget | null) => boolean;
}): boolean {
  const { event, showSettings, isInputTarget } = params;
  if (event.metaKey || event.ctrlKey || event.altKey) return true;
  if (isModifierOnlyKey(event.key)) return true;
  if (showSettings) return true;
  return isInputTarget(event.target);
}

function tryHandlePendingAdvance(params: {
  event: KeyboardEvent;
  pendingAdvance: boolean;
  setPendingAdvanceReason: (reason: PendingAdvanceReason) => void;
  nextQuestionRef: React.RefObject<() => void>;
}): boolean {
  const { event, pendingAdvance, setPendingAdvanceReason, nextQuestionRef } = params;
  if (!pendingAdvance) return false;
  event.preventDefault();
  setPendingAdvanceReason(null);
  nextQuestionRef.current?.();
  return true;
}

function tryHandleSpeakHotkey(params: {
  event: KeyboardEvent;
  currentQuestion: QuizQuestion;
  speakWord: (text: string, force?: boolean) => void;
}): boolean {
  const { event, currentQuestion, speakWord } = params;
  if (event.code !== 'Space') return false;
  event.preventDefault();
  speakWord(currentQuestion.targetWord.korean, true);
  return true;
}

function tryHandleChoiceHotkey(params: {
  event: KeyboardEvent;
  currentQuestion: QuizQuestion;
  isLocked: boolean;
  handleOptionClick: (index: number) => void;
}): boolean {
  const { event, currentQuestion, isLocked, handleOptionClick } = params;
  if (currentQuestion.type !== 'MULTIPLE_CHOICE' || isLocked) return false;
  const mapped = NUMBER_KEY_TO_OPTION_INDEX[event.key] ?? NUMBER_KEY_TO_OPTION_INDEX[event.code];
  if (mapped === undefined) return false;
  event.preventDefault();
  handleOptionClick(mapped);
  return true;
}

function tryHandleWritingHotkey(params: {
  event: KeyboardEvent;
  currentQuestion: QuizQuestion;
  writingState: WritingState;
  handleWritingSubmit: () => void;
}): boolean {
  const { event, currentQuestion, writingState, handleWritingSubmit } = params;
  if (currentQuestion.type !== 'WRITING') return false;
  if (writingState !== 'INPUT' || event.key !== 'Enter') return false;
  event.preventDefault();
  handleWritingSubmit();
  return true;
}

const useQuizKeyboard = ({
  pendingAdvance,
  showSettings,
  isLocked,
  currentQuestion,
  writingState,
  nextQuestionRef,
  setPendingAdvanceReason,
  handleOptionClick,
  handleWritingSubmit,
  speakWord,
}: {
  pendingAdvance: boolean;
  showSettings: boolean;
  isLocked: boolean;
  currentQuestion: QuizQuestion | undefined;
  writingState: WritingState;
  nextQuestionRef: React.RefObject<() => void>;
  setPendingAdvanceReason: (reason: PendingAdvanceReason) => void;
  handleOptionClick: (index: number) => void;
  handleWritingSubmit: () => void;
  speakWord: (text: string, force?: boolean) => void;
}) => {
  useEffect(() => {
    const isInputTarget = (target: EventTarget | null) => {
      const element = target as HTMLElement | null;
      if (!element) return false;
      const tag = element.tagName;
      return element.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    };

    const handler = (e: KeyboardEvent) => {
      if (shouldIgnoreQuizHotkey({ event: e, showSettings, isInputTarget })) return;
      if (
        tryHandlePendingAdvance({
          event: e,
          pendingAdvance,
          setPendingAdvanceReason,
          nextQuestionRef,
        })
      )
        return;
      if (!currentQuestion) return;
      if (tryHandleSpeakHotkey({ event: e, currentQuestion, speakWord })) return;
      if (
        tryHandleChoiceHotkey({
          event: e,
          currentQuestion,
          isLocked,
          handleOptionClick,
        })
      )
        return;
      void tryHandleWritingHotkey({
        event: e,
        currentQuestion,
        writingState,
        handleWritingSubmit,
      });
    };

    globalThis.addEventListener('keydown', handler);
    return () => globalThis.removeEventListener('keydown', handler);
  }, [
    currentQuestion,
    handleOptionClick,
    handleWritingSubmit,
    isLocked,
    nextQuestionRef,
    pendingAdvance,
    setPendingAdvanceReason,
    showSettings,
    speakWord,
    writingState,
  ]);
};

interface QuizContentProps {
  currentQuestion: QuizQuestion;
  labels: Labels;
  isLearn: boolean;
  currentBatchNum: number;
  questionIndex: number;
  totalQuestions: number;
  settingsLocked: boolean;
  setShowSettings: (show: boolean) => void;
  correctCount: number;
  optionStates: readonly OptionState[];
  handleOptionClick: (index: number) => void;
  isLocked: boolean;
  handleDontKnow: () => void;
  pendingAdvance: boolean;
  language: Language;
  setPendingAdvanceReason: (reason: PendingAdvanceReason) => void;
  nextQuestionRef: React.RefObject<() => void>;
  inputRef: React.RefObject<HTMLInputElement | null>;
  writingInput: string;
  setWritingInput: (value: string) => void;
  writingState: WritingState;
  handleWritingSubmit: () => void;
}

function getQuizPromptText(
  currentQuestion: QuizQuestion,
  labels: Labels,
  isWriting: boolean
): string {
  if (isWriting) {
    return currentQuestion.direction === 'KR_TO_NATIVE'
      ? labels.dashboard?.quiz?.enterMeaning || 'Enter meaning...'
      : labels.dashboard?.quiz?.enterKorean || 'Enter Korean...';
  }
  return currentQuestion.direction === 'KR_TO_NATIVE'
    ? labels.dashboard?.quiz?.questionMeaning || 'What does this word mean?'
    : labels.dashboard?.quiz?.questionKorean || 'What is the Korean word?';
}

const DontKnowAction: React.FC<{
  visible: boolean;
  handleDontKnow: () => void;
  isLocked: boolean;
  labels: Labels;
}> = ({ visible, handleDontKnow, isLocked, labels }) => {
  if (!visible) return null;
  return (
    <div className="flex items-center justify-end">
      <Button
        variant="ghost"
        size="auto"
        type="button"
        onClick={handleDontKnow}
        disabled={isLocked}
        className="text-sm font-black text-blue-600 hover:text-blue-700 disabled:opacity-50"
      >
        {labels.vocabQuiz?.dontKnow || "I don't know"}
      </Button>
    </div>
  );
};

const QuizContent: React.FC<QuizContentProps> = ({
  currentQuestion,
  labels,
  isLearn,
  currentBatchNum,
  questionIndex,
  totalQuestions,
  settingsLocked,
  setShowSettings,
  correctCount,
  optionStates,
  handleOptionClick,
  isLocked,
  handleDontKnow,
  pendingAdvance,
  language,
  setPendingAdvanceReason,
  nextQuestionRef,
  inputRef,
  writingInput,
  setWritingInput,
  writingState,
  handleWritingSubmit,
}) => {
  const isWriting = currentQuestion.type === 'WRITING';
  const questionText =
    currentQuestion.direction === 'NATIVE_TO_KR'
      ? currentQuestion.targetWord.english
      : currentQuestion.targetWord.korean;
  const promptText = getQuizPromptText(currentQuestion, labels, isWriting);
  const containerClass = isLearn
    ? 'rounded-3xl border border-border shadow-sm p-6 sm:p-7 max-w-4xl mx-auto'
    : 'rounded-[2.5rem] border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] p-8';
  const showDontKnow = isLearn && !pendingAdvance && !isWriting && Boolean(currentQuestion.options);

  return (
    <div className={`bg-card ${containerClass}`}>
      <ProgressHeader
        labels={labels}
        currentBatchNum={currentBatchNum}
        questionIndex={questionIndex}
        totalQuestions={totalQuestions}
        settingsLocked={settingsLocked}
        setShowSettings={setShowSettings}
        isLearn={isLearn}
      />

      <ScoreBadge
        correctCount={correctCount}
        labels={labels}
        isWriting={isWriting}
        isLearn={isLearn}
      />

      <QuestionDisplay promptText={promptText} questionText={questionText} isLearn={isLearn} />

      {!isWriting && currentQuestion.options && (
        <MCOptions
          options={currentQuestion.options}
          direction={currentQuestion.direction}
          optionStates={optionStates}
          handleOptionClick={handleOptionClick}
          isLocked={isLocked}
          isLearn={isLearn}
        />
      )}

      <DontKnowAction
        visible={showDontKnow}
        handleDontKnow={handleDontKnow}
        isLocked={isLocked}
        labels={labels}
      />

      {pendingAdvance ? (
        <PendingAdvanceBanner
          language={language}
          onContinue={() => {
            setPendingAdvanceReason(null);
            nextQuestionRef.current?.();
          }}
        />
      ) : null}

      {isWriting && (
        <WritingInput
          inputRef={inputRef}
          writingInput={writingInput}
          setWritingInput={setWritingInput}
          writingState={writingState}
          handleWritingSubmit={handleWritingSubmit}
          direction={currentQuestion.direction}
          targetWord={currentQuestion.targetWord}
          labels={labels}
          isLearn={isLearn}
        />
      )}

      <style>{`
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-8px); } 75% { transform: translateX(8px); } }
        .animate-shake { animation: shake 0.3s ease-in-out; }
      `}</style>
    </div>
  );
};

function VocabQuizComponent({
  words,
  courseId,
  onComplete,
  hasNextUnit,
  onNextUnit,
  currentUnitLabel: _currentUnitLabel,
  userId,
  onFsrsReview,
  language = 'zh',
  variant = 'quiz',
  presetSettings,
  settingsLocked = false,
}: VocabQuizProps) {
  const labels = getLabels(language);
  const isLearn = variant === 'learn';
  let modeLabel = labels.vocab?.quiz || 'Quiz';
  if (variant === 'learn') {
    modeLabel = labels.learn || 'Learn';
  }
  // Settings
  const [settings, setSettings] = useState<QuizSettings>({
    multipleChoice: true,
    writingMode: false,
    mcDirection: 'KR_TO_NATIVE',
    writingDirection: 'NATIVE_TO_KR',
    autoTTS: true,
    soundEffects: true,
    ...presetSettings,
  });
  const [showSettings, setShowSettings] = useState(false);
  const { speak: speakTTS } = useTTS();
  const { playCorrectSound, playWrongSound } = useQuizSounds(settings.soundEffects);
  const { recordProgress } = useQuizProgress(courseId);
  const lastProgressErrorAtRef = useRef(0);
  const handleProgressSyncError = useCallback(() => {
    const now = Date.now();
    if (now - lastProgressErrorAtRef.current < 3000) return;
    lastProgressErrorAtRef.current = now;
    notify.error(
      labels.vocab?.syncFailed ||
        'Failed to sync progress. Your local answer is kept; please try again later.'
    );
  }, [labels.vocab?.syncFailed]);
  const {
    gameState,
    questions,
    questionIndex,
    optionStates,
    isLocked,
    correctCount,
    writingInput,
    setWritingInput,
    writingState,
    currentBatchNum,
    totalQuestionsAnswered,
    currentQuestion,
    totalQuestions,
    pendingAdvance,
    handleOptionClick,
    handleDontKnow,
    handleWritingSubmit,
    restartGame,
    applySettings,
    inputRef,
    nextQuestionRef,
    setQuestions,
    setPendingAdvanceReason,
    generateQuestions,
  } = useQuizGame({
    words,
    settings,
    isLearn,
    onComplete,
    recordProgress,
    playCorrectSound,
    playWrongSound,
    userId,
    onFsrsReview,
    onProgressSyncError: handleProgressSyncError,
  });

  const { speakWord } = useQuizTTS(settings.autoTTS, speakTTS);
  useQuizKeyboard({
    pendingAdvance,
    showSettings,
    isLocked,
    currentQuestion,
    writingState,
    nextQuestionRef,
    setPendingAdvanceReason,
    handleOptionClick,
    handleWritingSubmit,
    speakWord,
  });

  useEffect(() => {
    if (settings.autoTTS && currentQuestion && gameState === 'PLAYING') {
      if (currentQuestion.direction === 'KR_TO_NATIVE') {
        speakWord(currentQuestion.targetWord.korean);
      }
    }
  }, [questionIndex, questions, settings.autoTTS, gameState, speakWord, currentQuestion]);

  // Initial load
  const [hasInit, setHasInit] = useState(false);
  if (!hasInit && words.length >= 4) {
    setHasInit(true);
    setQuestions(generateQuestions(settings));
  }

  // Not enough words
  if (words.length < 4) {
    return <NotEnoughWords wordsCount={words.length} labels={labels} variant={variant} />;
  }

  // Complete Screen
  if (gameState === 'COMPLETE') {
    return (
      <CompleteScreen
        correctCount={correctCount}
        totalQuestionsAnswered={totalQuestionsAnswered}
        totalQuestions={totalQuestions}
        labels={labels}
        variant={variant}
        hasNextUnit={hasNextUnit}
        onNextUnit={onNextUnit}
        restartGame={restartGame}
      />
    );
  }

  // Playing
  if (!currentQuestion) return null;

  return (
    <>
      <SettingsModal
        showSettings={showSettings}
        settingsLocked={settingsLocked}
        setShowSettings={setShowSettings}
        labels={labels}
        modeLabel={modeLabel}
        settings={settings}
        setSettings={setSettings}
        applySettings={applySettings}
      />
      <QuizContent
        currentQuestion={currentQuestion}
        labels={labels}
        isLearn={isLearn}
        currentBatchNum={currentBatchNum}
        questionIndex={questionIndex}
        totalQuestions={totalQuestions}
        settingsLocked={settingsLocked}
        setShowSettings={setShowSettings}
        correctCount={correctCount}
        optionStates={optionStates}
        handleOptionClick={handleOptionClick}
        isLocked={isLocked}
        handleDontKnow={handleDontKnow}
        pendingAdvance={pendingAdvance}
        language={language}
        setPendingAdvanceReason={setPendingAdvanceReason}
        nextQuestionRef={nextQuestionRef}
        inputRef={inputRef}
        writingInput={writingInput}
        setWritingInput={setWritingInput}
        writingState={writingState}
        handleWritingSubmit={handleWritingSubmit}
      />
    </>
  );
}

const VocabQuiz = memo(VocabQuizComponent);
export default VocabQuiz;
