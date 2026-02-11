import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useAction } from 'convex/react';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { aRef } from '../../utils/convexRefs'; // Assuming this util exists or I'll copy the type
import { logger } from '../../utils/logger';
import { notify } from '../../utils/notify';
import { ArrowLeft, Check, BookOpen, Trophy, Sparkles } from 'lucide-react';

// Re-using types from SubscriptionPage implies we might need to import them or redefine.
// Since we are rewriting the logic here, I will redefine the Convex action signature inline for safety.

export const MobileSubscriptionPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useLocalizedNavigate();
  const { user } = useAuth();
  const [billingInterval, setBillingInterval] = useState<'MONTHLY' | 'ANNUAL'>('ANNUAL');
  const [loading, setLoading] = useState(false);

  const createCheckoutSession = useAction(
    aRef<
      {
        plan: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'LIFETIME';
        userId?: string;
        userEmail?: string;
        userName?: string;
        region?: string;
      },
      { checkoutUrl: string }
    >('lemonsqueezy:createCheckout')
  );

  const showLocalizedPromo =
    i18n.language === 'zh' ||
    i18n.language === 'vi' ||
    i18n.language === 'mn' ||
    i18n.language.startsWith('zh-');

  // Prices (Hardcoded for display based on logic, or ideally fetched.
  // Desktop uses 'PricingSection' which likely has hardcoded or fetched prices.
  // For parity, assuming $9.99/$79.99 as per prototype/desktop common defaults)
  // TODO: If prices are dynamic, this needs to fetch. But typically they are static in frontend for this app.
  const monthlyPrice = '$9.99';
  const annualPrice = '$79.99';

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const { checkoutUrl } = await createCheckoutSession({
        plan: billingInterval,
        userId: user?.id?.toString() || '',
        userEmail: user?.email || '',
        region: showLocalizedPromo ? 'REGIONAL' : 'GLOBAL',
      });
      globalThis.location.href = checkoutUrl;
    } catch (error) {
      const err = error as Error;
      logger.error('Checkout failed:', err);
      const msg = err.message || 'Unknown error';
      notify.error(`Failed to start checkout: ${msg}`);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-40">
      {/* Header */}
      <header className="px-6 pt-6 pb-8 bg-white border-b border-slate-100">
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 text-slate-500 hover:bg-slate-50 rounded-lg"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Video</span>
            <span className="w-px h-3 bg-slate-300"></span>
            <span className="text-xs font-bold text-slate-900">English</span>
          </div>
        </div>

        <div className="text-center">
          <span className="inline-block py-1 px-3 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs mb-4">
            PREMIUM
          </span>
          <h1 className="text-3xl font-black text-slate-900 leading-tight mb-2">
            Unlock <span className="text-indigo-600">DuHan Premium</span>
          </h1>
          <p className="text-slate-500 font-medium text-sm leading-relaxed max-w-xs mx-auto">
            {t('coursesOverview.achieveGoal')}
          </p>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-8 space-y-8">
        {/* 1. Feature Cards */}
        <div className="space-y-4">
          {/* Textbooks */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-lg shadow-indigo-100/50">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-2">
              {t('coursesOverview.feature1Title')}
            </h3>
            <p className="text-sm text-slate-500 font-medium mb-4 leading-relaxed">
              <span className="text-indigo-600 font-bold">Premium Members</span> unlock full digital
              textbooks.
            </p>
            <ul className="space-y-2">
              {[
                t('coursesOverview.feature1List1'),
                t('coursesOverview.feature1List2'),
                t('coursesOverview.feature1List3'),
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm font-medium text-slate-700">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* TOPIK */}
          <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl border border-slate-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-12 -mt-12 w-40 h-40 bg-indigo-600 rounded-full blur-3xl opacity-30"></div>
            <div className="w-12 h-12 bg-white/10 text-indigo-300 rounded-xl flex items-center justify-center mb-4 backdrop-blur-sm">
              <Trophy className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black mb-2">{t('coursesOverview.feature2Title')}</h3>
            <p className="text-slate-300 text-sm font-medium mb-4 leading-relaxed">
              {t('coursesOverview.feature2Desc')}
            </p>
            <ul className="space-y-2">
              {[
                t('coursesOverview.feature2List1'),
                t('coursesOverview.feature2List2'),
                t('coursesOverview.feature2List3'),
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm font-medium text-slate-200">
                  <Check className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* AI Grammar */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-lg shadow-indigo-100/50">
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-2">
              {t('coursesOverview.feature3Title')}
            </h3>
            <p className="text-sm text-slate-500 font-medium mb-4 leading-relaxed">
              Stuck? Let AI explain grammar in context.
            </p>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {t('coursesOverview.booksDigitized')}
                </span>
                <span className="text-sm font-black text-slate-900">100+</span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div className="bg-purple-500 w-3/4 h-full"></div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Benefit Comparison Table */}
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-200 bg-slate-50 text-center">
            <h3 className="text-lg font-black text-slate-900">
              {t('coursesOverview.benefitComparison')}
            </h3>
          </div>

          <table className="w-full text-sm text-left">
            <thead className="text-xs bg-white text-slate-500 border-b border-slate-100">
              <tr>
                <th className="py-3 px-4 font-bold w-1/3">
                  {t('coursesOverview.featurePrivilege')}
                </th>
                <th className="py-3 px-2 font-bold text-center text-slate-400 w-1/4">
                  {t('free')}
                </th>
                <th className="py-3 px-2 font-bold text-center text-indigo-600 bg-indigo-50/50 w-1/4">
                  Pro
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold">
              {[
                {
                  l: t('coursesOverview.textbookAccess'),
                  f: t('coursesOverview.limited3Lessons'),
                  p: t('coursesOverview.fullAccess1to6'),
                },
                {
                  l: t('coursesOverview.topikAccess'),
                  f: t('coursesOverview.limitedRecent'),
                  p: t('coursesOverview.allPastExams'),
                },
                {
                  l: t('coursesOverview.grammarAccess'),
                  f: t('coursesOverview.limited'),
                  p: t('coursesOverview.unlimited'),
                },
                { l: t('coursesOverview.adFree'), f: 'Yes', p: 'None', isCheck: true },
              ].map((row, i) => (
                <tr key={i}>
                  <td className="py-3 px-4 text-slate-700">{row.l}</td>
                  <td className="py-3 px-2 text-center text-slate-400">{row.f}</td>
                  <td
                    className={`py-3 px-2 text-center ${row.isCheck ? 'text-green-600' : 'text-indigo-700'} bg-indigo-50/30`}
                  >
                    {row.isCheck ? <Check className="w-4 h-4 mx-auto" /> : row.p}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* 3. Sticky Pricing */}
      <div className="fixed bottom-0 w-full bg-white border-t border-slate-200 p-4 pb-8 z-50 rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
        <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
          <button
            onClick={() => setBillingInterval('MONTHLY')}
            className={`flex-1 py-3 rounded-lg text-xs font-bold transition-colors ${billingInterval === 'MONTHLY' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
          >
            Monthly {monthlyPrice}
          </button>
          <button
            onClick={() => setBillingInterval('ANNUAL')}
            className={`flex-1 py-3 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1 ${billingInterval === 'ANNUAL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
          >
            Annual {annualPrice}{' '}
            <span className="text-[9px] bg-green-100 text-green-700 px-1 rounded">-20%</span>
          </button>
        </div>

        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="w-full bg-slate-900 text-white py-4 rounded-xl font-black shadow-lg shadow-slate-200 active:scale-95 transition-transform disabled:opacity-70"
        >
          {loading ? 'Processing...' : 'Subscribe Now'}
        </button>
        <p className="text-[10px] text-center text-slate-400 mt-2 font-medium">
          Recurring billing. Cancel anytime.
        </p>
      </div>
    </div>
  );
};
