import React, { useEffect, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';

interface DailyPhrase {
    id: string;
    korean: string;
    romanization: string;
    chinese: string;
    english?: string;
}

const DailyPhrase: React.FC = () => {
    //     const [phrase, setPhrase] = useState<DailyPhrase | null>(null);
    //     const [loading, setLoading] = useState(true);
    //     const [error, setError] = useState<string | null>(null);

    const phrase = useQuery(api.vocab.getDailyPhrase);
    const loading = phrase === undefined;
    const error = phrase === null;

    //     useEffect(() => {
    //         const fetchDailyPhrase = async () => {
    //             try {
    //                 const data = await request<DailyPhrase>('/daily-phrase/today');
    //                 setPhrase(data);
    //             } catch (err) {
    //                 console.error('Error fetching daily phrase:', err);
    //                 setError('加载失败');
    //             } finally {
    //                 setLoading(false);
    //             }
    //         };
    // 
    //         fetchDailyPhrase();
    //     }, []);

    if (loading) {
        return (
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-6 border border-yellow-100">
                <div className="animate-pulse space-y-3">
                    <div className="h-4 w-20 bg-yellow-200 rounded"></div>
                    <div className="h-10 w-3/4 bg-yellow-200 rounded"></div>
                    <div className="h-4 w-1/2 bg-yellow-200 rounded"></div>
                </div>
            </div>
        );
    }

    if (error || !phrase) {
        return null; // Hide on error
    }

    return (
        <div className="bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 rounded-2xl p-6 border border-yellow-100 shadow-sm hover:shadow-md transition-shadow">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-5 h-5 text-amber-600" />
                <h3 className="text-sm font-bold text-amber-900 tracking-wide">每日一句</h3>
            </div>

            {/* Korean Sentence */}
            <div className="mb-3">
                <p className="text-3xl font-bold text-slate-900 leading-tight mb-2">
                    {phrase.korean}
                </p>
            </div>

            {/* Romanization */}
            <div className="mb-3">
                <p className="text-base text-slate-600 font-medium italic">
                    {phrase.romanization}
                </p>
            </div>

            {/* Translation */}
            <div className="pt-3 border-t border-yellow-200/50">
                <p className="text-slate-700 leading-relaxed">
                    {phrase.chinese}
                </p>
            </div>
        </div>
    );
};

export default DailyPhrase;
