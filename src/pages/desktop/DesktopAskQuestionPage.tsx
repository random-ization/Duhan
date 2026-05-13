import React, { useState } from 'react';
import type { JSONContent } from '@tiptap/core';
import { useMutation } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import { QA_FORUM } from '../../utils/convexRefs';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { DesktopCard } from '../../components/desktop/ui/DesktopCard';
import { TopicSelect } from '../../components/qa/TopicSelect';
import { notify } from '../../utils/notify';
import { cn } from '../../lib/utils';
import { EMPTY_QA_DOC, extractQAContentText, serializeQADoc } from '../../components/qa/qaRichText';
import { QARichTextEditor } from '../../components/qa/QARichTextEditor';

export default function DesktopAskQuestionPage() {
  const { t } = useTranslation();
  const navigate = useLocalizedNavigate();
  const [title, setTitle] = useState('');
  const [editorDoc, setEditorDoc] = useState<JSONContent>(EMPTY_QA_DOC);
  const [topicSlug, setTopicSlug] = useState('general');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createQuestion = useMutation(QA_FORUM.createQuestion);
  const plainText = extractQAContentText(serializeQADoc(editorDoc));

  const canSubmit = title.trim().length >= 5 && plainText.trim().length >= 10 && topicSlug;

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const questionId = await createQuestion({
        title: title.trim(),
        content: serializeQADoc(editorDoc),
        topicSlug,
      });
      navigate(`/community/qa/${questionId}`);
    } catch {
      notify.error(t('common.error', { defaultValue: 'Something went wrong' }));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-[700px] mx-auto px-6 py-6">
      <button
        type="button"
        onClick={() => navigate('/community/qa')}
        className="inline-flex items-center gap-1.5 text-[13px] text-k-sub font-bold hover:text-k-ink mb-5 transition-colors"
      >
        <ArrowLeft size={14} />
        {t('qa.backToList', { defaultValue: 'Back to Q&A' })}
      </button>

      <DesktopCard pad={28}>
        <h1 className="text-[20px] font-extrabold text-k-ink mb-6">
          {t('qa.askQuestion', { defaultValue: 'Ask a Question' })}
        </h1>

        {/* Topic */}
        <div className="mb-5">
          <label className="block text-[12px] font-bold text-k-sub uppercase tracking-wider mb-2">
            {t('qa.selectTopic', { defaultValue: 'Select a topic' })}
          </label>
          <TopicSelect value={topicSlug} onChange={setTopicSlug} />
        </div>

        {/* Title */}
        <div className="mb-5">
          <label className="block text-[12px] font-bold text-k-sub uppercase tracking-wider mb-2">
            {t('qa.questionTitle', { defaultValue: 'Question title' })}
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={t('qa.questionTitlePlaceholder', {
              defaultValue: 'What would you like to know about Korean?',
            })}
            className={cn(
              'w-full bg-k-bg2 rounded-xl px-4 py-3 text-[15px] text-k-ink',
              'placeholder:text-k-sub focus:outline-none focus:ring-2 focus:ring-k-crimson/30',
              'font-k-sans'
            )}
          />
        </div>

        {/* Content */}
        <div className="mb-6">
          <label className="block text-[12px] font-bold text-k-sub uppercase tracking-wider mb-2">
            {t('qa.questionContent', { defaultValue: 'Details' })}
          </label>
          <QARichTextEditor
            value={editorDoc}
            onChange={setEditorDoc}
            placeholder={t('qa.questionContentPlaceholder', {
              defaultValue: 'Describe your question in detail...',
            })}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/community/qa')}
            className="px-5 py-2.5 text-[13px] font-bold text-k-sub hover:text-k-ink transition-colors"
          >
            {t('qa.cancel', { defaultValue: 'Cancel' })}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            className={cn(
              'inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-[13px] font-bold',
              'bg-k-crimson text-k-card transition-all duration-150',
              'hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed'
            )}
          >
            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {t('qa.submit', { defaultValue: 'Submit' })}
          </button>
        </div>
      </DesktopCard>
    </div>
  );
}
