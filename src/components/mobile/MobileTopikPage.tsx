import React, { useEffect, useState } from 'react';
import { Clock, HelpCircle, PlayCircle, RotateCcw } from 'lucide-react';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { qRef, TOPIK } from '../../utils/convexRefs';
import { ExamAttempt, TopikExam } from '../../types';
import { appendReturnToPath, hasSafeReturnTo, resolveSafeReturnTo } from '../../utils/navigation';
import { safeGetLocalStorageItem, safeSetLocalStorageItem } from '../../utils/browserStorage';
import { formatTopikLabel } from '../../utils/topik';
import { KT, Chip, HanjaSeal, SectionHead, PageShell } from './ksoft/ksoft';

type FilterType = 'ALL' | 'READING' | 'LISTENING' | 'WRITING';
const ONE_DAY_MS = 86400000;

// exam type → K-Soft palette
const TYPE_STYLE: Record<
  FilterType,
  {
    bg: string;
    fg: string;
    hanja: string;
    label: string;
    chipTone: 'sky' | 'lilac' | 'pink' | 'muted';
  }
> = {
  ALL: { bg: KT.bg2, fg: KT.sub, hanja: '全', label: 'All', chipTone: 'muted' },
  READING: { bg: KT.sky, fg: KT.skyDeep, hanja: '讀', label: 'Read', chipTone: 'sky' },
  LISTENING: { bg: KT.lilac, fg: KT.lilacDeep, hanja: '聽', label: 'Listen', chipTone: 'lilac' },
  WRITING: { bg: KT.pink, fg: KT.pinkDeep, hanja: '述', label: 'Write', chipTone: 'pink' },
};

interface MobileTopikPageProps {
  onSelectExam: (examId: string) => void;
  topikExams: TopikExam[];
}

