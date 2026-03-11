import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useKoreanTyping, TypingMode } from '../features/typing/hooks/useKoreanTyping';
import { HiddenInput } from '../features/typing/components/HiddenInput';
import { KeyboardHints } from '../features/typing/components/KeyboardHints';
import { TypingResultsModal } from '../features/typing/components/TypingResultsModal';
import {
  PRACTICE_CATEGORIES,
  PracticeCategory,
  PRACTICE_PARAGRAPHS,
  PracticeParagraph,
} from '../features/typing/data/practiceTexts';
import { ArrowLeft, Ghost } from 'lucide-react';
import { useLayoutActions } from '../contexts/LayoutContext';
import { useAuth } from '../contexts/AuthContext';
import { useMutation, useQuery } from 'convex/react';
import { WordPractice } from '../features/typing/components/WordPractice';
import { api } from '../../convex/_generated/api';
import { useTranslation } from 'react-i18next'; // Added i18n hook
import { useNavigate } from 'react-router-dom';
import { TypingLobby } from '../features/typing/components/TypingLobby';
import { useIsMobile } from '../hooks/useIsMobile';
import { MobileTypingPage } from '../components/mobile/MobileTypingPage';
import { Button } from '../components/ui';
import { Select } from '../components/ui';

// Enhanced Keyboard & Page Theme Styles
// Enhanced Keyboard & Page Theme Styles (Soft Pop V3)
const keyboardThemeStyles = `
    /* Prevent scrolling and touch events on game container */
    .typing-practice-container {
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
    overscroll-behavior: none;
}

  /* Keyboard Container - Transparent to let background shine */
  .hg-theme-default {
    background-color: transparent!important;
    padding: 0!important;
}
  
  .hg-row {
    justify-content: center;
    gap: 3px; /* Tighter spacing */
    margin-bottom: 4px;
}

  /* Base Key Style - Soft Marshmallow Look */
  .hg-button {
    background: #ffffff!important;
    color: #475569!important; /* slate-600 */
    border: none!important;
    border-bottom: 1px solid #e2e8f0!important;
    border-radius: 0.3rem!important; /* Mini radius */
    box-shadow: 0 2px 0 #cbd5e1, 0 1px 2px rgba(0, 0, 0, 0.05)!important;

    font-weight: 600!important;
    font-size: 11px!important; /* Tiny font */
    height: 1.8rem!important; /* Ultra compact height */
    min-width: 1.6rem!important;
    margin: 0!important;

    transition: all 0.05s ease!important;
    display: flex!important;
    align-items: center!important;
    justify-content: center!important;
}

  /* Hover State */
  .hg-button:hover {
    background: #f8fafc!important;
    transform: translateY(1px);
    box-shadow: 0 2px 0 #cbd5e1!important;
}

  /* Active / Pressed State */
  .hg-button:active, .hg-activeButton {
    transform: translateY(3px)!important;
    box-shadow: 0 0 0 #cbd5e1, inset 0 2px 4px rgba(0, 0, 0, 0.05)!important;
    background: #f1f5f9!important;
}

  /* Highlighting Next Key (Guidance) */
  .active-key-highlight {
    background: #3b82f6!important; /* brand-500 */
    color: #ffffff!important;
    box-shadow: 0 3px 0 #1d4ed8, 0 4px 10px rgba(59, 130, 246, 0.4)!important;
    animation: bounce-gentle 2s infinite!important;
    z-index: 10;
}

@keyframes bounce-gentle {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-2px); }
}

  /* Special Keys Styling */
  .hg-button[data-skbtn="{bksp}"],
  .hg-button[data-skbtn="{tab}"],
  .hg-button[data-skbtn="{lock}"],
  .hg-button[data-skbtn="{enter}"],
  .hg-button[data-skbtn="{shiftleft}"], 
  .hg-button[data-skbtn="{shiftright}"] {
    background-color: #f1f5f9!important;
    color: #94a3b8!important;
    font-size: 11px!important;
    border-bottom-color: #cbd5e1!important;
    box-shadow: 0 3px 0 #cbd5e1!important;
}

  /* Override: Special keys should also highlight when active */
  .hg-button.active-key-highlight[data-skbtn="{shiftleft}"],
  .hg-button.active-key-highlight[data-skbtn="{shiftright}"],
  .hg-button.active-key-highlight[data-skbtn="{bksp}"],
  .hg-button.active-key-highlight[data-skbtn="{enter}"],
  .hg-button.active-key-highlight[data-skbtn="{space}"] {
    background: #3b82f6!important;
    color: #ffffff!important;
    box-shadow: 0 3px 0 #1d4ed8, 0 4px 10px rgba(59, 130, 246, 0.4)!important;
    animation: bounce-gentle 2s infinite!important;
}

  .hg-button[data-skbtn="{space}"] {
    min-width: 14rem!important;
    color: transparent!important; /* Hide text on spacebar usually */
}
  .hg-button[data-skbtn="{space}"]:after {
    content: "SPACE";
    color: #cbd5e1;
    font-size: 10px;
    letter-spacing: 1px;
}

  /* Word Practice V6 Styles (Blue Compact Card) */
  .word-prompt-card {
    background: #2563eb; /* Strong solid blue */
    box-shadow: 0 20px 40px -10px rgba(37, 99, 235, 0.4);
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
  .word-prompt-card:hover {
    transform: scale(1.05);
}
`;

// Generate English Key Labels (QWERTY) via CSS
const englishKeys = {
  q: 'Q',
  w: 'W',
  e: 'E',
  r: 'R',
  t: 'T',
  y: 'Y',
  u: 'U',
  i: 'I',
  o: 'O',
  p: 'P',
  a: 'A',
  s: 'S',
  d: 'D',
  f: 'F',
  g: 'G',
  h: 'H',
  j: 'J',
  k: 'K',
  l: 'L',
  z: 'Z',
  x: 'X',
  c: 'C',
  v: 'V',
  b: 'B',
  n: 'N',
  m: 'M',
};

const englishKeyStyles = Object.entries(englishKeys)
  .map(
    ([key, label]) => `
    .hg-button[data-skbtn="${key}"]::after {
    content: "${label}";
    position: absolute;
    top: 2px;
    right: 4px;
    font-size: 8px;
    color: #94a3b8;
    font-weight: 500;
    line-height: normal;
}
`
  )
  .join('\n');

// Practice Mode Types
type PracticeMode = 'sentence' | 'word' | 'paragraph';
type GameState = 'lobby' | 'playing' | 'finished'; // Added GameState type

type CourseVolumeSource = {
  _id: string;
  displayLevel?: string;
  volume?: string;
  levels?: Array<number | { level: number }> | null;
};

type CourseVolumeOption = {
  id: string;
  label: string;
  sortKey: number;
};

type TypingTranslateFn = ReturnType<typeof useTranslation>['t'];

function getCourseDisplayLevel(course: CourseVolumeSource): number {
  const parsedDisplayLevel = Number.parseInt(course.displayLevel || '0');
  if (parsedDisplayLevel > 0) return parsedDisplayLevel;
  const firstLevel = course.levels?.[0];
  if (typeof firstLevel === 'number') return firstLevel;
  if (typeof firstLevel === 'object' && firstLevel !== null && 'level' in firstLevel) {
    return firstLevel.level;
  }
  return 0;
}

