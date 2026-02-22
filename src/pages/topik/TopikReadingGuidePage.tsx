import React, { useMemo } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { SEO as Seo } from '../../seo/SEO';
import { getRouteMeta } from '../../seo/publicRoutes';
import { LocalizedLink } from '../../components/LocalizedLink';
import { isValidLanguage } from '../../components/LanguageRouter';
import { Button } from '../../components/ui';

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
    h1: 'TOPIK \u9605\u8bfb\u7b56\u7565（\u6309\u65f6\u505a\u5b8c，\u7a33\u5b9a\u63d0\u5206）',
    intro: '\u9605\u8bfb\u5f88\u5927\u7a0b\u5ea6\u662f\u65f6\u95f4\u7ba1\u7406。\u5173\u952e\u662f\u4f1a\u8df3\u9898、\u4f1a\u626b\u8bfb\u7ed3\u6784、\u907f\u514d\u6162\u901f\u5b8c\u7f8e\u4e3b\u4e49。',
    rulesTitle: '\u4fdd\u62a4\u65f6\u95f4\u7684\u89c4\u5219',
    rules: ['\u9664\u975e\u5fc5\u8981\u4e0d\u8981\u6574\u6bb5\u53cd\u590d\u91cd\u8bfb', '\u6807\u8bb0\u540e\u5148\u8df3\u8fc7，\u6700\u540e\u518d\u56de\u770b', '\u5173\u6ce8\u4fe1\u53f7\u8bcd\u4e0e\u9898\u578b\u5957\u8def'],
    timingTitle: '\u5b9e\u7528\u7684\u505a\u9898\u987a\u5e8f',
    timing: ['\u5148\u62ff\u7b80\u5355\u9898\u786e\u4fdd\u5206\u6570', '\u4e2d\u7b49\u9898\u8bbe\u7f6e\u4e25\u683c\u65f6\u95f4\u4e0a\u9650', '\u96be\u9898\u653e\u6700\u540e，\u5fc5\u8981\u65f6\u679c\u65ad\u731c'],
    cta: '\u7acb\u5373\u7ec3\u9605\u8bfb',
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
        <div className="bg-card rounded-3xl border-2 border-foreground shadow-pop overflow-hidden">
          <div className="p-8 md:p-12">
            <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tight">
              {copy.h1}
            </h1>
            <p className="mt-4 text-muted-foreground font-semibold leading-relaxed max-w-3xl">
              {copy.intro}
            </p>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="text-xl font-black text-foreground">{copy.rulesTitle}</h2>
                <ul className="mt-4 space-y-2">
                  {copy.rules.map((s, idx) => (
                    <li key={idx} className="flex gap-3 text-muted-foreground font-semibold">
                      <span className="mt-2 h-2.5 w-2.5 rounded-full bg-blue-600 dark:bg-blue-300 shrink-0" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="text-xl font-black text-foreground">{copy.timingTitle}</h2>
                <ul className="mt-4 space-y-2">
                  {copy.timing.map((s, idx) => (
                    <li key={idx} className="flex gap-3 text-muted-foreground font-semibold">
                      <span className="mt-2 h-2.5 w-2.5 rounded-full bg-indigo-600 dark:bg-indigo-300 shrink-0" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <Button
                asChild
                variant="ghost"
                size="auto"
                className="inline-flex items-center justify-center rounded-2xl px-6 py-3 font-black bg-primary text-primary-foreground border-2 border-foreground hover:bg-muted transition"
              >
                <LocalizedLink to="/topik">{copy.cta}</LocalizedLink>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="auto"
                className="inline-flex items-center justify-center rounded-2xl px-6 py-3 font-black bg-card text-foreground border-2 border-foreground hover:bg-muted transition"
              >
                <LocalizedLink to="/topik/guide">
                  {currentLang === 'en'
                    ? 'Back to guide'
                    : currentLang === 'zh'
                      ? '\u8fd4\u56de\u6307\u5357'
                      : currentLang === 'vi'
                        ? 'Quay lại hướng dẫn'
                        : 'Гарын авлага руу'}
                </LocalizedLink>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopikReadingGuidePage;
