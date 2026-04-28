export const STOPWORDS = new Set([
  '그리고',
  '하지만',
  '그러나',
  '또한',
  '이것은',
  '그것은',
  '대한',
  '에서',
  '이다',
  '있다',
  '했다',
  '하는',
  '으로',
  '위해',
  '이번',
  '지난',
  '현재',
  '관련',
  '기자',
  '보도',
  '대한민국',
]);

export const TERM_GLOSSARY: Record<
  string,
  { meaning: Record<'zh' | 'en' | 'vi' | 'mn', string>; level: string }
> = {
  기준금리: {
    meaning: {
      zh: '基准利率',
      en: 'base interest rate',
      vi: 'lãi suất cơ bản',
      mn: 'суурь хүү',
    },
    level: 'TOPIK 4',
  },
  동결: {
    meaning: {
      zh: '冻结，维持不变',
      en: 'freeze, keep unchanged',
      vi: 'đóng băng, giữ nguyên',
      mn: 'хэвээр барих',
    },
    level: 'TOPIK 3',
  },
  동결하다: {
    meaning: {
      zh: '冻结，维持不变',
      en: 'freeze, keep unchanged',
      vi: 'đóng băng, giữ nguyên',
      mn: 'хэвээр барих',
    },
    level: 'TOPIK 3',
  },
  가계부채: {
    meaning: {
      zh: '家庭债务',
      en: 'household debt',
      vi: 'nợ hộ gia đình',
      mn: 'өрхийн өр',
    },
    level: 'TOPIK 4',
  },
  물가: {
    meaning: { zh: '物价', en: 'prices', vi: 'giá cả', mn: 'үнийн түвшин' },
    level: 'TOPIK 3',
  },
  상승률: {
    meaning: { zh: '上升率', en: 'growth rate', vi: 'tỷ lệ tăng', mn: 'өсөлтийн хувь' },
    level: 'TOPIK 4',
  },
  가능성: {
    meaning: { zh: '可能性', en: 'possibility', vi: 'khả năng', mn: 'боломж' },
    level: 'TOPIK 3',
  },
  배제: {
    meaning: { zh: '排除', en: 'exclude', vi: 'loại trừ', mn: 'үгүйсгэх' },
    level: 'TOPIK 5',
  },
  충돌: {
    meaning: { zh: '冲突', en: 'conflict', vi: 'xung đột', mn: 'мөргөлдөөн' },
    level: 'TOPIK 4',
  },
};
