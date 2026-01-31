import { TopikQuestionDto, TopikExamDto } from '../../../convex/topik';

// --- Types ---
export type TopikQuestion = TopikQuestionDto;

export type TopikExam = Partial<TopikExamDto> & {
  id: string;
  type: 'READING' | 'LISTENING';
  title: string;
  description?: string;
  round: number;
  timeLimit: number;
  isPaid: boolean | undefined;
  questions: TopikQuestion[];
  paperType?: string;
  audioUrl?: string;
};

export interface ExamSectionStructure {
  range: number[];
  instruction: string;
  type?: string;
  grouped?: boolean;
  style?: string;
  hasBox?: boolean;
}

export type QuestionUIType =
  | 'FILL_QUESTION'
  | 'IMAGE_REQUIRED'
  | 'IMAGE_OR_PASSAGE'
  | 'ORDERING'
  | 'PASSAGE_ONLY'
  | 'GROUPED'
  | 'INSERT_SENTENCE';

export interface QuestionConfig {
  instruction: string;
  question: string;
  score: number;
  uiType: QuestionUIType;
  needsQuestionInput?: boolean;
  needsPassage?: boolean;
  needsImage?: boolean;
  needsContextBox?: boolean;
  grouped?: boolean;
  groupStart?: number;
  fixedOptions?: string[];
}

