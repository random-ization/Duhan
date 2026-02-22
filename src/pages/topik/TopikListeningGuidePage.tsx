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
    stepsTitle: string;
    steps: string[];
    drillsTitle: string;
    drills: string[];
    cta: string;
  }
> = {
  en: {
    h1: 'TOPIK Listening strategy (that builds real speed)',
    intro:
      'Listening is not just “understanding”. It is prediction, pattern recognition, and staying calm under time pressure.',
    stepsTitle: 'A simple listening routine',
    steps: [
      '1) First pass: answer once, no pausing',
      '2) Second pass: replay hard parts and write down why you missed it',
      '3) Fix pass: repeat the same question type until it feels easy',
    ],
    drillsTitle: 'High ROI drills',
    drills: [
      'Shadowing (repeat short chunks out loud)',
      'Dictation for 1 to 2 minutes of audio',
      'Transcript check: find the exact phrase that tricked you',
    ],
    cta: 'Practice listening now',
  },
  zh: {
    h1: 'TOPIK \u542c\u529b\u7b56\u7565（\u771f\u6b63\u63d0\u5347\u901f\u5ea6\u4e0e\u7a33\u5b9a\u6027）',
    intro: '\u542c\u529b\u4e0d\u53ea\u662f“\u542c\u61c2”。\u66f4\u91cd\u8981\u7684\u662f\u9884\u5224、\u9898\u578b\u89c4\u5f8b，\u4ee5\u53ca\u5728\u8ba1\u65f6\u538b\u529b\u4e0b\u4fdd\u6301\u7a33\u5b9a。',
    stepsTitle: '\u7b80\u5355\u53ef\u575a\u6301\u7684\u542c\u529b\u6d41\u7a0b',
    steps: [
      '1）\u7b2c\u4e00\u904d：\u4e0d\u6682\u505c，\u6309\u8003\u8bd5\u8282\u594f\u505a',
      '2）\u7b2c\u4e8c\u904d：\u56de\u653e\u96be\u70b9，\u5199\u4e0b\u9519\u56e0',
      '3）\u4fee\u6b63：\u9488\u5bf9\u540c\u9898\u578b\u91cd\u590d\u8bad\u7ec3\u76f4\u5230\u53d8\u7b80\u5355',
    ],
    drillsTitle: '\u6700\u503c\u5f97\u505a\u7684\u8bad\u7ec3',
    drills: ['\u8ddf\u8bfb（\u77ed\u53e5\u53cd\u590d\u8ddf\u8bfb）', '\u542c\u5199（1-2 \u5206\u949f\u97f3\u9891\u5373\u53ef）', '\u6838\u5bf9\u6587\u672c：\u627e\u51fa\u5e72\u6270\u4f60\u7684\u5173\u952e\u8868\u8fbe'],
    cta: '\u7acb\u5373\u7ec3\u542c\u529b',
  },
  vi: {
    h1: 'Chiến lược nghe TOPIK (tăng tốc độ thật sự)',
    intro:
      'Nghe không chỉ là “hiểu”. Đó là dự đoán, nhận dạng mẫu câu hỏi và giữ bình tĩnh khi bị áp lực thời gian.',
    stepsTitle: 'Quy trình luyện nghe đơn giản',
    steps: [
      '1) Lần 1: làm một lượt, không dừng',
      '2) Lần 2: nghe lại phần khó và ghi lý do sai',
      '3) Sửa: luyện lại cùng dạng câu hỏi cho đến khi dễ',
    ],
    drillsTitle: 'Bài tập hiệu quả cao',
    drills: [
      'Shadowing (nhại lại đoạn ngắn)',
      'Chép chính tả 1-2 phút audio',
      'Đối chiếu transcript: tìm cụm từ gây nhầm',
    ],
    cta: 'Luyện nghe ngay',
  },
  mn: {
    h1: 'TOPIK сонсголын стратеги (жинхэнэ хурд бий болгох)',
    intro:
      'Сонсгол нь зөвхөн “ойлгох” биш. Таамаглах, хэв маяг таних, цагийн даралттай тайван байх чадвар юм.',
    stepsTitle: 'Энгийн сонсголын дадал',
    steps: [
      '1) 1-р удаа: зогсоолгүй нэг яв',
      '2) 2-р удаа: хэцүү хэсгийг давтаж алдааны шалтгааныг бич',
      '3) Засах: ижил төрлийн асуултыг амархан болтол давт',
    ],
    drillsTitle: 'Өндөр өгөөжтэй дасгал',
    drills: [
      'Shadowing (богино хэсгийг чангаар дагах)',
      '1-2 минут аудио сонсоод бичих',
      'Текст шалгах: төөрөгдүүлсэн хэллэгийг ол',
    ],
    cta: 'Сонсгол дасгал хийх',
  },
};

export const TopikListeningGuidePage: React.FC = () => {
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
                <h2 className="text-xl font-black text-foreground">{copy.stepsTitle}</h2>
                <ul className="mt-4 space-y-2">
                  {copy.steps.map((s, idx) => (
                    <li key={idx} className="flex gap-3 text-muted-foreground font-semibold">
                      <span className="mt-2 h-2.5 w-2.5 rounded-full bg-violet-600 dark:bg-violet-300 shrink-0" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="text-xl font-black text-foreground">{copy.drillsTitle}</h2>
                <ul className="mt-4 space-y-2">
                  {copy.drills.map((s, idx) => (
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

export default TopikListeningGuidePage;
