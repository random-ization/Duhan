import { useMemo } from 'react';
import { useQuery } from 'convex/react';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { LearnerStatsDto } from '../../../convex/learningStats';
import type { VocabActivityHeatmapCellDto } from '../../../convex/vocab';
import { useAuth } from '../../contexts/AuthContext';
import { useLearningSelection } from '../../contexts/LearningContext';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { INSTITUTES, NoArgs, qRef, VOCAB, WEAK_POINTS } from '../../utils/convexRefs';
import { getLocalizedContent } from '../../utils/languageUtils';
import { Card, Chip, HanjaSeal, KT, PageShell, SectionHead } from './ksoft/ksoft';

interface MobileVocabDashboardProps {
  readonly savedWordsCount: number;
  readonly onOpenSavedWords: () => void;
  readonly onOpenMistakes: () => void;
}

type DashboardCopy = {
  readonly subtitle: string;
  readonly memoryTitle: string;
  readonly memoryEngine: string;
  readonly masteredWords: string;
  readonly learningWords: string;
  readonly newWords: string;
  readonly todayTask: string;
  readonly dueNow: string;
  readonly currentCourse: string;
  readonly continueLearning: string;
  readonly chooseCourse: string;
  readonly currentCourseEmptyTitle: string;
  readonly currentCourseEmptyDescription: string;
  readonly libraryTitle: string;
  readonly savedWords: string;
  readonly mistakes: string;
  readonly mistakesEmpty: string;
  readonly monthlyHeatmap: string;
  readonly legendLess: string;
  readonly legendMore: string;
  readonly wordsUnit: string;
  readonly progressTitle: string;
  readonly openLibrary: string;
};

type LocalizedInstitute = {
  readonly id?: string;
  readonly name?: string;
  readonly nameEn?: string;
  readonly nameZh?: string;
  readonly nameVi?: string;
  readonly nameMn?: string;
  readonly displayLevel?: string;
  readonly publisher?: string;
};

const EMPTY_LEARNER_STATS: LearnerStatsDto = {
  streak: 0,
  todayMinutes: 0,
  dailyGoal: 30,
  dailyProgress: 0,
  weeklyActivity: [],
  todayActivities: {
    wordsLearned: 0,
    readingsCompleted: 0,
    listeningsCompleted: 0,
    examsCompleted: 0,
  },
  courseProgress: [],
  currentProgress: null,
  totalWordsLearned: 0,
  totalGrammarLearned: 0,
  wordsToReview: 0,
  vocabStats: { total: 0, dueReviews: 0, mastered: 0 },
  grammarStats: { total: 0, mastered: 0 },
  reviewStats: { dueNow: 0, dueSoon: 0, savedWords: 0 },
  moduleBreakdown: [],
  recentSessions: [],
  totalMinutes: 0,
  todayWordsStudied: 0,
  todayGrammarStudied: 0,
};

const isVocabularyLastModule = (value: string | undefined) => {
  const normalized = value?.trim().toUpperCase();
  return (
    normalized === 'VOCAB' ||
    normalized === 'VOCABULARY' ||
    normalized === 'FLASHCARD' ||
    normalized === 'LEARN' ||
    normalized === 'TEST'
  );
};

const getCurrentCourseId = ({
  recentCourseId,
  userLastModule,
  userLastInstitute,
}: {
  readonly recentCourseId: string | undefined;
  readonly userLastModule: string | undefined;
  readonly userLastInstitute: string | undefined;
}) => {
  if (recentCourseId && recentCourseId.trim()) {
    return recentCourseId.trim();
  }

  if (isVocabularyLastModule(userLastModule) && userLastInstitute && userLastInstitute.trim()) {
    return userLastInstitute.trim();
  }

  return '';
};

const getLocalizedCourseName = (course: LocalizedInstitute, language: string, fallback: string) =>
  getLocalizedContent(course, 'name', language) || course.name || fallback;

