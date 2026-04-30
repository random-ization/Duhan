import React, { useCallback, useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { useLocation, useSearchParams } from 'react-router-dom';
import {
  BookMarked,
  BookOpen,
  Compass,
  GraduationCap,
  PenLine,
  Sparkles,
  Clock3,
  type LucideIcon,
} from 'lucide-react';
import { GRAMMARS, qRef, NoArgs } from '../../utils/convexRefs';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { useAuth } from '../../contexts/AuthContext';
import { useLearningActions, useLearningSelection } from '../../contexts/LearningContext';
import {
  buildLearningModulePath,
  buildLearningPickerPath,
  normalizeLearningFlowModule,
  resolveInstituteDefaultLevel,
  TOPIK_GRAMMAR_COURSE_ID,
  type LearningFlowModule,
} from '../../utils/learningFlow';
import { appendReturnToPath } from '../../utils/navigation';
import { buildVocabBookModePath } from '../../utils/vocabBookRoutes';
import type { Institute } from '../../types';
import type { GrammarItemDto } from '../../../convex/grammars';
import { KT, Chip, HanjaSeal, SectionHead, Card, PageShell, PageIntro } from './ksoft/ksoft';
import { MobileSheet } from './MobileSheet';

type Course = Institute & { _id?: string };
type LearnTabKey = 'mine' | 'grammar' | 'vocabulary' | 'typing' | 'topik';
type LearnTone = 'pink' | 'mint' | 'butter' | 'lilac';
type LearnAction = { kind: 'module'; module: LearningFlowModule } | { kind: 'path'; path: string };
type LearnTab = { key: LearnTabKey; label: string; action?: LearnAction };
type VocabModeKey = 'flashcard' | 'test' | 'learn' | 'match';
type LearnTool = {
  k: string;
  l: string;
  s: string;
  tone: LearnTone;
  action: LearnAction;
};
type VocabModeCard = {
  key: VocabModeKey;
  k: string;
  l: string;
  s: string;
  tone: LearnTone;
};
type TypingStats = {
  totalTests: number;
  highestWpm: number;
  averageWpm: number;
} | null;
type CourseUnitEntry = {
  unitIndex: number;
  articleIndex?: number;
  title?: string;
  readingText?: string;
};
type UnitMeta = {
  title: string;
  subtitle: string;
};
type UnitProgressStats = {
  total: number;
  mastered: number;
};

const PRIORITY_COURSE_ID = TOPIK_GRAMMAR_COURSE_ID;

type LearnCopy = {
  hanjaTag: string;
  latin: string;
  title: string;
  subtitle: string;
  tabs: LearnTab[];
  progressLabel: (pct: number) => string;
  unitsLabel: (done: number, total: number) => string;
  estimate: (days: number) => string;
  journeyTitle: string;
  journeyAction: string;
  completed: string;
  toolsTitle: string;
  tools: LearnTool[];
  vocabModesTitle: string;
  vocabModes: VocabModeCard[];
  vocabNoWords: string;
  unitLabel: string;
  levelBadge: string;
  defaultCourseTitle: string;
  defaultCourseMeta: string;
  tapToStart: string;
};

const buildLearnTabs = (labels: {
  mine: string;
  grammar: string;
  vocabulary: string;
  typing: string;
  topik: string;
}): LearnTab[] => [
  { key: 'mine', label: labels.mine },
  { key: 'grammar', label: labels.grammar, action: { kind: 'module', module: 'grammar' } },
  {
    key: 'vocabulary',
    label: labels.vocabulary,
    action: { kind: 'module', module: 'vocabulary' },
  },
  { key: 'typing', label: labels.typing, action: { kind: 'path', path: '/typing' } },
  { key: 'topik', label: labels.topik, action: { kind: 'path', path: '/topik' } },
];

const buildLearnTools = (labels: {
  flashcards: string;
  flashcardsSub: string;
  dictation: string;
  dictationSub: string;
  typing: string;
  typingSub: string;
  pronunciation: string;
  pronunciationSub: string;
}): LearnTool[] => [
  {
    k: '詞',
    l: labels.flashcards,
    s: labels.flashcardsSub,
    tone: 'pink',
    action: { kind: 'path', path: buildVocabBookModePath('immerse') },
  },
  {
    k: '聽',
    l: labels.dictation,
    s: labels.dictationSub,
    tone: 'mint',
    action: { kind: 'path', path: buildVocabBookModePath('dictation') },
  },
  {
    k: '寫',
    l: labels.typing,
    s: labels.typingSub,
    tone: 'butter',
    action: { kind: 'path', path: '/typing' },
  },
  {
    k: '說',
    l: labels.pronunciation,
    s: labels.pronunciationSub,
    tone: 'lilac',
    action: { kind: 'path', path: buildVocabBookModePath('listen') },
  },
];

const buildVocabModeCards = (labels: {
  flashcard: string;
  flashcardSub: string;
  test: string;
  testSub: string;
  learn: string;
  learnSub: string;
  match: string;
  matchSub: string;
}): VocabModeCard[] => [
  {
    key: 'flashcard',
    k: '閃',
    l: labels.flashcard,
    s: labels.flashcardSub,
    tone: 'pink',
  },
  {
    key: 'test',
    k: '試',
    l: labels.test,
    s: labels.testSub,
    tone: 'butter',
  },
  {
    key: 'learn',
    k: '學',
    l: labels.learn,
    s: labels.learnSub,
    tone: 'mint',
  },
  {
    key: 'match',
    k: '配',
    l: labels.match,
    s: labels.matchSub,
    tone: 'lilac',
  },
];

const getCopy = (language: string): LearnCopy => {
  if (language.startsWith('zh')) {
    return {
      hanjaTag: '學',
      latin: 'LEARN',
      title: '배우다',
      subtitle: '系统地掌握韩语',
      tabs: buildLearnTabs({
        mine: '我的课程',
        grammar: '语法',
        vocabulary: '词汇',
        typing: '写作',
        topik: 'TOPIK',
      }),
      progressLabel: pct => `进行中 · ${pct}%`,
      unitsLabel: (done, total) => `${done} / ${total} 单元`,
      estimate: d => `约 ${d} 天`,
      journeyTitle: '学习旅程',
      journeyAction: '全部',
      completed: '完成 ✓',
      toolsTitle: '学习工具',
      tools: buildLearnTools({
        flashcards: '单词闪卡',
        flashcardsSub: '翻卡与记忆强化',
        dictation: '听写训练',
        dictationSub: '边听边写',
        typing: '打字练习',
        typingSub: '提升输入速度',
        pronunciation: '发音练习',
        pronunciationSub: '跟读与辨音',
      }),
      vocabModesTitle: '单词学习模式',
      vocabModes: buildVocabModeCards({
        flashcard: '闪卡',
        flashcardSub: '翻卡记忆与 FSRS 复习',
        test: '考试',
        testSub: '限时测验与错题反馈',
        learn: '学习',
        learnSub: '选择、拼写和分批掌握',
        match: '拼图',
        matchSub: '配对游戏强化反应',
      }),
      vocabNoWords: '该单元暂无词汇',
      unitLabel: '单元',
      levelBadge: '级',
      defaultCourseTitle: 'TOPIK II 综合课程',
      defaultCourseMeta: '中级',
      tapToStart: '开始学习',
    };
  }
  if (language.startsWith('vi')) {
    return {
      hanjaTag: '學',
      latin: 'LEARN',
      title: '배우다',
      subtitle: 'Học tiếng Hàn có hệ thống',
      tabs: buildLearnTabs({
        mine: 'Khóa học',
        grammar: 'Ngữ pháp',
        vocabulary: 'Từ vựng',
        typing: 'Viết',
        topik: 'TOPIK',
      }),
      progressLabel: pct => `Đang học · ${pct}%`,
      unitsLabel: (done, total) => `${done} / ${total} bài`,
      estimate: d => `~${d} ngày`,
      journeyTitle: 'Hành trình',
      journeyAction: 'Tất cả',
      completed: 'Xong ✓',
      toolsTitle: 'Công cụ học',
      tools: buildLearnTools({
        flashcards: 'Flashcard từ',
        flashcardsSub: 'Lật thẻ và ghi nhớ',
        dictation: 'Chép chính tả',
        dictationSub: 'Nghe và gõ lại',
        typing: 'Luyện gõ',
        typingSub: 'Tăng tốc độ nhập',
        pronunciation: 'Phát âm',
        pronunciationSub: 'Nghe mẫu và nhắc lại',
      }),
      vocabModesTitle: 'Chế độ từ vựng',
      vocabModes: buildVocabModeCards({
        flashcard: 'Flashcard',
        flashcardSub: 'Ôn nhớ với FSRS',
        test: 'Kiểm tra',
        testSub: 'Làm bài và xem lỗi sai',
        learn: 'Học',
        learnSub: 'Học theo từng nhóm nhỏ',
        match: 'Ghép cặp',
        matchSub: 'Luyện phản xạ qua trò chơi',
      }),
      vocabNoWords: 'Bài này chưa có từ vựng',
      unitLabel: 'Bài',
      levelBadge: 'Cấp',
      defaultCourseTitle: 'TOPIK II Tổng hợp',
      defaultCourseMeta: 'Trung cấp',
      tapToStart: 'Bắt đầu',
    };
  }
  if (language.startsWith('mn')) {
    return {
      hanjaTag: '學',
      latin: 'LEARN',
      title: '배우다',
      subtitle: 'Системээр солонгос хэл сурах',
      tabs: buildLearnTabs({
        mine: 'Миний хичээл',
        grammar: 'Дүрэм',
        vocabulary: 'Үгсийн сан',
        typing: 'Бичих',
        topik: 'TOPIK',
      }),
      progressLabel: pct => `Үргэлжилж · ${pct}%`,
      unitsLabel: (done, total) => `${done} / ${total} хичээл`,
      estimate: d => `~${d} өдөр`,
      journeyTitle: 'Сургалтын зам',
      journeyAction: 'Бүгд',
      completed: 'Дууссан ✓',
      toolsTitle: 'Сургалтын хэрэгсэл',
      tools: buildLearnTools({
        flashcards: 'Үгийн карт',
        flashcardsSub: 'Карт эргүүлж цээжлэх',
        dictation: 'Сонсож бичих',
        dictationSub: 'Сонсоод бичнэ',
        typing: 'Шивэх дасгал',
        typingSub: 'Оруулах хурдаа өсгөх',
        pronunciation: 'Дуудлага',
        pronunciationSub: 'Сонсоод даган хэлэх',
      }),
      vocabModesTitle: 'Үгийн сангийн горим',
      vocabModes: buildVocabModeCards({
        flashcard: 'Карт',
        flashcardSub: 'FSRS давтлага',
        test: 'Шалгалт',
        testSub: 'Алдаа шалгах сорил',
        learn: 'Сурах',
        learnSub: 'Бага багаар эзэмших',
        match: 'Тааруулах',
        matchSub: 'Тоглоомоор бататгах',
      }),
      vocabNoWords: 'Энэ нэгжид үг алга',
      unitLabel: 'Хичээл',
      levelBadge: 'Түв',
      defaultCourseTitle: 'TOPIK II Нэгтгэл',
      defaultCourseMeta: 'Дунд',
      tapToStart: 'Эхлэх',
    };
  }
  return {
    hanjaTag: '學',
    latin: 'LEARN',
    title: '배우다',
    subtitle: 'Master Korean systematically',
    tabs: buildLearnTabs({
      mine: 'My course',
      grammar: 'Grammar',
      vocabulary: 'Vocab',
      typing: 'Writing',
      topik: 'TOPIK',
    }),
    progressLabel: pct => `In progress · ${pct}%`,
    unitsLabel: (done, total) => `${done} / ${total} units`,
    estimate: d => `~${d} days`,
    journeyTitle: 'Learning journey',
    journeyAction: 'View all',
    completed: 'Done ✓',
    toolsTitle: 'Learning tools',
    tools: buildLearnTools({
      flashcards: 'Flashcards',
      flashcardsSub: 'Flip cards and reinforce recall',
      dictation: 'Dictation',
      dictationSub: 'Listen and write back',
      typing: 'Typing',
      typingSub: 'Build speed and accuracy',
      pronunciation: 'Pronunciation',
      pronunciationSub: 'Shadow native audio',
    }),
    vocabModesTitle: 'Word study modes',
    vocabModes: buildVocabModeCards({
      flashcard: 'Flashcard',
      flashcardSub: 'Flip cards with FSRS review',
      test: 'Test',
      testSub: 'Timed quiz with mistake feedback',
      learn: 'Learn',
      learnSub: 'Master words in focused batches',
      match: 'Match',
      matchSub: 'Pair words through a quick puzzle',
    }),
    vocabNoWords: 'No words in this unit yet',
    unitLabel: 'Unit',
    levelBadge: 'Lv',
    defaultCourseTitle: 'TOPIK II Grammar',
    defaultCourseMeta: 'Intermediate',
    tapToStart: 'Start',
  };
};

const getInstituteLocalizedName = (institute: Institute | undefined, language: string) => {
  if (!institute) return '';
  if (language.startsWith('zh')) return institute.nameZh || institute.name;
  if (language.startsWith('vi')) return institute.nameVi || institute.nameEn || institute.name;
  if (language.startsWith('mn')) return institute.nameMn || institute.nameEn || institute.name;
  return institute.nameEn || institute.name;
};

const normalizeText = (text: string | undefined): string =>
  (text || '').replace(/\s+/g, ' ').trim();

const buildUnitExcerpt = (readingText: string | undefined): string => {
  const normalized = normalizeText(readingText);
  if (!normalized) return '';
  const maxLen = 28;
  if (normalized.length <= maxLen) return normalized;
  return `${normalized.slice(0, maxLen).trimEnd()}…`;
};

const BEAD_TONES: Array<'mint' | 'butter' | 'pink' | 'lilac' | 'sky'> = [
  'mint',
  'butter',
  'pink',
  'lilac',
  'sky',
];

const UNIT_BEADS: LucideIcon[] = [BookOpen, PenLine, Clock3, Compass, GraduationCap, Sparkles];

const getDefaultUnitTitle = (unitNumber: number, language: string): string => {
  if (language.startsWith('zh')) return `单元 ${unitNumber}`;
  if (language.startsWith('vi')) return `Bài ${unitNumber}`;
  if (language.startsWith('mn')) return `Хичээл ${unitNumber}`;
  return `Unit ${unitNumber}`;
};

const buildCourseVocabModePath = (
  courseId: string,
  mode: VocabModeKey,
  unitNumber?: number
): string => {
  const params = new URLSearchParams({ mode });
  if (typeof unitNumber === 'number') params.set('unit', String(unitNumber));
  return `/course/${courseId}/vocab?${params.toString()}`;
};

const MobileCoursesOverview: React.FC = () => {
  const navigate = useLocalizedNavigate();
  const location = useLocation();
  const { i18n, t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { recentMaterials, selectedInstitute } = useLearningSelection();
  const { setRecentMaterial, setSelectedInstitute, setSelectedLevel } = useLearningActions();
  const [isCoursePickerOpen, setIsCoursePickerOpen] = useState(false);
  const language = i18n.resolvedLanguage || i18n.language || 'en';
  const copy = useMemo(() => getCopy(language), [language]);
  const activeTab = useMemo<LearnTabKey>(() => {
    const moduleParam = (searchParams.get('module') || '').trim().toLowerCase();
    if (moduleParam === 'typing') return 'typing';
    if (moduleParam === 'topik') return 'topik';
    const module = normalizeLearningFlowModule(moduleParam);
    if (module === 'grammar') return 'grammar';
    if (module === 'vocabulary') return 'vocabulary';
    return 'mine';
  }, [searchParams]);

  const courses = useQuery(qRef<NoArgs, Course[]>('institutes:getAll'));

  const currentCourse = useMemo<Course | null>(() => {
    const list = courses || [];
    if (!list.length) return null;

    if (activeTab === 'grammar') {
      const grammarRecentInstituteId = recentMaterials?.grammar?.instituteId;
      if (grammarRecentInstituteId) {
        const recentGrammarMatch = list.find(course => course.id === grammarRecentInstituteId);
        if (recentGrammarMatch) return recentGrammarMatch;
      }

      const priorityGrammarCourse = list.find(course => course.id === TOPIK_GRAMMAR_COURSE_ID);
      if (priorityGrammarCourse) return priorityGrammarCourse;
    }

    if ((activeTab === 'mine' || activeTab === 'vocabulary') && selectedInstitute) {
      const selectedMatch = list.find(course => course.id === selectedInstitute);
      if (selectedMatch) return selectedMatch;
    }

    const preferredRecentMaterial =
      activeTab === 'vocabulary'
        ? recentMaterials?.vocabulary
        : recentMaterials?.grammar ?? recentMaterials?.vocabulary;
    if (preferredRecentMaterial?.instituteId) {
      const preferredMatch = list.find(course => course.id === preferredRecentMaterial.instituteId);
      if (preferredMatch) return preferredMatch;
    }

    const recentIds = Object.values(recentMaterials || {})
      .filter(Boolean)
      .map(m => m?.instituteId);
    const match = list.find(c => recentIds.includes(c.id));
    if (match) return match;
    const priority = list.find(c => c.id === PRIORITY_COURSE_ID);
    return priority || list[0];
  }, [activeTab, courses, recentMaterials, selectedInstitute]);

  const usesGrammarJourney =
    activeTab === 'grammar' ||
    (activeTab === 'mine' && currentCourse?.id === TOPIK_GRAMMAR_COURSE_ID);
  const usesSemanticGrammarUnits = currentCourse?.id === TOPIK_GRAMMAR_COURSE_ID;

  // Real per-unit progress: fetch the active course content and bucket by unit.
  type UnitProgressWord = { unitId?: number; mastered?: boolean; status?: string };
  const courseWords = useQuery(
    qRef<{ courseId: string; limit?: number }, UnitProgressWord[]>('vocab:getOfCourse'),
    currentCourse?.id && !usesGrammarJourney ? { courseId: currentCourse.id, limit: 2000 } : 'skip'
  );
  const courseGrammars = useQuery(
    GRAMMARS.getByCourse,
    currentCourse?.id && usesGrammarJourney
      ? { courseId: currentCourse.id, language }
      : 'skip'
  );
  const courseUnits = useQuery(
    qRef<{ courseId: string }, CourseUnitEntry[]>('units:getByCourse'),
    currentCourse?.id && !usesSemanticGrammarUnits ? { courseId: currentCourse.id } : 'skip'
  );
  const typingStats = useQuery(qRef<Record<string, never>, TypingStats>('typing:getUserStats'), {});

  const vocabUnitProgressMap = useMemo(() => {
    const map = new Map<number, { total: number; mastered: number }>();
    if (!courseWords) return map;
    for (const w of courseWords) {
      const u = typeof w.unitId === 'number' ? w.unitId : Number(w.unitId);
      if (!Number.isFinite(u)) continue;
      const entry = map.get(u) || { total: 0, mastered: 0 };
      entry.total += 1;
      if (w.mastered === true || w.status === 'MASTERED') entry.mastered += 1;
      map.set(u, entry);
    }
    return map;
  }, [courseWords]);

  const grammarUnitProgressMap = useMemo(() => {
    const map = new Map<number, UnitProgressStats>();
    if (!courseGrammars) return map;

    for (const grammar of courseGrammars) {
      const unitNumber = Number(grammar.unitId);
      if (!Number.isFinite(unitNumber) || unitNumber <= 0) continue;
      const entry = map.get(unitNumber) || { total: 0, mastered: 0 };
      entry.total += 1;
      if (grammar.status === 'MASTERED') entry.mastered += 1;
      map.set(unitNumber, entry);
    }

    return map;
  }, [courseGrammars]);

  const grammarUnitTitleMap = useMemo(() => {
    const map = new Map<number, string>();
    const defaultUnitLabel = t('grammarModule.unitLabel', { defaultValue: 'Unit' });
    const fallbackTitles: Record<number, string> = {
      1: t('grammarModule.units.unit1', { defaultValue: 'Speculation & inference' }),
      2: t('grammarModule.units.unit2', { defaultValue: 'Contrast & shifts' }),
      3: t('grammarModule.units.unit3', { defaultValue: 'Cause & reason' }),
      4: t('grammarModule.units.unit4', { defaultValue: 'Purpose & intent' }),
      5: t('grammarModule.units.unit5', { defaultValue: 'Progress & completion' }),
      6: t('grammarModule.units.unit6', { defaultValue: 'State & continuity' }),
      7: t('grammarModule.units.unit7', { defaultValue: 'Degree & limits' }),
      8: t('grammarModule.units.unit8', { defaultValue: 'Hypothesis & assumption' }),
      9: t('grammarModule.units.unit9', { defaultValue: 'Concession & inclusion' }),
      10: t('grammarModule.units.unit10', { defaultValue: 'Chance & change' }),
      11: t('grammarModule.units.unit11', { defaultValue: 'Reported speech' }),
      12: t('grammarModule.units.unit12', { defaultValue: 'Necessity & experience' }),
      13: t('grammarModule.units.unit13', { defaultValue: 'Listing & sequence' }),
      14: t('grammarModule.units.unit14', { defaultValue: 'Standards & range' }),
      15: t('grammarModule.units.unit15', { defaultValue: 'Particles & nuance' }),
    };

    for (const unitNumber of Object.keys(fallbackTitles).map(value => Number(value))) {
      const fallbackTitle = fallbackTitles[unitNumber];
      if (fallbackTitle) {
        map.set(unitNumber, fallbackTitle);
      }
    }

    if (!courseGrammars) return map;

    const grouped = new Map<number, GrammarItemDto[]>();
    for (const grammar of courseGrammars) {
      const unitNumber = Number(grammar.unitId);
      if (!Number.isFinite(unitNumber) || unitNumber <= 0) continue;
      const bucket = grouped.get(unitNumber) || [];
      bucket.push(grammar);
      grouped.set(unitNumber, bucket);
    }

    for (const [unitNumber, grammars] of grouped.entries()) {
      const titles = grammars
        .map(grammar => normalizeText(grammar.summary))
        .filter(summary => summary.length > 0);
      if (titles.length === 1 && !map.has(unitNumber)) {
        map.set(unitNumber, titles[0]);
        continue;
      }
      if (!map.has(unitNumber)) {
        map.set(unitNumber, `${defaultUnitLabel} ${unitNumber}`);
      }
    }

    return map;
  }, [courseGrammars, t]);

  const unitMetaMap = useMemo(() => {
    const map = new Map<number, UnitMeta>();
    if (!courseUnits) return map;

    const grouped = new Map<
      number,
      {
        primary: CourseUnitEntry | null;
        titles: string[];
      }
    >();

    for (const entry of courseUnits) {
      const unitIndex = Number(entry.unitIndex);
      if (!Number.isFinite(unitIndex) || unitIndex <= 0) continue;
      const normalizedTitle = normalizeText(entry.title);
      const bucket = grouped.get(unitIndex) || { primary: null, titles: [] };

      const entryOrder =
        typeof entry.articleIndex === 'number' ? entry.articleIndex : Number.MAX_SAFE_INTEGER;
      const primaryOrder =
        typeof bucket.primary?.articleIndex === 'number'
          ? bucket.primary.articleIndex
          : Number.MAX_SAFE_INTEGER;
      if (!bucket.primary || entryOrder < primaryOrder) {
        bucket.primary = entry;
      }

      if (normalizedTitle && !bucket.titles.includes(normalizedTitle)) {
        bucket.titles.push(normalizedTitle);
      }
      grouped.set(unitIndex, bucket);
    }

    for (const [unitIndex, bucket] of grouped.entries()) {
      const primaryTitle = normalizeText(bucket.primary?.title) || bucket.titles[0] || '';
      if (!primaryTitle) continue;
      const secondaryTitle = bucket.titles.find(title => title !== primaryTitle) || '';
      const excerpt = secondaryTitle ? '' : buildUnitExcerpt(bucket.primary?.readingText);
      map.set(unitIndex, {
        title: primaryTitle,
        subtitle: secondaryTitle || excerpt,
      });
    }

    return map;
  }, [courseUnits]);

  const activeUnitProgressMap = usesGrammarJourney ? grammarUnitProgressMap : vocabUnitProgressMap;

  const units = useMemo(() => {
    const derivedUnitNumbers = usesSemanticGrammarUnits
      ? new Set<number>(Array.from(activeUnitProgressMap.keys()))
      : new Set<number>([
          ...Array.from(unitMetaMap.keys()),
          ...Array.from(activeUnitProgressMap.keys()),
        ]);
    const derivedMaxUnit =
      derivedUnitNumbers.size > 0 ? Math.max(...Array.from(derivedUnitNumbers.values())) : 0;
    const total = Math.max(currentCourse?.totalUnits || 0, derivedMaxUnit, 5);
    const shown = Math.min(total, 5);
    return Array.from({ length: shown }).map((_, i) => {
      const unitNumber = i + 1;
      const progress = activeUnitProgressMap.get(unitNumber);
      const meta = usesSemanticGrammarUnits ? undefined : unitMetaMap.get(unitNumber);
      const pct =
        progress && progress.total > 0 ? Math.min(1, progress.mastered / progress.total) : 0;
      const tone = BEAD_TONES[i % BEAD_TONES.length];
      const fallbackTitle = getDefaultUnitTitle(unitNumber, language);
      const grammarTitle = usesSemanticGrammarUnits ? grammarUnitTitleMap.get(unitNumber) : '';
      const title = usesGrammarJourney
        ? meta?.title || grammarTitle || fallbackTitle
        : meta?.title || fallbackTitle;
      const subtitle = usesGrammarJourney
        ? progress && progress.total > 0
          ? `${progress.mastered}/${progress.total}`
          : ''
        : meta?.subtitle ||
          (progress && progress.total > 0 ? `${progress.mastered}/${progress.total}` : '');
      return {
        n: unitNumber,
        t: title,
        s: subtitle,
        pct,
        tone,
        icon: UNIT_BEADS[i % UNIT_BEADS.length],
      };
    });
  }, [
    activeUnitProgressMap,
    currentCourse?.totalUnits,
    grammarUnitTitleMap,
    language,
    unitMetaMap,
    usesSemanticGrammarUnits,
    usesGrammarJourney,
  ]);

  const completedUnits = units.filter(u => u.pct === 1).length;
  const totalUnits = units.length;
  const overallPct = Math.round(
    (units.reduce((sum, u) => sum + u.pct, 0) / Math.max(1, totalUnits)) * 100
  );

  const openModule = useCallback(
    (module: LearningFlowModule) => {
      if (currentCourse && (module === 'grammar' || module === 'vocabulary')) {
        setSelectedInstitute(currentCourse.id);
        setSelectedLevel(resolveInstituteDefaultLevel(currentCourse));
        navigate(buildLearningModulePath(module, currentCourse.id));
        return;
      }
      navigate(buildLearningPickerPath(module));
    },
    [currentCourse, navigate, setSelectedInstitute, setSelectedLevel]
  );

  const openLearnAction = useCallback(
    (action: LearnAction) => {
      if (action.kind === 'module') {
        openModule(action.module);
        return;
      }
      const currentPath = `${location.pathname}${location.search}`;
      if (action.path.startsWith('/topik') || action.path.startsWith('/typing')) {
        navigate(appendReturnToPath(action.path, currentPath));
        return;
      }
      navigate(action.path);
    },
    [location.pathname, location.search, navigate, openModule]
  );

  const handleTabPress = useCallback(
    (tab: LearnTab) => {
      const nextParams = new URLSearchParams(searchParams);
      if (tab.key === 'mine') {
        nextParams.delete('module');
      } else if (tab.key === 'grammar') {
        nextParams.set('module', 'grammar');
      } else if (tab.key === 'vocabulary') {
        nextParams.set('module', 'vocabulary');
      } else if (tab.key === 'typing') {
        nextParams.set('module', 'typing');
      } else if (tab.key === 'topik') {
        nextParams.set('module', 'topik');
      }
      setSearchParams(nextParams);
    },
    [searchParams, setSearchParams]
  );

  const handleCourseOpen = useCallback(() => {
    if (activeTab === 'typing') {
      openLearnAction({ kind: 'path', path: '/typing' });
      return;
    }
    if (activeTab === 'topik') {
      openLearnAction({ kind: 'path', path: '/topik' });
      return;
    }
    if (activeTab === 'grammar') {
      openLearnAction({ kind: 'module', module: 'grammar' });
      return;
    }
    if (activeTab === 'vocabulary') {
      openLearnAction({ kind: 'module', module: 'vocabulary' });
      return;
    }
    if (!currentCourse) return;
    if (currentCourse.id === PRIORITY_COURSE_ID) {
      navigate(`/course/${currentCourse.id}/grammar`);
      return;
    }
    navigate(`/course/${currentCourse.id}`);
  }, [activeTab, currentCourse, navigate, openLearnAction]);

  const handleUnitOpen = useCallback(
    (unitNumber: number) => {
      if (!currentCourse) return;

      const level = resolveInstituteDefaultLevel(currentCourse);
      setSelectedInstitute(currentCourse.id);
      setSelectedLevel(level);
      const recentModule: LearningFlowModule = activeTab === 'grammar' ? 'grammar' : 'vocabulary';
      setRecentMaterial(recentModule, {
        instituteId: currentCourse.id,
        level,
        unit: unitNumber,
        updatedAt: Date.now(),
      });

      if (currentCourse.id === PRIORITY_COURSE_ID && activeTab !== 'vocabulary') {
        navigate(`/course/${currentCourse.id}/grammar?focusUnit=${unitNumber}`);
        return;
      }

      if (activeTab === 'grammar') {
        navigate(`/course/${currentCourse.id}/grammar?focusUnit=${unitNumber}`);
        return;
      }

      navigate(`/course/${currentCourse.id}/vocab?unit=${unitNumber}`);
    },
    [activeTab, currentCourse, navigate, setRecentMaterial, setSelectedInstitute, setSelectedLevel]
  );

  const courseName =
    getInstituteLocalizedName(currentCourse ?? undefined, language) || copy.defaultCourseTitle;
  const courseLevel =
    currentCourse?.displayLevel ||
    (typeof currentCourse?.levels?.[0] === 'number'
      ? `${currentCourse?.levels?.[0]}`
      : typeof (currentCourse?.levels?.[0] as { level?: number } | undefined)?.level === 'number'
        ? `${(currentCourse?.levels?.[0] as { level: number }).level}`
        : null) ||
    'II';
  const estimatedDays = Math.max(
    14,
    Math.round(((100 - overallPct) / 100) * Math.max(totalUnits * 6, 28))
  );
  const typedWpm = Math.max(0, typingStats?.highestWpm ?? 0);
  const tabLabelMap = useMemo(
    () =>
      Object.fromEntries(copy.tabs.map(tab => [tab.key, tab.label])) as Record<LearnTabKey, string>,
    [copy.tabs]
  );
  const heroChipLabel =
    activeTab === 'grammar'
      ? `${tabLabelMap.grammar} · ${overallPct}%`
      : activeTab === 'vocabulary'
        ? `${tabLabelMap.vocabulary} · ${overallPct}%`
        : activeTab === 'typing'
          ? `${tabLabelMap.typing} · ${typedWpm} WPM`
          : activeTab === 'topik'
            ? `${tabLabelMap.topik} · TOPIK`
            : copy.progressLabel(overallPct);
  const heroTitle =
    activeTab === 'grammar'
      ? `${courseName} · ${tabLabelMap.grammar}`
      : activeTab === 'vocabulary'
        ? `${courseName} · ${tabLabelMap.vocabulary}`
        : activeTab === 'typing'
          ? copy.tools[2]?.l || tabLabelMap.typing
          : activeTab === 'topik'
            ? `${tabLabelMap.topik} · ${copy.tapToStart}`
            : courseName;
  const heroMeta =
    activeTab === 'grammar' || activeTab === 'vocabulary'
      ? `${copy.defaultCourseMeta} · ${copy.unitLabel} ${completedUnits} / ${totalUnits}`
      : activeTab === 'typing'
        ? language.startsWith('zh')
          ? `${typingStats?.totalTests ?? 0} 次测试 · 最高 ${typedWpm} WPM`
          : `${typingStats?.totalTests ?? 0} tests · best ${typedWpm} WPM`
        : activeTab === 'topik'
          ? language.startsWith('zh')
            ? '历年真题与模考'
            : 'Mock exams and historical papers'
          : `${copy.defaultCourseMeta} · ${copy.levelBadge} ${courseLevel}`;
  const showUnitJourney =
    activeTab === 'mine' || activeTab === 'grammar' || activeTab === 'vocabulary';
  const showLearningTools = activeTab === 'mine' || activeTab === 'vocabulary';
  const vocabModesDisabled = !usesGrammarJourney && courseWords !== undefined && courseWords.length === 0;
  const showSwitchMaterialInHero =
    activeTab === 'mine' || activeTab === 'grammar' || activeTab === 'vocabulary';
  const switchMaterialModule: LearningFlowModule =
    activeTab === 'vocabulary' ? 'vocabulary' : 'grammar';

  const handleVocabModeOpen = useCallback(
    (mode: VocabModeKey) => {
      if (!currentCourse || vocabModesDisabled) return;

      const level = resolveInstituteDefaultLevel(currentCourse);
      setSelectedInstitute(currentCourse.id);
      setSelectedLevel(level);
      setRecentMaterial('vocabulary', {
        instituteId: currentCourse.id,
        level,
        updatedAt: Date.now(),
      });

      const currentPath = `${location.pathname}${location.search}`;
      navigate(appendReturnToPath(buildCourseVocabModePath(currentCourse.id, mode), currentPath));
    },
    [
      currentCourse,
      location.pathname,
      location.search,
      navigate,
      setRecentMaterial,
      setSelectedInstitute,
      setSelectedLevel,
      vocabModesDisabled,
    ]
  );

  const handleSwitchCourse = useCallback(
    (course: Course) => {
      const level = resolveInstituteDefaultLevel(course);
      setSelectedInstitute(course.id);
      setSelectedLevel(level);
      setRecentMaterial(switchMaterialModule, {
        instituteId: course.id,
        level,
        updatedAt: Date.now(),
      });
      setIsCoursePickerOpen(false);
    },
    [setRecentMaterial, setSelectedInstitute, setSelectedLevel, switchMaterialModule]
  );

  return (
    <PageShell>
      <PageIntro
        hanja={copy.hanjaTag}
        latin={copy.latin}
        title={copy.title}
        subtitle={copy.subtitle}
      />

      {/* Course tabs */}
      <div className="hide-scroll" style={{ padding: '0 18px 14px', display: 'flex', gap: 8, overflowX: 'auto' }}>
        {copy.tabs.map((tab, i) => {
          const isActive = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabPress(tab)}
              style={{
                padding: '8px 16px',
                borderRadius: 20,
                background: isActive ? KT.ink : KT.card,
                color: isActive ? KT.bg : KT.ink,
                fontSize: 12,
                fontWeight: 800,
                boxShadow: isActive ? 'none' : KT.shSm,
                whiteSpace: 'nowrap',
                flexShrink: 0,
                border: 'none',
                cursor: 'pointer',
                fontFamily: KT.font,
                letterSpacing: 0.2,
                marginLeft: i === 0 ? 0 : undefined,
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Current course hero */}
      <div style={{ padding: '0 18px 20px' }}>
        <div
          style={{
            width: '100%',
            background: `linear-gradient(135deg, ${KT.butter}B8 0%, ${KT.pink}80 100%)`,
            borderRadius: 28,
            boxShadow: KT.sh,
            padding: 20,
            cursor: 'pointer',
            textAlign: 'left',
            fontFamily: KT.font,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 16,
            }}
          >
            <button
              type="button"
              onClick={handleCourseOpen}
              style={{
                flex: 1,
                minWidth: 0,
                border: 'none',
                background: 'transparent',
                padding: 0,
                textAlign: 'left',
                cursor: 'pointer',
                fontFamily: KT.font,
              }}
            >
              <Chip tone="ink">{heroChipLabel}</Chip>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  marginTop: 10,
                  color: KT.ink,
                  letterSpacing: -0.4,
                  lineHeight: 1.2,
                }}
              >
                {heroTitle}
              </div>
              <div style={{ fontSize: 12, color: KT.ink2, marginTop: 4 }}>{heroMeta}</div>
            </button>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: 8,
                flexShrink: 0,
              }}
            >
              {showSwitchMaterialInHero ? (
                <button
                  type="button"
                  onClick={() => setIsCoursePickerOpen(true)}
                  aria-label={t('learningFlow.actions.switchMaterial', {
                    defaultValue: 'Switch textbook',
                  })}
                  title={t('learningFlow.actions.switchMaterial', {
                    defaultValue: 'Switch textbook',
                  })}
                  style={{
                    minHeight: 36,
                    borderRadius: 999,
                    background: 'rgba(255,255,255,0.86)',
                    border: `1px solid ${KT.line}`,
                    boxShadow: KT.shSm,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    cursor: 'pointer',
                    flexShrink: 0,
                    padding: '0 12px',
                    color: KT.ink,
                    fontSize: 12,
                    fontWeight: 800,
                    fontFamily: KT.font,
                    letterSpacing: 0.1,
                  }}
                >
                  <BookMarked size={15} color={KT.ink} />
                  <span>
                    {t('learningFlow.actions.switchMaterial', {
                      defaultValue: 'Switch textbook',
                    })}
                  </span>
                </button>
              ) : null}
              <HanjaSeal c="級" size={44} bg={KT.ink} round={10} />
            </div>
          </div>
          <button
            type="button"
            onClick={handleCourseOpen}
            style={{
              width: '100%',
              marginTop: 16,
              border: 'none',
              background: 'transparent',
              padding: 0,
              textAlign: 'left',
              cursor: 'pointer',
              fontFamily: KT.font,
            }}
          >
            <div
              style={{
                height: 6,
                borderRadius: 3,
                background: 'rgba(31,27,23,0.15)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${overallPct}%`,
                  height: '100%',
                  background: KT.ink,
                  borderRadius: 3,
                }}
              >
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 8,
              }}
            >
              <div style={{ fontSize: 11, color: KT.ink2, fontWeight: 700 }}>
                {copy.unitsLabel(completedUnits, totalUnits)}
              </div>
              <div style={{ fontSize: 11, color: KT.ink2, fontWeight: 700 }}>
                {copy.estimate(estimatedDays)}
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Unit beads journey */}
      {showUnitJourney ? (
        <div style={{ padding: '0 18px 28px' }}>
          <SectionHead
            kanji="路"
            title={copy.journeyTitle}
            action={copy.journeyAction}
            onAction={handleCourseOpen}
          />
          <Card pad={20}>
            <div style={{ position: 'relative' }}>
              {units.map((u, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleUnitOpen(u.n)}
                  style={{
                    display: 'flex',
                    gap: 14,
                    alignItems: 'flex-start',
                    position: 'relative',
                    paddingBottom: 18,
                    width: '100%',
                    border: 'none',
                    background: 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontFamily: KT.font,
                  }}
                >
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        background: u.pct > 0 ? KT[u.tone] : KT.line2,
                        display: 'grid',
                        placeItems: 'center',
                        boxShadow:
                          u.pct > 0 ? `0 0 0 3px ${KT.bg}, 0 0 0 4px ${KT[u.tone]}` : 'none',
                      }}
                    >
                      <u.icon
                        size={18}
                        strokeWidth={2.1}
                        color={u.pct > 0 ? KT.card : KT.sub}
                        aria-hidden="true"
                      />
                    </div>
                    {i < units.length - 1 && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 50,
                          left: 21,
                          bottom: -20,
                          width: 2,
                          background: KT.line2,
                        }}
                      />
                    )}
                  </div>
                  <div style={{ flex: 1, paddingTop: 6, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        gap: 8,
                        alignItems: 'center',
                        marginBottom: 3,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: KT.sub,
                          letterSpacing: 1,
                        }}
                      >
                        {copy.unitLabel.toUpperCase()} {String(u.n).padStart(2, '0')}
                      </span>
                      {u.pct === 1 && (
                        <span style={{ fontSize: 11, color: KT.mintDeep, fontWeight: 800 }}>
                          {copy.completed}
                        </span>
                      )}
                      {u.pct > 0 && u.pct < 1 && (
                        <span style={{ fontSize: 11, color: KT.pinkDeep, fontWeight: 800 }}>
                          {Math.round(u.pct * 100)}%
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 800,
                        color: u.pct > 0 ? KT.ink : KT.sub,
                        letterSpacing: -0.2,
                      }}
                    >
                      {u.t}
                    </div>
                    {u.s ? (
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 11,
                          fontWeight: 600,
                          color: KT.sub,
                          letterSpacing: 0.1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {u.s}
                      </div>
                    ) : null}
                    {u.pct > 0 && u.pct < 1 && (
                      <div
                        style={{
                          marginTop: 8,
                          height: 4,
                          borderRadius: 2,
                          background: KT.line,
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${u.pct * 100}%`,
                            height: '100%',
                            background: KT.pinkDeep,
                          }}
                        />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>
      ) : (
        <div style={{ padding: '0 18px 28px' }}>
          <Card pad={18}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: KT.ink, letterSpacing: -0.2 }}>
                  {activeTab === 'typing'
                    ? copy.tools[2]?.l || tabLabelMap.typing
                    : tabLabelMap.topik}
                </div>
                <div style={{ fontSize: 12, color: KT.sub, marginTop: 4, fontWeight: 600 }}>
                  {activeTab === 'typing'
                    ? copy.tools[2]?.s || copy.tapToStart
                    : language.startsWith('zh')
                      ? '进入模拟考试与历史成绩'
                      : 'Jump into mock exams and history'}
                </div>
              </div>
              <button
                type="button"
                onClick={handleCourseOpen}
                style={{
                  border: 'none',
                  background: KT.ink,
                  color: KT.bg,
                  borderRadius: 14,
                  padding: '10px 14px',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer',
                  fontFamily: KT.font,
                }}
              >
                {copy.tapToStart}
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* Learning tools grid */}
      {showLearningTools && (
        <div style={{ padding: '0 18px 28px' }}>
          <SectionHead kanji="具" title={copy.toolsTitle} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {copy.tools.map((m, i) => {
              const deepKey = `${m.tone}Deep` as const;
              const bg = KT[deepKey] || KT.ink;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => openLearnAction(m.action)}
                  style={{
                    background: KT.card,
                    padding: 16,
                    borderRadius: 28,
                    boxShadow: KT.sh,
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: KT.font,
                  }}
                >
                  <HanjaSeal c={m.k} size={34} bg={bg} round={8} />
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 800,
                      color: KT.ink,
                      marginTop: 12,
                      letterSpacing: -0.2,
                    }}
                  >
                    {m.l}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: KT.sub,
                      marginTop: 2,
                      fontWeight: 600,
                    }}
                  >
                    {m.s}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'vocabulary' && (
        <div style={{ padding: '0 18px 28px' }}>
          <SectionHead kanji="詞" title={copy.vocabModesTitle} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {copy.vocabModes.map(mode => {
              const deepKey = `${mode.tone}Deep` as const;
              const bg = KT[deepKey] || KT.ink;
              return (
                <button
                  key={mode.key}
                  type="button"
                  disabled={vocabModesDisabled}
                  onClick={() => handleVocabModeOpen(mode.key)}
                  style={{
                    background: KT.card,
                    padding: 16,
                    borderRadius: 28,
                    boxShadow: KT.sh,
                    border: `1px solid ${KT.line}`,
                    cursor: vocabModesDisabled ? 'not-allowed' : 'pointer',
                    textAlign: 'left',
                    fontFamily: KT.font,
                    opacity: vocabModesDisabled ? 0.55 : 1,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <HanjaSeal c={mode.k} size={34} bg={bg} round={8} />
                    <Chip tone={mode.tone}>{mode.key.toUpperCase()}</Chip>
                  </div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 800,
                      color: KT.ink,
                      marginTop: 12,
                      letterSpacing: -0.2,
                    }}
                  >
                    {mode.l}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: KT.sub,
                      marginTop: 3,
                      fontWeight: 600,
                      lineHeight: 1.45,
                    }}
                  >
                    {vocabModesDisabled ? copy.vocabNoWords : mode.s}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!user && (
        <div
          style={{
            padding: '0 18px 28px',
            fontSize: 11,
            color: KT.sub,
            textAlign: 'center',
            fontWeight: 600,
          }}
        >
          {language.startsWith('zh')
            ? '登录后可查看个人学习进度'
            : 'Sign in to track personal progress'}
        </div>
      )}

      <MobileSheet
        isOpen={isCoursePickerOpen}
        onClose={() => setIsCoursePickerOpen(false)}
        title={t('learningFlow.actions.switchMaterial', {
          defaultValue: 'Switch textbook',
        })}
        height="auto"
      >
        <div style={{ display: 'grid', gap: 10 }}>
          {(courses ?? []).map(course => {
            const isActive = currentCourse?.id === course.id;
            const localizedName =
              getInstituteLocalizedName(course, language) || course.name || copy.defaultCourseTitle;
            const levelLabel =
              course.displayLevel ||
              (typeof course.levels?.[0] === 'number'
                ? `${course.levels[0]}`
                : typeof course.levels?.[0] === 'object' &&
                    course.levels[0] !== null &&
                    'level' in course.levels[0] &&
                    typeof course.levels[0].level === 'number'
                  ? `${course.levels[0].level}`
                  : copy.levelBadge);

            return (
              <button
                key={course._id || course.id}
                type="button"
                onClick={() => handleSwitchCourse(course)}
                style={{
                  width: '100%',
                  borderRadius: 22,
                  border: `1px solid ${isActive ? KT.ink : KT.line}`,
                  background: isActive ? `${KT.butter}66` : KT.card,
                  boxShadow: KT.shSm,
                  padding: '14px 16px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontFamily: KT.font,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 800,
                        color: KT.ink,
                        letterSpacing: -0.2,
                      }}
                    >
                      {localizedName}
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 12,
                        fontWeight: 600,
                        color: KT.sub,
                        lineHeight: 1.5,
                      }}
                    >
                      {course.publisher || copy.defaultCourseMeta}
                      {' · '}
                      {levelLabel}
                    </div>
                  </div>
                  {isActive ? <Chip tone="ink">{t('common.current', { defaultValue: 'Current' })}</Chip> : null}
                </div>
              </button>
            );
          })}
        </div>
      </MobileSheet>
    </PageShell>
  );
};

export default MobileCoursesOverview;
