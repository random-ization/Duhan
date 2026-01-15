import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Globe, Check } from 'lucide-react';
import { Language } from '../types';
import BackButton from '../components/ui/BackButton';
import PricingSection from '../components/PricingSection';
import { SEO } from '../components/SEO';

const SubscriptionPage: React.FC = () => {
  const { user, language, setLanguage } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);

  const createCheckoutSession = useAction(api.lemonsqueezy.createCheckout);

  const languages: { code: Language; label: string }[] = [
    { code: 'en', label: 'English' },
    { code: 'zh', label: '中文' },
    { code: 'vi', label: 'Tiếng Việt' },
    { code: 'mn', label: 'Монгол' },
  ];

  return (
    <>
      <SEO
        title="Pricing Plans - DuHan Korean Learning"
        description="Choose the perfect plan for your Korean learning journey. Free tier available with premium options for unlimited access to all content and features."
        canonical="/pricing"
      />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header: Back Button & Language Selector */}
          <div className="mb-8 flex justify-between items-center">
            <BackButton onClick={() => navigate(-1)} />

            {/* Language Selector */}
            <div className="relative">
              <button
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 transition-colors shadow-sm"
              >
                <Globe className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {languages.find(l => l.code === language)?.label || 'English'}
                </span>
              </button>

              {isLangMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsLangMenuOpen(false)}
                  ></div>
                  <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-100">
                    {languages.map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setLanguage(lang.code);
                          setIsLangMenuOpen(false);
                        }}
                        className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${
                          language === lang.code
                            ? 'text-indigo-600 font-bold bg-indigo-50/50 dark:bg-indigo-900/20'
                            : 'text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {lang.label}
                        {language === lang.code && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="text-center mb-16">
            <span className="inline-block py-1 px-3 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm mb-4">
              {t('coursesOverview.navTitle')}
            </span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-6">
              <Trans i18nKey="coursesOverview.unlockTitle">
                Unlock <span className="text-indigo-600">DuHan Premium</span>
              </Trans>
            </h2>
            <p className="text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
              {t('coursesOverview.achieveGoal')}
            </p>
          </div>

          {/* --- 1. Feature Breakdown Section --- */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
            {/* Feature 1: Textbooks */}
            <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-lg shadow-indigo-100/50 dark:shadow-none hover:-translate-y-1 transition-transform">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                {t('coursesOverview.feature1Title')}
              </h3>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                <Trans i18nKey="coursesOverview.feature1Desc">
                  <span className="font-bold text-indigo-600">Premium Members</span> unlock full
                  digital textbooks...
                </Trans>
              </p>
              <ul className="space-y-3">
                {[
                  t('coursesOverview.feature1List1'),
                  t('coursesOverview.feature1List2'),
                  t('coursesOverview.feature1List3'),
                ].map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    <svg
                      className="w-5 h-5 text-green-500 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Feature 2: TOPIK */}
            <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none hover:-translate-y-1 transition-transform relative overflow-hidden">
              <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-indigo-600 rounded-full blur-3xl opacity-30"></div>
              <div className="w-14 h-14 bg-white/10 text-indigo-300 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-sm">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">{t('coursesOverview.feature2Title')}</h3>
              <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                {t('coursesOverview.feature2Desc')}
              </p>
              <ul className="space-y-3">
                {[
                  t('coursesOverview.feature2List1'),
                  t('coursesOverview.feature2List2'),
                  t('coursesOverview.feature2List3'),
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm font-medium text-slate-200">
                    <svg
                      className="w-5 h-5 text-indigo-400 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Feature 3: Grammar */}
            <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-lg shadow-indigo-100/50 dark:shadow-none hover:-translate-y-1 transition-transform">
              <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                {t('coursesOverview.feature3Title')}
              </h3>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                <Trans i18nKey="coursesOverview.feature3Desc">
                  Stuck on a sentence? <span className="font-bold">AI Analysis</span>...
                </Trans>
              </p>
              <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl border border-slate-100 dark:border-slate-600">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {t('coursesOverview.booksDigitized')}
                  </span>
                  <span className="text-xl font-black text-slate-900 dark:text-white">100+</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-600 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-purple-500 w-3/4 h-full"></div>
                </div>
              </div>
            </div>
          </div>

          {/* --- 2. Benefit Comparison Table --- */}
          <div className="mb-24 overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-700">
            <div className="bg-slate-50 dark:bg-slate-800 p-6 border-b border-slate-200 dark:border-slate-700 text-center">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                {t('coursesOverview.benefitComparison')}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mt-2">
                {t('coursesOverview.seeDifference')}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full bg-white dark:bg-slate-900 text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <th className="p-4 text-left text-slate-400 font-medium w-1/3 pl-8">
                      {t('coursesOverview.featurePrivilege')}
                    </th>
                    <th className="p-4 text-center text-slate-500 font-medium w-1/3">
                      {t('free')}
                    </th>
                    <th className="p-4 text-center text-indigo-600 font-bold w-1/3 bg-indigo-50/30 dark:bg-indigo-900/10">
                      Premium
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {[
                    {
                      label: t('coursesOverview.textbookAccess'),
                      free: t('coursesOverview.limited3Lessons'),
                      premium: t('coursesOverview.fullAccess1to6'),
                    },
                    {
                      label: t('coursesOverview.topikAccess'),
                      free: t('coursesOverview.limitedRecent'),
                      premium: t('coursesOverview.allPastExams'),
                    },
                    {
                      label: t('coursesOverview.grammarAccess'),
                      free: t('coursesOverview.limited'),
                      premium: t('coursesOverview.unlimited'),
                    },
                    {
                      label: t('coursesOverview.vocabAccess'),
                      free: t('coursesOverview.vocab50'),
                      premium: t('coursesOverview.vocabUnlimited'),
                    },
                    {
                      label: t('coursesOverview.adFree'),
                      free: '—',
                      premium: <span className="text-green-500">✔</span>,
                    },
                  ].map((row, i) => (
                    <tr
                      key={i}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="p-4 pl-8 font-bold text-slate-700 dark:text-slate-200">
                        {row.label}
                      </td>
                      <td className="p-4 text-center text-slate-500">{row.free}</td>
                      <td className="p-4 text-center font-bold text-slate-900 dark:text-white bg-indigo-50/30 dark:bg-indigo-900/10">
                        {row.premium}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* --- 3. Pricing Section --- */}
          <PricingSection
            onSubscribe={async (plan: string) => {
              try {
                const { checkoutUrl } = await createCheckoutSession({
                  plan: plan as 'MONTHLY' | 'ANNUAL' | 'LIFETIME',
                  userId: user?.id?.toString() || '',
                  userEmail: user?.email || '',
                });
                window.location.href = checkoutUrl;
              } catch (error) {
                console.error('Checkout failed:', error);
                const msg = error instanceof Error ? error.message : 'Unknown error';
                alert(`Failed to start checkout session: ${msg}`);
              }
            }}
          />
        </div>
      </div>
    </>
  );
};

export default SubscriptionPage;