function buildCourseVolumeOption(
  course: CourseVolumeSource,
  t: TypingTranslateFn
): CourseVolumeOption {
  let level = getCourseDisplayLevel(course);
  let volume = 0;
  let label = course.displayLevel || course.volume || '1';

  const levelVolumeMatch = course.volume?.match(/^(\d+)-(\d+)$/);
  if (levelVolumeMatch) {
    level = Number.parseInt(levelVolumeMatch[1]);
    volume = Number.parseInt(levelVolumeMatch[2]);
    label = t('typingLobby.volumeWithLevel', { level, volume });
  } else if (level > 0 && course.volume) {
    volume = Number.parseInt(course.volume) || 0;
    label = t('typingLobby.volumeWithLevel', { level, volume: course.volume });
  } else if (course.volume && !Number.isNaN(Number(course.volume))) {
    volume = Number.parseInt(course.volume);
    label = t('typingLobby.volumeOnly', { volume: course.volume });
  } else if (course.volume) {
    label = course.volume;
  }

  return {
    id: course._id,
    label,
    sortKey: level * 100 + (volume || 0),
  };
}

function buildCourseVolumeOptions(
  courses: CourseVolumeSource[] | undefined,
  t: TypingTranslateFn
): CourseVolumeOption[] {
  const uniqueOptions = new Map<string, CourseVolumeOption>();
  courses?.forEach(course => {
    const option = buildCourseVolumeOption(course, t);
    if (!uniqueOptions.has(option.label)) {
      uniqueOptions.set(option.label, option);
    }
  });
  return Array.from(uniqueOptions.values()).sort((a, b) => a.sortKey - b.sortKey);
}

type CourseRecord = CourseVolumeSource & { name: string };

type TypingPosition = {
  index: number;
  inputChar: string;
  targetChar: string;
  hasError: boolean;
};

function groupCoursesByName(courses: CourseRecord[]): Record<string, CourseRecord[]> {
  const groups: Record<string, CourseRecord[]> = {};
  courses.forEach(course => {
    if (!groups[course.name]) {
      groups[course.name] = [];
    }
    groups[course.name].push(course);
  });
  return groups;
}

function syncSelectedCourseNameState(args: {
  courses: CourseRecord[];
  selectedCourseId: string;
  selectedCourseName: string;
  coursesByName: Record<string, CourseRecord[]>;
  setSelectedCourseName: React.Dispatch<React.SetStateAction<string>>;
}) {
  const { courses, selectedCourseId, selectedCourseName, coursesByName, setSelectedCourseName } =
    args;
  if (selectedCourseId) {
    const selectedCourse = courses.find(course => course._id === selectedCourseId);
    if (selectedCourse && selectedCourse.name !== selectedCourseName) {
      setTimeout(() => setSelectedCourseName(selectedCourse.name), 0);
    }
    return;
  }
  if (courses.length > 0 && !selectedCourseName) {
    const firstGroup = Object.keys(coursesByName)[0];
    if (firstGroup) {
      setTimeout(() => setSelectedCourseName(firstGroup), 0);
    }
  }
}

function resetSessionCounters(args: {
  reset: () => void;
  setElapsedTime: React.Dispatch<React.SetStateAction<number>>;
  setSentencesCompleted: React.Dispatch<React.SetStateAction<number>>;
  setTotalCharactersTyped: React.Dispatch<React.SetStateAction<number>>;
}) {
  args.reset();
  args.setElapsedTime(0);
  args.setSentencesCompleted(0);
  args.setTotalCharactersTyped(0);
}

function getCurrentTypingPosition(args: {
  targetText: string;
  userInput: string;
  checkInput: (
    targetChar: string,
    inputChar: string,
    nextChar?: string
  ) => 'pending' | 'correct' | 'incorrect';
}): TypingPosition {
  const { targetText, userInput, checkInput } = args;
  for (let index = 0; index < targetText.length; index += 1) {
    const inputChar = userInput[index];
    const targetChar = targetText[index];
    const nextChar = index + 1 < targetText.length ? targetText[index + 1] : undefined;
    if (!inputChar) {
      return { index, inputChar: '', targetChar, hasError: false };
    }
    const status = checkInput(targetChar, inputChar, nextChar);
    if (status === 'pending') {
      return { index, inputChar, targetChar, hasError: false };
    }
    if (status === 'incorrect') {
      return { index, inputChar, targetChar, hasError: true };
    }
  }
  return { index: targetText.length, inputChar: '', targetChar: '', hasError: false };
}

function formatTypingElapsedTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')} `;
}

function maybeWarnImeMismatch(args: {
  userInput: string;
  hasWarnedRef: React.MutableRefObject<boolean>;
  t: TypingTranslateFn;
}) {
  const { userInput, hasWarnedRef, t } = args;
  if (/[a-zA-Z]{2,}/.test(userInput)) {
    if (!hasWarnedRef.current) {
      toast.error(
        t('typingGame.switchImeWarning', {
          defaultValue: 'English input detected. Please switch to Korean IME.',
        }),
        {
          duration: 4000,
          position: 'top-center',
          style: {
            background: '#334155',
            color: '#fff',
            fontWeight: 'bold',
          },
        }
      );
      hasWarnedRef.current = true;
    }
    return;
  }
  if (userInput.length === 0) {
    hasWarnedRef.current = false;
  }
}

function generateSentenceQueue(category: PracticeCategory, count: number = 4) {
  const queue: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const sentence = category.sentences[Math.floor(Math.random() * category.sentences.length)];
    queue.push(sentence);
  }
  return queue;
}

function handleStartWordMode(args: {
  setPracticeMode: React.Dispatch<React.SetStateAction<PracticeMode>>;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  selectedCourseId: string;
  courses: CourseRecord[];
  setSelectedCourseId: React.Dispatch<React.SetStateAction<string>>;
  setSelectedCourseName: React.Dispatch<React.SetStateAction<string>>;
  setSelectedUnitId: React.Dispatch<React.SetStateAction<number>>;
  reset: () => void;
  setElapsedTime: React.Dispatch<React.SetStateAction<number>>;
  setSentencesCompleted: React.Dispatch<React.SetStateAction<number>>;
  setTotalCharactersTyped: React.Dispatch<React.SetStateAction<number>>;
}) {
  const {
    setPracticeMode,
    setGameState,
    selectedCourseId,
    courses,
    setSelectedCourseId,
    setSelectedCourseName,
    setSelectedUnitId,
    reset,
    setElapsedTime,
    setSentencesCompleted,
    setTotalCharactersTyped,
  } = args;
  setPracticeMode('word');
  setGameState('playing');
  if (!selectedCourseId && courses.length > 0) {
    const firstCourse = courses[0];
    setSelectedCourseId(firstCourse._id);
    setSelectedCourseName(firstCourse.name);
    setSelectedUnitId(1);
  }
  resetSessionCounters({
    reset,
    setElapsedTime,
    setSentencesCompleted,
    setTotalCharactersTyped,
  });
}

function handleStartSentenceMode(args: {
  setPracticeMode: React.Dispatch<React.SetStateAction<PracticeMode>>;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  reset: () => void;
  setElapsedTime: React.Dispatch<React.SetStateAction<number>>;
  setSentencesCompleted: React.Dispatch<React.SetStateAction<number>>;
  setTotalCharactersTyped: React.Dispatch<React.SetStateAction<number>>;
  selectedCategory: PracticeCategory | null;
  setSelectedCategory: React.Dispatch<React.SetStateAction<PracticeCategory | null>>;
  sentenceQueue: string[];
  setSentenceQueue: React.Dispatch<React.SetStateAction<string[]>>;
  setTargetText: React.Dispatch<React.SetStateAction<string>>;
}) {
  const {
    setPracticeMode,
    setGameState,
    reset,
    setElapsedTime,
    setSentencesCompleted,
    setTotalCharactersTyped,
    selectedCategory,
    setSelectedCategory,
    sentenceQueue,
    setSentenceQueue,
    setTargetText,
  } = args;
  setPracticeMode('sentence');
  setGameState('playing');
  resetSessionCounters({
    reset,
    setElapsedTime,
    setSentencesCompleted,
    setTotalCharactersTyped,
  });

  if (!selectedCategory && PRACTICE_CATEGORIES.length > 0) {
    const category = PRACTICE_CATEGORIES[0];
    setSelectedCategory(category);
    const queue = generateSentenceQueue(category);
    setSentenceQueue(queue);
    setTargetText(queue[0]);
    return;
  }
  if (!selectedCategory) return;
  if (sentenceQueue.length === 0) {
    const queue = generateSentenceQueue(selectedCategory);
    setSentenceQueue(queue);
    setTargetText(queue[0]);
    return;
  }
  setTargetText(sentenceQueue[0]);
}

