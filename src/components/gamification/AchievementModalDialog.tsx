import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, m as motion } from 'framer-motion';
import { useMutation, useQuery } from 'convex/react';
import { Download, Trophy, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Doc } from '../../../convex/_generated/dataModel';
import { api } from '../../../convex/_generated/api';
import { Badge, Button, Card, Dialog, DialogContent, DialogOverlay, DialogPortal } from '../ui';
import { logger } from '../../utils/logger';
import { notify } from '../../utils/notify';

type PendingBadge = Doc<'user_badges'>;
type SharePayload = {
  files?: File[];
  text?: string;
  title?: string;
  url?: string;
};
type ShareCapableNavigator = Navigator & {
  canShare?: (data?: SharePayload) => boolean;
};

function supportsNativeShare(): boolean {
  return (
    typeof globalThis.navigator !== 'undefined' && typeof globalThis.navigator.share === 'function'
  );
}

const REPORT_EXPORT_TIMEOUT_MS = 8000;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(message));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

async function renderBadgeCanvas(element: HTMLElement): Promise<HTMLCanvasElement> {
  const { default: html2canvas } = await import('html2canvas');
  return await html2canvas(element, {
    useCORS: true,
    allowTaint: false,
    backgroundColor: null,
    scale: 2,
  });
}

async function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  if (typeof canvas.toBlob === 'function') {
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) {
          resolve(blob);
          return;
        }
        reject(new Error('Canvas export returned an empty blob.'));
      }, 'image/png');
    });
  }

  const dataUrl = canvas.toDataURL('image/png');
  const response = await fetch(dataUrl);
  return await response.blob();
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function isAbortError(error: unknown): boolean {
  return (error instanceof DOMException || error instanceof Error) && error.name === 'AbortError';
}

function getTierClass(tier: PendingBadge['tier']): string {
  switch (tier) {
    case 'BRONZE':
      return 'bg-amber-300';
    case 'SILVER':
      return 'bg-gray-200';
    case 'GOLD':
      return 'bg-brand-yellow bg-[#FFDE59]';
    case 'DIAMOND':
      return 'bg-cyan-300';
    default:
      return 'bg-card';
  }
}

function getCategoryLabelKey(category: PendingBadge['category']): string | null {
  switch (category) {
    case 'TYPING':
      return 'achievements.categoryLabels.TYPING';
    case 'VOCAB':
      return 'achievements.categoryLabels.VOCAB';
    case 'STREAK':
      return 'achievements.categoryLabels.STREAK';
    default:
      return null;
  }
}

type AchievementModalDialogProps = {
  readonly badge: PendingBadge;
};

