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
    h1: 'TOPIK II \u56db\u5468\u5b9e\u7528\u5907\u8003\u8ba1\u5212',
    intro: '\u8fd9\u4efd\u8ba1\u5212\u5f3a\u8c03\u53ef\u575a\u6301。\u65f6\u95f4\u53ef\u589e\u53ef\u51cf，\u4f46\u7ed3\u6784\u4e0d\u53d8：\u5b66\u4e60、\u8ba1\u65f6\u7ec3\u4e60、\u590d\u76d8。',
    weeks: [
      {
        title: '\u7b2c 1 \u5468：\u6478\u5e95 + \u5efa\u7acb\u8282\u594f',
        items: [
          '\u5404\u505a\u4e00\u6b21\u542c\u529b/\u9605\u8bfb\u8ba1\u65f6\u8bad\u7ec3',
          '\u5efa\u7acb\u6bcf\u65e5\u8bcd\u6c47 + \u8bed\u6cd5\u5b66\u4e60\u5757',
          '\u8bb0\u5f55\u6700\u8584\u5f31\u7684 3 \u4e2a\u9898\u578b/\u9519\u8bef\u6a21\u5f0f',
        ],
      },
      {
        title: '\u7b2c 2 \u5468：\u9898\u578b\u4e0e\u89c4\u5f8b\u8bad\u7ec3',
        items: ['\u9488\u5bf9\u8584\u5f31\u9898\u578b\u96c6\u4e2d\u7ec3', '\u542c\u529b\u52a0\u5165\u6838\u5bf9\u6587\u672c/\u5173\u952e\u8bcd', '\u575a\u6301\u8ba1\u65f6，\u54ea\u6015\u505a\u5f97\u5f88\u96be\u53d7'],
      },
      {
        title: '\u7b2c 3 \u5468：\u901f\u5ea6\u4e0e\u7a33\u5b9a\u6027',
        items: ['\u9002\u5ea6\u589e\u52a0\u8ba1\u65f6\u8bad\u7ec3\u91cf', '\u9605\u8bfb\u8bbe\u7f6e\u4e25\u683c\u65f6\u95f4\u4e0a\u9650', '\u9519\u9898\u5f53\u5929\u590d\u76d8'],
      },
      {
        title: '\u7b2c 4 \u5468：\u6a21\u8003\u4e0e\u6536\u5c3e',
        items: ['\u505a 1-2 \u6b21\u5b8c\u6574\u6a21\u8003', '\u53ea\u4fee\u6b63\u6700\u9ad8\u6536\u76ca\u7684\u8584\u5f31\u70b9', '\u7761\u7720\u4e0e\u7a33\u5b9a\u80dc\u8fc7\u4e34\u65f6\u62b1\u4f5b\u811a'],
      },
    ],
    note: '\u5982\u679c\u6bcf\u5929\u53ea\u6709 30 \u5206\u949f：10 \u5206\u949f\u8bcd\u6c47 + 10 \u5206\u949f\u8ba1\u65f6\u7ec3\u4e60 + 10 \u5206\u949f\u590d\u76d8。',
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
        <div className="bg-card rounded-3xl border-2 border-foreground shadow-pop overflow-hidden">
          <div className="p-8 md:p-12">
            <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tight">
              {copy.h1}
            </h1>
            <p className="mt-4 text-muted-foreground font-semibold leading-relaxed max-w-3xl">
              {copy.intro}
            </p>

            <div className="mt-10 space-y-6">
              {copy.weeks.map(w => (
                <section key={w.title} className="rounded-2xl border border-border bg-card p-6">
                  <h2 className="text-xl font-black text-foreground">{w.title}</h2>
                  <ul className="mt-4 space-y-2">
                    {w.items.map((item, idx) => (
                      <li key={idx} className="flex gap-3 text-muted-foreground font-semibold">
                        <span className="mt-2 h-2.5 w-2.5 rounded-full bg-emerald-600 dark:bg-emerald-300 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>

            <div className="mt-8 rounded-2xl border border-border bg-muted p-6">
              <div className="font-black text-foreground">
                {currentLang === 'en'
                  ? 'Note'
                  : currentLang === 'zh'
                    ? '\u63d0\u793a'
                    : currentLang === 'vi'
                      ? 'Ghi chú'
                      : 'Тэмдэглэл'}
              </div>
              <p className="mt-2 text-muted-foreground font-semibold">{copy.note}</p>
            </div>

            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <Button
                asChild
                variant="ghost"
                size="auto"
                className="inline-flex items-center justify-center rounded-2xl px-6 py-3 font-black bg-primary text-white border-2 border-foreground hover:bg-muted transition"
              >
                <LocalizedLink to="/topik">
                  {currentLang === 'en'
                    ? 'Start practice'
                    : currentLang === 'zh'
                      ? '\u5f00\u59cb\u7ec3\u4e60'
                      : currentLang === 'vi'
                        ? 'Bắt đầu luyện'
                        : 'Дасгал эхлэх'}
                </LocalizedLink>
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

export default TopikStudyPlanPage;