const getCopy = (language: string): DashboardCopy => {
  if (language.startsWith('zh')) {
    return {
      subtitle: '把词汇复习、课程进度和记忆曲线收拢到一个页面里。',
      memoryTitle: '记忆强度',
      memoryEngine: 'FSRS',
      masteredWords: '已掌握',
      learningWords: '学习中',
      newWords: '新词',
      todayTask: '今日复习',
      dueNow: '待复习',
      currentCourse: '当前课程',
      continueLearning: '继续学习',
      chooseCourse: '去选课程',
      currentCourseEmptyTitle: '先开始一门课程词汇',
      currentCourseEmptyDescription: '进入任意课程词汇页后，这里会自动接续你的进度。',
      libraryTitle: '我的资料',
      savedWords: '生词本',
      mistakes: '易错池',
      mistakesEmpty: '暂无错词',
      monthlyHeatmap: '本月活跃热力',
      legendLess: '少',
      legendMore: '多',
      wordsUnit: '词',
      progressTitle: '课程进度',
      openLibrary: '打开词库',
    };
  }

  if (language.startsWith('vi')) {
    return {
      subtitle: 'Gom ôn tập, tiến độ khóa học và nhịp ghi nhớ vào một màn hình.',
      memoryTitle: 'Độ mạnh ghi nhớ',
      memoryEngine: 'FSRS',
      masteredWords: 'Đã vững',
      learningWords: 'Đang học',
      newWords: 'Từ mới',
      todayTask: 'Ôn hôm nay',
      dueNow: 'đến hạn',
      currentCourse: 'Khóa hiện tại',
      continueLearning: 'Tiếp tục',
      chooseCourse: 'Chọn khóa',
      currentCourseEmptyTitle: 'Hãy mở một khóa từ vựng trước',
      currentCourseEmptyDescription:
        'Sau khi vào một khóa từ vựng, trang này sẽ bám theo tiến độ đó.',
      libraryTitle: 'Kho của tôi',
      savedWords: 'Sổ từ',
      mistakes: 'Từ sai',
      mistakesEmpty: 'Chưa có từ sai',
      monthlyHeatmap: 'Nhiệt độ tháng này',
      legendLess: 'Ít',
      legendMore: 'Nhiều',
      wordsUnit: 'từ',
      progressTitle: 'Tiến độ khóa học',
      openLibrary: 'Mở thư viện',
    };
  }

  if (language.startsWith('mn')) {
    return {
      subtitle: 'Үг давтлага, курсын явц, цээжлэлтийн хэмнэлийг нэг дэлгэцэд төвлөрүүлнэ.',
      memoryTitle: 'Санах хүч',
      memoryEngine: 'FSRS',
      masteredWords: 'Тогтсон',
      learningWords: 'Сурч буй',
      newWords: 'Шинэ',
      todayTask: 'Өнөөдрийн давтлага',
      dueNow: 'давтах',
      currentCourse: 'Одоогийн курс',
      continueLearning: 'Үргэлжлүүлэх',
      chooseCourse: 'Курс сонгох',
      currentCourseEmptyTitle: 'Эхлээд үгийн курс нээ',
      currentCourseEmptyDescription:
        'Нэг үгийн курс руу ормогц энэ дэлгэц тухайн урсгалыг үргэлжлүүлнэ.',
      libraryTitle: 'Миний сан',
      savedWords: 'Үгийн сан',
      mistakes: 'Алдаатай үгс',
      mistakesEmpty: 'Алдаа алга',
      monthlyHeatmap: 'Энэ сарын идэвх',
      legendLess: 'Бага',
      legendMore: 'Их',
      wordsUnit: 'үг',
      progressTitle: 'Курсын явц',
      openLibrary: 'Сан нээх',
    };
  }

  return {
    subtitle: 'Pull review queues, course momentum, and memory signals into one screen.',
    memoryTitle: 'Memory strength',
    memoryEngine: 'FSRS',
    masteredWords: 'Mastered',
    learningWords: 'Learning',
    newWords: 'New',
    todayTask: 'Due today',
    dueNow: 'due',
    currentCourse: 'Current course',
    continueLearning: 'Continue',
    chooseCourse: 'Choose course',
    currentCourseEmptyTitle: 'Start a vocab course first',
    currentCourseEmptyDescription:
      'Once you open a course vocabulary flow, this page will keep that thread here.',
    libraryTitle: 'My library',
    savedWords: 'Saved words',
    mistakes: 'Mistakes',
    mistakesEmpty: 'No mistakes yet',
    monthlyHeatmap: 'Monthly activity',
    legendLess: 'Less',
    legendMore: 'More',
    wordsUnit: 'words',
    progressTitle: 'Course progress',
    openLibrary: 'Open library',
  };
};

