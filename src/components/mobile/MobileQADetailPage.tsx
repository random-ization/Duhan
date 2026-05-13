import React, { useEffect, useMemo, useState } from 'react';
import type { JSONContent } from '@tiptap/core';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Eye, Flag, HelpCircle, Loader2, MessageCircle, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { QA_FORUM } from '../../utils/convexRefs';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { useAuth } from '../../contexts/AuthContext';
import { PageShell, Card, KT } from './ksoft/ksoft';
import { TopicChip } from '../qa/TopicChip';
import { VoteButton } from '../qa/VoteButton';
import { AnswerCard } from '../qa/AnswerCard';
import { AnswerComposer } from '../qa/AnswerComposer';
import { QARichContent } from '../qa/QARichContent';
import { ReportDialog } from '../qa/ReportDialog';
import { QARichTextEditor } from '../qa/QARichTextEditor';
import type { Id } from '../../../convex/_generated/dataModel';
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
} from '../ui';
import { TopicSelect } from '../qa/TopicSelect';
import {
  EMPTY_QA_DOC,
  extractQAContentText,
  serializeQADoc,
  storedQAContentToEditorDoc,
} from '../qa/qaRichText';
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

export default function MobileQADetailPage() {
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
  }, [questionId, incrementView]);

  const openQuestionEditor = () => {
    if (!question) return;
    setEditTitle(question.title);
    setEditTopicSlug(question.topicSlug);
    setEditorDoc(storedQAContentToEditorDoc(question.content));
    setShowQuestionEditor(true);
  };

  const handleQuestionSave = async () => {
    if (!question || !editTitle.trim() || !questionPlainText.trim() || isSavingQuestion) return;
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
      <PageShell>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin" size={22} style={{ color: KT.sub }} />
        </div>
      </PageShell>
    );
  }

  if (question === null) {
    return (
      <PageShell>
        <div className="text-center py-16 px-6">
          <HelpCircle size={36} className="mx-auto mb-2" style={{ color: KT.sub, opacity: 0.4 }} />
          <p style={{ fontSize: 13, color: KT.sub }}>Question not found</p>
          <button
            type="button"
            onClick={() => navigate('/community/qa')}
            className="mt-3 font-bold text-[13px]"
            style={{ color: KT.crimson }}
          >
            {t('qa.backToList', { defaultValue: 'Back to Q&A' })}
          </button>
        </div>
      </PageShell>
    );
  }

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

        {/* Question */}
        <Card pad={20} className="mb-4">
          <div className="flex gap-3">
            <VoteButton
              target="question"
              targetId={question._id}
              voteScore={question.voteScore}
              myVote={myVotes?.[question._id] ?? 0}
              size="sm"
              className="shrink-0 pt-1"
            />

            <div className="flex-1 min-w-0">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <TopicChip slug={question.topicSlug} size="md" />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label={t('common.more', { defaultValue: 'More actions' })}
                      className="rounded-full p-1.5"
                      style={{ color: KT.sub, background: KT.bg2 }}
                    >
                      <MoreHorizontal size={14} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    unstyled
                    style={{
                      minWidth: 168,
                      borderRadius: 18,
                      border: `1px solid ${KT.line}`,
                      background: KT.card,
                      padding: 6,
                      boxShadow: '0 10px 36px rgba(31,27,23,0.18)',
                    }}
                  >
                    {isQuestionAuthor ? (
                      <>
                        <button
                          type="button"
                          onClick={openQuestionEditor}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] font-semibold"
                          style={{ color: KT.ink }}
                        >
                          <Pencil size={14} />
                          {t('qa.editQuestion', { defaultValue: 'Edit question' })}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowDeleteDialog(true)}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] font-semibold"
                          style={{ color: KT.crimson }}
                        >
                          <Trash2 size={14} />
                          {t('qa.deleteQuestion', { defaultValue: 'Delete question' })}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowReportDialog(true)}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] font-semibold"
                        style={{ color: KT.ink }}
                      >
                        <Flag size={14} />
                        {t('qa.report', { defaultValue: 'Report' })}
                      </button>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <h1 style={{ fontSize: 18, fontWeight: 800, color: KT.ink, lineHeight: 1.3, marginBottom: 10 }}>
                {question.title}
              </h1>

              <QARichContent content={question.content} className="mb-4" />

              <div
                className="flex items-center gap-3 pt-3"
                style={{ borderTop: `1px solid ${KT.line}`, fontSize: 11, color: KT.sub }}
              >
                <button
                  type="button"
                  onClick={() => navigate(`/community/u/${question.author._id}`)}
                  aria-label={t('qa.openAuthorProfile', {
                    name: question.author.name,
                    defaultValue: `View ${question.author.name}'s profile`,
                  })}
                  className="flex items-center gap-1.5"
                >
                  <img
                    src={question.author.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${question.author.name}`}
                    alt=""
                    className="w-4 h-4 rounded-full"
                  />
                  <span style={{ fontWeight: 600, color: KT.ink2 }}>{question.author.name}</span>
                </button>
                <span>{formatRelativeTime(question.createdAt)}</span>
                <div className="flex items-center gap-1">
                  <Eye size={11} />
                  <span>{question.viewCount}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageCircle size={11} />
                  <span>{question.answers.length}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Answers header */}
        <div className="mb-3">
          <span style={{ fontSize: 14, fontWeight: 800, color: KT.ink }}>
            {question.answers.length === 0
              ? t('qa.answersZero', { defaultValue: 'No answers yet' })
              : t('qa.answers', { count: question.answers.length, defaultValue: `${question.answers.length} answers` })}
          </span>
        </div>

        {/* Answers */}
        {question.answers.length > 0 && (
          <div className="flex flex-col gap-3 mb-4">
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

      {/* Composer */}
      <AnswerComposer questionId={question._id} />

      <Dialog open={showQuestionEditor} onOpenChange={setShowQuestionEditor}>
        <DialogContent className="max-w-[min(100vw-24px,720px)] rounded-[28px] border border-k-line bg-k-card p-0">
          <div className="p-5">
            <DialogHeader className="space-y-2 text-left">
              <DialogTitle>{t('qa.editQuestion', { defaultValue: 'Edit question' })}</DialogTitle>
              <DialogDescription>
                {t('qa.editQuestionDescription', {
                  defaultValue: 'Update the title, topic, and details for this question.',
                })}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              <input
                type="text"
                value={editTitle}
                onChange={event => setEditTitle(event.target.value)}
                className="w-full rounded-2xl border-none px-4 py-3 outline-none"
                style={{ background: KT.bg2, color: KT.ink, fontSize: 14 }}
              />
              <div className="overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
                <TopicSelect value={editTopicSlug} onChange={setEditTopicSlug} className="flex-nowrap" />
              </div>
              <QARichTextEditor
                value={editorDoc}
                onChange={setEditorDoc}
                placeholder={t('qa.questionContentPlaceholder', {
                  defaultValue: 'Describe your question in detail...',
                })}
              />
            </div>
            <DialogFooter className="mt-5 flex-row justify-end gap-2">
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
    </PageShell>
  );
}
