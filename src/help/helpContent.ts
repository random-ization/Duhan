import type { Language } from '../types';

export const HELP_CENTER_SUPPORTED_LANGUAGES = [
  'en',
  'zh',
  'vi',
  'mn',
] as const satisfies readonly Language[];

export type HelpCenterLanguage = (typeof HELP_CENTER_SUPPORTED_LANGUAGES)[number];

export type HelpSectionId = 'start' | 'study' | 'practice' | 'immerse' | 'community' | 'account';

export type HelpEntryId =
  | 'dashboard'
  | 'courses'
  | 'vocab'
  | 'grammar'
  | 'topik'
  | 'review'
  | 'media'
  | 'reading'
  | 'podcasts'
  | 'dictionary'
  | 'notebook'
  | 'community'
  | 'profile';

export interface HelpCenterHero {
  eyebrow: string;
  title: string;
  description: string;
  searchPlaceholder: string;
  allSectionsLabel: string;
  primaryCta: HelpCenterCta;
  secondaryCta: HelpCenterCta;
}

export interface HelpCenterCta {
  label: string;
  to: `/${string}`;
}

export interface HelpCenterSection {
  id: HelpSectionId;
  title: string;
  description: string;
}

export interface HelpCenterEntry {
  id: HelpEntryId;
  sectionId: HelpSectionId;
  marker: string;
  title: string;
  summary: string;
  whenToUse: string[];
  quickStart: string[];
  cta: HelpCenterCta;
  keywords: string[];
}

export interface HelpCenterLearningPath {
  title: string;
  description: string;
  steps: string[];
}

export interface HelpCenterFaq {
  question: string;
  answer: string;
}

export interface HelpCenterContent {
  hero: HelpCenterHero;
  sections: HelpCenterSection[];
  entries: HelpCenterEntry[];
  learningPaths: HelpCenterLearningPath[];
  faqs: HelpCenterFaq[];
  emptyState: {
    title: string;
    description: string;
  };
  labels: {
    featureMap: string;
    quickStart: string;
    whenToUse: string;
    openFeature: string;
    learningPaths: string;
    faq: string;
    resultsCount: string;
  };
}

const SECTION_IDS: readonly HelpSectionId[] = [
  'start',
  'study',
  'practice',
  'immerse',
  'community',
  'account',
];

const ENTRY_IDS: readonly HelpEntryId[] = [
  'dashboard',
  'courses',
  'vocab',
  'grammar',
  'topik',
  'review',
  'media',
  'reading',
  'podcasts',
  'dictionary',
  'notebook',
  'community',
  'profile',
];