export function AchievementModalDialog({ badge }: Readonly<AchievementModalDialogProps>) {
  const { t } = useTranslation();
  const viewer = useQuery(api.users.viewer);
  const acknowledgeBadge = useMutation(api.achievements.acknowledgeBadge);
  const cardRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(true);
  const [closing, setClosing] = useState(false);
  const [saving, setSaving] = useState(false);

  const tierClass = getTierClass(badge.tier);
  const categoryLabelKey = getCategoryLabelKey(badge.category);
  const categoryLabel = categoryLabelKey
    ? t(categoryLabelKey, { defaultValue: badge.category })
    : badge.category;
  const displayName =
    viewer?.name ?? t('achievements.defaultLearner', { defaultValue: 'DuHan Learner' });
  const avatarUrl = viewer?.image ?? viewer?.avatar ?? null;
  const shareSupported = useMemo(() => supportsNativeShare(), []);
  const primaryActionLabel = shareSupported
    ? t('achievements.shareReportImage', { defaultValue: 'Share report image' })
    : t('achievements.saveReportImage', { defaultValue: 'Save report image' });

  const dismissBadge = () => {
    if (closing) {
      return;
    }

    setIsOpen(false);
    setClosing(true);
    void acknowledgeBadge({ badgeId: badge._id })
      .catch(error => {
        logger.error('Failed to acknowledge achievement badge', error);
      })
      .finally(() => {
        setClosing(false);
      });
  };

  const handleClose = () => {
    dismissBadge();
  };

  const handlePrimaryAction = async () => {
    if (!cardRef.current || saving || closing) {
      return;
    }

    setSaving(true);

    try {
      const canvas = await withTimeout(
        renderBadgeCanvas(cardRef.current),
        REPORT_EXPORT_TIMEOUT_MS,
        'Achievement report export timed out.'
      );
      const blob = await withTimeout(
        canvasToPngBlob(canvas),
        REPORT_EXPORT_TIMEOUT_MS,
        'Achievement report image conversion timed out.'
      );
      const filename = `duhan-achievement-${badge.category.toLowerCase()}-${Date.now()}.png`;
      const navigatorWithShare = globalThis.navigator as ShareCapableNavigator;
      const shareData: SharePayload = {
        title: t('achievements.achievementUnlocked', {
          defaultValue: 'Achievement Unlocked',
        }),
        text: `${displayName} · ${categoryLabel} ${badge.milestoneValue}`,
        files: [new File([blob], filename, { type: 'image/png' })],
      };

      if (
        typeof navigatorWithShare.share === 'function' &&
        (typeof navigatorWithShare.canShare !== 'function' ||
          navigatorWithShare.canShare(shareData))
      ) {
        try {
          await navigatorWithShare.share(shareData);
          dismissBadge();
          return;
        } catch (error) {
          if (isAbortError(error)) {
            return;
          }
          logger.error('Native achievement share failed, falling back to download', error);
        }
      }

      downloadBlob(blob, filename);
      dismissBadge();
    } catch (error) {
      logger.error('Failed to export achievement report image', error);
      notify.error(
        t('achievements.reportImageActionFailed', {
          defaultValue: 'Unable to share or save this report image right now.',
        })
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && handleClose()}>
      <DialogPortal>
        <DialogOverlay unstyled className="fixed inset-0 z-[60] bg-slate-950/70 backdrop-blur-md" />
        <DialogContent
          unstyled
          className="fixed inset-0 z-[61] flex items-center justify-center p-4 pointer-events-none"
        >
          <AnimatePresence mode="wait">
            <div className="flex flex-col items-center pointer-events-auto">
              <motion.div
                initial={{ y: 100, opacity: 0, rotate: -5 }}
                animate={{ y: 0, opacity: 1, rotate: 0 }}
                exit={{ y: 80, opacity: 0, rotate: 4 }}
                transition={{ type: 'spring', bounce: 0.5, duration: 0.8 }}
                whileHover={{ y: -5, rotate: -2 }}
              >
                <Card
                  ref={cardRef}
                  className={`relative w-[min(360px,calc(100vw-2.5rem))] aspect-[3/4] ${tierClass} border-4 border-black shadow-[8px_8px_0px_0px_#0F172A] rounded-[2rem] p-6 overflow-hidden`}
                >
                  <div className="absolute -top-10 -right-10 h-28 w-28 rounded-full border-4 border-black bg-card/70" />
                  <div className="absolute top-20 -left-10 h-20 w-20 rounded-full border-4 border-black bg-card/70" />

                  <div className="relative z-10 flex h-full flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-14 w-14 rounded-2xl border-4 border-black bg-white overflow-hidden grid place-items-center">
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt={displayName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="font-display text-lg font-black text-slate-900">
                              {displayName.slice(0, 1).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-heading text-xs font-black uppercase tracking-[0.15em] text-slate-700">
                            {t('achievements.achievementUnlocked', {
                              defaultValue: 'Achievement Unlocked',
                            })}
                          </p>
                          <p className="font-display text-xl font-black leading-none text-slate-900">
                            {displayName}
                          </p>
                        </div>
                      </div>
                      <Badge className="border-2 border-black bg-card px-3 py-1 text-xs font-black text-slate-900 shadow-[3px_3px_0px_0px_#0F172A]">
                        {badge.tier}
                      </Badge>
                    </div>

                    <div className="text-center">
                      <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-2xl border-4 border-black bg-card">
                        <Trophy className="h-9 w-9 text-slate-900" />
                      </div>
                      <p className="font-heading text-sm font-black uppercase tracking-[0.2em] text-slate-700">
                        {categoryLabel}
                      </p>
                      <p className="font-display text-8xl font-black leading-none text-slate-900">
                        {badge.milestoneValue}
                      </p>
                      <p className="font-heading mt-1 text-sm font-bold text-slate-700">
                        {t('achievements.categoryLabel', { defaultValue: 'Category' })}:{' '}
                        {badge.category}
                      </p>
                    </div>

                    <div className="rounded-2xl border-4 border-black bg-card/90 p-4 shadow-[4px_4px_0px_0px_#0F172A]">
                      <div className="flex items-end justify-between gap-3">
                        <div>
                          <p className="font-heading text-[11px] font-black uppercase tracking-[0.2em] text-slate-700">
                            {t('achievements.appName', { defaultValue: 'DuHan App' })}
                          </p>
                          <p className="font-display text-sm font-black leading-tight text-slate-900">
                            {t('achievements.aiTutorTagline', {
                              defaultValue: 'Your personal Korean AI tutor',
                            })}
                          </p>
                        </div>
                        <div className="h-16 w-16 rounded-lg border-4 border-black bg-white p-1.5">
                          <div className="grid h-full w-full grid-cols-4 gap-0.5">
                            {Array.from({ length: 16 }).map((_, idx) => (
                              <span
                                key={`qr-dot-${idx}`}
                                className={`${idx % 2 === 0 ? 'bg-black' : 'bg-transparent'} rounded-[2px]`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>

              <div className="mt-5 flex w-[min(360px,calc(100vw-2.5rem))] items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={closing}
                  className="flex-1 h-12 border-4 border-black bg-card text-slate-900 shadow-[5px_5px_0px_0px_#0F172A] font-heading font-black hover:translate-y-1 hover:shadow-none"
                >
                  <X className="mr-2 h-4 w-4" />
                  {t('common.close', { defaultValue: 'Close' })}
                </Button>
                <Button
                  type="button"
                  onClick={() => void handlePrimaryAction()}
                  disabled={closing || saving}
                  className="flex-1 h-12 border-4 border-black bg-brand-yellow bg-[#FFDE59] text-slate-900 shadow-[5px_5px_0px_0px_#0F172A] font-heading font-black hover:translate-y-1 hover:shadow-none"
                >
                  <Download className="mr-2 h-4 w-4" />
                  {primaryActionLabel}
                </Button>
              </div>
            </div>
          </AnimatePresence>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
