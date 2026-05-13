import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { Plus, Loader2, HelpCircle } from 'lucide-react';
import { QA_FORUM } from '../../utils/convexRefs';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { DesktopCard } from '../../components/desktop/ui/DesktopCard';
import { DRail } from '../../components/desktop/ui/DRail';
import { QuestionCard } from '../../components/qa/QuestionCard';
import { TopicFilter } from '../../components/qa/TopicFilter';
import { QASortDropdown, type SortOption } from '../../components/qa/QASortDropdown';
import { SearchBar } from '../../components/qa/SearchBar';
import { cn } from '../../lib/utils';

export default function DesktopQAListPage() {
  const { t } = useTranslation();
  const navigate = useLocalizedNavigate();
  const [topicSlug, setTopicSlug] = useState<string | null>(null);
  const [sort, setSort] = useState<SortOption>('recent');
  const [searchQuery, setSearchQuery] = useState('');

  const isSearching = searchQuery.length >= 2;

  const listResults = useQuery(
    QA_FORUM.listQuestions,
    !isSearching ? { topicSlug: topicSlug || undefined, sort, limit: 30 } : 'skip'
  );

  const searchResults = useQuery(
    QA_FORUM.searchQuestions,
    isSearching ? { searchQuery, topicSlug: topicSlug || undefined, limit: 30 } : 'skip'
  );

  const questions = isSearching ? searchResults : listResults;

  return (
    <div className="flex gap-6 max-w-[1200px] mx-auto px-6 py-6">
      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <HelpCircle size={20} className="text-k-crimson" />
            <h1 className="text-[20px] font-extrabold text-k-ink tracking-tight">
              {t('qa.title', { defaultValue: 'Q&A' })}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => navigate('/community/qa/ask')}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2.5 rounded-full',
              'bg-k-crimson text-k-card text-[13px] font-bold',
              'hover:opacity-90 transition-opacity shadow-k-shSm'
            )}
          >
            <Plus size={14} />
            {t('qa.askQuestion', { defaultValue: 'Ask a Question' })}
          </button>
        </div>

        {/* Search + Sort */}
        <div className="flex items-center gap-3 mb-5">
          <SearchBar value={searchQuery} onChange={setSearchQuery} className="flex-1" />
          {!isSearching && <QASortDropdown value={sort} onChange={setSort} />}
        </div>

        <TopicFilter value={topicSlug} onChange={setTopicSlug} className="mb-5" />

        {/* Question list */}
        {!questions ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-k-sub" size={24} />
          </div>
        ) : questions.length === 0 ? (
          <DesktopCard className="text-center py-16">
            <HelpCircle size={40} className="mx-auto mb-3 text-k-sub opacity-40" />
            <p className="text-[14px] text-k-sub">
              {t('qa.noQuestions', { defaultValue: 'No questions yet. Be the first to ask!' })}
            </p>
          </DesktopCard>
        ) : (
          <div className="flex flex-col gap-3">
            {questions.map(q => (
              <QuestionCard
                key={q._id}
                question={q}
                onClick={() => navigate(`/community/qa/${q._id}`)}
                onAuthorClick={() => navigate(`/community/u/${q.author._id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Right sidebar */}
      <div className="w-[280px] flex-shrink-0 hidden lg:block">
        <DRail kanji="問" title={t('qa.title', { defaultValue: 'Q&A' })}>
          <DesktopCard pad={16} className="text-[12px] text-k-sub leading-relaxed">
            <p className="mb-2 font-bold text-k-ink text-[13px]">
              {t('qa.askQuestion', { defaultValue: 'Ask a Question' })}
            </p>
            <p>
              {t('qa.sidebarHint', {
                defaultValue: 'Share your Korean learning questions and help fellow learners by answering theirs.',
              })}
            </p>
          </DesktopCard>
        </DRail>
      </div>
    </div>
  );
}
