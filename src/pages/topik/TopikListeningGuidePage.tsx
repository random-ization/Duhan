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
    h1: 'TOPIK 听力策略（真正提升速度与稳定性）',
    intro: '听力不只是“听懂”。更重要的是预判、题型规律，以及在计时压力下保持稳定。',
    stepsTitle: '简单可坚持的听力流程',
    steps: [
      '1）第一遍：不暂停，按考试节奏做',
      '2）第二遍：回放难点，写下错因',
      '3）修正：针对同题型重复训练直到变简单',
    ],
    drillsTitle: '最值得做的训练',
    drills: ['跟读（短句反复跟读）', '听写（1-2 分钟音频即可）', '核对文本：找出干扰你的关键表达'],
    cta: '立即练听力',
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
                      ? '返回指南'
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