const en: HelpCenterContent = {
  hero: {
    eyebrow: 'Help Center',
    title: 'Find the right DuHan feature before you start studying',
    description:
      'DuHan has courses, review, TOPIK, media, notes, community, and AI-assisted tools. This center explains what each area is for and gives you a practical first action.',
    searchPlaceholder: 'Search TOPIK, vocab, grammar, reading, notes...',
    allSectionsLabel: 'All',
    primaryCta: { label: 'Start from dashboard', to: '/dashboard' },
    secondaryCta: { label: 'Browse public learning guides', to: '/learn' },
  },
  sections: [
    {
      id: 'start',
      title: 'Start Here',
      description: 'Pick the right first screen and avoid getting lost.',
    },
    {
      id: 'study',
      title: 'Core Study',
      description: 'Use courses, vocabulary, and grammar as your foundation.',
    },
    {
      id: 'practice',
      title: 'Practice & Exams',
      description: 'Turn knowledge into measurable performance.',
    },
    {
      id: 'immerse',
      title: 'Immersion',
      description: 'Learn from reading, podcasts, video, and dictionary lookup.',
    },
    {
      id: 'community',
      title: 'Community',
      description: 'Ask questions and learn from other learners.',
    },
    {
      id: 'account',
      title: 'Account & Records',
      description: 'Manage notes, profile, settings, and learning history.',
    },
  ],
  entries: [
    {
      id: 'dashboard',
      sectionId: 'start',
      marker: '今',
      title: 'Dashboard',
      summary:
        'Your daily command center: current course, streak, progress, recommended next action, and weekly report.',
      whenToUse: [
        'You just opened DuHan and want one clear next step.',
        'You want to check progress before choosing a module.',
      ],
      quickStart: [
        'Open the dashboard.',
        'Follow the highlighted current course or daily task.',
        'Use the weekly report when you need a broader review.',
      ],
      cta: { label: 'Open dashboard', to: '/dashboard' },
      keywords: ['dashboard', 'home', 'today', 'progress', 'weekly report'],
    },
    {
      id: 'courses',
      sectionId: 'study',
      marker: '課',
      title: 'Courses',
      summary:
        'Structured textbook-style learning. Use this when you want a planned path instead of jumping between tools.',
      whenToUse: [
        'You want to study by level or textbook.',
        'You need grammar, reading, listening, and vocab in one sequence.',
      ],
      quickStart: [
        'Choose a course.',
        'Open the active unit.',
        'Complete the module suggested for your current level.',
      ],
      cta: { label: 'Browse courses', to: '/courses' },
      keywords: ['course', 'textbook', 'unit', 'lesson', 'curriculum'],
    },
    {
      id: 'vocab',
      sectionId: 'study',
      marker: '詞',
      title: 'Vocabulary Book',
      summary:
        'Saved words, flashcards, listening drills, spelling, dictation, and spaced review live here.',
      whenToUse: [
        'You saved words from reading, video, podcast, or dictionary.',
        'You want short repeatable review sessions.',
      ],
      quickStart: [
        'Open your vocab book.',
        'Start with review or flashcards.',
        'Use listening and dictation when recognition is weak.',
      ],
      cta: { label: 'Study vocabulary', to: '/vocab-book' },
      keywords: ['vocab', 'word', 'flashcard', 'spaced repetition', 'dictation', 'listening'],
    },
    {
      id: 'grammar',
      sectionId: 'study',
      marker: '法',
      title: 'Grammar',
      summary:
        'Grammar explanations, examples, markdown-formatted notes, and practice entry points for course grammar.',
      whenToUse: [
        'You do not understand a sentence pattern.',
        'You want to compare similar grammar points before using them.',
      ],
      quickStart: [
        'Open grammar from the sidebar or course.',
        'Read the explanation and examples.',
        'Move into practice once the pattern is clear.',
      ],
      cta: { label: 'Open grammar', to: '/grammar' },
      keywords: ['grammar', 'pattern', 'ending', 'example', 'sentence'],
    },
    {
      id: 'topik',
      sectionId: 'practice',
      marker: '試',
      title: 'TOPIK',
      summary:
        'Mock exams, history, writing practice, AI coaching, and weak-point review for exam preparation.',
      whenToUse: [
        'You are preparing for TOPIK I or TOPIK II.',
        'You need timed practice and mistake review.',
      ],
      quickStart: [
        'Open TOPIK.',
        'Take a small timed block first.',
        'Review mistakes before starting a full exam.',
      ],
      cta: { label: 'Practice TOPIK', to: '/topik' },
      keywords: ['topik', 'exam', 'mock test', 'writing', 'weak points'],
    },
    {
      id: 'review',
      sectionId: 'practice',
      marker: '復',
      title: 'Review Center',
      summary:
        'A focused place to revisit weak words, mistakes, and practice sessions without browsing all content again.',
      whenToUse: [
        'You have completed lessons but retention is unstable.',
        'You want a practice-first session.',
      ],
      quickStart: [
        'Open review.',
        'Pick the review mode that matches your weakness.',
        'Stop after a small complete session and check accuracy.',
      ],
      cta: { label: 'Open review', to: '/review' },
      keywords: ['review', 'practice', 'mistake', 'quiz', 'retention'],
    },
    {
      id: 'media',
      sectionId: 'immerse',
      marker: '浸',
      title: 'Media Hub',
      summary:
        'The hub for podcasts, videos, and reading when you want real Korean input beyond textbook units.',
      whenToUse: [
        'You want listening and reading immersion.',
        'You are tired of drills and want real content.',
      ],
      quickStart: [
        'Open media.',
        'Choose podcast, video, or reading.',
        'Save unknown words into your vocab book as you go.',
      ],
      cta: { label: 'Open media', to: '/media' },
      keywords: ['media', 'immersion', 'video', 'podcast', 'reading'],
    },
    {
      id: 'reading',
      sectionId: 'immerse',
      marker: '讀',
      title: 'Reading',
      summary:
        'Curated articles and reading tools for vocabulary discovery, comprehension, and longer-form Korean exposure.',
      whenToUse: [
        'You want to build reading stamina.',
        'You want to learn words from real context.',
      ],
      quickStart: [
        'Open reading.',
        'Choose one article close to your level.',
        'Save useful words and write notes for difficult sentences.',
      ],
      cta: { label: 'Start reading', to: '/reading' },
      keywords: ['reading', 'article', 'news', 'book', 'comprehension'],
    },
    {
      id: 'podcasts',
      sectionId: 'immerse',
      marker: '話',
      title: 'Podcasts & Videos',
      summary:
        'Listening and video surfaces with transcripts, playback controls, and vocabulary capture.',
      whenToUse: ['You need more listening input.', 'You want to study from authentic speech.'],
      quickStart: [
        'Open podcasts or videos from media.',
        'Play a short episode.',
        'Use transcript and saved words instead of passive watching.',
      ],
      cta: { label: 'Open podcasts', to: '/podcasts' },
      keywords: ['podcast', 'video', 'listening', 'transcript', 'subtitle'],
    },
    {
      id: 'dictionary',
      sectionId: 'immerse',
      marker: '典',
      title: 'Dictionary',
      summary:
        'Look up Korean words and move useful discoveries into study flows instead of leaving them as one-off searches.',
      whenToUse: [
        'You meet an unknown word in any module.',
        'You want a quick meaning check before saving a word.',
      ],
      quickStart: [
        'Open dictionary search.',
        'Search the word or phrase.',
        'Save important results to your vocab book.',
      ],
      cta: { label: 'Search dictionary', to: '/dictionary/search' },
      keywords: ['dictionary', 'lookup', 'meaning', 'word search'],
    },
    {
      id: 'notebook',
      sectionId: 'account',
      marker: '記',
      title: 'Notebook',
      summary:
        'Your study memory: notes, mistakes, imported text notes, and references worth revisiting.',
      whenToUse: [
        'You want to remember why something was difficult.',
        'You need a place for explanations and personal examples.',
      ],
      quickStart: [
        'Open notebook.',
        'Create a note from a lesson, article, or mistake.',
        'Review notes before repeating the same module.',
      ],
      cta: { label: 'Open notebook', to: '/notebook' },
      keywords: ['notebook', 'notes', 'mistakes', 'memory', 'annotation'],
    },
    {
      id: 'community',
      sectionId: 'community',
      marker: '會',
      title: 'Community & Q&A',
      summary:
        'Ask questions, browse community posts, and learn from explanations written for real learner problems.',
      whenToUse: [
        'You are stuck after reading the explanation.',
        'You want examples from other learners.',
      ],
      quickStart: [
        'Open community.',
        'Search or browse Q&A first.',
        'Ask a focused question with the sentence or context included.',
      ],
      cta: { label: 'Open community', to: '/community' },
      keywords: ['community', 'qa', 'question', 'answer', 'discussion'],
    },
    {
      id: 'profile',
      sectionId: 'account',
      marker: '我',
      title: 'Profile, Settings, and Support',
      summary:
        'Manage account details, language, notifications, subscription, achievements, support links, and legal information.',
      whenToUse: [
        'You need settings or support.',
        'You want to review your account, subscription, or achievements.',
      ],
      quickStart: [
        'Open profile.',
        'Use settings for language and notifications.',
        'Use support links when billing or account help is needed.',
      ],
      cta: { label: 'Open profile', to: '/profile' },
      keywords: ['profile', 'settings', 'support', 'language', 'subscription'],
    },
  ],
  learningPaths: [
    {
      title: 'I am new and need direction',
      description: 'Use the app like a guided learning system, not a list of tools.',
      steps: [
        'Start from Dashboard.',
        'Pick one course and complete the current unit.',
        'Use Review Center before adding more content.',
      ],
    },
    {
      title: 'I am preparing for TOPIK',
      description: 'Combine timed exams with targeted repair.',
      steps: [
        'Open TOPIK for a timed block.',
        'Review mistakes and weak points.',
        'Save recurring words and grammar into vocab and notebook.',
      ],
    },
    {
      title: 'I want real Korean input',
      description: 'Use immersion, but keep it active.',
      steps: [
        'Choose one podcast, video, or article.',
        'Use transcript or reading tools.',
        'Save only important unknown words for later review.',
      ],
    },
  ],
  faqs: [
    {
      question: 'Should I start from courses or media?',
      answer:
        'Start from courses if you need structure. Use media when you want real input or already know what skill you want to train.',
    },
    {
      question: 'Where do saved words go?',
      answer:
        'Saved words are collected in the vocabulary book, where you can review them with flashcards and drill modes.',
    },
    {
      question: 'How do I avoid using too many tools at once?',
      answer:
        'Keep one main path for the day: course, TOPIK, or immersion. Use vocab, notebook, and review as supporting tools.',
    },
  ],
  emptyState: {
    title: 'No guide matches that search',
    description:
      'Try a module name like TOPIK, vocab, grammar, reading, podcast, notes, or profile.',
  },
  labels: {
    featureMap: 'Feature map',
    quickStart: 'Quick start',
    whenToUse: 'When to use it',
    openFeature: 'Open feature',
    learningPaths: 'Recommended paths',
    faq: 'FAQ',
    resultsCount: 'matching guides',
  },
};