function handleStartParagraphMode(args: {
  setPracticeMode: React.Dispatch<React.SetStateAction<PracticeMode>>;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  reset: () => void;
  setElapsedTime: React.Dispatch<React.SetStateAction<number>>;
  setSentencesCompleted: React.Dispatch<React.SetStateAction<number>>;
  setTotalCharactersTyped: React.Dispatch<React.SetStateAction<number>>;
  selectedParagraph: PracticeParagraph | null;
  setSelectedParagraph: React.Dispatch<React.SetStateAction<PracticeParagraph | null>>;
  setTargetText: React.Dispatch<React.SetStateAction<string>>;
}) {
  const {
    setPracticeMode,
    setGameState,
    reset,
    setElapsedTime,
    setSentencesCompleted,
    setTotalCharactersTyped,
    selectedParagraph,
    setSelectedParagraph,
    setTargetText,
  } = args;
  setPracticeMode('paragraph');
  setGameState('playing');
  resetSessionCounters({
    reset,
    setElapsedTime,
    setSentencesCompleted,
    setTotalCharactersTyped,
  });
  if (!selectedParagraph && PRACTICE_PARAGRAPHS.length > 0) {
    const paragraph = PRACTICE_PARAGRAPHS[0];
    setSelectedParagraph(paragraph);
    setTargetText(paragraph.text);
    return;
  }
  if (selectedParagraph) {
    setTargetText(selectedParagraph.text);
  }
}

const SELECT_BOX_CLASS =
  'w-full appearance-none bg-card rounded-2xl p-3 pl-4 pr-8 border border-border shadow-sm text-xs font-bold text-muted-foreground outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-300/40 cursor-pointer';
const SENTENCE_SELECT_CLASS =
  'h-auto w-full appearance-none bg-card rounded-2xl p-3 pl-12 pr-8 border border-border shadow-sm text-xs font-bold text-muted-foreground outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-300/40 cursor-pointer';

type TargetChar = {
  char: string;
  id: string;
};

type LiveTypingStats = {
  wpm: number;
  accuracy: number;
};

type SessionStats = {
  wpm: number;
  accuracy: number;
  errorCount: number;
  duration: number;
};

type WordPracticeEntry = {
  id: string;
  word: string;
  meaning: string;
};

function getTypingModeTitle(practiceMode: PracticeMode, t: TypingTranslateFn) {
  const titleByMode: Record<PracticeMode, string> = {
    word: t('typingLobby.word.title'),
    paragraph: t('typingLobby.paragraph.title'),
    sentence: t('typingLobby.sentence.title'),
  };
  return titleByMode[practiceMode];
}

function getTypingDisplayChar(char: string, isCurrent: boolean, inputChar: string | undefined) {
  if (isCurrent && inputChar) return inputChar;
  if (char === ' ') return '\u00A0';
  return char;
}

const TypingSelectChevron: React.FC = () => (
  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
    <svg
      className="h-4 w-4 text-muted-foreground"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  </div>
);

const TypingFooterUser: React.FC<{ userAvatar?: string | null; userName?: string | null }> = ({
  userAvatar,
  userName,
}) => (
  <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-muted-foreground font-medium">
    <div className="w-6 h-6 rounded-full bg-muted overflow-hidden">
      {userAvatar ? (
        <img src={userAvatar} alt="User" className="w-full h-full object-cover" />
      ) : (
        <Ghost className="w-3 h-3 text-muted-foreground m-auto mt-1.5" />
      )}
    </div>
    <span>Logged in as {userName || 'Guest'}</span>
  </div>
);

