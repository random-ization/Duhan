import React from 'react';
import {
    Card,
    CardDescription,
    CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Clock, ArrowRight } from 'lucide-react';
import { useLocalizedNavigate } from '@/hooks/useLocalizedNavigate';
import { useTranslation } from 'react-i18next';

interface ReviewWordsCardProps {
    dueCount?: number;
}

export const ReviewWordsCard: React.FC<ReviewWordsCardProps> = ({ dueCount = 0 }) => {
    const navigate = useLocalizedNavigate();
    const { t } = useTranslation();

    return (
        <Card className="w-full overflow-hidden relative group border-2 hover:border-indigo-500/50 transition-all duration-300 mb-6 shadow-md">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-900/20 opacity-50 group-hover:opacity-100 transition-opacity" />

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between relative z-10 p-6">
                <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
                            <Brain className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 font-bold">
                            {t('reviewPage.card.wordsDue', { count: dueCount, defaultValue: `${dueCount} Words Due` })}
                        </Badge>
                    </div>
                    <CardTitle className="text-xl font-bold text-slate-800 dark:text-slate-100">
                        {t('reviewPage.card.title', { defaultValue: 'Daily Review Session' })}
                    </CardTitle>
                    <CardDescription className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-sm">
                        {t('reviewPage.card.description', { defaultValue: 'Strengthen your long-term memory with spaced repetition suited for you.' })}
                    </CardDescription>

                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 mt-3">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{t('reviewPage.card.estimatedTime', { min: Math.max(2, Math.ceil(dueCount * 0.5)), defaultValue: `Estimated time: ~${Math.max(2, Math.ceil(dueCount * 0.5))} mins` })}</span>
                    </div>
                </div>

                <div className="mt-5 sm:mt-0 sm:ml-6">
                    <Button
                        onClick={() => navigate('/review')}
                        className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-all shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 group-hover:translate-y-[-2px] gap-2 px-6"
                    >

                        {t('reviewPage.card.start', { defaultValue: 'Start Review' })} <ArrowRight className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </Card>
    );
};
