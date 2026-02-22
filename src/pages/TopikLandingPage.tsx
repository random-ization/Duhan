import React, { useMemo } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { SEO as Seo } from '../seo/SEO';
import { getRouteMeta } from '../seo/publicRoutes';
import { LocalizedLink } from '../components/LocalizedLink';
import { isValidLanguage } from '../components/LanguageRouter';
import { Button } from '../components/ui';

type Lang = 'en' | 'zh' | 'vi' | 'mn';

const COPY: Record<
  Lang,
  {
    heroTitle: string;
    heroSubtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
    highlightsTitle: string;
    highlights: string[];
    faqTitle: string;
    faqs: Array<{ q: string; a: string }>;
  }
> = {
  en: {
    heroTitle: 'Practice TOPIK with real, timed mock exams',
    heroSubtitle:
      'Train TOPIK listening and reading, review mistakes, and track progress with DuHan.',
    ctaPrimary: 'Start practicing',
    ctaSecondary: 'See pricing',
    highlightsTitle: 'What you can do',
    highlights: [
      'Timed practice for TOPIK II listening and reading',
      'History and review so you learn from mistakes',
      'Audio-first flow designed for listening practice',
    ],
    faqTitle: 'FAQ',
    faqs: [
      {
        q: 'Do I need an account to practice?',
        a: 'To start a full exam and save history, you need to sign in. You can still explore this page without logging in.',
      },
      {
        q: 'Is this TOPIK I or TOPIK II?',
        a: 'DuHan focuses on TOPIK II-style listening and reading practice.',
      },
      {
        q: 'How do I improve fastest?',
        a: 'Practice timed sets consistently, then review your mistakes and repeat weak sections.',
      },
    ],
  },
  zh: {
    heroTitle: '\u7528\u771f\u5b9e\u8ba1\u65f6\u6a21\u8003\u9ad8\u6548\u7ec3 TOPIK',
    heroSubtitle: '\u5728 DuHan \u8bad\u7ec3 TOPIK \u542c\u529b\u4e0e\u9605\u8bfb，\u590d\u76d8\u9519\u9898，\u5e76\u6301\u7eed\u8ffd\u8e2a\u8fdb\u5ea6。',
    ctaPrimary: '\u5f00\u59cb\u7ec3\u4e60',
    ctaSecondary: '\u67e5\u770b\u4ef7\u683c',
    highlightsTitle: '\u4f60\u53ef\u4ee5\u505a\u4ec0\u4e48',
    highlights: ['TOPIK II \u542c\u529b\u4e0e\u9605\u8bfb\u8ba1\u65f6\u7ec3\u4e60', '\u8003\u8bd5\u8bb0\u5f55\u4e0e\u9519\u9898\u590d\u76d8', '\u4ee5\u542c\u529b\u4e3a\u6838\u5fc3\u7684\u7ec3\u4e60\u6d41\u7a0b'],
    faqTitle: '\u5e38\u89c1\u95ee\u9898',
    faqs: [
      {
        q: '\u9700\u8981\u6ce8\u518c\u624d\u80fd\u7ec3\u4e60\u5417？',
        a: '\u5f00\u59cb\u5b8c\u6574\u8003\u8bd5\u5e76\u4fdd\u5b58\u8bb0\u5f55\u9700\u8981\u767b\u5f55。\u4f60\u4ecd\u53ef\u4ee5\u5728\u4e0d\u767b\u5f55\u7684\u60c5\u51b5\u4e0b\u6d4f\u89c8\u6b64\u9875\u9762。',
      },
      {
        q: '\u8fd9\u662f TOPIK I \u8fd8\u662f TOPIK II？',
        a: 'DuHan \u4e3b\u8981\u63d0\u4f9b TOPIK II \u98ce\u683c\u7684\u542c\u529b\u4e0e\u9605\u8bfb\u7ec3\u4e60。',
      },
      {
        q: '\u600e\u6837\u63d0\u5347\u6700\u5feb？',
        a: '\u575a\u6301\u8ba1\u65f6\u7ec3\u4e60，\u7136\u540e\u590d\u76d8\u9519\u9898\u4e0e\u8584\u5f31\u9898\u578b，\u5faa\u73af\u5f3a\u5316。',
      },
    ],
  },
  vi: {
    heroTitle: 'Luyện TOPIK hiệu quả với đề thi thử có tính giờ',
    heroSubtitle: 'DuHan giúp bạn luyện nghe và đọc TOPIK, xem lại lỗi sai và theo dõi tiến độ.',
    ctaPrimary: 'Bắt đầu luyện',
    ctaSecondary: 'Xem bảng giá',
    highlightsTitle: 'Bạn có thể làm gì',
    highlights: [
      'Luyện nghe và đọc TOPIK II có tính giờ',
      'Lịch sử làm bài và xem lại lỗi sai',
      'Luồng luyện nghe tối ưu cho phần Listening',
    ],
    faqTitle: 'Câu hỏi thường gặp',
    faqs: [
      {
        q: 'Có cần tài khoản để luyện không?',
        a: 'Để làm bài đầy đủ và lưu lịch sử, bạn cần đăng nhập. Bạn vẫn có thể xem trang này mà không cần đăng nhập.',
      },
      {
        q: 'Đây là TOPIK I hay TOPIK II?',
        a: 'DuHan tập trung vào luyện nghe và đọc theo phong cách TOPIK II.',
      },
      {
        q: 'Làm sao cải thiện nhanh nhất?',
        a: 'Luyện đều đặn theo thời gian, sau đó xem lại lỗi sai và luyện lại phần yếu.',
      },
    ],
  },
  mn: {
    heroTitle: 'TOPIK-ийг бодит цагтай жишиг шалгалтаар үр дүнтэй бэлд',
    heroSubtitle:
      'DuHan дээр TOPIK сонсгол, уншлагын дасгал хийж, алдаагаа хянаад ахицаа дагаарай.',
    ctaPrimary: 'Дасгал эхлэх',
    ctaSecondary: 'Үнийг харах',
    highlightsTitle: 'Та юу хийж чадах вэ',
    highlights: [
      'TOPIK II сонсгол ба уншлагын цагтай дасгал',
      'Түүх ба алдаа хяналт',
      'Сонсголд төвлөрсөн дасгалын урсгал',
    ],
    faqTitle: 'Түгээмэл асуулт',
    faqs: [
      {
        q: 'Дасгал хийхэд бүртгэл хэрэгтэй юу?',
        a: 'Бүрэн шалгалт өгч түүхээ хадгалахын тулд нэвтрэх шаардлагатай. Гэхдээ энэ хуудсыг нэвтрэхгүйгээр үзэж болно.',
      },
      {
        q: 'TOPIK I эсвэл TOPIK II юу?',
        a: 'DuHan нь TOPIK II хэв маягийн сонсгол ба уншлагын дасгалд төвлөрдөг.',
      },
      {
        q: 'Хамгийн хурдан сайжрах арга?',
        a: 'Цагтайгаар тогтмол дасгал хийж, дараа нь алдаагаа хянаад сул хэсгээ давт.',
      },
    ],
  },
};