const zh: HelpCenterContent = {
  hero: {
    eyebrow: '帮助中心',
    title: '先找到适合你的 DuHan 功能，再开始学习',
    description:
      'DuHan 包含课程、复习、TOPIK、媒体、笔记、社区和 AI 辅助功能。这里会解释每个区域的用途，并给出可以立刻执行的第一步。',
    searchPlaceholder: '搜索 TOPIK、词汇、语法、阅读、笔记...',
    allSectionsLabel: '全部',
    primaryCta: { label: '从主页开始', to: '/dashboard' },
    secondaryCta: { label: '阅读公开学习指南', to: '/learn' },
  },
  sections: [
    { id: 'start', title: '从这里开始', description: '选择正确的第一个页面，避免在功能之间迷路。' },
    { id: 'study', title: '核心学习', description: '用课程、词汇和语法建立学习基础。' },
    { id: 'practice', title: '练习与考试', description: '把知识转化成可衡量的表现。' },
    { id: 'immerse', title: '沉浸输入', description: '通过阅读、播客、视频和词典接触真实韩语。' },
    { id: 'community', title: '社区', description: '提问，并从其他学习者的问题中学习。' },
    { id: 'account', title: '账户与记录', description: '管理笔记、个人资料、设置和学习记录。' },
  ],
  entries: [
    {
      id: 'dashboard',
      sectionId: 'start',
      marker: '今',
      title: '主页',
      summary: '你的每日学习驾驶舱：当前课程、连续学习、进度、推荐下一步和学习周报。',
      whenToUse: ['刚打开 DuHan，想知道现在该做什么。', '想先查看学习进度，再决定进入哪个模块。'],
      quickStart: ['打开主页。', '跟随当前课程或每日任务。', '需要整体复盘时查看学习周报。'],
      cta: { label: '打开主页', to: '/dashboard' },
      keywords: ['dashboard', 'home', 'today', 'progress', 'weekly report', '主页', '进度', '周报'],
    },
    {
      id: 'courses',
      sectionId: 'study',
      marker: '課',
      title: '课程中心',
      summary: '系统化教材式学习。适合想按路径学习，而不是在工具之间跳转的用户。',
      whenToUse: ['想按等级或教材学习。', '需要把语法、阅读、听力和词汇放在同一条学习线里。'],
      quickStart: ['选择课程。', '打开当前单元。', '完成系统为当前水平推荐的模块。'],
      cta: { label: '浏览课程', to: '/courses' },
      keywords: ['course', 'textbook', 'unit', 'lesson', '课程', '教材', '单元'],
    },
    {
      id: 'vocab',
      sectionId: 'study',
      marker: '詞',
      title: '词汇本',
      summary: '保存过的单词、闪卡、听写、拼写、听力和间隔复习都在这里。',
      whenToUse: ['从阅读、视频、播客或词典保存了单词。', '想做短时间、可重复的词汇复习。'],
      quickStart: ['打开词汇本。', '先从复习或闪卡开始。', '听辨弱时使用听力和听写模式。'],
      cta: { label: '学习词汇', to: '/vocab-book' },
      keywords: ['vocab', 'word', 'flashcard', '词汇', '单词', '闪卡', '听写'],
    },
    {
      id: 'grammar',
      sectionId: 'study',
      marker: '法',
      title: '语法',
      summary: '查看语法解释、例句、Markdown 格式笔记，并进入课程语法练习。',
      whenToUse: ['看不懂某个句型。', '想比较相似语法点再使用。'],
      quickStart: ['从侧边栏或课程打开语法。', '先读解释和例句。', '理解后再进入练习。'],
      cta: { label: '打开语法', to: '/grammar' },
      keywords: ['grammar', 'pattern', 'sentence', '语法', '句型', '例句'],
    },
    {
      id: 'topik',
      sectionId: 'practice',
      marker: '試',
      title: 'TOPIK',
      summary: '用于考试备考的模考、历史记录、写作练习、AI 教练和薄弱点复盘。',
      whenToUse: ['正在准备 TOPIK I 或 TOPIK II。', '需要限时训练和错题复盘。'],
      quickStart: ['打开 TOPIK。', '先做一个小的限时训练块。', '复盘错误后再开始完整模考。'],
      cta: { label: '练习 TOPIK', to: '/topik' },
      keywords: ['topik', 'exam', 'mock test', 'writing', '考试', '模考', '写作'],
    },
    {
      id: 'review',
      sectionId: 'practice',
      marker: '復',
      title: '复习中心',
      summary: '集中复习薄弱词汇、错题和练习内容，不需要重新翻遍所有学习材料。',
      whenToUse: ['学过内容但记忆不稳定。', '想做一次以练习为主的学习。'],
      quickStart: [
        '打开复习中心。',
        '选择对应薄弱点的复习模式。',
        '完成一个小 session 后查看正确率。',
      ],
      cta: { label: '打开复习', to: '/review' },
      keywords: ['review', 'practice', 'mistake', '复习', '练习', '错题'],
    },
    {
      id: 'media',
      sectionId: 'immerse',
      marker: '浸',
      title: '媒体中心',
      summary: '播客、视频和阅读的统一入口，适合从真实韩语内容中学习。',
      whenToUse: ['想做听力和阅读沉浸。', '不想只做题，想接触真实内容。'],
      quickStart: ['打开媒体中心。', '选择播客、视频或阅读。', '遇到重要生词时保存到词汇本。'],
      cta: { label: '打开媒体', to: '/media' },
      keywords: ['media', 'immersion', 'video', 'podcast', 'reading', '媒体', '沉浸'],
    },
    {
      id: 'reading',
      sectionId: 'immerse',
      marker: '讀',
      title: '阅读',
      summary: '通过精选文章和阅读工具提升词汇发现、理解能力和长文本耐力。',
      whenToUse: ['想提升阅读耐力。', '想在真实上下文中学习单词。'],
      quickStart: [
        '打开阅读。',
        '选择一篇接近当前水平的文章。',
        '保存有价值的单词，并为难句写笔记。',
      ],
      cta: { label: '开始阅读', to: '/reading' },
      keywords: ['reading', 'article', 'news', '阅读', '文章', '理解'],
    },
    {
      id: 'podcasts',
      sectionId: 'immerse',
      marker: '話',
      title: '播客与视频',
      summary: '带字幕/转写、播放控制和词汇保存能力的听力与视频学习区域。',
      whenToUse: ['需要更多听力输入。', '想从真实语速和真实表达中学习。'],
      quickStart: [
        '从媒体进入播客或视频。',
        '选择一个短内容。',
        '配合转写和保存词汇主动学习，而不是被动观看。',
      ],
      cta: { label: '打开播客', to: '/podcasts' },
      keywords: ['podcast', 'video', 'listening', '播客', '视频', '听力', '字幕'],
    },
    {
      id: 'dictionary',
      sectionId: 'immerse',
      marker: '典',
      title: '词典',
      summary: '查询韩语单词，并把有价值的结果转入学习流程，而不是停留在一次性查询。',
      whenToUse: ['任何模块里遇到不认识的词。', '想快速确认含义后再决定是否保存。'],
      quickStart: ['打开词典搜索。', '搜索单词或短语。', '把重要结果保存到词汇本。'],
      cta: { label: '搜索词典', to: '/dictionary/search' },
      keywords: ['dictionary', 'lookup', 'meaning', '词典', '查询', '释义'],
    },
    {
      id: 'notebook',
      sectionId: 'account',
      marker: '記',
      title: '笔记本',
      summary: '你的学习记忆区：笔记、错因、导入文本记录和值得复盘的解释。',
      whenToUse: ['想记住某个知识点为什么难。', '需要保存解释和自己的例句。'],
      quickStart: ['打开笔记本。', '从课程、文章或错题创建笔记。', '重复同类模块前先复习笔记。'],
      cta: { label: '打开笔记本', to: '/notebook' },
      keywords: ['notebook', 'notes', 'mistakes', '笔记', '错因', '记录'],
    },
    {
      id: 'community',
      sectionId: 'community',
      marker: '會',
      title: '社区与问答',
      summary: '提问、浏览社区内容，并从真实学习问题的解释中学习。',
      whenToUse: ['看完解释后仍然卡住。', '想看其他学习者的例子和问题。'],
      quickStart: ['打开社区。', '先搜索或浏览问答。', '提问时附上句子和上下文。'],
      cta: { label: '打开社区', to: '/community' },
      keywords: ['community', 'qa', 'question', '社区', '问答', '提问'],
    },
    {
      id: 'profile',
      sectionId: 'account',
      marker: '我',
      title: '个人资料、设置与支持',
      summary: '管理账户、语言、通知、订阅、成就、支持链接和法律信息。',
      whenToUse: ['需要修改设置或联系支持。', '想查看账户、订阅或成就。'],
      quickStart: [
        '打开个人资料。',
        '在设置里修改语言和通知。',
        '遇到账户或支付问题时使用支持链接。',
      ],
      cta: { label: '打开个人资料', to: '/profile' },
      keywords: ['profile', 'settings', 'support', '个人资料', '设置', '支持', '订阅'],
    },
  ],
  learningPaths: [
    {
      title: '我是新用户，不知道从哪里开始',
      description: '把 DuHan 当成有引导的学习系统，而不是一堆工具。',
      steps: ['先打开主页。', '选择一个课程并完成当前单元。', '在增加新内容前，先用复习中心巩固。'],
    },
    {
      title: '我要备考 TOPIK',
      description: '把限时训练和针对性修复结合起来。',
      steps: [
        '进入 TOPIK 做一个限时训练块。',
        '复盘错题和薄弱点。',
        '把反复出现的词汇和语法放入词汇本与笔记本。',
      ],
    },
    {
      title: '我想接触真实韩语内容',
      description: '沉浸输入要保持主动，而不是只看完。',
      steps: [
        '选择一个播客、视频或文章。',
        '配合转写或阅读工具学习。',
        '只保存真正重要的生词，留到之后复习。',
      ],
    },
  ],
  faqs: [
    {
      question: '应该先用课程还是媒体？',
      answer: '需要结构化学习时先用课程。已经知道要练听力、阅读或真实输入时，再进入媒体。',
    },
    {
      question: '保存的单词在哪里？',
      answer: '保存的单词会进入词汇本，可以用闪卡、听写、拼写和复习模式继续学习。',
    },
    {
      question: '怎样避免同时使用太多功能？',
      answer:
        '每天只保留一条主线：课程、TOPIK 或沉浸输入。词汇本、笔记本和复习中心作为辅助工具使用。',
    },
  ],
  emptyState: {
    title: '没有找到匹配的指南',
    description: '可以尝试搜索 TOPIK、词汇、语法、阅读、播客、笔记或个人资料。',
  },
  labels: {
    featureMap: '功能地图',
    quickStart: '快速上手',
    whenToUse: '适合什么时候用',
    openFeature: '打开功能',
    learningPaths: '推荐学习路径',
    faq: '常见问题',
    resultsCount: '个匹配指南',
  },
};

