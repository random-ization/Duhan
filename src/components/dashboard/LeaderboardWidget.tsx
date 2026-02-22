import { useQuery } from 'convex/react';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { api } from '../../../convex/_generated/api';
import { Skeleton } from '../ui/skeleton';

/* ── Framer Motion variants ──────────────────────────── */

const listVariants: Variants = {
    hidden: {},
    visible: {
        transition: { staggerChildren: 0.06 },
    },
};

const itemVariants: Variants = {
    hidden: { x: -20, opacity: 0 },
    visible: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 260, damping: 20 } },
};

/* ── Rank styling helpers ────────────────────────────── */

function getRankDisplay(rank: number) {
    if (rank === 1) return '👑';
    return String(rank);
}

function getRowBg(rank: number) {
    if (rank === 1) return 'bg-brand-yellow';
    if (rank === 2) return 'bg-gray-200 dark:bg-gray-700';
    if (rank === 3) return 'bg-orange-200 dark:bg-orange-900/40';
    return 'bg-white dark:bg-card';
}

/* ── Component ───────────────────────────────────────── */

interface LeaderboardWidgetProps {
    className?: string;
}

export function LeaderboardWidget({ className = '' }: LeaderboardWidgetProps) {
    const { t } = useTranslation();
    const leaderboard = useQuery(api.xp.getWeeklyLeaderboard, { limit: 10 });
    const viewer = useQuery(api.users.viewer);

    /* ── Loading skeleton ───────────────────────────────── */
    if (leaderboard === undefined) {
        return (
            <div
                className={`bg-white dark:bg-card border-4 border-brand-dark shadow-pop-card rounded-[2rem] p-6 flex flex-col ${className}`}
            >
                <div className="flex items-center gap-2 mb-5">
                    <span className="text-2xl">🔥</span>
                    <Skeleton className="h-7 w-32" />
                </div>
                <div className="space-y-3">
                    {['a', 'b', 'c', 'd', 'e', 'f'].map((id) => (
                        <Skeleton key={`lb-skel-${id}`} className="h-12 w-full rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    /* ── Empty state ────────────────────────────────────── */
    if (leaderboard.length === 0) {
        return (
            <div
                className={`bg-white dark:bg-card border-4 border-brand-dark shadow-pop-card rounded-[2rem] p-6 flex flex-col ${className}`}
            >
                <div className="flex items-center gap-2 mb-5">
                    <span className="text-2xl">🔥</span>
                    <h3 className="font-heading font-black text-2xl text-foreground">
                        {t('leaderboard.weeklyTitle', { defaultValue: 'Weekly leaderboard' })}
                    </h3>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                    <span className="text-4xl mb-3">🏆</span>
                    <p className="text-sm font-bold text-muted-foreground">
                        {t('leaderboard.empty', { defaultValue: 'No one is ranked yet. Be the first!' })}
                    </p>
                </div>
            </div>
        );
    }

    const viewerId = viewer?._id;

    /* ── Populated list ─────────────────────────────────── */
    return (
        <div
            className={`bg-white dark:bg-card border-4 border-brand-dark shadow-pop-card rounded-[2rem] p-6 flex flex-col h-full ${className}`}
        >
            {/* Header */}
            <div className="flex items-center gap-2 mb-5">
                <span className="text-2xl">🔥</span>
                <h3 className="font-heading font-black text-2xl text-foreground">
                    {t('leaderboard.weeklyTitle', { defaultValue: 'Weekly leaderboard' })}
                </h3>
            </div>

            {/* List */}
            <motion.ul
                className="flex-1 flex flex-col gap-1"
                variants={listVariants}
                initial="hidden"
                animate="visible"
            >
                {leaderboard.map((entry, idx) => {
                    const rank = idx + 1;
                    const isMe = viewerId != null && entry.userId === viewerId;
                    const isTop3 = rank <= 3;
                    const rowBg = getRowBg(rank);

                    /* Row class composition */
                    const rowClass = [
                        'flex justify-between items-center px-4 py-3 rounded-xl transition-all',
                        rowBg,
                        isTop3 ? '' : 'border-b-2 border-brand-dark last:border-b-0',
                        isMe ? 'border-4 border-brand-dark shadow-pop-sm ring-2 ring-brand-purple/30' : '',
                    ]
                        .filter(Boolean)
                        .join(' ');

                    return (
                        <motion.li key={entry.userId} variants={itemVariants} className={rowClass}>
                            {/* Left: rank + avatar + name */}
                            <div className="flex items-center gap-3 min-w-0">
                                <span
                                    className={`w-7 text-center font-display font-black text-lg ${rank === 1 ? 'text-2xl' : 'text-brand-dark dark:text-foreground'
                                        }`}
                                >
                                    {getRankDisplay(rank)}
                                </span>

                                {/* Avatar circle */}
                                {entry.image ? (
                                    <img
                                        src={entry.image}
                                        alt={entry.name ?? ''}
                                        className="w-8 h-8 rounded-full border-2 border-brand-dark object-cover shrink-0"
                                    />
                                ) : (
                                    <div className="w-8 h-8 rounded-full border-2 border-brand-dark bg-brand-purple/20 flex items-center justify-center shrink-0">
                                        <span className="font-heading font-black text-xs text-brand-purple">
                                            {(entry.name ?? '?')[0]?.toUpperCase()}
                                        </span>
                                    </div>
                                )}

                                <span className="font-bold truncate max-w-[120px] text-sm text-foreground">
                                    {entry.name ?? 'Learner'}
                                    {isMe && (
                                        <span className="ml-1 text-[10px] font-black text-brand-purple opacity-70">
                                            {t('leaderboard.meTag', { defaultValue: '(Me)' })}
                                        </span>
                                    )}
                                </span>
                            </div>

                            {/* Right: XP */}
                            <div className="flex items-baseline gap-1 shrink-0">
                                <span className="font-display font-black text-brand-purple text-lg">
                                    {entry.currentWeekXp.toLocaleString()}
                                </span>
                                <span className="text-[10px] font-bold text-muted-foreground">XP</span>
                            </div>
                        </motion.li>
                    );
                })}
            </motion.ul>
        </div>
    );
}

export default LeaderboardWidget;