// --- Reading Section Configurations ---
export const TOPIK_READING_QUESTIONS: Record<number, QuestionConfig> = {
  1: { instruction: '※ [1~2] (    )에 들어갈 가장 알맞은 것을 고르십시오. (각 2점)', question: '', score: 2, uiType: 'FILL_QUESTION' },
  2: { instruction: '※ [1~2] (    )에 들어갈 가장 알맞은 것을 고르십시오. (각 2점)', question: '', score: 2, uiType: 'FILL_QUESTION' },
  3: { instruction: '※ [3～4] 다음 밑줄 친 부분과 의미가 비슷한 것을 고르십시오. (각 2점)', question: '', score: 2, uiType: 'FILL_QUESTION' },
  4: { instruction: '※ [3～4] 다음 밑줄 친 부분과 의미가 비슷한 것을 고르십시오. (각 2점)', question: '', score: 2, uiType: 'FILL_QUESTION' },
  5: { instruction: '※ [5～8] 다음은 무엇에 대한 글인지 고르십시오. (각 2점)', question: '', score: 2, uiType: 'IMAGE_REQUIRED', needsImage: true },
  6: { instruction: '※ [5～8] 다음은 무엇에 대한 글인지 고르십시오. (각 2점)', question: '', score: 2, uiType: 'IMAGE_REQUIRED', needsImage: true },
  7: { instruction: '※ [5～8] 다음은 무엇에 대한 글인지 고르십시오. (각 2점)', question: '', score: 2, uiType: 'IMAGE_REQUIRED', needsImage: true },
  8: { instruction: '※ [5～8] 다음은 무엇에 대한 글인지 고르십시오. (각 2점)', question: '', score: 2, uiType: 'IMAGE_REQUIRED', needsImage: true },
  9: { instruction: '※ [9～12] 다음 글 또는 도표의 내용과 같은 것을 고르십시오. (각 2점)', question: '', score: 2, uiType: 'IMAGE_OR_PASSAGE', needsPassage: true, needsImage: true },
  10: { instruction: '※ [9～12] 다음 글 또는 도표의 내용과 같은 것을 고르십시오. (각 2점)', question: '', score: 2, uiType: 'IMAGE_OR_PASSAGE', needsPassage: true, needsImage: true },
  11: { instruction: '※ [9～12] 다음 글 또는 도표의 내용과 같은 것을 고르십시오. (각 2점)', question: '', score: 2, uiType: 'PASSAGE_ONLY', needsPassage: true },
  12: { instruction: '※ [9～12] 다음 글 또는 도표의 내용과 같은 것을 고르십시오. (각 2점)', question: '', score: 2, uiType: 'PASSAGE_ONLY', needsPassage: true },
  13: { instruction: '※ [13～15] 다음을 순서대로 맞게 배열한 것을 고르십시오. (각 2점)', question: '', score: 2, uiType: 'ORDERING', needsContextBox: true },
  14: { instruction: '※ [13～15] 다음을 순서대로 맞게 배열한 것을 고르십시오. (각 2점)', question: '', score: 2, uiType: 'ORDERING', needsContextBox: true },
  15: { instruction: '※ [13～15] 다음을 순서대로 맞게 배열한 것을 고르십시오. (각 2점)', question: '', score: 2, uiType: 'ORDERING', needsContextBox: true },
  16: { instruction: '※ [16～18] 다음을 읽고 (    )에 들어갈 내용으로 가장 알맞은 것을 고르십시오. (각 2점)', question: '', score: 2, uiType: 'PASSAGE_ONLY', needsPassage: true },
  17: { instruction: '※ [16～18] 다음을 읽고 (    )에 들어갈 내용으로 가장 알맞은 것을 고르십시오. (각 2점)', question: '', score: 2, uiType: 'PASSAGE_ONLY', needsPassage: true },
  18: { instruction: '※ [16～18] 다음을 읽고 (    )에 들어갈 내용으로 가장 알맞은 것을 고르십시오. (각 2점)', question: '', score: 2, uiType: 'PASSAGE_ONLY', needsPassage: true },
  19: { instruction: '※ [19～20] 다음을 읽고 물음에 답하십시오. (각 2점)', question: '글쓴이가 말하는 방식으로 가장 알맞은 것을 고르십시오.', score: 2, uiType: 'GROUPED', grouped: true, groupStart: 19, needsPassage: true, needsQuestionInput: true },
  20: { instruction: '※ [19～20] 다음을 읽고 물음에 답하십시오. (각 2점)', question: '위 글의 내용과 같은 것을 고르십시오.', score: 2, uiType: 'GROUPED', grouped: true, groupStart: 19, needsQuestionInput: true },
  21: { instruction: '※ [21～22] 다음을 읽고 물음에 답하십시오. (각 2점)', question: "밑줄 친 부분에 나타난 '나'의 심정으로 알맞은 것을 고르십시오.", score: 2, uiType: 'GROUPED', grouped: true, groupStart: 21, needsPassage: true, needsQuestionInput: true },
  22: { instruction: '※ [21～22] 다음을 읽고 물음에 답하십시오. (각 2점)', question: '위 글의 내용과 같은 것을 고르십시오.', score: 2, uiType: 'GROUPED', grouped: true, groupStart: 21, needsQuestionInput: true },
  23: { instruction: '※ [23～24] 다음을 읽고 물음에 답하십시오. (각 2점)', question: '이 글을 쓴 목적을 고르십시오.', score: 2, uiType: 'GROUPED', grouped: true, groupStart: 23, needsPassage: true, needsQuestionInput: true },
  24: { instruction: '※ [23～24] 다음을 읽고 물음에 답하십시오. (각 2점)', question: '위 글의 내용과 같은 것을 고르십시오.', score: 2, uiType: 'GROUPED', grouped: true, groupStart: 23, needsQuestionInput: true },
  25: { instruction: '※ [25～27] 다음 신문 기사의 제목을 가장 잘 설명한 것을 고르십시오. (각 2점)', question: '', score: 2, uiType: 'PASSAGE_ONLY', needsPassage: true },
  26: { instruction: '※ [25～27] 다음 신문 기사의 제목을 가장 잘 설명한 것을 고르십시오. (각 2점)', question: '', score: 2, uiType: 'PASSAGE_ONLY', needsPassage: true },
  27: { instruction: '※ [25～27] 다음 신문 기사의 제목을 가장 잘 설명한 것을 고르십시오. (각 2점)', question: '', score: 2, uiType: 'PASSAGE_ONLY', needsPassage: true },
  28: { instruction: '※ [28～31] 다음을 읽고 (    )에 들어갈 내용으로 가장 알맞은 것을 고르십시오. (각 2점)', question: '', score: 2, uiType: 'PASSAGE_ONLY', needsPassage: true },
  29: { instruction: '※ [28～31] 다음을 읽고 (    )에 들어갈 내용으로 가장 알맞은 것을 고르십시오. (각 2점)', question: '', score: 2, uiType: 'PASSAGE_ONLY', needsPassage: true },
  30: { instruction: '※ [28～31] 다음을 읽고 (    )에 들어갈 내용으로 가장 알맞은 것을 고르십시오. (각 2점)', question: '', score: 2, uiType: 'PASSAGE_ONLY', needsPassage: true },
  31: { instruction: '※ [28～31] 다음을 읽고 (    )에 들어갈 내용으로 가장 알맞은 것을 고르십시오. (각 2점)', question: '', score: 2, uiType: 'PASSAGE_ONLY', needsPassage: true },
  32: { instruction: '※ [32～34] 다음을 읽고 내용이 같은 것을 고르십시오. (각 2점)', question: '', score: 2, uiType: 'PASSAGE_ONLY', needsPassage: true },
  33: { instruction: '※ [32～34] 다음을 읽고 내용이 같은 것을 고르십시오. (각 2점)', question: '', score: 2, uiType: 'PASSAGE_ONLY', needsPassage: true },
  34: { instruction: '※ [32～34] 다음을 읽고 내용이 같은 것을 고르십시오. (각 2점)', question: '', score: 2, uiType: 'PASSAGE_ONLY', needsPassage: true },
  35: { instruction: '※ [35～38] 다음 글의 주제로 가장 알맞은 것을 고르십시오. (각 2점)', question: '', score: 2, uiType: 'PASSAGE_ONLY', needsPassage: true },
  36: { instruction: '※ [35～38] 다음 글의 주제로 가장 알맞은 것을 고르십시오. (각 2점)', question: '', score: 2, uiType: 'PASSAGE_ONLY', needsPassage: true },
  37: { instruction: '※ [35～38] 다음 글의 주제로 가장 알맞은 것을 고르십시오. (각 2점)', question: '', score: 2, uiType: 'PASSAGE_ONLY', needsPassage: true },
  38: { instruction: '※ [35～38] 다음 글의 주제로 가장 알맞은 것을 고르십시오. (각 2점)', question: '', score: 2, uiType: 'PASSAGE_ONLY', needsPassage: true },
  39: { instruction: '※ [39～41] 다음 글에서 <보기>의 문장이 들어가기에 가장 알맞은 곳을 고르십시오. (각 2점)', question: '', score: 2, uiType: 'INSERT_SENTENCE', needsPassage: true, needsContextBox: true, fixedOptions: ['㉠', '㉡', '㉢', '㉣'] },
  40: { instruction: '※ [39～41] 다음 글에서 <보기>의 문장이 들어가기에 가장 알맞은 곳을 고르십시오. (각 2점)', question: '', score: 2, uiType: 'INSERT_SENTENCE', needsPassage: true, needsContextBox: true, fixedOptions: ['㉠', '㉡', '㉢', '㉣'] },
  41: { instruction: '※ [39～41] 다음 글에서 <보기>의 문장이 들어가기에 가장 알맞은 곳을 고르십시오. (각 2점)', question: '', score: 2, uiType: 'INSERT_SENTENCE', needsPassage: true, needsContextBox: true, fixedOptions: ['㉠', '㉡', '㉢', '㉣'] },
  42: { instruction: '※ [42～43] 다음을 읽고 물음에 답하십시오. (각 2점)', question: '밑줄 친 부분에 나타난 사람들의 태도로 알맞은 것을 고르십시오.', score: 2, uiType: 'GROUPED', grouped: true, groupStart: 42, needsPassage: true, needsQuestionInput: true },
  43: { instruction: '※ [42～43] 다음을 읽고 물음에 답하십시오. (각 2점)', question: '이 글의 내용과 같은 것을 고르십시오.', score: 2, uiType: 'GROUPED', grouped: true, groupStart: 42, needsQuestionInput: true },
  44: { instruction: '※ [44～45] 다음을 읽고 물음에 답하십시오. (각 2점)', question: '이 글의 주제로 알맞은 것을 고르십시오.', score: 2, uiType: 'GROUPED', grouped: true, groupStart: 44, needsPassage: true, needsQuestionInput: true },
  45: { instruction: '※ [44～45] 다음을 읽고 물음에 답하십시오. (각 2점)', question: '(    )에 들어갈 내용으로 알맞은 것을 고르십시오.', score: 2, uiType: 'GROUPED', grouped: true, groupStart: 44, needsQuestionInput: true },
  46: { instruction: '※ [46～47] 다음을 읽고 물음에 답하십시오. (각 2점)', question: '윗글에 나타난 필자의 태도로 가장 알맞은 것을 고르십시오.', score: 2, uiType: 'GROUPED', grouped: true, groupStart: 46, needsPassage: true, needsQuestionInput: true },
  47: { instruction: '※ [46～47] 다음을 읽고 물음에 답하십시오. (각 2점)', question: '윗글의 내용과 같은 것을 고르십시오.', score: 2, uiType: 'GROUPED', grouped: true, groupStart: 46, needsQuestionInput: true },
  48: { instruction: '※ [48～50] 다음을 읽고 물음에 답하십시오. (각 2점)', question: '필자가 이 글을 쓴 목적을 고르십시오.', score: 2, uiType: 'GROUPED', grouped: true, groupStart: 48, needsPassage: true, needsQuestionInput: true },
  49: { instruction: '※ [48～50] 다음을 읽고 물음에 답하십시오. (각 2점)', question: '(    )에 들어갈 내용으로 알맞은 것을 고르십시오.', score: 2, uiType: 'GROUPED', grouped: true, groupStart: 48, needsQuestionInput: true },
  50: { instruction: '※ [48～50] 다음을 읽고 물음에 답하십시오. (각 2점)', question: '밑줄 친 부분에 나타난 필자의 태도로 알맞은 것을 고르십시오.', score: 2, uiType: 'GROUPED', grouped: true, groupStart: 48, needsQuestionInput: true },
};

