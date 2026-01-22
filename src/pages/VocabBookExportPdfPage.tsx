import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from 'convex/react';
import QRCode from 'qrcode';
import { useAuth } from '../contexts/AuthContext';
import { VOCAB } from '../utils/convexRefs';

type VocabBookCategory = 'UNLEARNED' | 'DUE' | 'MASTERED';
type ExportMode = 'A4_DICTATION' | 'LANG_LIST' | 'KO_LIST';

type Labels = {
  title: string;
  wordHeader: string;
  meaningHeader: string;
  domainLabel: string;
  slogan: string;
  footerName: string;
  footerDesc: string;
  footerLink: string;
  preparing: string;
};

const getPdfLabels = (language: string, origin: string): Labels => {
  if (language === 'zh') {
    return {
      title: '单词学习表',
      wordHeader: '韩语',
      meaningHeader: '释义',
      domainLabel: origin.replace(/^https?:\/\//, ''),
      slogan: '每天 10 分钟，轻松学韩语',
      footerName: 'DuHan',
      footerDesc: '韩语学习平台 · 生词本/刷词/听写',
      footerLink: origin,
      preparing: '正在准备打印…',
    };
  }
  if (language === 'vi') {
    return {
      title: 'Bảng học từ',
      wordHeader: 'Tiếng Hàn',
      meaningHeader: 'Nghĩa',
      domainLabel: origin.replace(/^https?:\/\//, ''),
      slogan: '10 phút mỗi ngày, học tiếng Hàn dễ dàng',
      footerName: 'DuHan',
      footerDesc: 'Nền tảng học tiếng Hàn · Sổ từ/Ôn tập/Nghe chép',
      footerLink: origin,
      preparing: 'Đang chuẩn bị in…',
    };
  }
  if (language === 'mn') {
    return {
      title: 'Үг сурах хүснэгт',
      wordHeader: 'Солонгос',
      meaningHeader: 'Утга',
      domainLabel: origin.replace(/^https?:\/\//, ''),
      slogan: 'Өдөрт 10 минут, солонгос хэлийг амархан сур',
      footerName: 'DuHan',
      footerDesc: 'Солонгос хэл сурах платформ · Үгийн дэвтэр/Давталт/Диктант',
      footerLink: origin,
      preparing: 'Хэвлэхийг бэлтгэж байна…',
    };
  }
  return {
    title: 'Word Study Sheet',
    wordHeader: 'Korean',
    meaningHeader: 'Meaning',
    domainLabel: origin.replace(/^https?:\/\//, ''),
    slogan: '10 minutes a day, learn Korean easily',
    footerName: 'DuHan',
    footerDesc: 'Korean learning platform · Vocab book/Review/Dictation',
    footerLink: origin,
    preparing: 'Preparing to print…',
  };
};

const getLanguageListTitle = (language: string) => {
  if (language === 'zh') return '中文词表';
  if (language === 'vi') return 'Từ vựng tiếng Việt';
  if (language === 'mn') return 'Монгол үгийн жагсаалт';
  return 'English List';
};

const getMeaningForLanguage = (
  item: { meaning: string; meaningEn?: string; meaningVi?: string; meaningMn?: string },
  language: string
) => {
  if (language === 'zh') return item.meaning;
  if (language === 'vi') return item.meaningVi || item.meaning || item.meaningEn || '';
  if (language === 'mn') return item.meaningMn || item.meaning || item.meaningEn || '';
  return item.meaningEn || item.meaning || '';
};

const shuffleCopy = <T,>(arr: T[]) => {
  const copy = [...arr];
  const rnd = new Uint32Array(copy.length);
  crypto.getRandomValues(rnd);
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = rnd[i] % (i + 1);
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
};

const ROWS_PER_COL = 20;
const ROWS_PER_PAGE = ROWS_PER_COL * 2;

const VocabBookExportPdfPage: React.FC = () => {
  const { language } = useAuth();
  const [params] = useSearchParams();
  const origin = window.location.origin;
  const labels = useMemo(() => getPdfLabels(language, origin), [language, origin]);

  const categoryParam = (params.get('category') || 'DUE').toUpperCase();
  const q = params.get('q')?.trim();
  const modeParam = (params.get('mode') || 'A4_DICTATION').toUpperCase();
  const shuffle = params.get('shuffle') === '1';

  const category: VocabBookCategory =
    categoryParam === 'UNLEARNED' || categoryParam === 'MASTERED' || categoryParam === 'DUE'
      ? (categoryParam as VocabBookCategory)
      : 'DUE';

  const mode: ExportMode =
    modeParam === 'A4_DICTATION' || modeParam === 'LANG_LIST' || modeParam === 'KO_LIST'
      ? (modeParam as ExportMode)
      : 'A4_DICTATION';

  const vocabBookResult = useQuery(VOCAB.getVocabBook, {
    includeMastered: true,
    search: q || undefined,
  });

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const url = await QRCode.toDataURL(origin, { margin: 0, width: 256 });
      if (!cancelled) setQrDataUrl(url);
    })();
    return () => {
      cancelled = true;
    };
  }, [origin]);

  const loading = vocabBookResult === undefined || qrDataUrl == null;
  const items = useMemo(() => vocabBookResult ?? [], [vocabBookResult]);

  const filtered = useMemo(() => {
    const base = items.filter(item => {
      const p = item.progress;
      const isMastered = p.status === 'MASTERED';
      const isUnlearned = p.state === 0 || p.status === 'NEW';
      const c: VocabBookCategory = isMastered ? 'MASTERED' : isUnlearned ? 'UNLEARNED' : 'DUE';
      return c === category;
    });
    return shuffle ? shuffleCopy(base) : base;
  }, [items, category, shuffle]);

  const subtitle = useMemo(() => {
    const cat =
      category === 'DUE'
        ? language === 'zh'
          ? '待复习'
          : 'Due'
        : category === 'UNLEARNED'
          ? language === 'zh'
            ? '未学习'
            : 'Unlearned'
          : language === 'zh'
            ? '已掌握'
            : 'Mastered';

    const modeLabel =
      mode === 'A4_DICTATION'
        ? language === 'zh'
          ? 'A4 默写'
          : 'A4 Dictation'
        : mode === 'LANG_LIST'
          ? getLanguageListTitle(language)
          : language === 'zh'
            ? '韩语词表'
            : 'Korean List';
    const base = `${cat} · ${modeLabel}`;
    return q ? `${base} · ${q}` : base;
  }, [category, language, mode, q]);

  const pages = useMemo(() => {
    const totalPages = Math.ceil(filtered.length / ROWS_PER_PAGE);
    const result: Array<{ left: typeof filtered; right: typeof filtered; pageIndex: number }> = [];
    for (let p = 0; p < totalPages; p += 1) {
      const start = p * ROWS_PER_PAGE;
      const left = filtered.slice(start, start + ROWS_PER_COL);
      const right = filtered.slice(start + ROWS_PER_COL, start + ROWS_PER_COL * 2);
      result.push({ left, right, pageIndex: p });
    }
    return result;
  }, [filtered]);

  useEffect(() => {
    if (loading) return;
    const timer = window.setTimeout(() => window.print(), 250);
    const onAfterPrint = () => {
      window.close();
    };
    window.addEventListener('afterprint', onAfterPrint);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('afterprint', onAfterPrint);
    };
  }, [loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-600 font-bold">
        {labels.preparing}
      </div>
    );
  }

  const showWord = (half: 'left' | 'right') => {
    if (mode === 'KO_LIST') return true;
    if (mode === 'LANG_LIST') return false;
    return half === 'left';
  };

  const showMeaning = (half: 'left' | 'right') => {
    if (mode === 'KO_LIST') return false;
    if (mode === 'LANG_LIST') return true;
    return half === 'right';
  };

  return (
    <div className="print-root">
      <style>{`
        @page { size: A4; margin: 10mm; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        .print-root {
          font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", "Noto Sans KR", "Noto Sans", "Apple SD Gothic Neo", "Segoe UI", Roboto, Arial, sans-serif;
          background: #fff;
          color: #0f172a;
        }
        .page {
          width: 190mm;
          height: 277mm;
          padding: 0;
          box-sizing: border-box;
          break-after: page;
        }
        .header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding-top: 2mm;
          padding-bottom: 4mm;
        }
        .header-left h1 {
          margin: 0;
          font-size: 14pt;
          font-weight: 800;
        }
        .header-left .sub {
          margin-top: 2mm;
          font-size: 9pt;
          color: #64748b;
          font-weight: 700;
        }
        .header-right {
          text-align: right;
        }
        .qr {
          width: 18mm;
          height: 18mm;
        }
        .domain {
          margin-top: 1.5mm;
          font-size: 8pt;
          font-weight: 800;
          color: #334155;
        }
        .slogan {
          margin-top: 1mm;
          font-size: 7pt;
          color: #64748b;
          font-weight: 600;
        }
        .tables {
          display: flex;
          gap: 6mm;
        }
        table.sheet {
          width: 92mm;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 8.5pt;
        }
        table.sheet thead th {
          background: #fdaB8A;
          color: #fff;
          font-weight: 900;
          padding: 2mm 1.5mm;
          border: 0.2mm solid #fdaB8A;
          text-align: center;
        }
        table.sheet td {
          border: 0.2mm solid #e2e8f0;
          padding: 1.6mm 1.5mm;
          vertical-align: middle;
          color: #0f172a;
          word-break: break-word;
        }
        table.sheet tbody tr:nth-child(even) td {
          background: #fff0ea;
        }
        .col-no { width: 8mm; text-align: center; }
        .col-check { width: 6mm; text-align: center; }
        .check {
          display: inline-block;
          width: 3mm;
          height: 3mm;
          border: 0.2mm solid #cbd5e1;
          border-radius: 0.2mm;
        }
        .footer {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          padding-top: 4mm;
          display: flex;
          align-items: center;
          gap: 3mm;
          color: #334155;
        }
        .footer img { width: 8mm; height: 8mm; }
        .footer .name { font-weight: 900; font-size: 9pt; margin: 0; }
        .footer .desc { font-size: 8pt; margin: 0; color: #64748b; font-weight: 600; }
        .footer .link { font-size: 8pt; margin: 0; color: #2563eb; font-weight: 600; }
      `}</style>

      {pages.map(p => (
        <div key={p.pageIndex} className="page">
          <div className="header">
            <div className="header-left">
              <h1>{labels.title}</h1>
              <div className="sub">{subtitle}</div>
            </div>
            <div className="header-right">
              <img className="qr" src={qrDataUrl} alt="qr" />
              <div className="domain">{labels.domainLabel}</div>
              <div className="slogan">{labels.slogan}</div>
            </div>
          </div>

          <div className="tables">
            {(['left', 'right'] as const).map(half => {
              const data = half === 'left' ? p.left : p.right;
              return (
                <table key={half} className="sheet">
                  <thead>
                    <tr>
                      <th className="col-no">#</th>
                      <th>{labels.wordHeader}</th>
                      <th>{labels.meaningHeader}</th>
                      <th className="col-check" />
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: ROWS_PER_COL }, (_, idx) => {
                      const row = data[idx];
                      const no =
                        p.pageIndex * ROWS_PER_PAGE +
                        (half === 'left' ? 0 : ROWS_PER_COL) +
                        idx +
                        1;
                      const word = row?.word || '';
                      const meaning = row ? getMeaningForLanguage(row, language) : '';
                      return (
                        <tr key={idx}>
                          <td className="col-no">{row ? no : ''}</td>
                          <td>{row && showWord(half) ? word : ''}</td>
                          <td>{row && showMeaning(half) ? meaning : ''}</td>
                          <td className="col-check">
                            <span className="check" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              );
            })}
          </div>

          <div className="footer">
            <img src="/logo.png" alt="logo" />
            <div>
              <p className="name">{labels.footerName}</p>
              <p className="desc">{labels.footerDesc}</p>
              <p className="link">{labels.footerLink}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default VocabBookExportPdfPage;
