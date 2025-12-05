import {
  VocabularyItem,
  ReadingContent,
  GrammarPoint,
  Language,
  TextbookContent,
  TopikQuestion,
} from '../types';

// This service now strictly parses manual content provided by the Admin.
// No AI generation is performed.

export const getMockVocabulary = (lang: Language = 'en'): VocabularyItem[] => {
  // Retaining mock data for demo purposes when DB is empty
  const bases = [
    { k: '학교', e: 'School', p: 'Noun', ex: '저는 학교에 갑니다.', ext: 'I go to school.' },
    {
      k: '친구',
      e: 'Friend',
      p: 'Noun',
      ex: '친구와 영화를 봅니다.',
      ext: 'I watch a movie with a friend.',
    },
    { k: '공부하다', e: 'To study', p: 'Verb', ex: '한국어를 공부합니다.', ext: 'I study Korean.' },
    {
      k: '선생님',
      e: 'Teacher',
      p: 'Noun',
      ex: '선생님이 칠판에 씁니다.',
      ext: 'The teacher writes on the blackboard.',
    },
    {
      k: '학생',
      e: 'Student',
      p: 'Noun',
      ex: '학생들이 교실에 있습니다.',
      ext: 'Students are in the classroom.',
    },
    {
      k: '책',
      e: 'Book',
      p: 'Noun',
      ex: '도서관에서 책을 읽어요.',
      ext: 'I read a book in the library.',
    },
    {
      k: '연필',
      e: 'Pencil',
      p: 'Noun',
      ex: '연필로 이름을 씁니다.',
      ext: 'I write my name with a pencil.',
    },
    { k: '가방', e: 'Bag', p: 'Noun', ex: '가방이 무겁습니다.', ext: 'The bag is heavy.' },
    {
      k: '숙제',
      e: 'Homework',
      p: 'Noun',
      ex: '숙제를 빨리 끝냈어요.',
      ext: 'I finished my homework quickly.',
    },
    {
      k: '시험',
      e: 'Exam',
      p: 'Noun',
      ex: '내일 시험이 있습니다.',
      ext: 'I have an exam tomorrow.',
    },
  ];

  if (lang === 'zh') {
    return [
      {
        korean: '학교',
        english: '学校',
        pos: '名词',
        exampleSentence: '저는 학교에 갑니다.',
        exampleTranslation: '我去学校。',
      },
      {
        korean: '친구',
        english: '朋友',
        pos: '名词',
        exampleSentence: '친구와 영화를 봅니다.',
        exampleTranslation: '我和朋友看电影。',
      },
      {
        korean: '공부하다',
        english: '学习',
        pos: '动词',
        exampleSentence: '한국어를 공부합니다.',
        exampleTranslation: '我学习韩语。',
      },
      {
        korean: '선생님',
        english: '老师',
        pos: '名词',
        exampleSentence: '선생님이 칠판에 씁니다.',
        exampleTranslation: '老师在黑板上写字。',
      },
      {
        korean: '학생',
        english: '学生',
        pos: '名词',
        exampleSentence: '학생들이 교실에 있습니다.',
        exampleTranslation: '学生们在教室里。',
      },
      {
        korean: '책',
        english: '书',
        pos: '名词',
        exampleSentence: '도서관에서 책을 읽어요.',
        exampleTranslation: '我在图书馆看书。',
      },
      {
        korean: '연필',
        english: '铅笔',
        pos: '名词',
        exampleSentence: '연필로 이름을 씁니다.',
        exampleTranslation: '我用铅笔写名字。',
      },
      {
        korean: '가방',
        english: '包',
        pos: '名词',
        exampleSentence: '가방이 무겁습니다.',
        exampleTranslation: '包很重。',
      },
      {
        korean: '숙제',
        english: '作业',
        pos: '名词',
        exampleSentence: '숙제를 빨리 끝냈어요.',
        exampleTranslation: '我很快完成了作业。',
      },
      {
        korean: '시험',
        english: '考试',
        pos: '名词',
        exampleSentence: '내일 시험이 있습니다.',
        exampleTranslation: '明天有考试。',
      },
    ];
  }
  return bases.map(b => ({
    korean: b.k,
    english: b.e,
    pos: b.p,
    exampleSentence: b.ex,
    exampleTranslation: b.ext,
  }));
};

export const generateVocabulary = async (
  institute: string,
  level: number,
  unit: number,
  lang: Language,
  content?: TextbookContent
): Promise<VocabularyItem[]> => {
  if (content?.vocabularyList && content.vocabularyList.startsWith('[')) {
    try {
      const parsed = JSON.parse(content.vocabularyList);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      console.warn('Failed to parse admin vocab list', e);
    }
  }
  return [];
};

export const generateReadingPassage = async (
  institute: string,
  level: number,
  unit: number,
  lang: Language,
  content?: TextbookContent
): Promise<ReadingContent | null> => {
  if (content?.readingText && content.readingText.trim().length > 0) {
    const title = content.readingTitle || 'Reading Practice';
    const manualTranslation = content.readingTranslation || '';

    let fallbackVocab: { word: string; meaning: string; pos?: string }[] = [];
    try {
      if (content.vocabularyList) {
        const parsed = JSON.parse(content.vocabularyList);
        fallbackVocab = parsed.map((v: any) => ({
          word: v.korean,
          meaning: v.english,
          pos: v.pos,
        }));
      }
    } catch {}

    return {
      title: title,
      koreanText: content.readingText,
      englishTranslation: manualTranslation,
      keyVocabulary: fallbackVocab,
    };
  }
  return null;
};

export const generateGrammarLesson = async (
  institute: string,
  level: number,
  unit: number,
  lang: Language,
  content?: TextbookContent
): Promise<GrammarPoint[]> => {
  if (content?.grammarList && content.grammarList.startsWith('[')) {
    try {
      const parsed = JSON.parse(content.grammarList);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {}
  }
  return [];
};
