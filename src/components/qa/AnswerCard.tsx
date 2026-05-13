import React, { useState } from 'react';
import type { JSONContent } from '@tiptap/core';
import { useTranslation } from 'react-i18next';
import { useMutation } from 'convex/react';
import { CheckCircle2, Flag, Loader2, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { QA_FORUM } from '../../utils/convexRefs';
import { VoteButton } from './VoteButton';
import type { QAAnswerDto } from '../../../convex/qaForum';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../ui';
import { notify } from '../../utils/notify';
import { QARichContent } from './QARichContent';
import { QARichTextEditor } from './QARichTextEditor';
import { ReportDialog } from './ReportDialog';
import { storedQAContentToEditorDoc, extractQAContentText, serializeQADoc } from './qaRichText';

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

interface AnswerCardProps {
  answer: QAAnswerDto;
  myVote?: number;
  isQuestionAuthor?: boolean;
  currentUserId?: string | null;
  onAuthorClick?: () => void;
  className?: string;
}

export function AnswerCard({
  answer,
  myVote = 0,
  isQuestionAuthor = false,
  currentUserId,
  onAuthorClick,
  className,
}: AnswerCardProps) {
  const { t } = useTranslation();
  const acceptAnswer = useMutation(QA_FORUM.acceptAnswer);
  const editAnswer = useMutation(QA_FORUM.editAnswer);
  const deleteAnswer = useMutation(QA_FORUM.deleteAnswer);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editorDoc, setEditorDoc] = useState<JSONContent>(() => storedQAContentToEditorDoc(answer.content));
  const isAnswerAuthor = currentUserId === answer.author._id;
  const plainText = extractQAContentText(serializeQADoc(editorDoc));

  const handleAccept = async () => {
    await acceptAnswer({ answerId: answer._id });
  };

  const handleEditSave = async () => {
    if (!plainText.trim() || isSaving) return;
    setIsSaving(true);
    try {
      await editAnswer({ answerId: answer._id, content: serializeQADoc(editorDoc) });
      setIsEditing(false);
    } catch {
      notify.error(t('common.error', { defaultValue: 'Something went wrong' }));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteAnswer({ answerId: answer._id });
      setShowDeleteDialog(false);
    } catch {
      notify.error(t('common.error', { defaultValue: 'Something went wrong' }));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div
        className={cn(
          'bg-k-card rounded-k-md p-5 border-l-4',
          answer.isAccepted ? 'border-l-[#2F5847]' : 'border-l-transparent',
          className
        )}
      >
        {answer.isAccepted && (
          <div className="flex items-center gap-1.5 mb-3 text-[12px] font-bold text-[#2F5847]">
            <CheckCircle2 size={14} />
            {t('qa.accepted', { defaultValue: 'Accepted' })}
          </div>
        )}

        <div className="flex gap-3">
          <VoteButton
            target="answer"
            targetId={answer._id}
            voteScore={answer.voteScore}
            myVote={myVote}
            size="sm"
            className="shrink-0"
          />

          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="mb-4">
                <QARichTextEditor
                  value={editorDoc}
                  onChange={setEditorDoc}
                  placeholder={t('qa.writeAnswer', { defaultValue: 'Write your answer...' })}
                />
                <div className="mt-3 flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => setIsEditing(false)}>
                    {t('qa.cancel', { defaultValue: 'Cancel' })}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void handleEditSave()}
                    disabled={!plainText.trim() || isSaving}
                    className="bg-k-crimson text-k-card hover:opacity-90"
                  >
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {t('qa.saveEdit', { defaultValue: 'Save changes' })}
                  </Button>
                </div>
              </div>
            ) : (
              <QARichContent content={answer.content} className="mb-4" />
            )}

            <div className="flex items-center gap-3 text-[11px] text-k-sub">
              <button
                type="button"
                onClick={onAuthorClick}
                aria-label={t('qa.openAuthorProfile', {
                  name: answer.author.name,
                  defaultValue: `View ${answer.author.name}'s profile`,
                })}
                className="flex items-center gap-1.5 rounded-full pr-1 transition-colors hover:text-k-ink"
              >
                <img
                  src={answer.author.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${answer.author.name}`}
                  alt=""
                  className="w-4 h-4 rounded-full"
                />
                <span className="font-medium text-k-ink2">{answer.author.name}</span>
              </button>
              <span>{formatRelativeTime(answer.createdAt)}</span>
              {answer.isEdited && !isEditing ? (
                <span className="italic">({t('qa.edited', { defaultValue: 'edited' })})</span>
              ) : null}

              <div className="ml-auto flex items-center gap-2">
                {isQuestionAuthor ? (
                  <button
                    type="button"
                    onClick={handleAccept}
                    className={cn(
                      'flex items-center gap-1 font-bold transition-colors',
                      answer.isAccepted
                        ? 'text-[#2F5847]'
                        : 'text-k-sub hover:text-[#2F5847]'
                    )}
                  >
                    <CheckCircle2 size={13} />
                    {answer.isAccepted
                      ? t('qa.unaccept', { defaultValue: 'Unaccept' })
                      : t('qa.accept', { defaultValue: 'Accept' })}
                  </button>
                ) : null}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label={t('common.more', { defaultValue: 'More actions' })}
                      className="rounded-full p-1.5 text-k-sub transition-colors hover:bg-k-bg2 hover:text-k-ink"
                    >
                      <MoreHorizontal size={14} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    unstyled
                    className="min-w-[168px] rounded-2xl border border-k-line bg-k-card p-1.5 shadow-k-shLg"
                  >
                    {isAnswerAuthor ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setIsEditing(true)}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] font-semibold text-k-ink hover:bg-k-bg2"
                        >
                          <Pencil size={14} />
                          {t('qa.editAnswer', { defaultValue: 'Edit answer' })}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowDeleteDialog(true)}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] font-semibold text-k-crimson hover:bg-k-bg2"
                        >
                          <Trash2 size={14} />
                          {t('qa.deleteAnswer', { defaultValue: 'Delete answer' })}
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
            </div>
          </div>
        </div>
      </div>
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="rounded-[28px] border border-k-line bg-k-card">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('qa.deleteAnswer', { defaultValue: 'Delete answer' })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('qa.deleteAnswerConfirm', {
                defaultValue: 'This answer will be removed from the thread.',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('qa.cancel', { defaultValue: 'Cancel' })}</AlertDialogCancel>
            <AlertDialogAction
              onClick={event => {
                event.preventDefault();
                void handleDelete();
              }}
              className="bg-k-crimson text-k-card hover:opacity-90"
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('qa.deleteAnswer', { defaultValue: 'Delete answer' })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ReportDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        target="answer"
        targetId={answer._id}
      />
    </>
  );
}
