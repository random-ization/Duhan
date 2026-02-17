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
    heroTitle: '用真实计时模考高效练 TOPIK',
    heroSubtitle: '在 DuHan 训练 TOPIK 听力与阅读，复盘错题，并持续追踪进度。',
    ctaPrimary: '开始练习',
    ctaSecondary: '查看价格',
    highlightsTitle: '你可以做什么',
    highlights: ['TOPIK II 听力与阅读计时练习', '考试记录与错题复盘', '以听力为核心的练习流程'],
    faqTitle: '常见问题',
    faqs: [
      {
        q: '需要注册才能练习吗？',
        a: '开始完整考试并保存记录需要登录。你仍可以在不登录的情况下浏览此页面。',
      },
      {
        q: '这是 TOPIK I 还是 TOPIK II？',
        a: 'DuHan 主要提供 TOPIK II 风格的听力与阅读练习。',
      },
      {
        q: '怎样提升最快？',
        a: '坚持计时练习，然后复盘错题与薄弱题型，循环强化。',
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
                      ? '提示：在个人资料页绑定 Google/Kakao，保持同一账号。'
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
                ? '查看课程'
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
