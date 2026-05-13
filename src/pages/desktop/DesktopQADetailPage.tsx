import React, { useEffect, useMemo, useState } from 'react';
import type { JSONContent } from '@tiptap/core';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Eye, Flag, HelpCircle, Loader2, MessageCircle, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { QA_FORUM } from '../../utils/convexRefs';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { useAuth } from '../../contexts/AuthContext';
import { DesktopCard } from '../../components/desktop/ui/DesktopCard';
import { TopicChip } from '../../components/qa/TopicChip';
import { VoteButton } from '../../components/qa/VoteButton';
import { AnswerCard } from '../../components/qa/AnswerCard';
import { AnswerComposer } from '../../components/qa/AnswerComposer';
import { QARichContent } from '../../components/qa/QARichContent';
import { ReportDialog } from '../../components/qa/ReportDialog';
import { QARichTextEditor } from '../../components/qa/QARichTextEditor';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../../components/ui';
import type { Id } from '../../../convex/_generated/dataModel';
import { TopicSelect } from '../../components/qa/TopicSelect';
import {
  EMPTY_QA_DOC,
  extractQAContentText,
  serializeQADoc,
  storedQAContentToEditorDoc,
} from '../../components/qa/qaRichText';
import { notify } from '../../utils/notify';

function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay}d`;
  return `${Math.floor(diffDay / 30)}mo`;
}

export default function DesktopQADetailPage() {
  const { t } = useTranslation();
  const navigate = useLocalizedNavigate();
  const { questionId } = useParams<{ questionId: string }>();

  const { user } = useAuth();
  const [showQuestionEditor, setShowQuestionEditor] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);
  const [isDeletingQuestion, setIsDeletingQuestion] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editTopicSlug, setEditTopicSlug] = useState('general');
  const [editorDoc, setEditorDoc] = useState<JSONContent>(EMPTY_QA_DOC);

  const question = useQuery(
    QA_FORUM.getQuestion,
    questionId ? { questionId: questionId as Id<'qa_questions'> } : 'skip'
  );

  const voteTargetIds = useMemo(() => {
    if (!question) return [];
    return [question._id as string, ...question.answers.map(a => a._id as string)];
  }, [question]);

  const myVotes = useQuery(
    QA_FORUM.getMyVotes,
    voteTargetIds.length > 0 ? { targetIds: voteTargetIds } : 'skip'
  );

  const isQuestionAuthor = !!(user && question && question.author._id === user.id);

  const incrementView = useMutation(QA_FORUM.incrementViewCount);
  const editQuestion = useMutation(QA_FORUM.editQuestion);
  const deleteQuestion = useMutation(QA_FORUM.deleteQuestion);
  const questionPlainText = extractQAContentText(serializeQADoc(editorDoc));

  useEffect(() => {
    if (questionId) {
      void incrementView({ questionId: questionId as Id<'qa_questions'> });
    }
  }, [incrementView, questionId]);

  const openQuestionEditor = () => {
    if (!question) return;
    setEditTitle(question.title);
    setEditTopicSlug(question.topicSlug);
    setEditorDoc(storedQAContentToEditorDoc(question.content));
    setShowQuestionEditor(true);
  };

  const handleQuestionSave = async () => {
    if (!question || !questionPlainText.trim() || !editTitle.trim() || isSavingQuestion) return;
    setIsSavingQuestion(true);
    try {
      await editQuestion({
        questionId: question._id,
        title: editTitle.trim(),
        content: serializeQADoc(editorDoc),
        topicSlug: editTopicSlug,
      });
      setShowQuestionEditor(false);
    } catch {
      notify.error(t('common.error', { defaultValue: 'Something went wrong' }));
    } finally {
      setIsSavingQuestion(false);
    }
  };

  const handleQuestionDelete = async () => {
    if (!question || isDeletingQuestion) return;
    setIsDeletingQuestion(true);
    try {
      await deleteQuestion({ questionId: question._id });
      navigate('/community/qa');
    } catch {
      notify.error(t('common.error', { defaultValue: 'Something went wrong' }));
    } finally {
      setIsDeletingQuestion(false);
    }
  };

  if (!question && question !== null) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-k-sub" size={24} />
      </div>
    );
  }

  if (question === null) {
    return (
      <div className="max-w-[800px] mx-auto px-6 py-10 text-center">
        <HelpCircle size={40} className="mx-auto mb-3 text-k-sub opacity-40" />
        <p className="text-k-sub">Question not found</p>
        <button
          type="button"
          onClick={() => navigate('/community/qa')}
          className="mt-4 text-k-crimson font-bold text-[13px] hover:underline"
        >
          {t('qa.backToList', { defaultValue: 'Back to Q&A' })}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[800px] mx-auto px-6 py-6">
      {/* Back */}
      <button
        type="button"
        onClick={() => navigate('/community/qa')}
        className="inline-flex items-center gap-1.5 text-[13px] text-k-sub font-bold hover:text-k-ink mb-5 transition-colors"
      >
        <ArrowLeft size={14} />
        {t('qa.backToList', { defaultValue: 'Back to Q&A' })}
      </button>

      {/* Question */}
      <DesktopCard pad={24} className="mb-6">
        <div className="flex gap-4">
          <VoteButton
            target="question"
            targetId={question._id}
            voteScore={question.voteScore}
            myVote={myVotes?.[question._id] ?? 0}
            className="shrink-0 pt-1"
          />

          <div className="flex-1 min-w-0">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <TopicChip slug={question.topicSlug} size="md" />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label={t('common.more', { defaultValue: 'More actions' })}
                    className="rounded-full p-2 text-k-sub transition-colors hover:bg-k-bg2 hover:text-k-ink"
                  >
                    <MoreHorizontal size={16} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  unstyled
                  className="min-w-[180px] rounded-2xl border border-k-line bg-k-card p-1.5 shadow-k-shLg"
                >
                  {isQuestionAuthor ? (
                    <>
                      <button
                        type="button"
                        onClick={openQuestionEditor}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] font-semibold text-k-ink hover:bg-k-bg2"
                      >
                        <Pencil size={14} />
                        {t('qa.editQuestion', { defaultValue: 'Edit question' })}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDeleteDialog(true)}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] font-semibold text-k-crimson hover:bg-k-bg2"
                      >
                        <Trash2 size={14} />
                        {t('qa.deleteQuestion', { defaultValue: 'Delete question' })}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowReportDialog(true)}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] font-semibold text-k-ink hover:bg-k-bg2"
                    >
                      <Flag size={14} />
                      {t('qa.report', { defaultValue: 'Report' })}
                    </button>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <h1 className="text-[22px] font-extrabold text-k-ink leading-snug mb-4">
              {question.title}
            </h1>

            <QARichContent content={question.content} className="mb-5" />

            <div className="flex items-center gap-4 text-[11px] text-k-sub border-t border-k-line pt-4">
              <button
                type="button"
                onClick={() => navigate(`/community/u/${question.author._id}`)}
                aria-label={t('qa.openAuthorProfile', {
                  name: question.author.name,
                  defaultValue: `View ${question.author.name}'s profile`,
                })}
                className="flex items-center gap-1.5 rounded-full pr-1 transition-colors hover:text-k-ink"
              >
                <img
                  src={question.author.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${question.author.name}`}
                  alt=""
                  className="w-5 h-5 rounded-full"
                />
                <span className="font-medium text-k-ink2">{question.author.name}</span>
              </button>
              <span>{formatRelativeTime(question.createdAt)}</span>
              <div className="flex items-center gap-1">
                <Eye size={12} />
                <span>{question.viewCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle size={12} />
                <span>{question.answers.length}</span>
              </div>
            </div>
          </div>
        </div>
      </DesktopCard>

      {/* Answers header */}
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-[16px] font-extrabold text-k-ink">
          {question.answers.length === 0
            ? t('qa.answersZero', { defaultValue: 'No answers yet' })
            : t('qa.answers', { count: question.answers.length, defaultValue: `${question.answers.length} answers` })}
        </h2>
      </div>

      {/* Answers list */}
      {question.answers.length > 0 && (
        <div className="flex flex-col gap-3 mb-6">
          {question.answers.map(a => (
            <AnswerCard
              key={a._id}
              answer={a}
              myVote={myVotes?.[a._id] ?? 0}
              isQuestionAuthor={isQuestionAuthor}
              currentUserId={user?.id ?? null}
              onAuthorClick={() => navigate(`/community/u/${a.author._id}`)}
            />
          ))}
        </div>
      )}

      {/* Answer composer */}
      <AnswerComposer questionId={question._id} />

      <Dialog open={showQuestionEditor} onOpenChange={setShowQuestionEditor}>
        <DialogContent className="max-w-3xl rounded-[28px] border border-k-line bg-k-card p-0 shadow-k-shLg">
          <div className="p-6">
            <DialogHeader className="space-y-2 text-left">
              <DialogTitle>{t('qa.editQuestion', { defaultValue: 'Edit question' })}</DialogTitle>
              <DialogDescription>
                {t('qa.editQuestionDescription', {
                  defaultValue: 'Update the title, topic, and details for this question.',
                })}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-5 space-y-5">
              <div>
                <label className="mb-2 block text-[12px] font-bold uppercase tracking-wider text-k-sub">
                  {t('qa.questionTitle', { defaultValue: 'Question title' })}
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={event => setEditTitle(event.target.value)}
                  className="w-full rounded-2xl bg-k-bg2 px-4 py-3 text-[15px] text-k-ink outline-none focus:ring-2 focus:ring-k-crimson/20"
                />
              </div>
              <div>
                <label className="mb-2 block text-[12px] font-bold uppercase tracking-wider text-k-sub">
                  {t('qa.selectTopic', { defaultValue: 'Select a topic' })}
                </label>
                <TopicSelect value={editTopicSlug} onChange={setEditTopicSlug} />
              </div>
              <div>
                <label className="mb-2 block text-[12px] font-bold uppercase tracking-wider text-k-sub">
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
            </div>

            <DialogFooter className="mt-6 flex-row justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setShowQuestionEditor(false)}>
                {t('qa.cancel', { defaultValue: 'Cancel' })}
              </Button>
              <Button
                type="button"
                onClick={() => void handleQuestionSave()}
                disabled={!editTitle.trim() || !questionPlainText.trim() || isSavingQuestion}
                className="bg-k-crimson text-k-card hover:opacity-90"
              >
                {isSavingQuestion ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t('qa.saveEdit', { defaultValue: 'Save changes' })}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="rounded-[28px] border border-k-line bg-k-card">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('qa.deleteQuestion', { defaultValue: 'Delete question' })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('qa.deleteQuestionConfirm', {
                defaultValue: 'This will remove the full thread from the Q&A board.',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('qa.cancel', { defaultValue: 'Cancel' })}</AlertDialogCancel>
            <AlertDialogAction
              onClick={event => {
                event.preventDefault();
                void handleQuestionDelete();
              }}
              className="bg-k-crimson text-k-card hover:opacity-90"
            >
              {isDeletingQuestion ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('qa.deleteQuestion', { defaultValue: 'Delete question' })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ReportDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        target="question"
        targetId={question._id}
      />
    </div>
  );
}
