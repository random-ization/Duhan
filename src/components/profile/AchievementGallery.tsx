import { useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '../../../convex/_generated/api';

/* ── Design dictionaries ─────────────────────────────── */

const TIER_COLORS: Record<string, string> = {
    GOLD: 'bg-brand-yellow',
    SILVER: 'bg-gray-200',
    BRONZE: 'bg-amber-300',
    DIAMOND: 'bg-cyan-300',
} as const;

const CATEGORY_ICONS: Record<string, string> = {
    TYPING: '⌨️',
    VOCAB: '🧠',
    STREAK: '🔥',
} as const;

const CATEGORY_LABELS: Record<string, string> = {
    TYPING: 'Typing Master',
    VOCAB: 'Vocab Master',
    STREAK: 'Streak Master',
} as const;

const DEFAULT_ICON = '🏆';
const DEFAULT_LABEL = 'All-around Champion';

/* ── Component ───────────────────────────────────────── */

export function AchievementGallery() {
    const { t } = useTranslation();
    const achievements = useQuery(api.achievements.getUserGallery, {});

    /* Loading state */
    if (achievements === undefined) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {['a', 'b', 'c', 'd'].map((id) => (
                    <div
                        key={`skeleton-${id}`}
                        className="h-40 animate-pulse rounded-2xl bg-muted border border-border"
                    />
                ))}
            </div>
        );
    }

    /* Empty state */
    if (achievements.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted py-12 px-6 text-center">
                <span className="text-5xl mb-3">🏅</span>
                <p className="text-sm font-bold text-muted-foreground">
                    {t('achievements.galleryEmpty', {
                        defaultValue: 'Complete typing or vocab practice to unlock your first badge!',
                    })}
                </p>
            </div>
        );
    }

    /* Gallery grid */
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {achievements.map((badge) => {
                const tierBg = TIER_COLORS[badge.tier] ?? 'bg-card';
                const icon = CATEGORY_ICONS[badge.category] ?? DEFAULT_ICON;
                const label = CATEGORY_LABELS[badge.category] ?? DEFAULT_LABEL;

                return (
                    <div
                        key={badge._id}
                        className={`${tierBg} border-4 border-brand-dark shadow-pop rounded-2xl relative overflow-hidden transition-all hover:-translate-y-1 hover:shadow-pop-hover`}
                    >
                        <div className="p-4 flex flex-col items-center justify-center text-center">
                            <span className="text-4xl mb-2">{icon}</span>
                            <p className="text-xl font-heading font-bold text-slate-900">
                                {badge.milestoneValue}
                            </p>
                            <p className="text-xs font-bold text-slate-700/70">{label}</p>
                            <p className="text-[10px] text-slate-700/50 mt-2">
                                {new Date(badge.unlockedAt).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