const getMemoryBars = (cells: VocabActivityHeatmapCellDto[]): number[] | null => {
  const recentCells = cells.slice(-14);
  if (recentCells.length === 0) return null;

  const hasAnyActivity = recentCells.some(cell => cell.count > 0);
  if (!hasAnyActivity) return null;

  const maxCount = Math.max(...recentCells.map(cell => cell.count), 1);
  const paddedCells: Array<VocabActivityHeatmapCellDto | null> = [
    ...Array.from({ length: Math.max(0, 14 - recentCells.length) }, () => null),
    ...recentCells,
  ];

  return paddedCells.map(cell => {
    if (!cell) return 0.12;
    if (cell.count <= 0) return 0.1;
    return Math.max(cell.count / maxCount, 0.2);
  });
};

const getHeatmapCellStyle = (cell: VocabActivityHeatmapCellDto) => {
  if (cell.intensity === 0) {
    return {
      background: 'transparent',
      border: `1px dashed ${KT.line2}`,
    };
  }

  if (cell.intensity === 1) {
    return { background: `${KT.mint}80`, border: 'none' };
  }
  if (cell.intensity === 2) {
    return { background: KT.mint, border: 'none' };
  }
  if (cell.intensity === 3) {
    return { background: KT.mintDeep, border: 'none' };
  }

  return {
    background: KT.jade,
    border: 'none',
    boxShadow: '0 0 0 1px rgba(255,255,255,0.12), 0 8px 18px rgba(76,107,78,0.18)',
  };
};