const MobileTopikPage: React.FC<MobileTopikPageProps> = ({ onSelectExam, topikExams }) => {
  const filterStorageKey = 'mobileTopikFilterType';
  const { user } = useAuth();
  const navigate = useLocalizedNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const [filterType, setFilterType] = useState<FilterType>(() => {
    if (globalThis.window === undefined) return 'ALL';
    const saved = safeGetLocalStorageItem(filterStorageKey);
    if (saved === 'READING' || saved === 'LISTENING' || saved === 'WRITING') return saved;
    return 'ALL';
  });

  useEffect(() => {
    if (globalThis.window === undefined) return;
    safeSetLocalStorageItem(filterStorageKey, filterType);
  }, [filterType]);

  const examAttempts = useQuery(
    qRef<{ limit?: number }, ExamAttempt[]>('user:getExamAttempts'),
    user ? {} : 'skip'
  );
  const examHistory = examAttempts ?? [];
  const upcomingExam = useQuery(TOPIK.getUpcoming, {});
  const [now] = useState(() => Date.now());

  const filteredExams = topikExams.filter(exam => filterType === 'ALL' || exam.type === filterType);
  const daysUntilUpcomingExam =
    typeof upcomingExam?.scheduledAt === 'number'
      ? Math.max(0, Math.ceil((upcomingExam.scheduledAt - now) / ONE_DAY_MS))
      : null;

  const totalAttempts = examHistory.length;
  const avgScore =
    totalAttempts > 0
      ? Math.round(
          examHistory.reduce((sum, a) => {
            const maxScore = a.maxScore || a.totalScore || 100;
            return sum + (maxScore > 0 ? ((a.score || 0) / maxScore) * 100 : 0);
          }, 0) / totalAttempts
        )
      : 0;
  const passCount = examHistory.filter(a => {
    const maxScore = a.maxScore || a.totalScore || 100;
    return maxScore > 0 && (a.score || 0) / maxScore >= 0.6;
  }).length;
  const passRate = totalAttempts > 0 ? Math.round((passCount / totalAttempts) * 100) : 0;

  const getBestScore = (examId: string) => {
    const attempts = examHistory.filter(a => a.examId === examId);
    if (attempts.length === 0) return null;
    return Math.max(
      ...attempts.map(a => {
        const maxScore = a.maxScore || a.totalScore || 100;
        return maxScore > 0 ? Math.round(((a.score || 0) / maxScore) * 100) : 0;
      })
    );
  };

  const handleBack = () => {
    const returnTo = searchParams.get('returnTo');
    if (hasSafeReturnTo(returnTo)) {
      navigate(resolveSafeReturnTo(returnTo, '/courses'));
      return;
    }
    navigate('/courses');
  };

  return (
    <PageShell>
      {/* ── Header ─────────────────────────────────── */}
      <div
        style={{
          padding: '14px 22px 20px',
          paddingTop: 'calc(env(safe-area-inset-top) + 14px)',
        }}
      >
        {/* back */}
        <button
          type="button"
          onClick={handleBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 16,
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            color: KT.sub,
            fontSize: 13,
            fontWeight: 600,
            fontFamily: KT.font,
          }}
        >
          ← {t('common.back', { defaultValue: 'Back' })}
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
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
              試驗 · TOPIK
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: KT.ink,
                letterSpacing: -0.6,
              }}
            >
              {t('dashboard.topik.examCenter', { defaultValue: 'Mock exam' })}
            </div>
            <div style={{ fontSize: 13, color: KT.sub, marginTop: 4 }}>
              {t('topik.mobileSubtitle', {
                defaultValue: 'Choose a mock exam and keep your timing sharp.',
              })}
            </div>
          </div>

          {/* history button */}
          <button
            type="button"
            onClick={() =>
              navigate(appendReturnToPath('/topik/history', searchParams.get('returnTo')))
            }
            aria-label={t('dashboard.topik.history', { defaultValue: 'History' })}
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              background: KT.card,
              border: `1px solid ${KT.line2}`,
              boxShadow: KT.shSm,
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              fontFamily: KT.serif,
              fontSize: 16,
              color: KT.crimson,
            }}
          >
            歷
          </button>
        </div>

        {/* upcoming exam banner */}
        {upcomingExam && (
          <div
            style={{
              marginTop: 16,
              borderRadius: 16,
              background: `linear-gradient(135deg, ${KT.indigo} 0%, #4A5A8A 100%)`,
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <HanjaSeal c="試" size={40} bg="rgba(255,255,255,0.15)" round={10} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.65)',
                  letterSpacing: 1,
                  marginBottom: 3,
                }}
              >
                {t('dashboard.topik.nextExam', { defaultValue: 'UPCOMING' })} ·{' '}
                {formatTopikLabel(upcomingExam.level)}
              </div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: '#fff',
                  lineHeight: 1.3,
                }}
              >
                {upcomingExam.title}
              </div>
            </div>
            <div
              style={{
                background: 'rgba(255,255,255,0.18)',
                borderRadius: 8,
                padding: '5px 10px',
                fontSize: 12,
                fontWeight: 800,
                color: '#fff',
                flexShrink: 0,
                fontFamily: KT.font,
              }}
            >
              {daysUntilUpcomingExam === null
                ? `R${upcomingExam.round}`
                : `D-${daysUntilUpcomingExam}`}
            </div>
          </div>
        )}
      </div>

      {/* ── Stats Row ───────────────────────────────── */}
      <div
        style={{
          padding: '0 18px 12px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 10,
        }}
      >
        {[
          {
            k: '均',
            label: t('dashboard.topik.avgScore', { defaultValue: 'Avg score' }),
            value: `${avgScore}`,
            color: KT.ink,
          },
          {
            k: '率',
            label: t('dashboard.topik.passRate', { defaultValue: 'Pass rate' }),
            value: `${passRate}%`,
            color: KT.mintDeep,
          },
          {
            k: '數',
            label: t('dashboard.topik.total', { defaultValue: 'Total exams' }),
            value: `${filteredExams.length}`,
            color: KT.ink,
          },
        ].map(s => (
          <div
            key={s.k}
            style={{
              background: KT.card,
              borderRadius: 16,
              boxShadow: KT.shSm,
              padding: '14px 10px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontFamily: KT.serif,
                fontSize: 14,
                color: KT.crimson,
                opacity: 0.8,
                marginBottom: 4,
              }}
            >
              {s.k}
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div
              style={{
                fontSize: 9,
                color: KT.sub,
                fontWeight: 600,
                marginTop: 2,
                fontFamily: KT.font,
              }}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter Tabs ─────────────────────────────── */}
      <div
        className="hide-scroll"
        style={{
          padding: '0 18px 14px',
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
        }}
      >
        {(['ALL', 'READING', 'LISTENING', 'WRITING'] as FilterType[]).map(ft => {
          const ts = TYPE_STYLE[ft];
          const isActive = filterType === ft;
          return (
            <button
              key={ft}
              type="button"
              onClick={() => setFilterType(ft)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '7px 14px',
                borderRadius: 999,
                background: isActive ? ts.bg : 'rgba(31,27,23,0.05)',
                color: isActive ? ts.fg : KT.sub,
                border: 'none',
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 800,
                fontFamily: KT.font,
                letterSpacing: 0.4,
                flexShrink: 0,
                transition: 'background 0.15s',
              }}
            >
              <span style={{ fontFamily: KT.serif, fontSize: 13, fontWeight: 500 }}>
                {ts.hanja}
              </span>
              {ts.label}
            </button>
          );
        })}
      </div>

      {/* ── Exam List ───────────────────────────────── */}
      <div style={{ padding: '0 18px 24px' }}>
        <SectionHead
          kanji="錄"
          title={t('dashboard.topik.availableExams', { defaultValue: 'Available exams' })}
        />

        {filteredExams.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: KT.sub }}>
            <div style={{ fontFamily: KT.serif, fontSize: 32, marginBottom: 8, opacity: 0.3 }}>
              無
            </div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              {t('topikLobby.noExams', { defaultValue: 'No exams available' })}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredExams.map(exam => {
            const bestScore = getBestScore(exam.id);
            const examType = (exam.type as FilterType) || 'READING';
            const ts = TYPE_STYLE[examType] ?? TYPE_STYLE.READING;

            return (
              <button
                key={exam.id}
                type="button"
                onClick={() => onSelectExam(exam.id)}
                style={{
                  width: '100%',
                  background: KT.card,
                  borderRadius: 20,
                  boxShadow: KT.sh,
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  textAlign: 'left',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {/* Hanja type badge */}
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    background: ts.bg,
                    color: ts.fg,
                    fontFamily: KT.serif,
                    fontSize: 20,
                    fontWeight: 500,
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  {ts.hanja}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 800,
                        color: KT.ink,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '70%',
                        display: 'block',
                      }}
                    >
                      {exam.title}
                    </span>
                    <Chip tone={ts.chipTone}>{ts.label}</Chip>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      fontSize: 10,
                      color: KT.sub,
                      fontWeight: 600,
                      fontFamily: KT.font,
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Clock size={10} />
                      {exam.timeLimit}m
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <HelpCircle size={10} />
                      {exam.questions?.length || 50}Q
                    </span>
                    {bestScore !== null && (
                      <span style={{ color: KT.mintDeep, fontWeight: 800 }}>최고 {bestScore}%</span>
                    )}
                  </div>
                </div>

                {/* Action */}
                {bestScore !== null ? (
                  <RotateCcw size={18} color={KT.sub} />
                ) : (
                  <PlayCircle size={26} color={KT.crimson} />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </PageShell>
  );
};

export default MobileTopikPage;
