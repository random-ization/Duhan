import React, { useMemo } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { SEO as Seo } from '../../seo/SEO';
import { getRouteMeta } from '../../seo/publicRoutes';
import { LocalizedLink } from '../../components/LocalizedLink';
import { isValidLanguage } from '../../components/LanguageRouter';

type Lang = 'en' | 'zh' | 'vi' | 'mn';

const COPY: Record<
  Lang,
  {
    h1: string;
    intro: string;
    rulesTitle: string;
    rules: string[];
    timingTitle: string;
    timing: string[];
    cta: string;
  }
> = {
  en: {
    h1: 'TOPIK Reading strategy (finish on time, score higher)',
    intro:
      'Reading is a time management game. You win by skipping wisely, scanning for structure, and avoiding slow perfectionism.',
    rulesTitle: 'Rules that protect your time',
    rules: [
      'Do not reread whole paragraphs unless required',
      'Mark and move: return only if you still have time',
      'Look for signal words and question patterns',
    ],
    timingTitle: 'A practical timing approach',
    timing: [
      'Easy questions first to secure points',
      'Medium questions with strict time caps',
      'Hard questions last, with smart guessing',
    ],
    cta: 'Practice reading now',
  },
  zh: {
    h1: 'TOPIK 阅读策略（按时做完，稳定提分）',
    intro: '阅读很大程度是时间管理。关键是会跳题、会扫读结构、避免慢速完美主义。',
    rulesTitle: '保护时间的规则',
    rules: ['除非必要不要整段反复重读', '标记后先跳过，最后再回看', '关注信号词与题型套路'],
    timingTitle: '实用的做题顺序',
    timing: ['先拿简单题确保分数', '中等题设置严格时间上限', '难题放最后，必要时果断猜'],
    cta: '立即练阅读',
  },
  vi: {
    h1: 'Chiến lược đọc TOPIK (làm kịp giờ, tăng điểm)',
    intro:
      'Đọc là cuộc chơi quản lý thời gian. Bạn thắng nhờ bỏ qua đúng lúc, quét cấu trúc và tránh “cầu toàn chậm”.',
    rulesTitle: 'Nguyên tắc để giữ thời gian',
    rules: [
      'Không đọc lại cả đoạn nếu không cần',
      'Đánh dấu rồi chuyển tiếp, quay lại khi còn thời gian',
      'Tìm từ khóa tín hiệu và mẫu câu hỏi',
    ],
    timingTitle: 'Cách phân bổ thời gian thực tế',
    timing: [
      'Làm câu dễ trước để chắc điểm',
      'Câu vừa với giới hạn thời gian nghiêm',
      'Câu khó cuối, đoán thông minh khi cần',
    ],
    cta: 'Luyện đọc ngay',
  },
  mn: {
    h1: 'TOPIK уншлагын стратеги (цагтаа багтааж, оноогоо өсгөх)',
    intro:
      'Уншлага бол цагийн тоглоом. Зөв алгасах, бүтэц хайх, удаан төгс хийхээс зайлсхийх нь чухал.',
    rulesTitle: 'Цагаа хамгаалах дүрэм',
    rules: [
      'Шаардлагагүй бол бүхэл догол мөрийг дахин бүү унш',
      'Тэмдэглээд урагшил, цаг үлдвэл буц',
      'Дохио үг, асуултын хэв маягийг ол',
    ],
    timingTitle: 'Бодит цагийн хуваарилалт',
    timing: [
      'Амарханыг эхэлж оноо баталгаажуул',
      'Дунд түвшинд хатуу хугацаа тогтоох',
      'Хэцүүг хамгийн сүүлд, хэрэгтэй үед ухаалгаар таах',
    ],
    cta: 'Уншлага дасгал хийх',
  },
};

export const TopikReadingGuidePage: React.FC = () => {
  const location = useLocation();
  const { lang } = useParams<{ lang: string }>();
  const currentLang: Lang = lang && isValidLanguage(lang) ? (lang as Lang) : 'en';
  const copy = COPY[currentLang] || COPY.en;
  const meta = useMemo(() => getRouteMeta(location.pathname), [location.pathname]);

  return (
    <div
      className="min-h-screen bg-[#F0F4F8] p-6 md:p-12 font-sans"
      style={{
        backgroundImage: 'radial-gradient(#cbd5e1 1.5px, transparent 1.5px)',
        backgroundSize: '24px 24px',
      }}
    >
      <Seo
        title={meta.title}
        description={meta.description}
        keywords={meta.keywords}
        noIndex={meta.noIndex}
      />

      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-3xl border-2 border-slate-900 shadow-pop overflow-hidden">
          <div className="p-8 md:p-12">
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
              {copy.h1}
            </h1>
            <p className="mt-4 text-slate-700 font-semibold leading-relaxed max-w-3xl">
              {copy.intro}
            </p>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="text-xl font-black text-slate-900">{copy.rulesTitle}</h2>
                <ul className="mt-4 space-y-2">
                  {copy.rules.map((s, idx) => (
                    <li key={idx} className="flex gap-3 text-slate-700 font-semibold">
                      <span className="mt-2 h-2.5 w-2.5 rounded-full bg-blue-600 shrink-0" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="text-xl font-black text-slate-900">{copy.timingTitle}</h2>
                <ul className="mt-4 space-y-2">
                  {copy.timing.map((s, idx) => (
                    <li key={idx} className="flex gap-3 text-slate-700 font-semibold">
                      <span className="mt-2 h-2.5 w-2.5 rounded-full bg-indigo-600 shrink-0" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <LocalizedLink
                to="/topik"
                className="inline-flex items-center justify-center rounded-2xl px-6 py-3 font-black bg-slate-900 text-white border-2 border-slate-900 hover:bg-slate-800 transition"
              >
                {copy.cta}
              </LocalizedLink>
              <LocalizedLink
                to="/topik/guide"
                className="inline-flex items-center justify-center rounded-2xl px-6 py-3 font-black bg-white text-slate-900 border-2 border-slate-900 hover:bg-slate-50 transition"
              >
                {currentLang === 'en'
                  ? 'Back to guide'
                  : currentLang === 'zh'
                    ? '返回指南'
                    : currentLang === 'vi'
                      ? 'Quay lại hướng dẫn'
                      : 'Гарын авлага руу'}
              </LocalizedLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopikReadingGuidePage;
