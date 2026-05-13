import React, { useState } from 'react';
import type { JSONContent } from '@tiptap/core';
import { useMutation } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import { QA_FORUM } from '../../utils/convexRefs';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { PageShell, Card, KT } from './ksoft/ksoft';
import { TopicSelect } from '../qa/TopicSelect';
import { notify } from '../../utils/notify';
import { cn } from '../../lib/utils';
import { EMPTY_QA_DOC, extractQAContentText, serializeQADoc } from '../qa/qaRichText';
import { QARichTextEditor } from '../qa/QARichTextEditor';

export default function MobileAskQuestionPage() {
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
    <PageShell>
      <div style={{ padding: '14px 16px 20px', paddingTop: 'calc(env(safe-area-inset-top) + 14px)' }}>
        {/* Back */}
        <button
          type="button"
          onClick={() => navigate('/community/qa')}
          className="inline-flex items-center gap-1 mb-4"
          style={{ fontSize: 13, fontWeight: 700, color: KT.sub }}
        >
          <ArrowLeft size={14} />
          {t('qa.backToList', { defaultValue: 'Back' })}
        </button>

        <Card pad={20}>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: KT.ink, marginBottom: 16 }}>
            {t('qa.askQuestion', { defaultValue: 'Ask a Question' })}
          </h1>

          {/* Topic */}
          <div className="mb-4">
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: KT.sub, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>
              {t('qa.selectTopic', { defaultValue: 'Select a topic' })}
            </label>
            <div className="overflow-x-auto pb-1 -mx-2 px-2" style={{ scrollbarWidth: 'none' }}>
              <TopicSelect value={topicSlug} onChange={setTopicSlug} className="flex-nowrap" />
            </div>
          </div>

          {/* Title */}
          <div className="mb-4">
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: KT.sub, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>
              {t('qa.questionTitle', { defaultValue: 'Question title' })}
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={t('qa.questionTitlePlaceholder', {
                defaultValue: 'What would you like to know about Korean?',
              })}
              style={{
                width: '100%',
                background: KT.bg2,
                borderRadius: 14,
                padding: '12px 14px',
                fontSize: 14,
                color: KT.ink,
                border: 'none',
                outline: 'none',
                fontFamily: KT.font,
              }}
            />
          </div>

          {/* Content */}
          <div className="mb-5">
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: KT.sub, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>
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
              style={{ fontSize: 13, fontWeight: 700, color: KT.sub, background: 'none', border: 'none', padding: '8px 0' }}
            >
              {t('qa.cancel', { defaultValue: 'Cancel' })}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              className={cn(
                'inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-bold',
                'transition-all duration-150',
                'disabled:opacity-40 disabled:cursor-not-allowed'
              )}
              style={{ background: KT.crimson, color: KT.card }}
            >
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {t('qa.submit', { defaultValue: 'Submit' })}
            </button>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