export const TopikLandingPage: React.FC = () => {
  const location = useLocation();
  const { lang } = useParams<{ lang: string }>();
  const meta = useMemo(() => getRouteMeta(location.pathname), [location.pathname]);
  const currentLang: Lang = lang && isValidLanguage(lang) ? (lang as Lang) : 'en';
  const copy = COPY[currentLang] || COPY.en;

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
          <div className="p-8 md:p-12 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-5">
              <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tight">
                {copy.heroTitle}
              </h1>
              <p className="text-muted-foreground font-semibold leading-relaxed">
                {copy.heroSubtitle}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  asChild
                  variant="ghost"
                  size="auto"
                  className="inline-flex items-center justify-center rounded-2xl px-6 py-3 font-black bg-primary text-white border-2 border-foreground hover:bg-muted transition"
                >
                  <LocalizedLink to="/login?redirect=/topik">{copy.ctaPrimary}</LocalizedLink>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  size="auto"
                  className="inline-flex items-center justify-center rounded-2xl px-6 py-3 font-black bg-card text-foreground border-2 border-foreground hover:bg-muted transition"
                >
                  <LocalizedLink to="/pricing">{copy.ctaSecondary}</LocalizedLink>
                </Button>
              </div>
            </div>

            <div className="bg-primary rounded-3xl p-8 text-white border-2 border-foreground relative overflow-hidden">
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(45deg, #fff 0, #fff 2px, transparent 2px, transparent 10px)',
                }}
              />
              <div className="relative z-10">
                <h2 className="text-xl font-black mb-4">{copy.highlightsTitle}</h2>
                <ul className="space-y-3 text-sm font-semibold text-muted-foreground">
                  {copy.highlights.map((item, idx) => (
                    <li key={idx} className="flex gap-3">
                      <span className="mt-0.5 h-2.5 w-2.5 rounded-full bg-yellow-400 dark:bg-amber-300 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-6 text-xs text-muted-foreground font-semibold">
                  {currentLang === 'en'
                    ? 'Tip: Link Google/Kakao in Profile to keep one account.'
                    : currentLang === 'zh'
                      ? '\u63d0\u793a：\u5728\u4e2a\u4eba\u8d44\u6599\u9875\u7ed1\u5b9a Google/Kakao，\u4fdd\u6301\u540c\u4e00\u8d26\u53f7。'
                      : currentLang === 'vi'
                        ? 'Mẹo: Liên kết Google/Kakao trong hồ sơ để dùng một tài khoản.'
                        : 'Зөвлөгөө: Профайл дээр Google/Kakao-г холбоод нэг бүртгэлээр ашигла.'}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-border p-8 md:p-12">
            <h2 className="text-2xl font-black text-foreground mb-4">{copy.faqTitle}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {copy.faqs.map((f, idx) => (
                <div key={idx} className="rounded-2xl border border-border bg-card p-5">
                  <h3 className="font-black text-foreground">{f.q}</h3>
                  <p className="mt-2 text-sm text-muted-foreground font-semibold leading-relaxed">
                    {f.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-muted-foreground font-semibold">
          <LocalizedLink to="/courses" className="underline hover:text-muted-foreground">
            {currentLang === 'en'
              ? 'Explore courses'
              : currentLang === 'zh'
                ? '\u67e5\u770b\u8bfe\u7a0b'
                : currentLang === 'vi'
                  ? 'Khám phá khóa học'
                  : 'Курсуудыг үзэх'}
          </LocalizedLink>
        </div>
      </div>
    </div>
  );
};

export default TopikLandingPage;
