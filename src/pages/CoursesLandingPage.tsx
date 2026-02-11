import React, { useMemo } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { SEO as Seo } from '../seo/SEO';
import { getRouteMeta } from '../seo/publicRoutes';
import { LocalizedLink } from '../components/LocalizedLink';
import { isValidLanguage } from '../components/LanguageRouter';

type Lang = 'en' | 'zh' | 'vi' | 'mn';

const COPY: Record<
  Lang,
  {
    heroTitle: string;
    heroSubtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
    blocks: Array<{ title: string; body: string }>;
  }
> = {
  en: {
    heroTitle: 'Structured Korean courses built around real textbooks',
    heroSubtitle:
      'Learn vocabulary, grammar, and reading with a clear path. DuHan helps you stay consistent and track progress.',
    ctaPrimary: 'Browse courses',
    ctaSecondary: 'Start free',
    blocks: [
      {
        title: 'Textbook-first structure',
        body: 'Follow a curriculum that makes sense: levels, units, and modules aligned with real learning materials.',
      },
      {
        title: 'Vocabulary and grammar practice',
        body: 'Turn each unit into actionable practice, with review loops that help you remember more.',
      },
      {
        title: 'Progress you can see',
        body: "Track what you studied and what to review next, so your learning doesn't drift.",
      },
    ],
  },
  zh: {
    heroTitle: '围绕教材的体系化韩语课程',
    heroSubtitle: '按清晰路径学习词汇、语法与阅读。DuHan 帮你保持节奏并追踪进度。',
    ctaPrimary: '浏览课程',
    ctaSecondary: '免费开始',
    blocks: [
      {
        title: '教材优先的学习结构',
        body: '按等级、单元与模块推进，与你熟悉的学习材料一致，学习更稳。',
      },
      {
        title: '词汇与语法练习',
        body: '把每一课变成可执行的练习与复习循环，更容易记住与应用。',
      },
      {
        title: '看得见的学习进度',
        body: '清晰记录学习内容与下一步复习重点，避免学习走偏。',
      },
    ],
  },
  vi: {
    heroTitle: 'Khóa học tiếng Hàn có lộ trình rõ ràng theo giáo trình',
    heroSubtitle:
      'Học từ vựng, ngữ pháp và đọc hiểu theo lộ trình. DuHan giúp bạn duy trì thói quen và theo dõi tiến độ.',
    ctaPrimary: 'Xem khóa học',
    ctaSecondary: 'Bắt đầu miễn phí',
    blocks: [
      {
        title: 'Học theo giáo trình',
        body: 'Lộ trình theo cấp độ, bài học và mô-đun, bám sát tài liệu học thực tế.',
      },
      {
        title: 'Luyện từ vựng và ngữ pháp',
        body: 'Biến mỗi bài học thành luyện tập cụ thể, kèm vòng lặp ôn tập để nhớ lâu hơn.',
      },
      {
        title: 'Theo dõi tiến độ',
        body: 'Biết bạn đã học gì và cần ôn gì tiếp theo để không bị chệch hướng.',
      },
    ],
  },
  mn: {
    heroTitle: 'Сурах бичигт суурилсан бүтэцтэй солонгос хэлний курс',
    heroSubtitle:
      'Үгийн сан, дүрэм, уншлагыг тодорхой замналаар сур. DuHan танд тогтмол суралцах ба ахицаа хянахад тусална.',
    ctaPrimary: 'Курсуудыг үзэх',
    ctaSecondary: 'Үнэгүй эхлэх',
    blocks: [
      {
        title: 'Сурах бичигт суурилсан бүтэц',
        body: 'Түвшин, нэгж, модулиар ахиж бодит сургалтын материалтай нийцсэн замналаар сур.',
      },
      {
        title: 'Үгийн сан ба дүрмийн дасгал',
        body: 'Хичээл бүрийг хэрэгжихүйц дасгал, давталттай болгож илүү сайн тогтооно.',
      },
      {
        title: 'Харагдах ахиц',
        body: 'Юу сурсан, дараа нь юуг давтахаа тодорхой харж, суралцахаа алдахгүй.',
      },
    ],
  },
};

export const CoursesLandingPage: React.FC = () => {
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
        <div className="bg-white rounded-3xl border-2 border-slate-900 shadow-pop overflow-hidden">
          <div className="p-8 md:p-12">
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
              {copy.heroTitle}
            </h1>
            <p className="mt-4 text-slate-600 font-semibold leading-relaxed max-w-3xl">
              {copy.heroSubtitle}
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <LocalizedLink
                to="/login?redirect=/courses"
                className="inline-flex items-center justify-center rounded-2xl px-6 py-3 font-black bg-slate-900 text-white border-2 border-slate-900 hover:bg-slate-800 transition"
              >
                {copy.ctaPrimary}
              </LocalizedLink>
              <LocalizedLink
                to="/register?redirect=/courses"
                className="inline-flex items-center justify-center rounded-2xl px-6 py-3 font-black bg-white text-slate-900 border-2 border-slate-900 hover:bg-slate-50 transition"
              >
                {copy.ctaSecondary}
              </LocalizedLink>
            </div>

            <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
              {copy.blocks.map((b, idx) => (
                <div key={idx} className="rounded-2xl border border-slate-200 bg-white p-6">
                  <h2 className="text-lg font-black text-slate-900">{b.title}</h2>
                  <p className="mt-2 text-sm text-slate-600 font-semibold leading-relaxed">
                    {b.body}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 p-8 md:p-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900">
                {currentLang === 'en'
                  ? 'Also preparing for TOPIK?'
                  : currentLang === 'zh'
                    ? '同时在备考 TOPIK？'
                    : currentLang === 'vi'
                      ? 'Bạn cũng đang luyện TOPIK?'
                      : 'TOPIK-д бас бэлдэж байна уу?'}
              </h2>
              <p className="mt-1 text-slate-600 font-semibold">
                {currentLang === 'en'
                  ? 'Use DuHan TOPIK practice to test your skills under time pressure.'
                  : currentLang === 'zh'
                    ? '用 DuHan 的 TOPIK 练习在计时环境下检验与提升能力。'
                    : currentLang === 'vi'
                      ? 'Dùng luyện TOPIK của DuHan để kiểm tra kỹ năng dưới áp lực thời gian.'
                      : 'DuHan TOPIK дасгалаар цагийн даралттайгаар чадвараа шалгаарай.'}
              </p>
            </div>
            <LocalizedLink
              to="/topik"
              className="inline-flex items-center justify-center rounded-2xl px-6 py-3 font-black bg-indigo-600 text-white border-2 border-indigo-700 hover:bg-indigo-700 transition"
            >
              {currentLang === 'en'
                ? 'Go to TOPIK practice'
                : currentLang === 'zh'
                  ? '前往 TOPIK 练习'
                  : currentLang === 'vi'
                    ? 'Đi tới luyện TOPIK'
                    : 'TOPIK дасгал руу'}
            </LocalizedLink>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoursesLandingPage;