// --- Listening Section Configurations ---
export const TOPIK_LISTENING_QUESTIONS: Record<number, QuestionConfig> = {
  1: { instruction: '※ [1～3] 다음을 듣고 알맞은 그림을 고르십시오. (각 2점)', question: '', score: 2, uiType: 'IMAGE_REQUIRED' },
  2: { instruction: '※ [1～3] 다음을 듣고 알맞은 그림을 고르십시오. (각 2점)', question: '', score: 2, uiType: 'IMAGE_REQUIRED' },
  3: { instruction: '※ [1～3] 다음을 듣고 알맞은 그림을 고르십시오. (각 2점)', question: '', score: 2, uiType: 'IMAGE_REQUIRED' },
  4: { instruction: '※ [4～8] 다음 대화를 잘 듣고 이어질 수 있는 말을 고르십시오. (각 2점)', question: '', score: 2, uiType: 'FILL_QUESTION' },
  5: { instruction: '※ [4～8] 다음 대화를 잘 듣고 이어질 수 있는 말을 고르십시오. (각 2점)', question: '', score: 2, uiType: 'FILL_QUESTION' },
  6: { instruction: '※ [4～8] 다음 대화를 잘 듣고 이어질 수 있는 말을 고르십시오. (각 2점)', question: '', score: 2, uiType: 'FILL_QUESTION' },
  7: { instruction: '※ [4～8] 다음 대화를 잘 듣고 이어질 수 있는 말을 고르십시오. (각 2점)', question: '', score: 2, uiType: 'FILL_QUESTION' },
  8: { instruction: '※ [4～8] 다음 대화를 잘 듣고 이어질 수 있는 말을 고르십시오. (각 2점)', question: '', score: 2, uiType: 'FILL_QUESTION' },
  9: { instruction: '※ [9～12] 다음 대화를 잘 듣고 여자가 이어서 할 행동으로 알맞은 것을 고르십시오. (각 2점)', question: '', score: 2, uiType: 'FILL_QUESTION' },
  10: { instruction: '※ [9～12] 다음 대화를 잘 듣고 여자가 이어서 할 행동으로 알맞은 것을 고르십시오. (각 2점)', question: '', score: 2, uiType: 'FILL_QUESTION' },
  11: { instruction: '※ [9～12] 다음 대화를 잘 듣고 여자가 이어서 할 행동으로 알맞은 것을 고르십시오. (각 2점)', question: '', score: 2, uiType: 'FILL_QUESTION' },
  12: { instruction: '※ [9～12] 다음 대화를 잘 듣고 여자가 이어서 할 행동으로 알맞은 것을 고르십시오. (각 2점)', question: '', score: 2, uiType: 'FILL_QUESTION' },
  13: { instruction: '※ [13～16] 다음을 듣고 내용과 일치하는 것을 고르십시오. (각 2점)', question: '', score: 2, uiType: 'FILL_QUESTION' },
  14: { instruction: '※ [13～16] 다음을 듣고 내용과 일치하는 것을 고르십시오. (각 2점)', question: '', score: 2, uiType: 'FILL_QUESTION' },
  15: { instruction: '※ [13～16] 다음을 듣고 내용과 일치하는 것을 고르십시오. (각 2점)', question: '', score: 2, uiType: 'FILL_QUESTION' },
  16: { instruction: '※ [13～16] 다음을 듣고 내용과 일치하는 것을 고르십시오. (각 2점)', question: '', score: 2, uiType: 'FILL_QUESTION' },
  17: { instruction: '※ [17～20] 다음을 듣고 남자의 중심 생각을 고르십시오. (각 2점)', question: '', score: 2, uiType: 'FILL_QUESTION' },
  18: { instruction: '※ [17～20] 다음을 듣고 남자의 중심 생각을 고르십시오. (각 2점)', question: '', score: 2, uiType: 'FILL_QUESTION' },
  19: { instruction: '※ [17～20] 다음을 듣고 남자의 중심 생각을 고르십시오. (각 2점)', question: '', score: 2, uiType: 'FILL_QUESTION' },
  20: { instruction: '※ [17～20] 다음을 듣고 남자의 중심 생각을 고르십시오. (각 2점)', question: '', score: 2, uiType: 'FILL_QUESTION' },
  21: { instruction: '※ [21～22] 다음을 듣고 물음에 답하십시오. (각 2점)', question: '남자의 중심 생각으로 맞는 것을 고르십시오.', score: 2, uiType: 'GROUPED', grouped: true, groupStart: 21, needsQuestionInput: true },
  22: { instruction: '※ [21～22] 다음을 듣고 물음에 답하십시오. (각 2점)', question: '들은 내용으로 맞는 것을 고르십시오.', score: 2, uiType: 'GROUPED', grouped: true, groupStart: 21, needsQuestionInput: true },
  23: { instruction: '※ [23～24] 다음을 듣고 물음에 답하십시오. (각 2점)', question: '남자가 무엇을 하고 있는지 고르십시오.', score: 2, uiType: 'GROUPED', grouped: true, groupStart: 23, needsQuestionInput: true },
  24: { instruction: '※ [23～24] 다음을 듣고 물음에 답하십시오. (각 2점)', question: '들은 내용으로 맞는 것을 고르십시오.', score: 2, uiType: 'GROUPED', grouped: true, groupStart: 23, needsQuestionInput: true },
  25: { instruction: '※ [25～26] 다음을 듣고 물음에 답하십시오. (각 2점)', question: '남자의 중심 생각으로 맞는 것을 고르십시오.', score: 2, uiType: 'GROUPED', grouped: true, groupStart: 25, needsQuestionInput: true },
  26: { instruction: '※ [25～26] 다음을 듣고 물음에 답하십시오. (각 2점)', question: '들은 내용으로 맞는 것을 고르십시오.', score: 2, uiType: 'GROUPED', grouped: true, groupStart: 25, needsQuestionInput: true },
  27: { instruction: '※ [27～28] 다음을 듣고 물음에 답하십시오. (각 2점)', question: '남자가 여자에게 말하는 의도를 고르십시오.', score: 2, uiType: 'GROUPED', grouped: true, groupStart: 27, needsQuestionInput: true },
  28: { instruction: '※ [27～28] 다음을 듣고 물음에 답하십시오. (각 2점)', question: '들은 내용으로 맞는 것을 고르십시오.', score: 2, uiType: 'GROUPED', grouped: true, groupStart: 27, needsQuestionInput: true },
  29: { instruction: '※ [29～30] 다음을 듣고 물음에 답하십시오. (각 2점)', question: '남자가 누구인지 고르십시오.', score: 2, uiType: 'GROUPED', grouped: true, groupStart: 29, needsQuestionInput: true },
  30: { instruction: '※ [29～30] 다음을 듣고 물음에 답하십시오. (각 2점)', question: '들은 내용으로 맞는 것을 고르십시오.', score: 2, uiType: 'GROUPED', grouped: true, groupStart: 29, needsQuestionInput: true },
  31: { instruction: '※ [31～32] 다음을 듣고 물음에 답하십시오. (각 2점)', question: '남자의 생각으로 맞는 것을 고르십시오.', score: 2, uiType: 'GROUPED', grouped: true, groupStart: 31, needsQuestionInput: true },
  32: { instruction: '※ [31～32] 다음을 듣고 물음에 답하십시오. (각 2점)', question: '남자의 태도로 맞는 것을 고르십시오.', score: 2, uiType: 'GROUPED', grouped: true, groupStart: 31, needsQuestionInput: true },
  33: { instruction: '※ [33～34] 다음을 듣고 물음에 답하십시오. (각 2점)', question: '무엇에 대한 내용인지 맞는 것을 고르십시오.', score: 2, uiType: 'GROUPED', grouped: true, groupStart: 33, needsQuestionInput: true },
  34: { instruction: '※ [33～34] 다음을 듣고 물음에 답하십시오. (각 2점)', question: '들은 내용으로 맞는 것을 고르십시오.', score: 2, uiType: 'GROUPED', grouped: true, groupStart: 33, needsQuestionInput: true },
  35: { instruction: '※ [35～36] 다음을 듣고 물음에 답하십시오. (각 2점)', question: '남자가 무엇을 하고 있는지 고르십시오.', score: 2, uiType: 'GROUPED', grouped: true, groupStart: 35, needsQuestionInput: true },
  36: { instruction: '※ [35～36] 다음을 듣고 물음에 답하십시오. (각 2점)', question: '들은 내용으로 맞는 것을 고르십시오.', score: 2, uiType: 'GROUPED', grouped: true, groupStart: 35, needsQuestionInput: true },
  37: { instruction: '※ [37～38] 다음은 교양 프로그램입니다. 잘 듣고 물음에 답하십시오. (각 2점)', question: '여자의 중심 생각으로 맞는 것을 고르십시오.', score: 2, uiType: 'GROUPED', grouped: true, groupStart: 37, needsQuestionInput: true },
  38: { instruction: '※ [37～38] 다음은 교양 프로그램입니다. 잘 듣고 물음에 답하십시오. (각 2점)', question: '들은 내용으로 맞는 것을 고르십시오.', score: 2, uiType: 'GROUPED', grouped: true, groupStart: 37, needsQuestionInput: true },
  39: { instruction: '※ [39～40] 다음은 대담입니다. 잘 듣고 물음에 답하십시오. (각 2점)', question: '이 담화 앞의 내용으로 알맞은 것을 고르십시오.', score: 2, uiType: 'GROUPED', grouped: true, groupStart: 39, needsQuestionInput: true },
  40: { instruction: '※ [39～40] 다음은 대담입니다. 잘 듣고 물음에 답하십시오. (각 2점)', question: '들은 내용으로 맞는 것을 고르십시오.', score: 2, uiType: 'GROUPED', grouped: true, groupStart: 39, needsQuestionInput: true },
  41: { instruction: '※ [41～42] 다음은 강연입니다. 잘 듣고 물음에 답하십시오. (각 2점)', question: '이 강연의 중심 내용으로 맞는 것을 고르십시오.', score: 2, uiType: 'GROUPED', grouped: true, groupStart: 41, needsQuestionInput: true },
  42: { instruction: '※ [41～42] 다음은 강연입니다. 잘 듣고 물음에 답하십시오. (각 2점)', question: '들은 내용으로 맞는 것을 고르십시오.', score: 2, uiType: 'GROUPED', grouped: true, groupStart: 41, needsQuestionInput: true },
  43: { instruction: '※ [43～44] 다음은 다큐멘터리입니다. 잘 듣고 물음에 답하십시오. (각 2점)', question: '이 이야기의 중심 내용으로 맞는 것을 고르십시오.', score: 2, uiType: 'GROUPED', grouped: true, groupStart: 43, needsQuestionInput: true },
  44: { instruction: '※ [43～44] 다음은 다큐멘터리입니다. 잘 듣고 물음에 답하십시오. (각 2점)', question: '들은 내용으로 맞는 것을 고르십시오.', score: 2, uiType: 'GROUPED', grouped: true, groupStart: 43, needsQuestionInput: true },
  45: { instruction: '※ [45～46] 다음은 강연입니다. 잘 듣고 물음에 답하십시오. (각 2점)', question: '들은 내용과 일치하는 것을 고르십시오.', score: 2, uiType: 'GROUPED', grouped: true, groupStart: 45, needsQuestionInput: true },
  46: { instruction: '※ [45～46] 다음은 강연입니다. 잘 듣고 물음에 답하십시오. (각 2점)', question: '남자의 태도로 가장 알맞은 것을 고르십시오.', score: 2, uiType: 'GROUPED', grouped: true, groupStart: 45, needsQuestionInput: true },
  47: { instruction: '※ [47～48] 다음은 대담입니다. 잘 듣고 물음에 답하십시오. (각 2점)', question: '들은 내용과 일치하는 것을 고르십시오.', score: 2, uiType: 'GROUPED', grouped: true, groupStart: 47, needsQuestionInput: true },
  48: { instruction: '※ [47～48] 다음은 대담입니다. 잘 듣고 물음에 답하십시오. (각 2점)', question: '남자의 태도로 가장 알맞은 것을 고르십시오.', score: 2, uiType: 'GROUPED', grouped: true, groupStart: 47, needsQuestionInput: true },
  49: { instruction: '※ [49～50] 다음은 강연입니다. 잘 듣고 물음에 답하십시오. (각 2점)', question: '들은 내용과 일치하는 것을 고르십시오.', score: 2, uiType: 'GROUPED', grouped: true, groupStart: 49, needsQuestionInput: true },
  50: { instruction: '※ [49～50] 다음은 강연입니다. 잘 듣고 물음에 답하십시오. (각 2점)', question: '남자의 태도로 가장 알맞은 것을 고르십시오.', score: 2, uiType: 'GROUPED', grouped: true, groupStart: 49, needsQuestionInput: true },
};