const vi: HelpCenterContent = {
  ...en,
  hero: {
    eyebrow: 'Trung tâm trợ giúp',
    title: 'Chọn đúng tính năng DuHan trước khi bắt đầu học',
    description:
      'DuHan có khóa học, ôn tập, TOPIK, media, ghi chú, cộng đồng và công cụ AI. Trang này giải thích từng khu vực dùng để làm gì và bước đầu tiên nên làm.',
    searchPlaceholder: 'Tìm TOPIK, từ vựng, ngữ pháp, đọc, ghi chú...',
    allSectionsLabel: 'Tất cả',
    primaryCta: { label: 'Bắt đầu từ bảng điều khiển', to: '/dashboard' },
    secondaryCta: { label: 'Xem hướng dẫn học công khai', to: '/learn' },
  },
  sections: [
    {
      id: 'start',
      title: 'Bắt đầu',
      description: 'Chọn màn hình đầu tiên phù hợp để không bị lạc giữa nhiều tính năng.',
    },
    {
      id: 'study',
      title: 'Học cốt lõi',
      description: 'Dùng khóa học, từ vựng và ngữ pháp làm nền tảng.',
    },
    {
      id: 'practice',
      title: 'Luyện tập & thi',
      description: 'Biến kiến thức thành kết quả có thể đo được.',
    },
    { id: 'immerse', title: 'Đắm chìm', description: 'Học qua đọc, podcast, video và tra từ.' },
    {
      id: 'community',
      title: 'Cộng đồng',
      description: 'Đặt câu hỏi và học từ vấn đề của người học khác.',
    },
    {
      id: 'account',
      title: 'Tài khoản & hồ sơ',
      description: 'Quản lý ghi chú, hồ sơ, cài đặt và lịch sử học.',
    },
  ],
  entries: en.entries.map(entry => ({
    ...entry,
    title: {
      dashboard: 'Bảng điều khiển',
      courses: 'Khóa học',
      vocab: 'Sổ từ vựng',
      grammar: 'Ngữ pháp',
      topik: 'TOPIK',
      review: 'Trung tâm ôn tập',
      media: 'Trung tâm media',
      reading: 'Đọc',
      podcasts: 'Podcast & video',
      dictionary: 'Từ điển',
      notebook: 'Sổ ghi chú',
      community: 'Cộng đồng & Q&A',
      profile: 'Hồ sơ, cài đặt và hỗ trợ',
    }[entry.id],
    summary: {
      dashboard:
        'Trung tâm hằng ngày: khóa đang học, chuỗi học, tiến độ, bước tiếp theo và báo cáo tuần.',
      courses: 'Lộ trình học có cấu trúc theo giáo trình, phù hợp khi bạn muốn học theo kế hoạch.',
      vocab: 'Nơi lưu từ, flashcard, nghe, chính tả, đánh vần và ôn tập giãn cách.',
      grammar: 'Giải thích ngữ pháp, ví dụ, ghi chú định dạng rõ ràng và lối vào luyện tập.',
      topik: 'Đề mô phỏng, lịch sử làm bài, luyện viết, AI coach và phân tích điểm yếu cho TOPIK.',
      review: 'Nơi ôn lại từ yếu, lỗi sai và bài luyện tập mà không phải tìm lại toàn bộ nội dung.',
      media: 'Cổng vào podcast, video và đọc khi bạn muốn học từ tiếng Hàn thật.',
      reading: 'Bài đọc và công cụ đọc giúp tăng sức bền, vốn từ và khả năng hiểu văn bản.',
      podcasts: 'Khu vực nghe và video với transcript, điều khiển phát và lưu từ vựng.',
      dictionary: 'Tra từ tiếng Hàn và chuyển từ quan trọng vào quy trình học.',
      notebook: 'Bộ nhớ học tập của bạn: ghi chú, lỗi sai, văn bản nhập và giải thích cần xem lại.',
      community: 'Đặt câu hỏi, xem bài cộng đồng và học từ giải thích cho vấn đề thật.',
      profile: 'Quản lý tài khoản, ngôn ngữ, thông báo, gói học, thành tích, hỗ trợ và pháp lý.',
    }[entry.id],
    whenToUse: entry.whenToUse.map(text => text.replace('You', 'Bạn')),
    quickStart: entry.quickStart,
    cta: { ...entry.cta, label: `Mở ${entry.title.toLowerCase()}` },
    keywords: [...entry.keywords, 'tro giup', 'huong dan'],
  })),
  learningPaths: [
    {
      title: 'Tôi mới bắt đầu và cần định hướng',
      description: 'Hãy dùng DuHan như một hệ thống có lộ trình, không phải danh sách công cụ.',
      steps: [
        'Bắt đầu từ bảng điều khiển.',
        'Chọn một khóa học và hoàn thành bài hiện tại.',
        'Ôn tập trước khi thêm nội dung mới.',
      ],
    },
    {
      title: 'Tôi đang luyện TOPIK',
      description: 'Kết hợp bài bấm giờ với sửa điểm yếu.',
      steps: [
        'Mở TOPIK và làm một phần bấm giờ.',
        'Xem lại lỗi và điểm yếu.',
        'Lưu từ và ngữ pháp lặp lại vào sổ từ và ghi chú.',
      ],
    },
    {
      title: 'Tôi muốn học từ tiếng Hàn thật',
      description: 'Đắm chìm cần chủ động, không chỉ xem cho xong.',
      steps: [
        'Chọn podcast, video hoặc bài đọc.',
        'Dùng transcript hoặc công cụ đọc.',
        'Chỉ lưu những từ thật sự quan trọng để ôn lại.',
      ],
    },
  ],
  faqs: [
    {
      question: 'Nên bắt đầu từ khóa học hay media?',
      answer:
        'Bắt đầu từ khóa học nếu bạn cần cấu trúc. Dùng media khi bạn muốn luyện nghe, đọc hoặc tiếp xúc tiếng Hàn thật.',
    },
    {
      question: 'Từ đã lưu nằm ở đâu?',
      answer:
        'Từ đã lưu nằm trong sổ từ vựng, nơi bạn có thể ôn bằng flashcard và các chế độ luyện tập.',
    },
    {
      question: 'Làm sao tránh dùng quá nhiều công cụ?',
      answer:
        'Mỗi ngày giữ một đường chính: khóa học, TOPIK hoặc đắm chìm. Từ vựng, ghi chú và ôn tập là công cụ hỗ trợ.',
    },
  ],
  emptyState: {
    title: 'Không có hướng dẫn phù hợp',
    description: 'Hãy thử TOPIK, vocab, grammar, reading, podcast, notes hoặc profile.',
  },
  labels: {
    featureMap: 'Bản đồ tính năng',
    quickStart: 'Bắt đầu nhanh',
    whenToUse: 'Khi nào nên dùng',
    openFeature: 'Mở tính năng',
    learningPaths: 'Lộ trình gợi ý',
    faq: 'FAQ',
    resultsCount: 'hướng dẫn phù hợp',
  },
};

