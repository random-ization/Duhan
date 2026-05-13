import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { Plus, Loader2, HelpCircle } from 'lucide-react';
import { QA_FORUM } from '../../utils/convexRefs';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { PageShell, Card, KT } from './ksoft/ksoft';
import { QuestionCard } from '../qa/QuestionCard';
import { TopicFilter } from '../qa/TopicFilter';
import { QASortDropdown, type SortOption } from '../qa/QASortDropdown';
import { SearchBar } from '../qa/SearchBar';
import { cn } from '../../lib/utils';

export default function MobileQAListPage() {
  const { t } = useTranslation();
  const navigate = useLocalizedNavigate();
  const [topicSlug, setTopicSlug] = useState<string | null>(null);
  const [sort, setSort] = useState<SortOption>('recent');
  const [searchQuery, setSearchQuery] = useState('');

  const isSearching = searchQuery.length >= 2;

  const listResults = useQuery(
    QA_FORUM.listQuestions,
    !isSearching ? { topicSlug: topicSlug || undefined, sort, limit: 20 } : 'skip'
  );

  const searchResults = useQuery(
    QA_FORUM.searchQuestions,
    isSearching ? { searchQuery, topicSlug: topicSlug || undefined, limit: 20 } : 'skip'
  );

  const questions = isSearching ? searchResults : listResults;

  return (
    <PageShell>
      <div style={{ padding: '14px 16px 20px', paddingTop: 'calc(env(safe-area-inset-top) + 14px)' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 style={{ fontSize: 22, fontWeight: 800, color: KT.ink, letterSpacing: -0.5 }}>
            {t('qa.title', { defaultValue: 'Q&A' })}
          </h1>
          <button
            type="button"
            onClick={() => navigate('/community/qa/ask')}
            className={cn(
              'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full',
              'text-[12px] font-bold'
            )}
            style={{ background: KT.crimson, color: KT.card }}
          >
            <Plus size={13} />
            {t('qa.askQuestion', { defaultValue: 'Ask' })}
          </button>
        </div>

        {/* Search */}
        <SearchBar value={searchQuery} onChange={setSearchQuery} className="mb-3" />

        {/* Sort */}
        {!isSearching && <QASortDropdown value={sort} onChange={setSort} className="mb-3" />}

        {/* Topics */}
        <div className="overflow-x-auto pb-2 -mx-4 px-4 mb-4" style={{ scrollbarWidth: 'none' }}>
          <TopicFilter value={topicSlug} onChange={setTopicSlug} className="flex-nowrap" />
        </div>

        {/* Questions */}
        {!questions ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin" size={22} style={{ color: KT.sub }} />
          </div>
        ) : questions.length === 0 ? (
          <Card pad={24} className="text-center">
            <HelpCircle size={36} className="mx-auto mb-2" style={{ color: KT.sub, opacity: 0.4 }} />
            <p style={{ fontSize: 13, color: KT.sub }}>
              {t('qa.noQuestions', { defaultValue: 'No questions yet. Be the first to ask!' })}
            </p>
          </Card>
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
    </PageShell>
  );
}