// --- Structure Definitions ---
export const TOPIK_READING_STRUCTURE: ExamSectionStructure[] = [
  { range: [1, 2], instruction: '※ [1~2] (    )에 들어갈 가장 알맞은 것을 고르십시오. (각 2점)' },
  { range: [3, 4], instruction: '※ [3～4] 다음 밑줄 친 부분과 의미가 비슷한 것을 고르십시오. (각 2점)' },
  { range: [5, 8], instruction: '※ [5～8] 다음은 무엇에 대한 글인지 고르십시오. (각 2점)', type: 'IMAGE_REQUIRED' },
  { range: [9, 10], instruction: '※ [9～12] 다음 글 또는 도표의 내용과 같은 것을 고르십시오. (각 2점)', type: 'IMAGE_OR_PASSAGE' },
  { range: [11, 12], instruction: '※ [9～12] 다음 글 또는 도표의 내용과 같은 것을 고르십시오. (각 2점)' },
  { range: [13, 15], instruction: '※ [13～15] 다음을 순서대로 맞게 배열한 것을 고르십시오. (각 2점)', hasBox: true },
  { range: [16, 18], instruction: '※ [16～18] 다음을 읽고 (    )에 들어갈 내용으로 가장 알맞은 것을 고르십시오. (각 2점)' },
  { range: [19, 20], instruction: '※ [19～20] 다음을 읽고 물음에 답하십시오. (각 2점)', grouped: true },
  { range: [21, 22], instruction: '※ [21～22] 다음을 읽고 물음에 답하십시오. (각 2점)', grouped: true },
  { range: [23, 24], instruction: '※ [23～24] 다음을 읽고 물음에 답하십시오. (각 2점)', grouped: true },
  { range: [25, 27], instruction: '※ [25～27] 다음은 신문 기사의 제목입니다. 가장 잘 설명한 것을 고르십시오. (각 2점)', style: 'HEADLINE' },
  { range: [28, 31], instruction: '※ [28～31] 다음을 읽고 (    )에 들어갈 내용으로 가장 알맞은 것을 고르십시오. (각 2점)' },
  { range: [32, 34], instruction: '※ [32～34] 다음을 읽고 내용이 같은 것을 고르십시오. (각 2점)' },
  { range: [35, 38], instruction: '※ [35～38] 다음 글의 주제로 가장 알맞은 것을 고르십시오. (각 2점)' },
  { range: [39, 41], instruction: '※ [39～41] 다음 글에서 <보기>의 문장이 들어가기에 가장 알맞은 곳을 고르십시오. (각 2점)', hasBox: true },
  { range: [42, 43], instruction: '※ [42～43] 다음을 읽고 물음에 답하십시오. (각 2점)', grouped: true },
  { range: [44, 45], instruction: '※ [44～45] 다음을 읽고 물음에 답하십시오. (각 2점)', grouped: true },
  { range: [46, 47], instruction: '※ [46～47] 다음을 읽고 물음에 답하십시오. (각 2점)', grouped: true, hasBox: true },
  { range: [48, 50], instruction: '※ [48～50] 다음을 읽고 물음에 답하십시오. (각 2점)', grouped: true },
];

