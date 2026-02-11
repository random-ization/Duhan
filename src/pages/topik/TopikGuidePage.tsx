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
    h1: 'TOPIK 备考指南：学什么，如何更快提分',
    intro:
      '这份指南针对 TOPIK II，总结一个可重复的备考循环：学习 -> 计时练习 -> 错题复盘 -> 针对薄弱点修正。',
    tocTitle: '目录',
    toc: [
      { label: 'TOPIK II 概览', href: '#overview' },
      { label: '四步备考循环', href: '#loop' },
      { label: '常见错误', href: '#mistakes' },
      { label: 'DuHan 如何帮助', href: '#duhan' },
    ],
    sections: [
      {
        id: 'overview',
        title: 'TOPIK II 概览（听力 + 阅读）',
        body: '很多人丢分不是因为不会，而是因为时间不够或题型规律不熟。你的目标是同时提升速度和准确率。',
        bullets: [
          '听力用音频优先的练习方式反复精听',
          '阅读用计时训练题型与信息定位',
          '复盘要趁记忆还新鲜立刻做',
        ],
      },
      {
        id: 'loop',
        title: '真正有效的四步循环',
        body: '计划越简单越容易坚持。建议每周 4 到 6 天重复以下循环：',
        bullets: [
          '1）学习：30-45 分钟 词汇 + 语法',
          '2）练习：20-40 分钟 计时做题',
          '3）复盘：15-30 分钟 错题复盘',
          '4）修正：针对薄弱题型重复训练',
        ],
      },
      {
        id: 'mistakes',
        title: '最常见的坑',
        body: '这些错误会让你投入很多却提分很慢：',
        bullets: [
          '只刷题不复盘',
          '练习不计时（考试节奏感很关键）',
          '听力不回放不核对文本',
          '没有稳定的每日最小计划',
        ],
      },
      {
        id: 'duhan',
        title: 'DuHan 如何帮助你备考',
        body: '你可以用 DuHan 做计时练习、听力音频训练，并通过历史记录复盘，按周看到进步。',
        bullets: [
          'TOPIK 听力与阅读练习中心',
          '历史记录与错题复盘',
          '教材体系化课程用于日常词汇语法',
        ],
      },
    ],
    nextTitle: '下一步：选择你的训练重点',
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
      <h2 className="text-2xl font-black text-slate-900">{title}</h2>
      <p className="mt-3 text-slate-700 font-semibold leading-relaxed">{body}</p>
      {bullets && bullets.length > 0 && (
        <ul className="mt-4 space-y-2">
          {bullets.map((b, idx) => (
            <li key={idx} className="flex gap-3 text-slate-700 font-semibold">
              <span className="mt-2 h-2.5 w-2.5 rounded-full bg-indigo-600 shrink-0" />
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
            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex-1">
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
                  {copy.h1}
                </h1>
                <p className="mt-4 text-slate-700 font-semibold leading-relaxed max-w-3xl">
                  {copy.intro}
                </p>

                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <LocalizedLink
                    to="/topik"
                    className="inline-flex items-center justify-center rounded-2xl px-6 py-3 font-black bg-slate-900 text-white border-2 border-slate-900 hover:bg-slate-800 transition"
                  >
                    {currentLang === 'en'
                      ? 'Go to TOPIK practice'
                      : currentLang === 'zh'
                        ? '前往 TOPIK 练习'
                        : currentLang === 'vi'
                          ? 'Đi tới luyện TOPIK'
                          : 'TOPIK дасгал руу'}
                  </LocalizedLink>
                  <LocalizedLink
                    to="/pricing"
                    className="inline-flex items-center justify-center rounded-2xl px-6 py-3 font-black bg-white text-slate-900 border-2 border-slate-900 hover:bg-slate-50 transition"
                  >
                    {currentLang === 'en'
                      ? 'See pricing'
                      : currentLang === 'zh'
                        ? '查看价格'
                        : currentLang === 'vi'
                          ? 'Xem bảng giá'
                          : 'Үнийг харах'}
                  </LocalizedLink>
                </div>
              </div>

              <aside className="w-full md:w-72">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="font-black text-slate-900">{copy.tocTitle}</div>
                  <ul className="mt-3 space-y-2">
                    {copy.toc.map(item => (
                      <li key={item.href}>
                        <a
                          href={item.href}
                          className="text-sm font-bold text-slate-700 hover:text-slate-900 underline"
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

            <div className="mt-12 border-t border-slate-100 pt-8">
              <h2 className="text-2xl font-black text-slate-900">{copy.nextTitle}</h2>
              <div className="mt-4 flex flex-col md:flex-row gap-3">
                <LocalizedLink
                  to="/topik/listening"
                  className="rounded-2xl px-5 py-3 font-black bg-indigo-600 text-white border-2 border-indigo-700 hover:bg-indigo-700 transition"
                >
                  {currentLang === 'en'
                    ? 'Listening strategy'
                    : currentLang === 'zh'
                      ? '听力策略'
                      : currentLang === 'vi'
                        ? 'Chiến lược nghe'
                        : 'Сонсголын стратеги'}
                </LocalizedLink>
                <LocalizedLink
                  to="/topik/reading"
                  className="rounded-2xl px-5 py-3 font-black bg-white text-slate-900 border-2 border-slate-900 hover:bg-slate-50 transition"
                >
                  {currentLang === 'en'
                    ? 'Reading strategy'
                    : currentLang === 'zh'
                      ? '阅读策略'
                      : currentLang === 'vi'
                        ? 'Chiến lược đọc'
                        : 'Уншлагын стратеги'}
                </LocalizedLink>
                <LocalizedLink
                  to="/topik/study-plan"
                  className="rounded-2xl px-5 py-3 font-black bg-white text-slate-900 border-2 border-slate-900 hover:bg-slate-50 transition"
                >
                  {currentLang === 'en'
                    ? '4-week plan'
                    : currentLang === 'zh'
                      ? '4 周计划'
                      : currentLang === 'vi'
                        ? 'Kế hoạch 4 tuần'
                        : '4 долоо хоногийн төлөвлөгөө'}
                </LocalizedLink>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopikGuidePage;
