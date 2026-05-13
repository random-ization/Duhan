import { useState } from 'react';
import { useMutation } from 'convex/react';
import { Flag, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Textarea,
} from '../ui';
import { cn } from '../../lib/utils';
import { QA_REPORTS } from '../../utils/convexRefs';
import { notify } from '../../utils/notify';

const REPORT_REASONS = [
  { value: 'spam', labelKey: 'qa.reportReasonSpam', defaultLabel: 'Spam or ads' },
  { value: 'abuse', labelKey: 'qa.reportReasonAbuse', defaultLabel: 'Harassment or abuse' },
  {
    value: 'misinformation',
    labelKey: 'qa.reportReasonMisinformation',
    defaultLabel: 'Misinformation',
  },
  { value: 'other', labelKey: 'qa.reportReasonOther', defaultLabel: 'Other' },
] as const;

export type ReportTarget = 'question' | 'answer' | 'post' | 'comment';

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: ReportTarget;
  targetId: string;
}

export function ReportDialog({ open, onOpenChange, target, targetId }: ReportDialogProps) {
  const { t } = useTranslation();
  const reportContent = useMutation(QA_REPORTS.reportContent);
  const [reason, setReason] = useState<(typeof REPORT_REASONS)[number]['value'] | null>(null);
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await reportContent({
        target,
        targetId,
        reason,
        details: details.trim() || undefined,
      });
      notify.success(t('qa.reportSuccess', { defaultValue: 'Report submitted' }));
      setReason(null);
      setDetails('');
      onOpenChange(false);
    } catch {
      notify.error(t('qa.reportFailed', { defaultValue: 'Could not submit the report' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={nextOpen => {
        if (!nextOpen && !isSubmitting) {
          setReason(null);
          setDetails('');
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-w-lg rounded-[28px] border border-k-line bg-k-card p-0 shadow-k-shLg">
        <div className="p-6">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="flex items-center gap-2 text-[18px] font-extrabold text-k-ink">
              <Flag size={18} className="text-k-crimson" />
              {t('qa.reportTitle', { defaultValue: 'Report content' })}
            </DialogTitle>
            <DialogDescription className="text-[13px] leading-relaxed text-k-sub">
              {t('qa.reportDescription', {
                defaultValue: 'Tell us why this content should be reviewed by the moderation team.',
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 flex flex-wrap gap-2">
            {REPORT_REASONS.map(option => {
              const isActive = reason === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setReason(option.value)}
                  className={cn(
                    'rounded-full px-3 py-2 text-[12px] font-bold transition-colors',
                    isActive
                      ? 'bg-k-ink text-k-card'
                      : 'bg-k-bg2 text-k-sub hover:text-k-ink'
                  )}
                >
                  {t(option.labelKey, { defaultValue: option.defaultLabel })}
                </button>
              );
            })}
          </div>

          <div className="mt-4">
            <Textarea
              value={details}
              onChange={event => setDetails(event.target.value)}
              placeholder={t('qa.reportDetailsPlaceholder', {
                defaultValue: 'Additional context (optional)',
              })}
              rows={4}
              className="min-h-[112px] rounded-2xl border-k-line bg-k-bg2 text-[13px] text-k-ink"
            />
          </div>

          <DialogFooter className="mt-5 flex-row justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {t('qa.cancel', { defaultValue: 'Cancel' })}
            </Button>
            <Button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={!reason || isSubmitting}
              className="bg-k-crimson text-k-card hover:opacity-90"
            >
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('qa.submitReport', { defaultValue: 'Submit report' })}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
