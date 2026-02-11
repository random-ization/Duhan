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
    weeks: Array<{ title: string; items: string[] }>;
    note: string;
  }
> = {
  en: {
    h1: 'A practical 4-week TOPIK II study plan',
    intro:
      'This plan is designed for consistency. Adjust time up or down, but keep the structure: learn, timed practice, review.',
    weeks: [
      {
        title: 'Week 1: Baseline + routine',
        items: [
          'Take 1 timed set for listening and reading',
          'Start a daily vocabulary + grammar block',
          'Write down your top 3 weak patterns',
        ],
      },
      {
        title: 'Week 2: Pattern training',
        items: [
          'Target your weak question types',
          'Add transcript checking for listening',
          'Keep practice timed, even when it feels bad',
        ],
      },
      {
        title: 'Week 3: Speed and stability',
        items: [
          'Increase timed volume slightly',
          'Add strict time caps for reading blocks',
          'Review mistakes on the same day',
        ],
      },
      {
        title: 'Week 4: Mock exam and polish',
        items: [
          'Do 1 to 2 full mock runs',
          'Only fix highest-impact weak spots',
          'Sleep and consistency beat cramming',
        ],
      },
    ],
    note: 'If you only have 30 minutes a day: do 10 min vocab, 10 min timed practice, 10 min review.',
  },
  zh: {
    h1: 'TOPIK II 四周实用备考计划',
    intro: '这份计划强调可坚持。时间可增可减，但结构不变：学习、计时练习、复盘。',
    weeks: [
      {
        title: '第 1 周：摸底 + 建立节奏',
        items: [
          '各做一次听力/阅读计时训练',
          '建立每日词汇 + 语法学习块',
          '记录最薄弱的 3 个题型/错误模式',
        ],
      },
      {
        title: '第 2 周：题型与规律训练',
        items: ['针对薄弱题型集中练', '听力加入核对文本/关键词', '坚持计时，哪怕做得很难受'],
      },
      {
        title: '第 3 周：速度与稳定性',
        items: ['适度增加计时训练量', '阅读设置严格时间上限', '错题当天复盘'],
      },
      {
        title: '第 4 周：模考与收尾',
        items: ['做 1-2 次完整模考', '只修正最高收益的薄弱点', '睡眠与稳定胜过临时抱佛脚'],
      },
    ],
    note: '如果每天只有 30 分钟：10 分钟词汇 + 10 分钟计时练习 + 10 分钟复盘。',
  },
  vi: {
    h1: 'Kế hoạch 4 tuần luyện TOPIK II thực tế',
    intro:
      'Kế hoạch này ưu tiên sự đều đặn. Có thể tăng/giảm thời lượng, nhưng giữ cấu trúc: học, luyện có giờ, xem lại.',
    weeks: [
      {
        title: 'Tuần 1: Đánh giá + tạo thói quen',
        items: [
          'Làm 1 set nghe và 1 set đọc có tính giờ',
          'Bắt đầu khối học từ vựng + ngữ pháp hằng ngày',
          'Ghi 3 dạng yếu nhất',
        ],
      },
      {
        title: 'Tuần 2: Luyện theo mẫu',
        items: [
          'Tập trung vào dạng câu hỏi yếu',
          'Nghe: đối chiếu transcript',
          'Luôn canh giờ, dù cảm giác khó',
        ],
      },
      {
        title: 'Tuần 3: Tốc độ và ổn định',
        items: [
          'Tăng nhẹ khối lượng luyện có giờ',
          'Đọc: đặt giới hạn thời gian nghiêm',
          'Xem lại lỗi trong ngày',
        ],
      },
      {
        title: 'Tuần 4: Thi thử và hoàn thiện',
        items: [
          'Làm 1-2 lượt thi thử đầy đủ',
          'Chỉ sửa phần yếu có tác động lớn',
          'Ngủ đủ và đều đặn hơn là nhồi',
        ],
      },
    ],
    note: 'Nếu chỉ có 30 phút/ngày: 10p từ vựng, 10p luyện có giờ, 10p xem lại.',
  },
  mn: {
    h1: 'TOPIK II 4 долоо хоногийн бодит төлөвлөгөө',
    intro:
      'Энэ төлөвлөгөө тогтвортой байдлыг эрхэмлэнэ. Хугацааг нэм/хасаж болно, гэхдээ бүтэц нь: сурах, цагтай дасгал, алдаа хяналт.',
    weeks: [
      {
        title: '1-р долоо хоног: Суурь түвшин + дадал',
        items: [
          'Сонсгол ба уншлагын тус бүр 1 цагтай дасгал',
          'Өдөр тутмын үгийн сан + дүрэм',
          'Сул 3 хэв маягаа тэмдэглэх',
        ],
      },
      {
        title: '2-р долоо хоног: Хэв маяг сургах',
        items: [
          'Сул асуултын төрлүүдээ онил',
          'Сонсгол: тексттэй тулгах',
          'Цаг барилтаа бүү сулруул',
        ],
      },
      {
        title: '3-р долоо хоног: Хурд ба тогтвортой байдал',
        items: [
          'Цагтай дасгалын хэмжээг бага зэрэг өсгөх',
          'Уншлага: хатуу хугацааны хязгаар',
          'Алдаагаа тухайн өдөр нь хянах',
        ],
      },
      {
        title: '4-р долоо хоног: Жишиг шалгалт + өнгөлгөө',
        items: [
          '1-2 бүтэн жишиг шалгалт',
          'Хамгийн өндөр өгөөжтэй сул хэсгээ л зас',
          'Нойр ба тогтмол дадал нь чухал',
        ],
      },
    ],
    note: 'Хэрэв өдөрт 30 минут л байвал: 10 мин үг, 10 мин цагтай дасгал, 10 мин алдаа хяналт.',
  },
};

export const TopikStudyPlanPage: React.FC = () => {
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

            <div className="mt-10 space-y-6">
              {copy.weeks.map(w => (
                <section key={w.title} className="rounded-2xl border border-slate-200 bg-white p-6">
                  <h2 className="text-xl font-black text-slate-900">{w.title}</h2>
                  <ul className="mt-4 space-y-2">
                    {w.items.map((item, idx) => (
                      <li key={idx} className="flex gap-3 text-slate-700 font-semibold">
                        <span className="mt-2 h-2.5 w-2.5 rounded-full bg-emerald-600 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>

            <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="font-black text-slate-900">
                {currentLang === 'en'
                  ? 'Note'
                  : currentLang === 'zh'
                    ? '提示'
                    : currentLang === 'vi'
                      ? 'Ghi chú'
                      : 'Тэмдэглэл'}
              </div>
              <p className="mt-2 text-slate-700 font-semibold">{copy.note}</p>
            </div>

            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <LocalizedLink
                to="/topik"
                className="inline-flex items-center justify-center rounded-2xl px-6 py-3 font-black bg-slate-900 text-white border-2 border-slate-900 hover:bg-slate-800 transition"
              >
                {currentLang === 'en'
                  ? 'Start practice'
                  : currentLang === 'zh'
                    ? '开始练习'
                    : currentLang === 'vi'
                      ? 'Bắt đầu luyện'
                      : 'Дасгал эхлэх'}
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

export default TopikStudyPlanPage;
