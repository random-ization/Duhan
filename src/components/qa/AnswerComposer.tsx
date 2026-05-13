import React, { useState } from 'react';
import type { JSONContent } from '@tiptap/core';
import { useTranslation } from 'react-i18next';
import { useMutation } from 'convex/react';
import { Send, Loader2 } from 'lucide-react';
import { QA_FORUM } from '../../utils/convexRefs';
import { notify } from '../../utils/notify';
import { cn } from '../../lib/utils';
import type { Id } from '../../../convex/_generated/dataModel';
import { EMPTY_QA_DOC, extractQAContentText, serializeQADoc } from './qaRichText';
import { QARichTextEditor } from './QARichTextEditor';

interface AnswerComposerProps {
  questionId: Id<'qa_questions'>;
  onSuccess?: () => void;
  className?: string;
}

export function AnswerComposer({ questionId, onSuccess, className }: AnswerComposerProps) {
  const { t } = useTranslation();
  const [editorDoc, setEditorDoc] = useState<JSONContent>(EMPTY_QA_DOC);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createAnswer = useMutation(QA_FORUM.createAnswer);
  const plainText = extractQAContentText(serializeQADoc(editorDoc));

  const handleSubmit = async () => {
    const trimmed = plainText.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createAnswer({ questionId, content: serializeQADoc(editorDoc) });
      setEditorDoc(EMPTY_QA_DOC);
      onSuccess?.();
    } catch {
      notify.error(t('common.error', { defaultValue: 'Something went wrong' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={cn('bg-k-card rounded-k-md p-4 shadow-k-shSm', className)}>
      <QARichTextEditor
        value={editorDoc}
        onChange={setEditorDoc}
        placeholder={t('qa.writeAnswer', { defaultValue: 'Write your answer...' })}
      />
      <div className="flex justify-end mt-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!plainText.trim() || isSubmitting}
          className={cn(
            'inline-flex items-center gap-2 px-5 py-2 rounded-full text-[13px] font-bold',
            'bg-k-crimson text-k-card transition-all duration-150',
            'hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed'
          )}
        >
          {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          {t('qa.submitAnswer', { defaultValue: 'Submit Answer' })}
        </button>
      </div>
    </div>
  );
}
