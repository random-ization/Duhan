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
    tocTitle: string;
    toc: Array<{ label: string; href: string }>;
    sections: Array<{ id: string; title: string; body: string; bullets?: string[] }>;
    nextTitle: string;
  }
> = {
  en: {
    h1: 'TOPIK Guide: what to study and how to score higher',
    intro:
      'This guide helps you prepare for TOPIK II with a simple, repeatable loop: learn, practice under time, review, and fix weak spots.',
    tocTitle: 'On this page',
    toc: [
      { label: 'TOPIK II overview', href: '#overview' },
      { label: 'A 4-step study loop', href: '#loop' },
      { label: 'Common mistakes', href: '#mistakes' },
      { label: 'How DuHan helps', href: '#duhan' },
    ],
    sections: [
      {
        id: 'overview',
        title: 'TOPIK II overview (Listening + Reading)',
        body: 'Most learners lose points not because they do not know enough, but because they run out of time or miss patterns. Your goal is to build speed and accuracy together.',
        bullets: [
          'Train listening with audio-first practice and focused replay',
          'Train reading with timed sets and pattern recognition',
          'Review mistakes immediately while memory is fresh',
        ],
      },
      {
        id: 'loop',
        title: 'A 4-step study loop that actually works',
        body: 'Keep it boring. Consistency beats complex plans. Use this loop 4 to 6 days per week:',
        bullets: [
          '1) Learn: 30 to 45 min vocabulary + grammar',
          '2) Practice: 20 to 40 min timed TOPIK sets',
          '3) Review: 15 to 30 min mistake review',
          '4) Fix: repeat weak sections with targeted practice',
        ],
      },
      {
        id: 'mistakes',
        title: 'Common mistakes to avoid',
        body: 'These are the biggest traps we see:',
        bullets: [
          'Doing full tests without reviewing errors',
          'Practicing without time limits (you need exam conditions)',
          'Skipping listening replay and transcript checking',
          'Not building a small, stable daily routine',
        ],
      },
      {
        id: 'duhan',
        title: 'How DuHan helps you prepare',
        body: 'Use DuHan for timed practice, listening audio flow, and history review so you can measure improvement week to week.',
        bullets: [
          'TOPIK practice center with listening and reading',
          'History and review to learn from mistakes',
          'Structured courses for daily vocabulary and grammar',
        ],
      },
    ],
    nextTitle: 'Next: pick your focus',
  },
  zh: {
    h1: 'TOPIK \u5907\u8003\u6307\u5357：\u5b66\u4ec0\u4e48，\u5982\u4f55\u66f4\u5feb\u63d0\u5206',
    intro:
      '\u8fd9\u4efd\u6307\u5357\u9488\u5bf9 TOPIK II，\u603b\u7ed3\u4e00\u4e2a\u53ef\u91cd\u590d\u7684\u5907\u8003\u5faa\u73af：\u5b66\u4e60 -> \u8ba1\u65f6\u7ec3\u4e60 -> \u9519\u9898\u590d\u76d8 -> \u9488\u5bf9\u8584\u5f31\u70b9\u4fee\u6b63。',
    tocTitle: '\u76ee\u5f55',
    toc: [
      { label: 'TOPIK II \u6982\u89c8', href: '#overview' },
      { label: '\u56db\u6b65\u5907\u8003\u5faa\u73af', href: '#loop' },
      { label: '\u5e38\u89c1\u9519\u8bef', href: '#mistakes' },
      { label: 'DuHan \u5982\u4f55\u5e2e\u52a9', href: '#duhan' },
    ],
    sections: [
      {
        id: 'overview',
        title: 'TOPIK II \u6982\u89c8（\u542c\u529b + \u9605\u8bfb）',
        body: '\u5f88\u591a\u4eba\u4e22\u5206\u4e0d\u662f\u56e0\u4e3a\u4e0d\u4f1a，\u800c\u662f\u56e0\u4e3a\u65f6\u95f4\u4e0d\u591f\u6216\u9898\u578b\u89c4\u5f8b\u4e0d\u719f。\u4f60\u7684\u76ee\u6807\u662f\u540c\u65f6\u63d0\u5347\u901f\u5ea6\u548c\u51c6\u786e\u7387。',
        bullets: [
          '\u542c\u529b\u7528\u97f3\u9891\u4f18\u5148\u7684\u7ec3\u4e60\u65b9\u5f0f\u53cd\u590d\u7cbe\u542c',
          '\u9605\u8bfb\u7528\u8ba1\u65f6\u8bad\u7ec3\u9898\u578b\u4e0e\u4fe1\u606f\u5b9a\u4f4d',
          '\u590d\u76d8\u8981\u8d81\u8bb0\u5fc6\u8fd8\u65b0\u9c9c\u7acb\u523b\u505a',
        ],
      },
      {
        id: 'loop',
        title: '\u771f\u6b63\u6709\u6548\u7684\u56db\u6b65\u5faa\u73af',
        body: '\u8ba1\u5212\u8d8a\u7b80\u5355\u8d8a\u5bb9\u6613\u575a\u6301。\u5efa\u8bae\u6bcf\u5468 4 \u5230 6 \u5929\u91cd\u590d\u4ee5\u4e0b\u5faa\u73af：',
        bullets: [
          '1）\u5b66\u4e60：30-45 \u5206\u949f \u8bcd\u6c47 + \u8bed\u6cd5',
          '2）\u7ec3\u4e60：20-40 \u5206\u949f \u8ba1\u65f6\u505a\u9898',
          '3）\u590d\u76d8：15-30 \u5206\u949f \u9519\u9898\u590d\u76d8',
          '4）\u4fee\u6b63：\u9488\u5bf9\u8584\u5f31\u9898\u578b\u91cd\u590d\u8bad\u7ec3',
        ],
      },
      {
        id: 'mistakes',
        title: '\u6700\u5e38\u89c1\u7684\u5751',
        body: '\u8fd9\u4e9b\u9519\u8bef\u4f1a\u8ba9\u4f60\u6295\u5165\u5f88\u591a\u5374\u63d0\u5206\u5f88\u6162：',
        bullets: [
          '\u53ea\u5237\u9898\u4e0d\u590d\u76d8',
          '\u7ec3\u4e60\u4e0d\u8ba1\u65f6（\u8003\u8bd5\u8282\u594f\u611f\u5f88\u5173\u952e）',
          '\u542c\u529b\u4e0d\u56de\u653e\u4e0d\u6838\u5bf9\u6587\u672c',
          '\u6ca1\u6709\u7a33\u5b9a\u7684\u6bcf\u65e5\u6700\u5c0f\u8ba1\u5212',
        ],
      },
      {
        id: 'duhan',
        title: 'DuHan \u5982\u4f55\u5e2e\u52a9\u4f60\u5907\u8003',
        body: '\u4f60\u53ef\u4ee5\u7528 DuHan \u505a\u8ba1\u65f6\u7ec3\u4e60、\u542c\u529b\u97f3\u9891\u8bad\u7ec3，\u5e76\u901a\u8fc7\u5386\u53f2\u8bb0\u5f55\u590d\u76d8，\u6309\u5468\u770b\u5230\u8fdb\u6b65。',
        bullets: [
          'TOPIK \u542c\u529b\u4e0e\u9605\u8bfb\u7ec3\u4e60\u4e2d\u5fc3',
          '\u5386\u53f2\u8bb0\u5f55\u4e0e\u9519\u9898\u590d\u76d8',
          '\u6559\u6750\u4f53\u7cfb\u5316\u8bfe\u7a0b\u7528\u4e8e\u65e5\u5e38\u8bcd\u6c47\u8bed\u6cd5',
        ],
      },
    ],
    nextTitle: '\u4e0b\u4e00\u6b65：\u9009\u62e9\u4f60\u7684\u8bad\u7ec3\u91cd\u70b9',
  },
  vi: {
    h1: 'Hướng dẫn TOPIK: học gì và tăng điểm nhanh hơn',
    intro:
      'Hướng dẫn này giúp bạn chuẩn bị TOPIK II theo một vòng lặp đơn giản: học -> luyện có tính giờ -> xem lại lỗi -> tập trung vào phần yếu.',
    tocTitle: 'Mục lục',
    toc: [
      { label: 'Tổng quan TOPIK II', href: '#overview' },
      { label: 'Vòng lặp 4 bước', href: '#loop' },
      { label: 'Lỗi thường gặp', href: '#mistakes' },
      { label: 'DuHan hỗ trợ thế nào', href: '#duhan' },
    ],
    sections: [
      {
        id: 'overview',
        title: 'Tổng quan TOPIK II (Nghe + Đọc)',
        body: 'Nhiều bạn mất điểm vì thiếu tốc độ hoặc chưa quen mẫu câu hỏi. Mục tiêu là tăng tốc độ và độ chính xác cùng lúc.',
        bullets: [
          'Luyện nghe theo luồng audio-first và nghe lại có mục tiêu',
          'Luyện đọc với bộ câu hỏi có tính giờ',
          'Xem lại lỗi ngay sau khi làm bài',
        ],
      },
      {
        id: 'loop',
        title: 'Vòng lặp 4 bước hiệu quả',
        body: 'Kế hoạch càng đơn giản càng dễ duy trì. Lặp lại 4 đến 6 ngày mỗi tuần:',
        bullets: [
          '1) Học: 30-45 phút từ vựng + ngữ pháp',
          '2) Luyện: 20-40 phút làm bài có tính giờ',
          '3) Xem lại: 15-30 phút phân tích lỗi',
          '4) Sửa: luyện lại phần yếu',
        ],
      },
      {
        id: 'mistakes',
        title: 'Lỗi thường gặp cần tránh',
        body: 'Đây là những “bẫy” phổ biến:',
        bullets: [
          'Làm đề nhiều nhưng không xem lại lỗi',
          'Luyện không canh giờ',
          'Không nghe lại và đối chiếu transcript',
          'Không có thói quen học mỗi ngày',
        ],
      },
      {
        id: 'duhan',
        title: 'DuHan giúp bạn chuẩn bị',
        body: 'Dùng DuHan để luyện có tính giờ, luyện nghe theo luồng audio và xem lịch sử làm bài để đo tiến bộ theo tuần.',
        bullets: [
          'Trung tâm luyện TOPIK nghe và đọc',
          'Lịch sử và xem lại lỗi sai',
          'Khóa học theo giáo trình cho từ vựng và ngữ pháp hằng ngày',
        ],
      },
    ],
    nextTitle: 'Tiếp theo: chọn trọng tâm',
  },
  mn: {
    h1: 'TOPIK гарын авлага: юу сурах, хэрхэн оноогоо өсгөх',
    intro:
      'Энэ гарын авлага TOPIK II-д зориулсан энгийн давталтыг санал болгоно: сурах -> цагтай дасгал -> алдаа хяналт -> сул хэсгээ засах.',
    tocTitle: 'Энэ хуудсанд',
    toc: [
      { label: 'TOPIK II тойм', href: '#overview' },
      { label: '4 алхамт давталт', href: '#loop' },
      { label: 'Түгээмэл алдаа', href: '#mistakes' },
      { label: 'DuHan хэрхэн туслах вэ', href: '#duhan' },
    ],
    sections: [
      {
        id: 'overview',
        title: 'TOPIK II тойм (Сонсгол + Уншлага)',
        body: 'Олон суралцагч мэдлэг дутсандаа биш, харин цаг дуусах эсвэл хэв маягт дасахгүйгээс оноо алдана. Зорилго нь хурд ба зөв байдлыг хамт өсгөх.',
        bullets: [
          'Сонсголыг audio-first урсгалаар давтан сонс',
          'Уншлагыг цагтай багцаар хий',
          'Алдаагаа даруй хяна',
        ],
      },
      {
        id: 'loop',
        title: 'Үр дүнтэй 4 алхамт давталт',
        body: 'Төлөвлөгөөгөө хялбар байлга. Долоо хоногт 4-6 өдөр дараах давталтыг хий:',
        bullets: [
          '1) Сурах: 30-45 мин үгийн сан + дүрэм',
          '2) Дасгал: 20-40 мин цагтай бод',
          '3) Хяналт: 15-30 мин алдаа задлах',
          '4) Засах: сул хэсгээ дахин давтах',
        ],
      },
      {
        id: 'mistakes',
        title: 'Зайлсхийх түгээмэл алдаа',
        body: 'Хамгийн том “урхи”:',
        bullets: [
          'Алдаа хянахгүйгээр олон бодох',
          'Цаг барихгүй дасгал хийх',
          'Сонсголыг дахин сонсож шалгахгүй байх',
          'Тогтмол дадалгүй сурах',
        ],
      },
      {
        id: 'duhan',
        title: 'DuHan хэрхэн туслах вэ',
        body: 'DuHan-ийг цагтай дасгал, сонсголын аудио урсгал, түүхээрээ хяналт хийхэд ашигла. Ингэснээр ахиц долоо хоногоор хэмжигдэнэ.',
        bullets: [
          'TOPIK сонсгол ба уншлагын дасгалын төв',
          'Түүх ба алдаа хяналт',
          'Өдөр тутмын үгийн сан, дүрэмд зориулсан курс',
        ],
      },
    ],
    nextTitle: 'Дараагийн алхам: чиглэлээ сонго',
  },
};