export const MobileVocabDashboard = ({
  savedWordsCount,
  onOpenSavedWords,
  onOpenMistakes,
}: MobileVocabDashboardProps) => {
  const navigate = useLocalizedNavigate();
  const { i18n, t } = useTranslation();
  const { user } = useAuth();
  const { recentMaterials } = useLearningSelection();
  const language = i18n.resolvedLanguage || i18n.language || 'en';
  const copy = getCopy(language);

  const learnerStats =
    useQuery(qRef<NoArgs, LearnerStatsDto>('userStats:getStats')) ?? EMPTY_LEARNER_STATS;
  const dashboardInsights = useQuery(VOCAB.getDashboardInsights, {});
  const institutes = useQuery(INSTITUTES.getAll, {});
  const mistakes = useQuery(
    qRef<{ limit?: number }, Array<{ id: string }>>('user:getMistakes'),
    user ? { limit: 500 } : 'skip'
  );
  const weakGrammar = useQuery(
    WEAK_POINTS.getWeakGrammarPatterns,
    user ? { limit: 3, language } : 'skip'
  );
  const weakVocabCategories = useQuery(
    WEAK_POINTS.getWeakVocabCategories,
    user ? { limit: 3, language } : 'skip'
  );

  const currentCourseId = useMemo(
    () =>
      getCurrentCourseId({
        recentCourseId: recentMaterials.vocabulary?.instituteId,
        userLastModule: user?.lastModule,
        userLastInstitute: user?.lastInstitute,
      }),
    [recentMaterials.vocabulary?.instituteId, user?.lastInstitute, user?.lastModule]
  );

  const currentCourseStats = useQuery(
    VOCAB.getStats,
    currentCourseId ? { courseId: currentCourseId } : 'skip'
  );
  const currentCourseSummary = useQuery(
    VOCAB.getReviewSummary,
    currentCourseId ? { courseId: currentCourseId } : 'skip'
  );

  const currentCourse = useMemo(
    () => institutes?.find(course => course.id === currentCourseId),
    [currentCourseId, institutes]
  );

  const currentCourseTitle = currentCourse
    ? getLocalizedCourseName(currentCourse, language, copy.currentCourse)
    : copy.currentCourse;
  const currentCourseMeta =
    currentCourse?.publisher || currentCourse?.displayLevel || copy.progressTitle;
  const currentCourseBadge =
    currentCourse?.displayLevel || currentCourse?.publisher || copy.currentCourse;
  const currentCourseProgress = currentCourseStats?.total
    ? Math.round((currentCourseStats.mastered / currentCourseStats.total) * 100)
    : 0;
  const hasCurrentCourse = Boolean(currentCourseId) && (currentCourseStats?.total ?? 0) > 0;
  const currentCoursePath = hasCurrentCourse ? `/course/${currentCourseId}/vocab` : '/courses';

  const heatmap = useMemo(() => dashboardInsights?.heatmap ?? [], [dashboardInsights?.heatmap]);
  const dueNow = currentCourseSummary?.dueNow ?? learnerStats.vocabStats.dueReviews ?? 0;
  const learningNow = currentCourseSummary?.learning ?? learnerStats.reviewStats.dueSoon ?? 0;
  const newWords = currentCourseSummary?.unlearned ?? 0;
  const masteredWords = learnerStats.vocabStats.mastered || learnerStats.totalWordsLearned;
  const mistakeCount = mistakes?.length ?? 0;
  const memoryBars = useMemo(() => getMemoryBars(heatmap), [heatmap]);
  const retentionRate30d = dashboardInsights?.retentionRate30d ?? null;
  const dueReviews = learnerStats.vocabStats.dueReviews ?? 0;
  const showBackButton =
    typeof window !== 'undefined' &&
    window.history.length > 1 &&
    !window.location.pathname.endsWith('/vocab-book');

  const handleBack = () => {
    navigate('/dashboard');
  };

  return (
    <PageShell>
      <div
        style={{
          padding: '14px 22px 18px',
          paddingTop: 'calc(env(safe-area-inset-top) + 14px)',
          background: `linear-gradient(180deg, ${KT.pink}50 0%, ${KT.bg} 100%)`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 14,
          }}
        >
          <div style={{ width: 40, height: 40 }}>
            {showBackButton ? (
              <button
                type="button"
                onClick={handleBack}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 14,
                  border: `1px solid ${KT.line}`,
                  background: KT.card,
                  color: KT.ink,
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                  boxShadow: KT.shSm,
                }}
                aria-label={t('common.back', { defaultValue: 'Back' })}
              >
                <ArrowLeft size={18} />
              </button>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onOpenSavedWords}
            style={{
              height: 36,
              padding: '0 14px',
              borderRadius: 999,
              border: `1px solid ${KT.line}`,
              background: KT.card,
              color: KT.ink,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 0.4,
              fontFamily: KT.font,
              cursor: 'pointer',
              boxShadow: KT.shSm,
            }}
          >
            {copy.openLibrary}
          </button>
        </div>

        <div
          style={{
            fontFamily: KT.serif,
            fontSize: 13,
            color: KT.crimson,
            letterSpacing: 4,
            marginBottom: 4,
            fontWeight: 500,
          }}
        >
          詞 · VOCABULARY
        </div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: KT.ink,
            letterSpacing: -0.8,
          }}
        >
          단어장
        </div>
        <div style={{ fontSize: 13, color: KT.sub, marginTop: 4 }}>{copy.subtitle}</div>

        <Card pad={16} style={{ marginTop: 18 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 10,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 800, color: KT.ink, letterSpacing: -0.2 }}>
              {copy.memoryTitle}
            </div>
            <div style={{ fontSize: 10, color: KT.sub, fontWeight: 700 }}>{copy.memoryEngine}</div>
          </div>

          {memoryBars === null ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: 44,
                borderRadius: 10,
                border: `1px dashed ${KT.line2}`,
                background: KT.bg2,
                fontSize: 11,
                fontWeight: 700,
                color: KT.sub,
                letterSpacing: 0.2,
                textAlign: 'center',
                padding: '0 12px',
              }}
            >
              {t('mobileVocabDashboard.memoryEmpty', {
                defaultValue: 'Review for 2 days to see your memory trend here.',
              })}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 44 }}>
              {memoryBars.map((height, index) => (
                <div
                  key={index}
                  style={{
                    flex: 1,
                    height: `${Math.round(height * 100)}%`,
                    background: `linear-gradient(180deg, ${KT.crimson} 0%, ${KT.pink} 100%)`,
                    borderRadius: 3,
                    opacity: 0.3 + height * 0.7,
                  }}
                />
              ))}
            </div>
          )}

          <div
            style={{
              marginTop: 12,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
            }}
          >
            <div
              style={{
                borderRadius: 10,
                border: `1px solid ${KT.line}`,
                background: KT.bg2,
                padding: '8px 10px',
              }}
            >
              <div style={{ fontSize: 10, color: KT.sub, fontWeight: 700 }}>
                {t('mobileVocabDashboard.dueReviews', { defaultValue: 'Due reviews' })}
              </div>
              <div style={{ fontSize: 16, color: KT.ink, fontWeight: 800, marginTop: 2 }}>
                {dueReviews.toLocaleString()}
              </div>
            </div>
            <div
              style={{
                borderRadius: 10,
                border: `1px solid ${KT.line}`,
                background: KT.bg2,
                padding: '8px 10px',
              }}
            >
              <div style={{ fontSize: 10, color: KT.sub, fontWeight: 700 }}>
                {t('mobileVocabDashboard.retention30d', { defaultValue: '30-day retention' })}
              </div>
              <div style={{ fontSize: 16, color: KT.ink, fontWeight: 800, marginTop: 2 }}>
                {retentionRate30d === null ? '—' : `${retentionRate30d}%`}
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 8,
              marginTop: 12,
            }}
          >
            {[
              { n: masteredWords, l: copy.masteredWords },
              { n: learningNow, l: copy.learningWords },
              { n: newWords, l: copy.newWords },
            ].map(item => (
              <div key={item.l} style={{ textAlign: 'center' }}>
                <div
                  style={{
                    fontSize: 17,
                    fontWeight: 800,
                    color: KT.ink,
                    letterSpacing: -0.3,
                  }}
                >
                  {item.n.toLocaleString()}
                </div>
                <div style={{ fontSize: 10, color: KT.sub, fontWeight: 600, marginTop: 1 }}>
                  {item.l}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Focus areas — weak grammar + vocab categories */}
      {((weakGrammar?.length ?? 0) > 0 || (weakVocabCategories?.length ?? 0) > 0) && (
        <div style={{ padding: '0 18px 18px' }}>
          <SectionHead
            kanji="攻"
            title={t('mobileVocabDashboard.focusAreas', {
              defaultValue: 'Focus areas',
            })}
          />
          <Card pad={16}>
            {(weakGrammar?.length ?? 0) > 0 && (
              <>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: KT.sub,
                    letterSpacing: 1.2,
                    marginBottom: 8,
                  }}
                >
                  {t('mobileVocabDashboard.weakGrammar', {
                    defaultValue: 'GRAMMAR TO REVISIT',
                  })}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {weakGrammar!.map(item => (
                    <button
                      key={String(item.grammarId)}
                      type="button"
                      onClick={() =>
                        navigate(
                          `/course/topik-grammar/grammar?focusGrammarId=${encodeURIComponent(String(item.grammarId))}`
                        )
                      }
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                        padding: '10px 12px',
                        borderRadius: 12,
                        border: `1px solid ${KT.line}`,
                        background: KT.bg2,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: KT.ink,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.title}
                        </div>
                        <div
                          style={{
                            height: 4,
                            marginTop: 6,
                            borderRadius: 2,
                            background: KT.line2,
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${Math.round(item.proficiency)}%`,
                              height: '100%',
                              background: KT.crimson,
                              borderRadius: 2,
                            }}
                          />
                        </div>
                      </div>
                      <Chip tone="pink">{Math.round(item.proficiency)}%</Chip>
                    </button>
                  ))}
                </div>
              </>
            )}

            {(weakGrammar?.length ?? 0) > 0 && (weakVocabCategories?.length ?? 0) > 0 && (
              <div
                style={{
                  height: 1,
                  background: KT.line,
                  margin: '14px 0',
                }}
              />
            )}

            {(weakVocabCategories?.length ?? 0) > 0 && (
              <>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: KT.sub,
                    letterSpacing: 1.2,
                    marginBottom: 8,
                  }}
                >
                  {t('mobileVocabDashboard.weakVocab', {
                    defaultValue: 'WORDS YOU FORGET',
                  })}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {weakVocabCategories!.map(cat => (
                    <div
                      key={cat.partOfSpeech}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 12,
                        border: `1px solid ${KT.line}`,
                        background: KT.bg2,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'baseline',
                          marginBottom: 4,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 800,
                            color: KT.ink,
                          }}
                        >
                          {cat.partOfSpeech || '기타'}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: KT.crimson,
                            fontWeight: 700,
                          }}
                        >
                          {t('mobileVocabDashboard.lapseCount', {
                            defaultValue: '{{count}} lapses · {{words}} words',
                            count: cat.totalLapses,
                            words: cat.wordCount,
                          })}
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: KT.sub,
                          fontWeight: 500,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {cat.samples.map(s => s.word).join(' · ')}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        </div>
      )}

      <div style={{ padding: '0 18px 18px' }}>
        <Card pad={18} style={{ background: KT.ink, color: KT.bg }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <HanjaSeal c="復" size={48} bg="rgba(255,255,255,0.15)" round={12} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 11,
                  opacity: 0.65,
                  fontWeight: 700,
                  letterSpacing: 1,
                }}
              >
                {copy.todayTask}
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  letterSpacing: -0.5,
                  marginTop: 2,
                }}
              >
                {dueNow.toLocaleString()} {copy.dueNow}
              </div>
              <div
                style={{
                  fontSize: 11,
                  opacity: 0.72,
                  marginTop: 6,
                  lineHeight: 1.5,
                }}
              >
                {hasCurrentCourse
                  ? `${copy.currentCourse} · ${currentCourseTitle}`
                  : copy.currentCourseEmptyDescription}
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate(currentCoursePath)}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                background: KT.card,
                color: KT.ink,
                display: 'grid',
                placeItems: 'center',
                fontSize: 18,
                border: 'none',
                cursor: 'pointer',
                flexShrink: 0,
              }}
              aria-label={hasCurrentCourse ? copy.continueLearning : copy.chooseCourse}
            >
              →
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              marginTop: 14,
            }}
          >
            <Chip tone="muted">{currentCourseBadge}</Chip>
            {hasCurrentCourse ? <Chip tone="muted">{currentCourseMeta}</Chip> : null}
            <Chip tone="muted">{`${copy.progressTitle} ${currentCourseProgress}%`}</Chip>
          </div>

          {hasCurrentCourse ? (
            <div style={{ marginTop: 12 }}>
              <div
                style={{
                  height: 5,
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.16)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${currentCourseProgress}%`,
                    height: '100%',
                    background: KT.card,
                    borderRadius: 999,
                  }}
                />
              </div>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => navigate(currentCoursePath)}
            style={{
              width: '100%',
              marginTop: 16,
              padding: '14px 18px',
              borderRadius: 18,
              border: '1px solid rgba(255,255,255,0.18)',
              background: 'rgba(255,255,255,0.08)',
              color: KT.card,
              fontSize: 14,
              fontWeight: 800,
              letterSpacing: 0.3,
              fontFamily: KT.font,
              cursor: 'pointer',
            }}
          >
            {hasCurrentCourse ? copy.continueLearning : copy.chooseCourse}
          </button>
        </Card>
      </div>

      <div style={{ padding: '0 18px 24px' }}>
        <SectionHead kanji="庫" title={copy.libraryTitle} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            {
              c: '詞',
              title: copy.savedWords,
              subtitle: `${savedWordsCount.toLocaleString()} ${copy.wordsUnit}`,
              tone: KT.pinkDeep,
              action: onOpenSavedWords,
            },
            {
              c: '誤',
              title: copy.mistakes,
              subtitle:
                mistakeCount > 0
                  ? `${mistakeCount.toLocaleString()} ${copy.wordsUnit}`
                  : copy.mistakesEmpty,
              tone: KT.indigo,
              action: onOpenMistakes,
            },
          ].map(item => (
            <button
              key={item.c}
              type="button"
              onClick={item.action}
              style={{
                background: KT.card,
                border: 'none',
                borderRadius: 24,
                boxShadow: KT.shSm,
                padding: 16,
                textAlign: 'left',
                cursor: 'pointer',
                fontFamily: KT.font,
              }}
            >
              <HanjaSeal c={item.c} size={34} bg={item.tone} round={8} />
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  color: KT.ink,
                  marginTop: 12,
                  letterSpacing: -0.2,
                }}
              >
                {item.title}
              </div>
              <div style={{ fontSize: 11, color: KT.sub, marginTop: 2, fontWeight: 600 }}>
                {item.subtitle}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '0 18px 28px' }}>
        <SectionHead kanji="記" title={copy.monthlyHeatmap} />
        <Card pad={18}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
            {heatmap.map(cell => (
              <div
                key={cell.date}
                style={{
                  aspectRatio: '1 / 1',
                  width: '100%',
                  borderRadius: 8,
                  ...getHeatmapCellStyle(cell),
                  ...(cell.isToday
                    ? { boxShadow: `0 0 0 1px ${KT.ink}, 0 0 0 4px rgba(31,27,23,0.05)` }
                    : null),
                }}
                aria-label={`${cell.date}: ${cell.count}`}
                title={`${cell.date}: ${cell.count}`}
              />
            ))}
          </div>

          <div
            style={{
              marginTop: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <span style={{ fontSize: 10, color: KT.sub, fontWeight: 700 }}>{copy.legendLess}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {[`${KT.mint}40`, `${KT.mint}80`, KT.mint, KT.mintDeep, KT.jade].map(tone => (
                <div
                  key={tone}
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    background: tone,
                  }}
                />
              ))}
            </div>
            <span style={{ fontSize: 10, color: KT.sub, fontWeight: 700 }}>{copy.legendMore}</span>
          </div>
        </Card>
      </div>
    </PageShell>
  );
};