export const TOPIK_LISTENING_STRUCTURE: ExamSectionStructure[] = [
  { range: [1, 3], instruction: '※ [1～3] 다음을 듣고 알맞은 그림을 고르십시오. (각 2점)', type: 'IMAGE_CHOICE' },
  { range: [4, 8], instruction: '※ [4～8] 다음 대화를 잘 듣고 이어질 수 있는 말을 고르십시오. (각 2점)' },
  { range: [9, 12], instruction: '※ [9～12] 다음 대화를 잘 듣고 여자가 이어서 할 행동으로 알맞은 것을 고르십시오. (각 2점)' },
  { range: [13, 16], instruction: '※ [13～16] 다음을 듣고 내용과 일치하는 것을 고르십시오. (각 2점)' },
  { range: [17, 20], instruction: '※ [17～20] 다음을 듣고 남자의 중심 생각을 고르십시오. (각 2점)' },
  { range: [21, 22], instruction: '※ [21～22] 다음을 듣고 물음에 답하십시오. (각 2점)', grouped: true },
  { range: [23, 24], instruction: '※ [23～24] 다음을 듣고 물음에 답하십시오. (각 2점)', grouped: true },
  { range: [25, 26], instruction: '※ [25～26] 다음을 듣고 물음에 답하십시오. (각 2점)', grouped: true },
  { range: [27, 28], instruction: '※ [27～28] 다음을 듣고 물음에 답하십시오. (각 2점)', grouped: true },
  { range: [29, 30], instruction: '※ [29～30] 다음을 듣고 물음에 답하십시오. (각 2점)', grouped: true },
  { range: [31, 32], instruction: '※ [31～32] 다음을 듣고 물음에 답하십시오. (각 2점)', grouped: true },
  { range: [33, 34], instruction: '※ [33～34] 다음을 듣고 물음에 답하십시오. (각 2점)', grouped: true },
  { range: [35, 36], instruction: '※ [35～36] 다음을 듣고 물음에 답하십시오. (각 2점)', grouped: true },
  { range: [37, 38], instruction: '※ [37～38] 다음은 교양 프로그램입니다. 잘 듣고 물음에 답하십시오. (각 2점)', grouped: true },
  { range: [39, 40], instruction: '※ [39～40] 다음은 대담입니다. 잘 듣고 물음에 답하십시오. (각 2점)', grouped: true },
  { range: [41, 42], instruction: '※ [41～42] 다음은 강연입니다. 잘 듣고 물음에 답하십시오. (각 2점)', grouped: true },
  { range: [43, 44], instruction: '※ [43～44] 다음은 다큐멘터리입니다. 잘 듣고 물음에 답하십시오. (각 2점)', grouped: true },
  { range: [45, 46], instruction: '※ [45～46] 다음은 강연입니다. 잘 듣고 물음에 답하십시오. (각 2점)', grouped: true },
  { range: [47, 48], instruction: '※ [47～48] 다음은 대담입니다. 잘 듣고 물음에 답하십시오. (각 2점)', grouped: true },
  { range: [49, 50], instruction: '※ [49～50] 다음은 강연입니다. 잘 듣고 물음에 답하십시오. (각 2점)', grouped: true },
];

// --- Helpers ---
export const getQuestionConfig = (id: number, type: 'READING' | 'LISTENING'): QuestionConfig | null => {
  return type === 'READING' ? TOPIK_READING_QUESTIONS[id] : TOPIK_LISTENING_QUESTIONS[id];
};