function Section({
  id,
  title,
  body,
  bullets,
}: {
  id: string;
  title: string;
  body: string;
  bullets?: string[];
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-2xl font-black text-foreground">{title}</h2>
      <p className="mt-3 text-muted-foreground font-semibold leading-relaxed">{body}</p>
      {bullets && bullets.length > 0 && (
        <ul className="mt-4 space-y-2">
          {bullets.map((b, idx) => (
            <li key={idx} className="flex gap-3 text-muted-foreground font-semibold">
              <span className="mt-2 h-2.5 w-2.5 rounded-full bg-indigo-600 dark:bg-indigo-300 shrink-0" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export const TopikGuidePage: React.FC = () => {
  const location = useLocation();
  const { lang } = useParams<{ lang: string }>();
  const currentLang: Lang = lang && isValidLanguage(lang) ? (lang as Lang) : 'en';
  const copy = COPY[currentLang] || COPY.en;
  const meta = useMemo(() => getRouteMeta(location.pathname), [location.pathname]);

  return (
    <div
      className="min-h-screen bg-[#F0F4F8] dark:bg-background p-6 md:p-12 font-sans"
      style={{
        backgroundImage: 'radial-gradient(hsl(var(--border) / 0.85) 1.5px, transparent 1.5px)',
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
            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex-1">
                <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tight">
                  {copy.h1}
                </h1>
                <p className="mt-4 text-muted-foreground font-semibold leading-relaxed max-w-3xl">
                  {copy.intro}
                </p>

                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <Button
                    asChild
                    variant="ghost"
                    size="auto"
                    className="inline-flex items-center justify-center rounded-2xl px-6 py-3 font-black bg-primary text-primary-foreground border-2 border-foreground hover:bg-muted transition"
                  >
                    <LocalizedLink to="/topik">
                      {currentLang === 'en'
                        ? 'Go to TOPIK practice'
                        : currentLang === 'zh'
                          ? '\u524d\u5f80 TOPIK \u7ec3\u4e60'
                          : currentLang === 'vi'
                            ? 'Đi tới luyện TOPIK'
                            : 'TOPIK дасгал руу'}
                    </LocalizedLink>
                  </Button>
                  <Button
                    asChild
                    variant="ghost"
                    size="auto"
                    className="inline-flex items-center justify-center rounded-2xl px-6 py-3 font-black bg-card text-foreground border-2 border-foreground hover:bg-muted transition"
                  >
                    <LocalizedLink to="/pricing">
                      {currentLang === 'en'
                        ? 'See pricing'
                        : currentLang === 'zh'
                          ? '\u67e5\u770b\u4ef7\u683c'
                          : currentLang === 'vi'
                            ? 'Xem bảng giá'
                            : 'Үнийг харах'}
                    </LocalizedLink>
                  </Button>
                </div>
              </div>

              <aside className="w-full md:w-72">
                <div className="rounded-2xl border border-border bg-muted p-5">
                  <div className="font-black text-foreground">{copy.tocTitle}</div>
                  <ul className="mt-3 space-y-2">
                    {copy.toc.map(item => (
                      <li key={item.href}>
                        <a
                          href={item.href}
                          className="text-sm font-bold text-muted-foreground hover:text-foreground underline"
                        >
                          {item.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </aside>
            </div>

            <div className="mt-10 space-y-10">
              {copy.sections.map(s => (
                <Section key={s.id} id={s.id} title={s.title} body={s.body} bullets={s.bullets} />
              ))}
            </div>

            <div className="mt-12 border-t border-border pt-8">
              <h2 className="text-2xl font-black text-foreground">{copy.nextTitle}</h2>
              <div className="mt-4 flex flex-col md:flex-row gap-3">
                <Button
                  asChild
                  variant="ghost"
                  size="auto"
                  className="rounded-2xl px-5 py-3 font-black bg-indigo-600 dark:bg-indigo-500 text-white dark:text-primary-foreground border-2 border-indigo-700 dark:border-indigo-300/60 hover:bg-indigo-700 dark:hover:bg-indigo-400 transition"
                >
                  <LocalizedLink to="/topik/listening">
                    {currentLang === 'en'
                      ? 'Listening strategy'
                      : currentLang === 'zh'
                        ? '\u542c\u529b\u7b56\u7565'
                        : currentLang === 'vi'
                          ? 'Chiến lược nghe'
                          : 'Сонсголын стратеги'}
                  </LocalizedLink>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  size="auto"
                  className="rounded-2xl px-5 py-3 font-black bg-card text-foreground border-2 border-foreground hover:bg-muted transition"
                >
                  <LocalizedLink to="/topik/reading">
                    {currentLang === 'en'
                      ? 'Reading strategy'
                      : currentLang === 'zh'
                        ? '\u9605\u8bfb\u7b56\u7565'
                        : currentLang === 'vi'
                          ? 'Chiến lược đọc'
                          : 'Уншлагын стратеги'}
                  </LocalizedLink>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  size="auto"
                  className="rounded-2xl px-5 py-3 font-black bg-card text-foreground border-2 border-foreground hover:bg-muted transition"
                >
                  <LocalizedLink to="/topik/study-plan">
                    {currentLang === 'en'
                      ? '4-week plan'
                      : currentLang === 'zh'
                        ? '4 \u5468\u8ba1\u5212'
                        : currentLang === 'vi'
                          ? 'Kế hoạch 4 tuần'
                          : '4 долоо хоногийн төлөвлөгөө'}
                  </LocalizedLink>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopikGuidePage;
