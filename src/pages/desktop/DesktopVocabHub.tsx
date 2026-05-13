import React, { useMemo, useState, useRef } from 'react';
import { useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { DesktopCard } from '../../components/desktop/ui/DesktopCard';
import { HanjaSeal } from '../../components/desktop/ui/HanjaSeal';
import { DesignChip } from '../../components/desktop/ui/DesignChip';
import { DRail } from '../../components/desktop/ui/DRail';
import { UnitListView } from '../../components/desktop/vocab/UnitListView';
import { UnitModeSelector } from '../../components/desktop/vocab/UnitModeSelector';
import { qRef, VOCAB, INSTITUTES, NoArgs } from '../../utils/convexRefs';
import { TOPIK_GRAMMAR_COURSE_ID } from '../../utils/learningFlow';
import type { VocabStatsDto, VocabBookItemDto, UnitProgressDto } from '../../../convex/vocab/vocabTypes';

/**
 * Helper component that fetches unit progress data for the selected unit
 * and renders the UnitModeSelector with the correct progress data.
 */
function UnitModeSelectorWithProgress({
  courseId,
  unitId,
  onBack,
}: {
  courseId: string;
  unitId: number;
  onBack: () => void;
}) {
  // Fetch unit progress data to find the selected unit's progress
  const unitProgress = useQuery(VOCAB.getUnitProgress, { courseId });

  // Find the selected unit's progress data
  const selectedUnitProgress = unitProgress?.find((u) => u.unitId === unitId);

  // Loading state
  if (!selectedUnitProgress) {
    return (
      <div className="py-8 text-center text-[14px] font-semibold text-k-sub">
        {unitProgress === undefined ? '加载中...' : '未找到单元数据'}
      </div>
    );
  }

  return (
    <UnitModeSelector
      courseId={courseId}
      unitId={unitId}
      unitProgress={selectedUnitProgress}
      onBack={onBack}
    />
  );
}


export default function DesktopVocabHub() {
  const navigate = useLocalizedNavigate();
  const { t, i18n } = useTranslation();

  // Use localStorage to persist the selected course
  const [selectedCourse, setSelectedCourse] = useState<string>(() => {
    return localStorage.getItem('vocab_hub_selected_course') || 'all';
  });

  // State for unit selection in learning path
  const [selectedUnit, setSelectedUnit] = useState<number | null>(null);

  // Ref to preserve scroll position when navigating back from mode selector
  const scrollPositionRef = useRef<number>(0);

  const handleCourseChange = (courseId: string) => {
    setSelectedCourse(courseId);
    setSelectedUnit(null);
    localStorage.setItem('vocab_hub_selected_course', courseId);
  };

  const formatNumber = (n: number): string => {
    return n.toLocaleString(i18n.language === 'zh' ? 'zh-CN' : 'en-US');
  };

  // 获取词汇统计数据 (如果是 all 则不传 courseId)
  const vocabStats = useQuery(
    VOCAB.getStats,
    selectedCourse !== 'all' ? { courseId: selectedCourse } : ({} as any)
  );

  // 获取所有教材列表
  const allInstitutes = useQuery(INSTITUTES.getAll);

  // 获取预测数据
  const forecastData = useQuery(qRef<NoArgs, number[]>('vocab:getForecast')) || [0, 0, 0, 0, 0, 0, 0];

  // 获取词汇本列表
  const vocabBook = useQuery(
    VOCAB.getVocabBook,
    { limit: 50, includeMastered: false }
  );

  // 计算到期复习数量
  const totalWords = vocabStats?.total ?? 0;
  const masteredWords = vocabStats?.mastered ?? 0;

  // 分组词汇
  const groupedDecks = useMemo(() => {
    if (!vocabBook) return [];

    const groups: Record<string, VocabBookItemDto[]> = {};
    for (const item of vocabBook) {
      const source = item.courseData?.courseId || t('coursesOverview.desktop.vocabulary.categories.other');
      if (!groups[source]) groups[source] = [];
      groups[source].push(item);
    }

    const hanjaMap: Record<string, string> = {
      'TOPIK I': '基',
      'TOPIK II': '中',
      [t('coursesOverview.desktop.vocabulary.categories.course')]: '課',
      [t('coursesOverview.desktop.vocabulary.categories.reading')]: '讀',
      [t('coursesOverview.desktop.vocabulary.categories.other')]: '他',
    };

    const toneMap: Record<string, string> = {
      'TOPIK I': 'mint',
      'TOPIK II': 'butter',
      [t('coursesOverview.desktop.vocabulary.categories.course')]: 'pink',
      [t('coursesOverview.desktop.vocabulary.categories.reading')]: 'lilac',
      [t('coursesOverview.desktop.vocabulary.categories.other')]: 'muted',
    };

    return Object.entries(groups).map(([source, words], index) => ({
      k: hanjaMap[source] || '他',
      l: source,
      n: words.length,
      m: t('coursesOverview.desktop.vocabulary.masteredStatus', { count: words.filter((w) => w.progress?.status === 'MASTERED' || (w as any).mastered).length }),
      tone: toneMap[source] || 'muted',
      cur: index === 0,
    }));
  }, [vocabBook, t]);

  // 获取薄弱词 (按熟练度排序，由于 vocabBook 是 limit 50 且不包含已掌握，我们直接从中取)
  const weakWords = useMemo(() => {
    if (!vocabBook) return [];
    return [...vocabBook]
      .sort((a, b) => (a.proficiency || 0) - (b.proficiency || 0))
      .slice(0, 5);
  }, [vocabBook]);

  const content = (
    <div>
      <div className="mb-[20px] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-k-serif text-[24px] font-bold text-k-crimson">學</span>
          <h1 className="text-[20px] font-extrabold text-k-ink">{t('coursesOverview.desktop.vocabulary.startStudy', { defaultValue: '词汇学习' })}</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-bold text-k-sub">{t('coursesOverview.desktop.vocabulary.categories.course')}</span>
          <select
            value={selectedCourse}
            onChange={(e) => handleCourseChange(e.target.value)}
            className="min-w-[200px] rounded-lg border border-k-divider bg-k-card px-3 py-1.5 text-[12px] font-bold text-k-ink focus:border-k-crimson focus:outline-none shadow-sm"
          >
            <option value="all">{t('common.all')}</option>
            {allInstitutes?.filter(i =>
              i.id !== TOPIK_GRAMMAR_COURSE_ID &&
              !i.id.toLowerCase().includes('chungang') &&
              !(i.publisher || '').toLowerCase().includes('chung-ang') &&
              !i.name.includes('中央大学')
            ).map(i => {
              const name = i.nameZh || i.name;
              let levelDisplay = i.displayLevel || '';
              if (levelDisplay) {
                if (/^\d+$/.test(levelDisplay)) {
                  levelDisplay = t('common.levelNum', { count: parseInt(levelDisplay), defaultValue: `${levelDisplay}级` });
                } else if (levelDisplay.includes('-')) {
                  const [l, v] = levelDisplay.split('-');
                  levelDisplay = `${l}级 ${v}册`;
                }
              }
              const volume = i.volume || '';
              return (
                <option key={i.id} value={i.id}>{[name, levelDisplay, volume].filter(Boolean).join(' ')}</option>
              );
            })}
          </select>
          <button
            onClick={() => navigate('/courses?module=vocabulary')}
            className="rounded-lg bg-k-card px-3 py-1.5 text-[12px] font-bold text-k-sub border border-k-divider hover:text-k-crimson hover:border-k-crimson transition-colors shadow-sm"
          >
            {t('coursesOverview.desktop.vocabulary.viewAll')}
          </button>
        </div>
      </div>

      {/* Main Study Grid */}
      <div className="mb-[22px] grid grid-cols-[1.5fr_1fr_1fr_1fr] gap-[14px]">
        {/* Review Card */}
        <DesktopCard
          pad={20}
          style={{ background: 'var(--color-k-crimson)', color: 'var(--color-k-card)' }}
          className="relative overflow-hidden"
        >
          <div className="absolute -right-2 -top-2.5 font-k-serif text-[90px] font-medium leading-[1] text-[rgba(255,255,255,0.13)]">
            復
          </div>
          <DesignChip tone="ink" size="sm">
            FSRS · {t('coursesOverview.desktop.vocabulary.dueToday')}
          </DesignChip>
          <div className="mt-2.5 text-[44px] font-extrabold leading-[1] tracking-[-1.5px]">
            {vocabStats?.dueReviews ?? 0}
            <span className="ml-2 text-[16px] opacity-70">
              {t('common.items')}
            </span>
          </div>
          <div className="mt-1.5 text-[12px] font-semibold opacity-85">
            {t('coursesOverview.desktop.vocabulary.minuteEstimate', { count: Math.ceil((vocabStats?.dueReviews ?? 0) * 0.5) })} · {t('coursesOverview.desktop.vocabulary.mastered')} {masteredWords}
          </div>
          <button
            onClick={() => navigate('/review' + (selectedCourse !== 'all' ? `?courseId=${selectedCourse}` : ''))}
            className="mt-3.5 cursor-pointer rounded-[11px] border-[1.5px] border-k-card bg-k-card px-4 py-2.5 text-[12px] font-extrabold text-k-crimson transition-transform hover:scale-105 active:scale-95"
          >
            {t('coursesOverview.desktop.vocabulary.startReview')} →
          </button>
        </DesktopCard>

        {[
          { k: t('common.vocabChar', '词'), n: formatNumber(totalWords), l: t('coursesOverview.desktop.vocabulary.totalVocab'), tone: 'mint' },
          { k: t('common.masteredChar', '通'), n: formatNumber(masteredWords), l: t('coursesOverview.desktop.vocabulary.mastered'), tone: 'butter' },
          { k: t('common.learnChar', '学'), n: formatNumber(vocabStats?.unlearned || 0), l: t('coursesOverview.desktop.vocabulary.toLearn'), tone: 'pink' },
        ].map((s, i) => (
          <DesktopCard key={i} pad={18}>
            <HanjaSeal c={s.k} size={32} bg={`var(--color-k-${s.tone}-deep)`} round={9} />
            <div className="mt-3 text-[32px] font-extrabold leading-[1] tracking-[-0.8px] text-k-ink">
              {s.n}
            </div>
            <div className="mt-1 text-[11px] font-bold text-k-sub">{s.l}</div>
          </DesktopCard>
        ))}
      </div>

      {/* Learning Path - Unit Selection + Mode Selector */}
      <DesktopCard pad={20} className="mb-[22px]">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center">
            <span className="mr-2 font-k-serif text-[16px] font-medium text-k-crimson">
              習
            </span>
            <span className="text-[14px] font-extrabold text-k-ink">
              {selectedCourse === 'all' ? t('common.all') : allInstitutes?.find(i => i.id === selectedCourse)?.nameZh || t('common.current', { defaultValue: '当前' })}
              {t('coursesOverview.desktop.vocabulary.learningPath', { defaultValue: '学习路径' })}
            </span>
          </div>
        </div>

        {/* State-driven rendering */}
        {selectedCourse === 'all' ? (
          // Prompt to select a course
          <div className="py-8 text-center text-[14px] font-semibold text-k-sub">
            {t('coursesOverview.desktop.vocabulary.selectCoursePrompt', { defaultValue: '请选择一个教材以查看单元' })}
          </div>
        ) : selectedUnit === null ? (
          // Show unit list
          <UnitListView
            courseId={selectedCourse}
            onSelectUnit={setSelectedUnit}
          />
        ) : (
          // Show mode selector for selected unit
          <UnitModeSelectorWithProgress
            courseId={selectedCourse}
            unitId={selectedUnit}
            onBack={() => setSelectedUnit(null)}
          />
        )}
      </DesktopCard>


      {/* SRS forecast */}
      <DesktopCard pad={20} className="mb-[22px]">
        <div className="mb-3.5 flex items-baseline">
          <span className="mr-2 font-k-serif text-[16px] font-medium text-k-crimson">
            豫
          </span>
          <span className="text-[14px] font-extrabold text-k-ink">{t('coursesOverview.desktop.vocabulary.forecastTitle', { defaultValue: '学习进度预测' })}</span>
          <span className="ml-auto text-[11px] font-bold text-k-sub">{t('coursesOverview.desktop.vocabulary.forecastTotal', { count: totalWords - masteredWords, defaultValue: '待复习 {{count}} 词' })}</span>
        </div>
        <div className="flex h-[100px] items-end gap-2.5">
          {forecastData.map((v, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
              <div className="text-[11px] font-extrabold text-k-ink opacity-0 group-hover:opacity-100 transition-opacity">{v}</div>
              <div
                className="w-full rounded-md transition-all duration-500"
                style={{
                  height: `${Math.min(100, (v / (Math.max(...forecastData, 1))) * 70 + 4)}px`,
                  background: i === 0 ? 'var(--color-k-crimson)' : 'var(--color-k-lilac)',
                  opacity: v === 0 ? 0.3 : 1
                }}
              />
              <div className="text-[10px] font-bold text-k-sub">
                {i === 0 ? t('coursesOverview.desktop.vocabulary.forecastDays.today', { defaultValue: '今天' }) :
                  i === 1 ? t('coursesOverview.desktop.vocabulary.forecastDays.tomorrow', { defaultValue: '明天' }) :
                    i === 2 ? t('coursesOverview.desktop.vocabulary.forecastDays.after', { defaultValue: '后天' }) :
                      i === 3 ? t('coursesOverview.desktop.vocabulary.forecastDays.plus2', { defaultValue: '3天后' }) :
                        i === 4 ? t('coursesOverview.desktop.vocabulary.forecastDays.plus3', { defaultValue: '4天后' }) :
                          i === 5 ? t('coursesOverview.desktop.vocabulary.forecastDays.plus4', { defaultValue: '5天后' }) :
                            t('coursesOverview.desktop.vocabulary.forecastDays.plus5', { defaultValue: '6天后' })}
              </div>
            </div>
          ))}
        </div>
      </DesktopCard>

      {/* Vocab decks */}
      <DesktopCard pad={0}>
        <div className="flex items-center border-b px-[20px] py-[16px]" style={{ borderColor: 'var(--color-k-line)' }}>
          <span className="mr-2 font-k-serif text-[16px] font-medium text-k-crimson">詞</span>
          <span className="text-[14px] font-extrabold text-k-ink">{t('coursesOverview.desktop.vocabulary.vocabBookTitle', { defaultValue: '词汇学习' })}</span>
          <span className="ml-auto text-[11px] font-bold text-k-sub">{t('coursesOverview.desktop.vocabulary.forecastTotal', { count: totalWords, defaultValue: '总计 {{count}} 词' })}</span>
        </div>
        {groupedDecks.length === 0 ? (
          <div className="px-[20px] py-12 text-center text-[14px] font-semibold text-k-sub">
            {t('coursesOverview.desktop.vocabulary.emptyVocab', { defaultValue: '暂无词汇，开始学习吧！' })}
          </div>
        ) : (
          groupedDecks.map((d, i, a) => (
            <div
              key={i}
              onClick={() => navigate('/vocab-book')}
              className="flex cursor-pointer items-center gap-3.5 px-[20px] py-[14px] transition-colors hover:bg-k-bg2"
              style={{ borderBottom: i < a.length - 1 ? '1px solid var(--color-k-line)' : 'none' }}
            >
              <HanjaSeal c={d.k} size={36} bg={`var(--color-k-${d.tone}-deep)`} round={9} />
              <div className="flex-1">
                <div className="text-[13px] font-extrabold text-k-ink">{d.l}</div>
                <div className="mt-0.5 text-[11px] font-semibold text-k-sub">{d.m}</div>
              </div>
              {d.cur && <DesignChip tone="crimson" size="sm">{t('coursesOverview.desktop.vocabulary.current', { defaultValue: '当前' })}</DesignChip>}
              <span className="text-[18px] text-k-sub-light">›</span>
            </div>
          ))
        )}
      </DesktopCard>
    </div>
  );

  const right = (
    <div className="w-[320px] shrink-0 pl-[22px]">
      <DRail kanji="熱" title={t('coursesOverview.desktop.vocabulary.learningHeat', { defaultValue: '学习热度' })} pad={14}>
        <div className="mb-3 flex items-baseline gap-1.5">
          <span className="text-[32px] font-extrabold tracking-[-1px] text-k-ink">{masteredWords}</span>
          <span className="text-[11px] font-bold text-k-sub">{t('coursesOverview.desktop.vocabulary.mastered', { defaultValue: '已掌握' })}</span>
        </div>
        <div className="text-[12px] text-k-sub">
          {t('coursesOverview.desktop.vocabulary.forecastTotal', { count: totalWords, defaultValue: '总计 {{count}} 词' })} · {t('coursesOverview.desktop.vocabulary.toLearn', { defaultValue: '待学习' })} {totalWords - masteredWords}
        </div>
      </DRail>

      <DRail kanji="弱" title={t('coursesOverview.desktop.vocabulary.weakWords', { defaultValue: '薄弱词汇' })} action={`${t('coursesOverview.desktop.vocabulary.viewAll', { defaultValue: '查看全部' })} →`} onActionClick={() => navigate('/vocab-book')} pad={0}>
        {weakWords.length > 0 ? (
          weakWords.map((w, i, a) => (
            <div key={i} className="flex items-center gap-2.5 py-[7px]" style={{ borderBottom: i < a.length - 1 ? '1px solid var(--color-k-line)' : 'none' }}>
              <div className="flex-1">
                <div className="text-[13px] font-extrabold tracking-[-0.2px] text-k-ink">{w.word}</div>
                <div className="text-[10px] font-semibold text-k-sub">{i18n.language === 'zh' ? (w.meaningZh || w.meaning) : (w.meaningEn || w.meaning)}</div>
              </div>
              <DesignChip tone="pink" size="sm">
                {w.proficiency ? `${Math.round(w.proficiency * 100)}%` : '---'}
              </DesignChip>
            </div>
          ))
        ) : (
          <div className="py-8 text-center text-[12px] font-bold text-k-sub opacity-50">
            {t('coursesOverview.desktop.vocabulary.noWeakWords', { defaultValue: '暂无薄弱词汇' })}
          </div>
        )}
      </DRail>
    </div>
  );

  return (
    <div className="flex font-sans">
      <div className="flex-1">{content}</div>
      {right}
    </div>
  );
}