const WordModeSelectors: React.FC<{
  selectedCourseName: string;
  coursesByName: Record<string, CourseRecord[]>;
  onCourseNameChange: (courseName: string) => void;
  selectedCourseId: string;
  selectedCourseVolumeOptions: CourseVolumeOption[];
  onCourseIdChange: (courseId: string) => void;
  selectedUnitId: number;
  onUnitChange: (unitId: number) => void;
}> = ({
  selectedCourseName,
  coursesByName,
  onCourseNameChange,
  selectedCourseId,
  selectedCourseVolumeOptions,
  onCourseIdChange,
  selectedUnitId,
  onUnitChange,
}) => (
  <div className="space-y-2">
    <div className="space-y-2">
      <div className="relative group">
        <Select
          value={selectedCourseName}
          onChange={e => onCourseNameChange(e.target.value)}
          className={SELECT_BOX_CLASS}
        >
          <option value="" disabled>
            Select Course
          </option>
          {Object.keys(coursesByName).map(name => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </Select>
        <TypingSelectChevron />
      </div>
      {selectedCourseName && (
        <div className="relative group">
          <Select
            value={selectedCourseId}
            onChange={e => onCourseIdChange(e.target.value)}
            className={SELECT_BOX_CLASS}
          >
            {selectedCourseVolumeOptions.map(option => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
          <TypingSelectChevron />
        </div>
      )}
      <div className="relative group">
        <Select
          value={selectedUnitId}
          onChange={e => onUnitChange(Number(e.target.value))}
          className={SELECT_BOX_CLASS}
        >
          {Array.from({ length: 20 }, (_, index) => index + 1).map(unit => (
            <option key={unit} value={unit}>
              Unit {unit}
            </option>
          ))}
        </Select>
        <TypingSelectChevron />
      </div>
    </div>
  </div>
);

const ParagraphModeSelector: React.FC<{
  selectedParagraphId: string;
  onParagraphChange: (paragraphId: string) => void;
}> = ({ selectedParagraphId, onParagraphChange }) => (
  <div className="relative group">
    <Select
      value={selectedParagraphId}
      onChange={e => onParagraphChange(e.target.value)}
      className={SELECT_BOX_CLASS}
    >
      {PRACTICE_PARAGRAPHS.map(paragraph => (
        <option key={paragraph.id} value={paragraph.id}>
          {paragraph.title}
        </option>
      ))}
    </Select>
    <TypingSelectChevron />
  </div>
);

const SentenceModeSelector: React.FC<{
  selectedCategoryId: string;
  selectedCategoryIcon: string;
  onCategoryChange: (categoryId: string) => void;
}> = ({ selectedCategoryId, selectedCategoryIcon, onCategoryChange }) => (
  <div className="relative group">
    <Select
      value={selectedCategoryId}
      onChange={e => onCategoryChange(e.target.value)}
      className={SENTENCE_SELECT_CLASS}
    />
    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-lg filter grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all">
      {selectedCategoryIcon}
    </div>
    <TypingSelectChevron />
  </div>
);

const TypingModeSelectorPanel: React.FC<{
  practiceMode: PracticeMode;
  selectedCourseName: string;
  coursesByName: Record<string, CourseRecord[]>;
  onCourseNameChange: (courseName: string) => void;
  selectedCourseId: string;
  selectedCourseVolumeOptions: CourseVolumeOption[];
  onCourseIdChange: (courseId: string) => void;
  selectedUnitId: number;
  onUnitChange: (unitId: number) => void;
  selectedParagraphId: string;
  onParagraphChange: (paragraphId: string) => void;
  selectedCategoryId: string;
  selectedCategoryIcon: string;
  onCategoryChange: (categoryId: string) => void;
}> = props => {
  const panelByMode: Record<PracticeMode, React.ReactNode> = {
    word: (
      <WordModeSelectors
        selectedCourseName={props.selectedCourseName}
        coursesByName={props.coursesByName}
        onCourseNameChange={props.onCourseNameChange}
        selectedCourseId={props.selectedCourseId}
        selectedCourseVolumeOptions={props.selectedCourseVolumeOptions}
        onCourseIdChange={props.onCourseIdChange}
        selectedUnitId={props.selectedUnitId}
        onUnitChange={props.onUnitChange}
      />
    ),
    paragraph: (
      <ParagraphModeSelector
        selectedParagraphId={props.selectedParagraphId}
        onParagraphChange={props.onParagraphChange}
      />
    ),
    sentence: (
      <SentenceModeSelector
        selectedCategoryId={props.selectedCategoryId}
        selectedCategoryIcon={props.selectedCategoryIcon}
        onCategoryChange={props.onCategoryChange}
      />
    ),
  };

  return <>{panelByMode[props.practiceMode]}</>;
};

const TypingKeyboardDeck: React.FC<{
  nextJamo: string | null;
  currentTargetChar: string;
  hasError: boolean;
}> = ({ nextJamo, currentTargetChar, hasError }) => (
  <div className="flex-shrink-0 bg-card border-t border-border py-3 px-4 shadow-[0_-4px_20px_rgba(0,0,0,0.02)] z-30 w-full">
    <div className="w-full max-w-[90rem] mx-auto flex flex-col gap-3">
      <div className="flex justify-between items-center px-4">
        <div className="text-xs font-bold text-muted-foreground flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${hasError ? 'bg-red-500 dark:bg-red-300' : 'bg-blue-500 dark:bg-blue-300'} animate-pulse`}
          ></span>
          <span>Next Key:</span>
          <span className="text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-400/14 px-2 py-0.5 rounded text-[11px] border border-blue-100 dark:border-blue-300/25">
            {nextJamo || 'Enter'}
          </span>
        </div>
        <div className="text-[10px] text-muted-foreground font-mono tracking-widest">
          2-SET KOREAN
        </div>
      </div>
      <div className="p-3 bg-muted/50 rounded-3xl border border-border/60 select-none">
        <KeyboardHints nextJamo={nextJamo} targetChar={currentTargetChar} hasError={hasError} />
      </div>
    </div>
  </div>
);

const ParagraphTypedChar: React.FC<{
  char: string;
  id: string;
  index: number;
  currentTypingIndex: number;
  userInput: string;
  isFocused: boolean;
}> = ({ char, id, index, currentTypingIndex, userInput, isFocused }) => {
  const isCompleted = index < currentTypingIndex;
  const isCurrent = index === currentTypingIndex;
  const displayChar = getTypingDisplayChar(char, isCurrent, userInput[index]);
  return (
    <span
      key={id}
      id={isCurrent ? 'active-char' : undefined}
      className={`
transition-colors duration-100
${isCompleted ? 'text-foreground' : 'text-muted-foreground'}
${isCurrent ? 'bg-blue-100 dark:bg-blue-400/14 text-blue-600 dark:text-blue-300 relative rounded-sm' : ''}
`}
    >
      {isCurrent && isFocused && (
        <span className="absolute -left-[1px] top-1 bottom-1 w-[2px] bg-blue-500 dark:bg-blue-300 animate-pulse"></span>
      )}
      {displayChar}
    </span>
  );
};

const SentenceTypedChar: React.FC<{
  char: string;
  id: string;
  index: number;
  currentTypingIndex: number;
  userInput: string;
  isFocused: boolean;
}> = ({ char, id, index, currentTypingIndex, userInput, isFocused }) => {
  const isCompleted = index < currentTypingIndex;
  const isCurrent = index === currentTypingIndex;
  const isRemaining = index > currentTypingIndex;
  const inputChar = userInput[index];
  const displayChar = getTypingDisplayChar(char, isCurrent, inputChar);

  return (
    <span
      key={id}
      className={`
transition-all duration-150 inline-block
${isCompleted ? 'text-muted-foreground' : ''}
${isCurrent ? 'text-foreground scale-110 transform cursor-text relative' : ''}
${isRemaining ? 'text-muted-foreground' : ''}
`}
      style={
        isCurrent
          ? {
              textShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }
          : undefined
      }
    >
      {displayChar}
      {isCurrent && inputChar && inputChar !== char && (
        <span className="absolute top-full left-1/2 -translate-x-1/2 text-xs text-blue-300 dark:text-blue-200 opacity-70 mt-1 pointer-events-none">
          {char}
        </span>
      )}
      {isCurrent && isFocused && (
        <span className="absolute -right-1 top-1 bottom-1 w-0.5 bg-blue-500 dark:bg-blue-300 rounded-full animate-pulse shadow-[0_0_4px_rgba(59,130,246,0.6)] dark:shadow-[0_0_4px_rgba(147,197,253,0.4)]"></span>
      )}
    </span>
  );
};

const WordModeContent: React.FC<{
  words?: WordPracticeEntry[];
  onComplete: (resultStats: {
    wpm: number;
    accuracy: number;
    errorCount: number;
    duration: number;
    wordsCompleted: number;
  }) => Promise<void>;
  onStatsUpdate: (stats: SessionStats) => void;
  onBack: () => void;
}> = ({ words, onComplete, onStatsUpdate, onBack }) =>
  words ? (
    <WordPractice
      words={words}
      onComplete={onComplete}
      onStatsUpdate={onStatsUpdate}
      onBack={onBack}
    />
  ) : (
    <div className="flex-1 flex items-center justify-center text-muted-foreground font-medium animate-pulse">
      Loading words...
    </div>
  );

const ParagraphModeContent: React.FC<{
  targetChars: TargetChar[];
  currentTypingIndex: number;
  userInput: string;
  isFocused: boolean;
  onFocusInput: () => void;
  selectedParagraphTitle?: string;
  elapsedTime: number;
  formatTime: (seconds: number) => string;
  nextJamo: string | null;
  currentTargetChar: string;
  hasError: boolean;
}> = ({
  targetChars,
  currentTypingIndex,
  userInput,
  isFocused,
  onFocusInput,
  selectedParagraphTitle,
  elapsedTime,
  formatTime,
  nextJamo,
  currentTargetChar,
  hasError,
}) => (
  <div className="flex-1 flex flex-col items-center justify-start bg-card min-h-0 w-full overflow-y-auto custom-scrollbar">
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center gap-8 py-10 px-8 flex-1">
      <Button
        type="button"
        variant="ghost"
        size="auto"
        className="w-full leading-loose text-left relative cursor-text text-2xl font-medium tracking-tight break-words whitespace-pre-wrap select-none leading-relaxed border-0 bg-transparent p-0"
        onClick={onFocusInput}
      >
        <div className="text-2xl font-medium tracking-tight break-words whitespace-pre-wrap select-none leading-relaxed">
          {targetChars.map(({ char, id }, index) => (
            <ParagraphTypedChar
              key={id}
              char={char}
              id={id}
              index={index}
              currentTypingIndex={currentTypingIndex}
              userInput={userInput}
              isFocused={isFocused}
            />
          ))}
        </div>
      </Button>
      <div className="text-muted-foreground text-sm">
        {selectedParagraphTitle} • {formatTime(elapsedTime)}
      </div>
    </div>
    <TypingKeyboardDeck
      nextJamo={nextJamo}
      currentTargetChar={currentTargetChar}
      hasError={hasError}
    />
  </div>
);

const SentenceModeContent: React.FC<{
  targetChars: TargetChar[];
  currentTypingIndex: number;
  userInput: string;
  isFocused: boolean;
  onFocusInput: () => void;
  sentenceQueue: string[];
  nextJamo: string | null;
  currentTargetChar: string;
  hasError: boolean;
}> = ({
  targetChars,
  currentTypingIndex,
  userInput,
  isFocused,
  onFocusInput,
  sentenceQueue,
  nextJamo,
  currentTargetChar,
  hasError,
}) => (
  <>
    <div className="flex-1 flex flex-col items-center justify-evenly bg-card min-h-0 w-full">
      <div className="w-full h-full flex flex-col items-center justify-center gap-4 lg:gap-10 flex-1">
        <div className="bg-card rounded-[2rem] p-8 lg:p-16 text-center relative overflow-visible shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] border border-white/80 dark:border-border group w-full transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-transparent dark:from-blue-300/10 rounded-[2rem]"></div>
          <div className="relative z-10">
            <p className="text-lg md:text-2xl lg:text-3xl font-bold leading-relaxed tracking-tight break-keep select-none">
              {targetChars.map(({ char, id }, index) => (
                <SentenceTypedChar
                  key={id}
                  char={char}
                  id={id}
                  index={index}
                  currentTypingIndex={currentTypingIndex}
                  userInput={userInput}
                  isFocused={isFocused}
                />
              ))}
            </p>
          </div>
          {!isFocused && (
            <Button
              type="button"
              variant="ghost"
              size="auto"
              className="absolute inset-0 flex items-center justify-center bg-card/60 backdrop-blur-[2px] rounded-[2rem] z-20 transition-all cursor-pointer w-full border-0"
              onClick={onFocusInput}
            >
              <div className="bg-blue-500 dark:bg-blue-400/80 text-primary-foreground px-6 py-2 rounded-full font-bold shadow-lg transform -translate-y-2 animate-bounce">
                Click to Focus
              </div>
            </Button>
          )}
        </div>

        <div
          className={`
w-full max-w-xl bg-card rounded-2xl p-3 lg:p-4 flex items-center justify-center border-2 transition-all duration-200
${isFocused ? 'border-blue-100 dark:border-blue-300/30 shadow-lg shadow-blue-500/5 dark:shadow-blue-900/20 -translate-y-1' : 'border-transparent shadow-sm'}
`}
        >
          <span className="text-lg lg:text-xl font-medium text-muted-foreground mr-1 opacity-50 select-none">
            {userInput.slice(-15) || (
              <span className="text-muted-foreground text-sm">Start typing...</span>
            )}
          </span>
          {isFocused && (
            <span className="w-0.5 h-6 bg-blue-500 dark:bg-blue-300 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.6)] dark:shadow-[0_0_8px_rgba(147,197,253,0.4)]"></span>
          )}
        </div>

        <div className="flex flex-col items-center gap-1.5 lg:gap-2 w-full mt-2">
          {sentenceQueue.slice(1, 4).map((sentence, index) => (
            <div
              key={`queue-${index}-${sentence.substring(0, 20)}`}
              className={`
rounded-xl text-center font-medium transition-all duration-500 truncate
${index === 0 ? 'w-[85%] bg-card/60 p-3 text-base text-muted-foreground shadow-sm' : 'w-[75%] bg-card/30 p-2 text-sm text-muted-foreground'}
`}
            >
              <p className="truncate px-2">{sentence}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
    <TypingKeyboardDeck
      nextJamo={nextJamo}
      currentTargetChar={currentTargetChar}
      hasError={hasError}
    />
  </>
);

const TypingMainContent: React.FC<{
  practiceMode: PracticeMode;
  wordPracticeWords?: WordPracticeEntry[];
  onWordComplete: (resultStats: {
    wpm: number;
    accuracy: number;
    errorCount: number;
    duration: number;
    wordsCompleted: number;
  }) => Promise<void>;
  onWordStatsUpdate: (stats: SessionStats) => void;
  onBackToLobby: () => void;
  targetChars: TargetChar[];
  currentTypingIndex: number;
  userInput: string;
  isFocused: boolean;
  onFocusInput: () => void;
  selectedParagraphTitle?: string;
  elapsedTime: number;
  formatTime: (seconds: number) => string;
  sentenceQueue: string[];
  nextJamo: string | null;
  currentTargetChar: string;
  hasError: boolean;
}> = props => {
  const contentByMode: Record<PracticeMode, React.ReactNode> = {
    word: (
      <WordModeContent
        words={props.wordPracticeWords}
        onComplete={props.onWordComplete}
        onStatsUpdate={props.onWordStatsUpdate}
        onBack={props.onBackToLobby}
      />
    ),
    paragraph: (
      <ParagraphModeContent
        targetChars={props.targetChars}
        currentTypingIndex={props.currentTypingIndex}
        userInput={props.userInput}
        isFocused={props.isFocused}
        onFocusInput={props.onFocusInput}
        selectedParagraphTitle={props.selectedParagraphTitle}
        elapsedTime={props.elapsedTime}
        formatTime={props.formatTime}
        nextJamo={props.nextJamo}
        currentTargetChar={props.currentTargetChar}
        hasError={props.hasError}
      />
    ),
    sentence: (
      <SentenceModeContent
        targetChars={props.targetChars}
        currentTypingIndex={props.currentTypingIndex}
        userInput={props.userInput}
        isFocused={props.isFocused}
        onFocusInput={props.onFocusInput}
        sentenceQueue={props.sentenceQueue}
        nextJamo={props.nextJamo}
        currentTargetChar={props.currentTargetChar}
        hasError={props.hasError}
      />
    ),
  };

  return <>{contentByMode[props.practiceMode]}</>;
};

const TypingSidebar: React.FC<{
  onBackToLobby: () => void;
  practiceMode: PracticeMode;
  t: TypingTranslateFn;
  selectedCourseName: string;
  coursesByName: Record<string, CourseRecord[]>;
  onCourseNameChange: (courseName: string) => void;
  selectedCourseId: string;
  selectedCourseVolumeOptions: CourseVolumeOption[];
  onCourseIdChange: (courseId: string) => void;
  selectedUnitId: number;
  onUnitChange: (unitId: number) => void;
  selectedParagraphId: string;
  onParagraphChange: (paragraphId: string) => void;
  selectedCategoryId: string;
  selectedCategoryIcon: string;
  onCategoryChange: (categoryId: string) => void;
  elapsedTime: number;
  formatTime: (seconds: number) => string;
  currentTypingIndex: number;
  targetTextLength: number;
  liveStats: LiveTypingStats;
  bestWpm: number;
  onStopPractice: () => void;
  userAvatar?: string | null;
  userName?: string | null;
}> = props => {
  const optionalParagraphProgressByMode: Partial<Record<PracticeMode, React.ReactNode>> = {
    paragraph: (
      <div className="bg-card p-4 rounded-2xl shadow-sm border border-border/50 transition-transform hover:scale-[1.02]">
        <div className="flex justify-between items-end mb-2">
          <span className="text-xs text-muted-foreground font-medium">Progress</span>
          <span className="text-sm font-bold text-muted-foreground tabular-nums">
            <span className="text-blue-600 dark:text-blue-300">{props.currentTypingIndex}</span>
            <span className="text-muted-foreground mx-1">/</span>
            {props.targetTextLength}
          </span>
        </div>
        <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-blue-500 dark:bg-blue-300 w-full h-full rounded-full origin-left transition-transform duration-300"
            style={{
              transform: `scaleX(${props.targetTextLength > 0 ? props.currentTypingIndex / props.targetTextLength : 0})`,
            }}
          ></div>
        </div>
      </div>
    ),
  };

  return (
    <aside className="w-[280px] flex-shrink-0 sidebar-glass flex flex-col z-20 shadow-sm transition-all duration-300 hidden md:flex border-r border-border/60">
      <Button
        type="button"
        variant="ghost"
        size="auto"
        className="w-full p-6 flex items-center gap-3 cursor-pointer hover:bg-muted/80 transition-colors border-b border-border text-left"
        onClick={props.onBackToLobby}
      >
        <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        <span className="text-sm font-bold text-muted-foreground">Back onto Lobby</span>
      </Button>

      <div className="px-6 py-6 flex flex-col items-center">
        <div className="bg-primary text-primary-foreground px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-slate-200/50 dark:shadow-[0_10px_20px_-10px_rgba(148,163,184,0.28)] mb-6 transform hover:scale-105 transition-transform">
          {getTypingModeTitle(props.practiceMode, props.t)}
        </div>

        <div className="w-full">
          <TypingModeSelectorPanel
            practiceMode={props.practiceMode}
            selectedCourseName={props.selectedCourseName}
            coursesByName={props.coursesByName}
            onCourseNameChange={props.onCourseNameChange}
            selectedCourseId={props.selectedCourseId}
            selectedCourseVolumeOptions={props.selectedCourseVolumeOptions}
            onCourseIdChange={props.onCourseIdChange}
            selectedUnitId={props.selectedUnitId}
            onUnitChange={props.onUnitChange}
            selectedParagraphId={props.selectedParagraphId}
            onParagraphChange={props.onParagraphChange}
            selectedCategoryId={props.selectedCategoryId}
            selectedCategoryIcon={props.selectedCategoryIcon}
            onCategoryChange={props.onCategoryChange}
          />
        </div>
      </div>

      <div className="flex-1 px-6 space-y-4 overflow-y-auto">
        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
          My Stats
        </div>

        <div className="bg-card p-4 rounded-2xl shadow-sm border border-border/50 transition-transform hover:scale-[1.02]">
          <div className="flex justify-between items-end mb-2">
            <span className="text-xs text-muted-foreground font-medium">Time</span>
            <span className="text-lg font-mono font-bold text-muted-foreground tabular-nums">
              {props.formatTime(props.elapsedTime)}
            </span>
          </div>
          <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-blue-500 dark:bg-blue-300 w-full h-full rounded-full origin-left animate-[progress_1s_ease-out]"
              style={{ transform: `scaleX(${Math.min(props.elapsedTime / 60, 1)})` }}
            ></div>
          </div>
        </div>

        {optionalParagraphProgressByMode[props.practiceMode] ?? null}

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card p-3 rounded-2xl shadow-sm border border-border/50 text-center transition-transform hover:scale-[1.02]">
            <div className="text-[10px] text-muted-foreground font-bold mb-1">WPM</div>
            <div className="text-xl font-bold text-blue-600 dark:text-blue-300 tabular-nums">
              {Math.round(props.liveStats.wpm)}
            </div>
          </div>
          <div className="bg-card p-3 rounded-2xl shadow-sm border border-border/50 text-center transition-transform hover:scale-[1.02]">
            <div className="text-[10px] text-muted-foreground font-bold mb-1">Accuracy</div>
            <div className="text-xl font-bold text-emerald-500 dark:text-emerald-300 tabular-nums">
              {props.liveStats.accuracy.toFixed(0)}%
            </div>
          </div>
        </div>

        <div className="bg-card/50 p-3 rounded-2xl border border-border text-center">
          <span className="text-[10px] text-muted-foreground">Best Record</span>
          <div className="text-sm font-bold text-muted-foreground">{props.bestWpm} WPM</div>
        </div>
      </div>

      <div className="p-6 bg-card/30">
        <Button
          type="button"
          variant="ghost"
          size="auto"
          onClick={props.onStopPractice}
          className="w-full py-3.5 bg-blue-500 hover:bg-blue-600 dark:bg-blue-400/80 dark:hover:bg-blue-300/80 text-primary-foreground rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 dark:shadow-blue-900/20 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <span>Stop Practice</span>
        </Button>
        <TypingFooterUser userAvatar={props.userAvatar} userName={props.userName} />
      </div>
    </aside>
  );
};

const DesktopTypingGameLayout: React.FC<{
  practiceMode: PracticeMode;
  t: TypingTranslateFn;
  onBackToLobby: () => void;
  selectedCourseName: string;
  coursesByName: Record<string, CourseRecord[]>;
  onCourseNameChange: (courseName: string) => void;
  selectedCourseId: string;
  selectedCourseVolumeOptions: CourseVolumeOption[];
  onCourseIdChange: (courseId: string) => void;
  selectedUnitId: number;
  onUnitChange: (unitId: number) => void;
  selectedParagraphId: string;
  onParagraphChange: (paragraphId: string) => void;
  selectedCategoryId: string;
  selectedCategoryIcon: string;
  onCategoryChange: (categoryId: string) => void;
  elapsedTime: number;
  formatTime: (seconds: number) => string;
  currentTypingIndex: number;
  targetTextLength: number;
  liveStats: LiveTypingStats;
  bestWpm: number;
  onStopPractice: () => void;
  userAvatar?: string | null;
  userName?: string | null;
  wordPracticeWords?: WordPracticeEntry[];
  onWordComplete: (resultStats: {
    wpm: number;
    accuracy: number;
    errorCount: number;
    duration: number;
    wordsCompleted: number;
  }) => Promise<void>;
  onWordStatsUpdate: (stats: SessionStats) => void;
  targetChars: TargetChar[];
  userInput: string;
  isFocused: boolean;
  onFocusInput: () => void;
  selectedParagraphTitle?: string;
  sentenceQueue: string[];
  nextJamo: string | null;
  currentTargetChar: string;
  hasError: boolean;
  showHiddenInput: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  setIsFocused: React.Dispatch<React.SetStateAction<boolean>>;
}> = ({
  practiceMode,
  t,
  onBackToLobby,
  selectedCourseName,
  coursesByName,
  onCourseNameChange,
  selectedCourseId,
  selectedCourseVolumeOptions,
  onCourseIdChange,
  selectedUnitId,
  onUnitChange,
  selectedParagraphId,
  onParagraphChange,
  selectedCategoryId,
  selectedCategoryIcon,
  onCategoryChange,
  elapsedTime,
  formatTime,
  currentTypingIndex,
  targetTextLength,
  liveStats,
  bestWpm,
  onStopPractice,
  userAvatar,
  userName,
  wordPracticeWords,
  onWordComplete,
  onWordStatsUpdate,
  targetChars,
  userInput,
  isFocused,
  onFocusInput,
  selectedParagraphTitle,
  sentenceQueue,
  nextJamo,
  currentTargetChar,
  hasError,
  showHiddenInput,
  inputRef,
  setIsFocused,
}) => (
  <div className="typing-practice-container flex h-screen font-sans overflow-hidden bg-card">
    <style>
      {keyboardThemeStyles} {englishKeyStyles}
    </style>
    <style>{`
    .hg-button { position: relative!important; }
`}</style>

    <TypingSidebar
      onBackToLobby={onBackToLobby}
      practiceMode={practiceMode}
      t={t}
      selectedCourseName={selectedCourseName}
      coursesByName={coursesByName}
      onCourseNameChange={onCourseNameChange}
      selectedCourseId={selectedCourseId}
      selectedCourseVolumeOptions={selectedCourseVolumeOptions}
      onCourseIdChange={onCourseIdChange}
      selectedUnitId={selectedUnitId}
      onUnitChange={onUnitChange}
      selectedParagraphId={selectedParagraphId}
      onParagraphChange={onParagraphChange}
      selectedCategoryId={selectedCategoryId}
      selectedCategoryIcon={selectedCategoryIcon}
      onCategoryChange={onCategoryChange}
      elapsedTime={elapsedTime}
      formatTime={formatTime}
      currentTypingIndex={currentTypingIndex}
      targetTextLength={targetTextLength}
      liveStats={liveStats}
      bestWpm={bestWpm}
      onStopPractice={onStopPractice}
      userAvatar={userAvatar}
      userName={userName}
    />

    <main className="flex-1 flex flex-col relative z-10">
      <TypingMainContent
        practiceMode={practiceMode}
        wordPracticeWords={wordPracticeWords}
        onWordComplete={onWordComplete}
        onWordStatsUpdate={onWordStatsUpdate}
        onBackToLobby={onBackToLobby}
        targetChars={targetChars}
        currentTypingIndex={currentTypingIndex}
        userInput={userInput}
        isFocused={isFocused}
        onFocusInput={onFocusInput}
        selectedParagraphTitle={selectedParagraphTitle}
        elapsedTime={elapsedTime}
        formatTime={formatTime}
        sentenceQueue={sentenceQueue}
        nextJamo={nextJamo}
        currentTargetChar={currentTargetChar}
        hasError={hasError}
      />
      {showHiddenInput && (
        <HiddenInput
          ref={inputRef}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
      )}
    </main>
  </div>
);

const DesktopTypingPage: React.FC = () => {
  // -- LAYOUT CONTROL --
  const { setSidebarHidden, setFooterHidden } = useLayoutActions();

  // -- USER --
  const { user } = useAuth();

  // -- CONVEX --
  const saveTypingRecord = useMutation(api.typing.saveRecord);
  const userStats = useQuery(api.typing.getUserStats);

  // Word Practice Data
  const rawCourses = useQuery(api.institutes.getAll);
  const courses = useMemo(() => (rawCourses || []) as CourseRecord[], [rawCourses]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedUnitId, setSelectedUnitId] = useState<number>(1);

  // Group courses by name for Volume selection
  const coursesByName = useMemo(() => groupCoursesByName(courses), [courses]);

  const [selectedCourseName, setSelectedCourseName] = useState<string>('');

  // Update selectedCourseName when courses load or selectedCourseId changes
  useEffect(() => {
    syncSelectedCourseNameState({
      courses,
      selectedCourseId,
      selectedCourseName,
      coursesByName,
      setSelectedCourseName,
    });
  }, [selectedCourseId, courses, coursesByName, selectedCourseName]);

  const courseWords = useQuery(
    api.vocab.getOfCourse,
    selectedCourseId ? { courseId: selectedCourseId, unitId: selectedUnitId } : 'skip'
  );

  const { t } = useTranslation(); // Init translation hook
  const selectedCourseVolumeOptions = useMemo(
    () =>
      buildCourseVolumeOptions(
        coursesByName[selectedCourseName] as CourseVolumeSource[] | undefined,
        t
      ),
    [coursesByName, selectedCourseName, t]
  );
  const navigate = useNavigate();
  const [gameState, setGameState] = useState<GameState>('lobby'); // 'lobby', 'playing', 'finished'
  const [selectedCategory, setSelectedCategory] = useState<PracticeCategory | null>(null);
  const [selectedParagraph, setSelectedParagraph] = useState<PracticeParagraph | null>(null);
  const [practiceMode, setPracticeMode] = useState<PracticeMode>('sentence');
  const [sentenceQueue, setSentenceQueue] = useState<string[]>([]);

  // Session Tracking
  const [sentencesCompleted, setSentencesCompleted] = useState(0);
  const [totalCharactersTyped, setTotalCharactersTyped] = useState(0);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    wpm: 0,
    accuracy: 100,
    errorCount: 0,
    duration: 0,
  });
  const targetWpm = 200; // Challenge target

  // Sentence Queue Management
  // const [sentenceQueue, setSentenceQueue] = useState<string[]>([]); // Moved up
  const [targetText, setTargetText] = useState('');

  // Memoize characters with IDs to avoid using index as key in render
  const targetChars = useMemo(() => {
    return targetText.split('').map((char, i) => ({
      char,
      id: `char-${i}-${targetText.length}`,
    }));
  }, [targetText]);

  const [mode] = useState<TypingMode>('sentence');
  const [isFocused, setIsFocused] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Hide main app sidebar when playing, show when in lobby
  // Hide main app sidebar AND footer when playing/on page
  useEffect(() => {
    setSidebarHidden(gameState === 'playing');
    setFooterHidden(true); // Always hide footer on this page
    return () => {
      setSidebarHidden(false);
      setFooterHidden(false);
    };
  }, [gameState, setSidebarHidden, setFooterHidden]);

  const {
    userInput,
    // completedIndex,
    phase,
    stats,
    inputRef,
    reset,
    checkInput,
    getNextJamo,
  } = useKoreanTyping(targetText, mode);

  const startGame = (category: PracticeCategory) => {
    setSelectedCategory(category);
    const queue = generateSentenceQueue(category);
    setSentenceQueue(queue);
    setTargetText(queue[0]);
    setGameState('playing');
    // Reset session tracking
    setSentencesCompleted(0);
    setTotalCharactersTyped(0);
    setElapsedTime(0);
    reset();
  };

  const nextSentence = useCallback(() => {
    if (!selectedCategory) return;

    // Track completed sentence
    setSentencesCompleted(prev => prev + 1);
    setTotalCharactersTyped(prev => prev + targetText.length);

    // Remove first, add one new
    const newSentence =
      selectedCategory.sentences[Math.floor(Math.random() * selectedCategory.sentences.length)];
    const nextQueue = [...sentenceQueue.slice(1), newSentence];

    setSentenceQueue(nextQueue);
    setTargetText(nextQueue[0]);
    reset();

    // Refocus
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, [selectedCategory, sentenceQueue, targetText, reset, inputRef]);

  // End session and show results
  const endSession = useCallback(async () => {
    const finalStats = {
      wpm: Math.round(stats.wpm),
      accuracy: stats.accuracy,
      errorCount: stats.errorCount,
      duration: elapsedTime,
    };
    setSessionStats(finalStats);
    setShowResultsModal(true);

    // Save to database
    try {
      if (selectedCategory) {
        await saveTypingRecord({
          practiceMode,
          categoryId: selectedCategory.id,
          wpm: finalStats.wpm,
          accuracy: finalStats.accuracy,
          errorCount: finalStats.errorCount,
          duration: finalStats.duration,
          charactersTyped: totalCharactersTyped + userInput.length,
          sentencesCompleted: sentencesCompleted,
          targetWpm,
          isTargetAchieved: finalStats.wpm >= targetWpm,
        });
      }
    } catch (error) {
      console.error('Failed to save typing record:', error);
    }
  }, [
    stats,
    elapsedTime,
    selectedCategory,
    practiceMode,
    saveTypingRecord,
    totalCharactersTyped,
    userInput.length,
    sentencesCompleted,
  ]);

  // Handle modal actions
  const handleRetry = () => {
    setShowResultsModal(false);
    if (selectedCategory) {
      startGame(selectedCategory);
    }
  };

  const handleQuit = () => {
    setShowResultsModal(false);
    setGameState('lobby');
    setSelectedCategory(null);
  };

  // Handle word practice completion
  const handleWordComplete = useCallback(
    async (resultStats: {
      wpm: number;
      accuracy: number;
      errorCount: number;
      duration: number;
      wordsCompleted: number;
    }) => {
      setSessionStats({
        wpm: resultStats.wpm,
        accuracy: resultStats.accuracy,
        errorCount: resultStats.errorCount,
        duration: resultStats.duration,
      });
      setShowResultsModal(true);

      try {
        await saveTypingRecord({
          practiceMode: 'word',
          categoryId: selectedCourseId, // Using course ID as category ID
          wpm: resultStats.wpm,
          accuracy: resultStats.accuracy,
          errorCount: resultStats.errorCount,
          duration: resultStats.duration,
          charactersTyped: 0,
          sentencesCompleted: resultStats.wordsCompleted, // Using words count as completed count
          targetWpm: 200,
          isTargetAchieved: resultStats.wpm >= 200,
        });
      } catch (error) {
        console.error('Failed to save word practice record:', error);
      }
    },
    [selectedCourseId, saveTypingRecord]
  );

  // Check for completion (auto-advance to next sentence)
  useEffect(() => {
    if (phase === 'finish') {
      const timer = setTimeout(() => {
        nextSentence();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [phase, nextSentence]);

  // Timer for elapsed time display
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (phase === 'typing' && stats.startTime) {
      interval = setInterval(() => {
        const now = Date.now();
        setElapsedTime(Math.floor((now - stats.startTime!) / 1000));
      }, 1000);
    } else if (phase === 'start') {
      setTimeout(() => setElapsedTime(0), 0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [phase, stats.startTime]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState === 'playing') {
        if (e.key === 'Escape') {
          e.preventDefault();
          setGameState('lobby');
          setSelectedCategory(null);
        }
      }
    };
    globalThis.addEventListener('keydown', handleKeyDown);
    return () => globalThis.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  // --- English Input Detection Warning ---
  const hasWarnedRef = useRef(false);
  useEffect(() => {
    maybeWarnImeMismatch({
      userInput,
      hasWarnedRef,
      t,
    });
  }, [userInput, t]);

  const {
    index: currentTypingIndex,
    inputChar: currentInputChar,
    targetChar: currentTargetChar,
    hasError,
  } = useMemo(
    () =>
      getCurrentTypingPosition({
        targetText,
        userInput,
        checkInput,
      }),
    [targetText, userInput, checkInput]
  );
  const nextTargetChar =
    currentTypingIndex + 1 < targetText.length ? targetText[currentTypingIndex + 1] : undefined;
  const nextJamo = currentTargetChar
    ? getNextJamo(currentTargetChar, currentInputChar, nextTargetChar)
    : null;

  const formatTime = formatTypingElapsedTime;
  const wordPracticeWords = useMemo(
    () =>
      courseWords?.map(word => ({ id: word._id, word: word.word, meaning: word.meaning ?? '' })),
    [courseWords]
  );

  const handleBackToLobby = () => {
    setGameState('lobby');
    setSelectedCategory(null);
  };

  const handleStartWord = () => {
    handleStartWordMode({
      setPracticeMode,
      setGameState,
      selectedCourseId,
      courses,
      setSelectedCourseId,
      setSelectedCourseName,
      setSelectedUnitId,
      reset,
      setElapsedTime,
      setSentencesCompleted,
      setTotalCharactersTyped,
    });
  };

  const handleStartSentence = () => {
    handleStartSentenceMode({
      setPracticeMode,
      setGameState,
      reset,
      setElapsedTime,
      setSentencesCompleted,
      setTotalCharactersTyped,
      selectedCategory,
      setSelectedCategory,
      sentenceQueue,
      setSentenceQueue,
      setTargetText,
    });
  };

  const handleStartParagraph = () => {
    handleStartParagraphMode({
      setPracticeMode,
      setGameState,
      reset,
      setElapsedTime,
      setSentencesCompleted,
      setTotalCharactersTyped,
      selectedParagraph,
      setSelectedParagraph,
      setTargetText,
    });
  };

  const handleCourseNameChange = (newName: string) => {
    setSelectedCourseName(newName);
    const variants = coursesByName[newName] || [];
    if (variants.length > 0) {
      setSelectedCourseId(variants[0]._id);
    }
    setSelectedUnitId(1);
    reset();
  };

  const handleCourseIdChange = (courseId: string) => {
    setSelectedCourseId(courseId);
    setSelectedUnitId(1);
    reset();
  };

  const handleUnitChange = (unitId: number) => {
    setSelectedUnitId(unitId);
    reset();
  };

  const handleParagraphChange = (paragraphId: string) => {
    const paragraph = PRACTICE_PARAGRAPHS.find(item => item.id === paragraphId);
    if (!paragraph) return;
    setSelectedParagraph(paragraph);
    setTargetText(paragraph.text);
    reset();
    setElapsedTime(0);
    setSentencesCompleted(0);
    setTotalCharactersTyped(0);
  };

  const handleCategoryChange = (categoryId: string) => {
    const category = PRACTICE_CATEGORIES.find(item => item.id === categoryId);
    if (!category || gameState !== 'playing') return;
    setSelectedCategory(category);
    const queue = generateSentenceQueue(category);
    setSentenceQueue(queue);
    setTargetText(queue[0]);
    reset();
  };

  const updateWordSessionStats = (wordStats: SessionStats) => {
    setSessionStats({
      wpm: wordStats.wpm,
      accuracy: wordStats.accuracy,
      errorCount: wordStats.errorCount,
      duration: wordStats.duration,
    });
  };

  if (gameState === 'lobby') {
    return (
      <TypingLobby
        onBack={() => navigate('/dashboard?view=practice')}
        onStartWord={handleStartWord}
        onStartSentence={handleStartSentence}
        onStartParagraph={handleStartParagraph}
      />
    );
  }

  return (
    <>
      <DesktopTypingGameLayout
        practiceMode={practiceMode}
        t={t}
        onBackToLobby={handleBackToLobby}
        selectedCourseName={selectedCourseName}
        coursesByName={coursesByName}
        onCourseNameChange={handleCourseNameChange}
        selectedCourseId={selectedCourseId}
        selectedCourseVolumeOptions={selectedCourseVolumeOptions}
        onCourseIdChange={handleCourseIdChange}
        selectedUnitId={selectedUnitId}
        onUnitChange={handleUnitChange}
        selectedParagraphId={selectedParagraph?.id || ''}
        onParagraphChange={handleParagraphChange}
        selectedCategoryId={selectedCategory?.id || ''}
        selectedCategoryIcon={selectedCategory?.icon || '📝'}
        onCategoryChange={handleCategoryChange}
        elapsedTime={elapsedTime}
        formatTime={formatTime}
        currentTypingIndex={currentTypingIndex}
        targetTextLength={targetText.length}
        liveStats={{ wpm: stats.wpm, accuracy: stats.accuracy }}
        bestWpm={userStats?.highestWpm || 0}
        onStopPractice={endSession}
        userAvatar={user?.avatar}
        userName={user?.name}
        wordPracticeWords={wordPracticeWords}
        onWordComplete={handleWordComplete}
        onWordStatsUpdate={updateWordSessionStats}
        targetChars={targetChars}
        userInput={userInput}
        isFocused={isFocused}
        onFocusInput={() => inputRef.current?.focus()}
        selectedParagraphTitle={selectedParagraph?.title}
        sentenceQueue={sentenceQueue}
        nextJamo={nextJamo}
        currentTargetChar={currentTargetChar}
        hasError={hasError}
        showHiddenInput={practiceMode !== 'word'}
        inputRef={inputRef}
        setIsFocused={setIsFocused}
      />
      <TypingResultsModal
        isOpen={showResultsModal}
        onClose={handleQuit}
        onRetry={handleRetry}
        wpm={sessionStats.wpm}
        accuracy={sessionStats.accuracy}
        errorCount={sessionStats.errorCount}
        duration={sessionStats.duration}
        targetWpm={targetWpm}
        highestWpm={userStats?.highestWpm || 0}
        userAvatar={user?.avatar}
      />
    </>
  );
};

const TypingPage: React.FC = () => {
  const isMobile = useIsMobile();
  if (isMobile) return <MobileTypingPage />;
  return <DesktopTypingPage />;
};

export default TypingPage;