const mn: HelpCenterContent = {
  ...en,
  hero: {
    eyebrow: 'Тусламжийн төв',
    title: 'Суралцахаасаа өмнө DuHan-ийн зөв хэсгийг ол',
    description:
      'DuHan-д курс, давтлага, TOPIK, медиа, тэмдэглэл, community болон AI туслах хэрэгслүүд бий. Энэ төв хэсэг бүр юунд хэрэгтэйг болон эхний алхмыг тайлбарлана.',
    searchPlaceholder: 'TOPIK, үг, дүрэм, уншлага, тэмдэглэл хайх...',
    allSectionsLabel: 'Бүгд',
    primaryCta: { label: 'Dashboard-оос эхлэх', to: '/dashboard' },
    secondaryCta: { label: 'Нээлттэй сурах гарын авлага үзэх', to: '/learn' },
  },
  sections: [
    {
      id: 'start',
      title: 'Эндээс эхэл',
      description: 'Олон функц дунд төөрөхгүйгээр эхний зөв дэлгэцээ сонго.',
    },
    {
      id: 'study',
      title: 'Үндсэн сургалт',
      description: 'Курс, үгсийн сан, дүрмээр сууриа тавина.',
    },
    {
      id: 'practice',
      title: 'Дасгал ба шалгалт',
      description: 'Мэдлэгээ хэмжиж болох гүйцэтгэл болго.',
    },
    {
      id: 'immerse',
      title: 'Орчинд нь сурах',
      description: 'Уншлага, podcast, video, толь ашиглан бодит солонгос хэлтэй ажилла.',
    },
    {
      id: 'community',
      title: 'Community',
      description: 'Асуулт асууж, бусад суралцагчдын асуудлаас суралц.',
    },
    {
      id: 'account',
      title: 'Бүртгэл ба түүх',
      description: 'Тэмдэглэл, профайл, тохиргоо, суралцсан түүхээ удирд.',
    },
  ],
  entries: en.entries.map(entry => ({
    ...entry,
    title: {
      dashboard: 'Dashboard',
      courses: 'Курс',
      vocab: 'Үгийн дэвтэр',
      grammar: 'Дүрэм',
      topik: 'TOPIK',
      review: 'Давтлагын төв',
      media: 'Медиа төв',
      reading: 'Уншлага',
      podcasts: 'Podcast ба video',
      dictionary: 'Толь',
      notebook: 'Тэмдэглэл',
      community: 'Community ба Q&A',
      profile: 'Профайл, тохиргоо, тусламж',
    }[entry.id],
    summary: {
      dashboard:
        'Өдрийн удирдлагын төв: одоогийн курс, streak, ахиц, дараагийн алхам, долоо хоногийн тайлан.',
      courses: 'Төлөвлөгөөтэй, сурах бичгийн хэлбэртэй сургалтын зам.',
      vocab: 'Хадгалсан үг, flashcard, сонсгол, диктант, үсэглэл, давтамжтай давтлага.',
      grammar: 'Дүрмийн тайлбар, жишээ, тэмдэглэл, курсын дүрмийн дасгал руу орох хэсэг.',
      topik: 'TOPIK-д зориулсан mock exam, түүх, бичих дасгал, AI coach, сул талын дүгнэлт.',
      review: 'Сул үг, алдаа, дасгалаа нэг дор дахин давтах хэсэг.',
      media: 'Podcast, video, уншлагаар бодит солонгос хэлтэй ажиллах төв.',
      reading: 'Урт уншлага, үгсийн сан, ойлголтоо хөгжүүлэх нийтлэл ба хэрэгсэл.',
      podcasts: 'Transcript, playback control, үг хадгалах боломжтой сонсгол ба video хэсэг.',
      dictionary: 'Солонгос үг хайж, хэрэгтэй үгийг сургалтын урсгал руу оруулах толь.',
      notebook: 'Таны суралцах ой санамж: тэмдэглэл, алдаа, импортолсон текст, тайлбар.',
      community: 'Асуулт асууж, community post уншиж, бодит асуудлын тайлбараас сурах хэсэг.',
      profile: 'Бүртгэл, хэл, мэдэгдэл, subscription, achievement, support, legal мэдээлэл.',
    }[entry.id],
    whenToUse: entry.whenToUse.map(text => text.replace('You', 'Та')),
    quickStart: entry.quickStart,
    cta: { ...entry.cta, label: `${entry.title} нээх` },
    keywords: [...entry.keywords, 'tuslamj', 'guide'],
  })),
  learningPaths: [
    {
      title: 'Би шинээр эхэлж байна',
      description: 'DuHan-ийг хэрэгслийн жагсаалт биш, чиглүүлдэг систем гэж ашигла.',
      steps: [
        'Dashboard-оос эхэл.',
        'Нэг курс сонгоод одоогийн unit-аа дуусга.',
        'Шинэ зүйл нэмэхээс өмнө Review Center ашигла.',
      ],
    },
    {
      title: 'Би TOPIK-д бэлдэж байна',
      description: 'Хугацаатай дасгал ба сул талаа засах ажлыг хослуул.',
      steps: [
        'TOPIK хэсэгт жижиг хугацаатай блок хий.',
        'Алдаа ба сул талаа шалга.',
        'Давтагдсан үг, дүрмээ үгийн дэвтэр ба тэмдэглэлд хадгал.',
      ],
    },
    {
      title: 'Би бодит солонгос хэлээр сурахыг хүсэж байна',
      description: 'Орчинд нь сурахдаа идэвхтэй бай.',
      steps: [
        'Podcast, video эсвэл нийтлэл сонго.',
        'Transcript эсвэл уншлагын хэрэгсэл ашигла.',
        'Зөвхөн чухал үгээ хадгалж дараа давт.',
      ],
    },
  ],
  faqs: [
    {
      question: 'Курсээс эхлэх үү, media-аас эхлэх үү?',
      answer:
        'Бүтэц хэрэгтэй бол курсээс эхэл. Сонсгол, уншлага, бодит input хэрэгтэй бол media ашигла.',
    },
    {
      question: 'Хадгалсан үг хаана ордог вэ?',
      answer: 'Хадгалсан үг үгийн дэвтэрт орж, flashcard болон дасгалын горимоор давтагдана.',
    },
    {
      question: 'Хэт олон хэрэгсэл зэрэг ашиглахаас яаж сэргийлэх вэ?',
      answer:
        'Өдөр бүр нэг гол зам барь: курс, TOPIK эсвэл immersion. Үг, тэмдэглэл, review нь туслах хэрэгсэл.',
    },
  ],
  emptyState: {
    title: 'Тохирох гарын авлага олдсонгүй',
    description: 'TOPIK, vocab, grammar, reading, podcast, notes эсвэл profile гэж хайгаад үз.',
  },
  labels: {
    featureMap: 'Функцийн зураг',
    quickStart: 'Хурдан эхлэх',
    whenToUse: 'Хэзээ ашиглах вэ',
    openFeature: 'Функц нээх',
    learningPaths: 'Санал болгох зам',
    faq: 'FAQ',
    resultsCount: 'тохирсон гарын авлага',
  },
};

export const HELP_CENTER_CONTENT_BY_LANGUAGE: Record<HelpCenterLanguage, HelpCenterContent> = {
  en,
  zh,
  vi,
  mn,
};

export function getHelpCenterContent(language: Language): HelpCenterContent {
  return HELP_CENTER_CONTENT_BY_LANGUAGE[language] ?? HELP_CENTER_CONTENT_BY_LANGUAGE.en;
}

export function listHelpCenterSections(language: Language): readonly HelpCenterSection[] {
  return getHelpCenterContent(language).sections;
}

export function listHelpCenterEntries(language: Language): readonly HelpCenterEntry[] {
  return getHelpCenterContent(language).entries;
}

export function getCanonicalHelpSectionIds(): readonly HelpSectionId[] {
  return SECTION_IDS;
}

export function getCanonicalHelpEntryIds(): readonly HelpEntryId[] {
  return ENTRY_IDS;
}
