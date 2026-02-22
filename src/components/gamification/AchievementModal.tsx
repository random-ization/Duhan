import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useMutation, useQuery } from 'convex/react';
import html2canvas from 'html2canvas';
import { Download, Trophy, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../../../convex/_generated/api';
import { Badge, Button, Card } from '../ui';

const tierClassMap = {
  BRONZE: 'bg-amber-300',
  SILVER: 'bg-gray-200',
  GOLD: 'bg-brand-yellow bg-[#FFDE59]',
  DIAMOND: 'bg-cyan-300',
} as const;

const categoryLabelMap = {
  TYPING: 'Typing Legend',
  VOCAB: 'Vocab Master',
  STREAK: 'Streak Keeper',
} as const;

export function AchievementModal() {
  const { t } = useTranslation();
  const pendingBadges = useQuery(api.achievements.getPendingBadges);
  const viewer = useQuery(api.users.viewer);
  const acknowledgeBadge = useMutation(api.achievements.acknowledgeBadge);
  const cardRef = useRef<HTMLDivElement>(null);
  const [closing, setClosing] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!pendingBadges || pendingBadges.length === 0) {
    return null;
  }

  const badge = pendingBadges[0];
  const tierClass = tierClassMap[badge.tier as keyof typeof tierClassMap] ?? 'bg-card';
  const categoryLabel =
    categoryLabelMap[badge.category as keyof typeof categoryLabelMap] ?? badge.category;
  const displayName = viewer?.name ?? 'Duhan Learner';
  const avatarUrl = viewer?.image ?? viewer?.avatar ?? null;

  const handleClose = async () => {
    if (closing || saving) {
      return;
    }
    setClosing(true);
    try {
      await acknowledgeBadge({ badgeId: badge._id });
    } finally {
      setClosing(false);
    }
  };

  const handleSaveImage = async () => {
    if (!cardRef.current || saving || closing) {
      return;
    }

    setSaving(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        useCORS: true,
        allowTaint: false,
        backgroundColor: null,
        scale: 2,
      });
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `duhan-achievement-${badge.category.toLowerCase()}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      await handleClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={badge._id}
        className="fixed inset-0 z-[60] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="flex flex-col items-center">
          <motion.div
            initial={{ y: 100, opacity: 0, rotate: -5 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: 80, opacity: 0, rotate: 4 }}
            transition={{ type: 'spring', bounce: 0.5, duration: 0.8 }}
            whileHover={{ y: -5, rotate: -2 }}
          >
            <Card
              ref={cardRef}
              className={`relative w-[360px] aspect-[3/4] ${tierClass} border-4 border-brand-dark border-black shadow-[8px_8px_0px_0px_#0F172A] rounded-[2rem] p-6 overflow-hidden`}
            >
              <div className="absolute -top-10 -right-10 h-28 w-28 rounded-full border-4 border-black bg-card/70" />
              <div className="absolute top-20 -left-10 h-20 w-20 rounded-full border-4 border-black bg-card/70" />

              <div className="relative z-10 flex h-full flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 rounded-2xl border-4 border-black bg-white overflow-hidden grid place-items-center">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                      ) : (
                        <span className="font-display text-lg font-black text-slate-900">
                          {displayName.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-heading text-xs font-black uppercase tracking-[0.15em] text-slate-700">
                        Achievement Unlocked
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
                    CATEGORY: {badge.category}
                  </p>
                </div>

                <div className="rounded-2xl border-4 border-black bg-card/90 p-4 shadow-[4px_4px_0px_0px_#0F172A]">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="font-heading text-[11px] font-black uppercase tracking-[0.2em] text-slate-700">
                        Duhan App
                      </p>
                      <p className="font-display text-sm font-black leading-tight text-slate-900">
                        {t('achievements.aiTutorTagline', { defaultValue: 'Your personal Korean AI tutor' })}
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

          <div className="mt-5 flex w-[360px] items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={closing || saving}
              className="flex-1 h-12 border-4 border-black bg-card text-slate-900 shadow-[5px_5px_0px_0px_#0F172A] font-heading font-black hover:translate-y-1 hover:shadow-none"
            >
              <X className="mr-2 h-4 w-4" />
              {t('common.close', { defaultValue: 'Close' })}
            </Button>
            <Button
              type="button"
              onClick={handleSaveImage}
              disabled={closing || saving}
              className="flex-1 h-12 border-4 border-black bg-brand-yellow bg-[#FFDE59] text-slate-900 shadow-[5px_5px_0px_0px_#0F172A] font-heading font-black hover:translate-y-1 hover:shadow-none"
            >
              <Download className="mr-2 h-4 w-4" />
              {t('achievements.saveReportImage', { defaultValue: 'Save report image' })}
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
