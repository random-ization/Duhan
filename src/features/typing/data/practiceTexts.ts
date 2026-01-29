export interface PracticeCategory {
  id: string;
  title: string;
  description: string;
  icon: string; // Emoji
  sentences: string[];
}

export const PRACTICE_CATEGORIES: PracticeCategory[] = [
  {
    id: 'basic',
    title: 'Basic Phrases',
    description: 'Common daily expressions for beginners.',
    icon: '👋',
    sentences: [
      '안녕하세요 만나서 반갑습니다.',
      '오늘 날씨가 정말 좋네요.',
      '한국어를 공부하는 것은 재미있습니다.',
      '감사합니다.',
      '죄송합니다.',
      '안녕히 계세요.',
      '이름이 무엇입니까?',
      '저는 한국 음식을 좋아합니다.',
      '어디에서 오셨습니까?',
      '도와주셔서 감사합니다.',
    ],
  },
  {
    id: 'proverbs',
    title: 'Proverbs',
    description: 'Wisdom from traditional Korean idioms.',
    icon: '🦉',
    sentences: [
      '가는 말이 고와야 오는 말이 곱다.',
      '고생 끝에 낙이 온다.',
      '금강산도 식후경.',
      '낫 놓고 기역 자도 모른다.',
      '낮말은 새가 듣고 밤말은 쥐가 듣는다.',
      '누워서 떡 먹기.',
      '등잔 밑이 어둡다.',
      '말 한마디로 천 냥 빚 갚는다.',
      '소 잃고 외양간 고친다.',
      '시작이 반이다.',
    ],
  },
  {
    id: 'kpop',
    title: 'K-Pop Lyrics',
    description: 'Famous lines from popular songs.',
    icon: '🎵',
    sentences: [
      '보고 싶다 이렇게 말하니까 더 보고 싶다.',
      '너를 사랑하는 건 참 아픈 일이야.',
      '밤이 깊었네 방황하며 춤을 추는 불빛들.',
      '마지막처럼 마마마지막처럼.',
      '피 땀 눈물 내 차가운 숨을.',
      '멈추지 마라 아직은 해가 중천에 있다.',
      '우리가 만든 이 세계는 아름다워.',
      '다 지나가니까 걱정하지 마.',
      '나는 나로 살기로 했다.',
      '모든 게 다 무너져도 난 너를 지킬게.',
    ],
  },
];

export interface PracticeParagraph {
  id: string;
  title: string;
  description: string;
  text: string;
}

export const PRACTICE_PARAGRAPHS: PracticeParagraph[] = [
  {
    id: 'star',
    title: '별 헤는 밤 (Night of Counting Stars)',
    description: "Excerpt from Yun Dong-ju's famous poem",
    text: '계절이 지나가는 하늘에는 가을로 가득 차 있습니다. 나는 아무 걱정도 없이 가을 속의 별들을 다 헤일 듯합니다. 가슴 속에 하나 둘 새겨지는 별을 이제 다 못 헤는 것은 쉬이 아침이 오는 까닭이요, 내일 밤이 남은 까닭이요, 아직 나의 청춘이 다하지 않은 까닭입니다.',
  },
  {
    id: 'road',
    title: '서시 (Prologue)',
    description: "Yun Dong-ju's prologue poem",
    text: '죽는 날까지 하늘을 우러러 한 점 부끄럼이 없기를, 잎새에 이는 바람에도 나는 괴로워했다. 별을 노래하는 마음으로 모든 죽어가는 것을 사랑해야지. 그리고 나한테 주어진 길을 걸어가야겠다. 오늘 밤에도 별이 바람에 스치운다.',
  },
  {
    id: 'conversation',
    title: '일상 대화 (Daily Conversation)',
    description: 'Common conversational context',
    text: '오히려 그럼 이번 즉 느낌 그런데 데 구조 아 만하다 너무 당신 바라보다 같다 갖다 얻다 가장 새 모두 들어오다 이루어지다 어떻다 이후 차 새롭다 대회 다르다 곧 가슴 운동 사건 이거 운동 의하다 하지만 간 사이 자식 다른 동안 들어오다 점 손 그리고 버리다 이후',
  },
];
