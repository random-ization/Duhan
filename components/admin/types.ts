// Shared types and constants for admin components
import {
  Language,
  AdminStats,
  User,
  Institute,
  TextbookContextMap,
  TopikExam,
  LegalDocument,
} from '../../types';

export interface AdminPanelProps {
  language: Language;
  stats: AdminStats;
  users: User[];
  onUpdateUser: (userId: string, updates: Partial<User>) => void;
  onDeleteUser: (userId: string) => void;
  institutes: Institute[];
  onAddInstitute: (name: string) => void | Promise<void>;
  onDeleteInstitute: (instituteId: string) => void;
  onUpdateInstitutes: (institutes: Institute[]) => void;
  textbookContexts: TextbookContextMap;
  onSaveContext: (contextKey: string, content: any) => void;
  topikExams: TopikExam[];
  onAddTopikExam: (exam: TopikExam) => void;
  onUpdateTopikExam: (examId: string, updates: Partial<TopikExam>) => void;
  onDeleteTopikExam: (examId: string) => void;
  legalDocuments?: LegalDocument[];
  onSaveLegalDocument?: (doc: LegalDocument) => void;
}

export interface ExamSectionStructure {
  range: number[];
  instruction: string;
  type?: string;
  grouped?: boolean;
  style?: string;
  hasBox?: boolean;
}

// TOPIK II READING FIXED STRUCTURE DEFINITION
export const TOPIK_READING_STRUCTURE: ExamSectionStructure[] = [
  { range: [1, 2], instruction: '※ [1~2] (    )에 들어갈 가장 알맞은 것을 고르십시오. (각 2점)' },
  {
    range: [3, 4],
    instruction: '※ [3～4] 다음 밑줄 친 부분과 의미가 비슷한 것을 고르십시오. (각 2점)',
  },
  {
    range: [5, 8],
    instruction: '※ [5～8] 다음은 무엇에 대한 글인지 고르십시오. (각 2점)',
    type: 'IMAGE_OPTIONAL',
  },
  {
    range: [9, 12],
    instruction: '※ [9～12] 다음 글 또는 도표의 내용과 같은 것을 고르십시오. (각 2점)',
    type: 'IMAGE_OPTIONAL',
  },
  {
    range: [13, 15],
    instruction: '※ [13～15] 다음을 순서대로 맞게 배열한 것을 고르십시오. (각 2점)',
  },
  {
    range: [16, 18],
    instruction:
      '※ [16～18] 다음을 읽고 (    )에 들어갈 내용으로 가장 알맞은 것을 고르십시오. (각 2점)',
  },
  {
    range: [19, 20],
    instruction: '※ [19～20] 다음을 읽고 물음에 답하십시오. (각 2점)',
    grouped: true,
  },
  {
    range: [21, 22],
    instruction: '※ [21～22] 다음을 읽고 물음에 답하십시오. (각 2점)',
    grouped: true,
  },
  {
    range: [23, 24],
    instruction: '※ [23～24] 다음을 읽고 물음에 답하십시오. (각 2점)',
    grouped: true,
  },
  {
    range: [25, 27],
    instruction:
      '※ [25～27] 다음은 신문 기사의 제목입니다. 가장 잘 설명한 것을 고르십시오. (각 2점)',
    style: 'HEADLINE',
  },
  {
    range: [28, 31],
    instruction:
      '※ [28～31] 다음을 읽고 (    )에 들어갈 내용으로 가장 알맞은 것을 고르십시오. (각 2점)',
  },
  { range: [32, 34], instruction: '※ [32～34] 다음을 읽고 내용이 같은 것을 고르십시오. (각 2점)' },
  {
    range: [35, 38],
    instruction: '※ [35～38] 다음 글의 주제로 가장 알맞은 것을 고르십시오. (각 2점)',
  },
  {
    range: [39, 41],
    instruction:
      '※ [39～41] 다음 글에서 <보기>의 문장이 들어가기에 가장 알맞은 곳을 고르십시오. (각 2점)',
    hasBox: true,
  },
  {
    range: [42, 43],
    instruction: '※ [42～43] 다음을 읽고 물음에 답하십시오. (각 2점)',
    grouped: true,
  },
  {
    range: [44, 45],
    instruction: '※ [44～45] 다음을 읽고 물음에 답하십시오. (각 2점)',
    grouped: true,
  },
  {
    range: [46, 47],
    instruction: '※ [46～47] 다음을 읽고 물음에 답하십시오. (각 2점)',
    grouped: true,
  },
  {
    range: [48, 50],
    instruction: '※ [48～50] 다음을 읽고 물음에 답하십시오. (각 2점)',
    grouped: true,
  },
];

// TOPIK II LISTENING FIXED STRUCTURE DEFINITION
export const TOPIK_LISTENING_STRUCTURE: ExamSectionStructure[] = [
  {
    range: [1, 3],
    instruction: '※ [1～3] 다음을 듣고 알맞은 그림을 고르십시오. (각 2점)',
    type: 'IMAGE_CHOICE',
  },
  {
    range: [4, 8],
    instruction: '※ [4～8] 다음 대화를 잘 듣고 이어질 수 있는 말을 고르십시오. (각 2점)',
  },
  {
    range: [9, 12],
    instruction:
      '※ [9～12] 다음 대화를 잘 듣고 여자가 이어서 할 행동으로 알맞은 것을 고르십시오. (각 2점)',
  },
  {
    range: [13, 16],
    instruction: '※ [13～16] 다음을 듣고 내용과 일치하는 것을 고르십시오. (각 2점)',
  },
  {
    range: [17, 20],
    instruction: '※ [17～20] 다음을 듣고 남자의 중심 생각을 고르십시오. (각 2점)',
  },
  {
    range: [21, 22],
    instruction: '※ [21～22] 다음을 듣고 물음에 답하십시오. (각 2점)',
    grouped: true,
  },
  {
    range: [23, 24],
    instruction: '※ [23～24] 다음을 듣고 물음에 답하십시오. (각 2점)',
    grouped: true,
  },
  {
    range: [25, 26],
    instruction: '※ [25～26] 다음을 듣고 물음에 답하십시오. (각 2점)',
    grouped: true,
  },
  {
    range: [27, 28],
    instruction: '※ [27～28] 다음을 듣고 물음에 답하십시오. (각 2점)',
    grouped: true,
  },
  {
    range: [29, 30],
    instruction: '※ [29～30] 다음을 듣고 물음에 답하십시오. (각 2점)',
    grouped: true,
  },
  {
    range: [31, 32],
    instruction: '※ [31～32] 다음을 듣고 물음에 답하십시오. (각 2점)',
    grouped: true,
  },
  {
    range: [33, 34],
    instruction: '※ [33～34] 다음을 듣고 물음에 답하십시오. (각 2점)',
    grouped: true,
  },
  {
    range: [35, 36],
    instruction: '※ [35～36] 다음을 듣고 물음에 답하십시오. (각 2점)',
    grouped: true,
  },
  {
    range: [37, 38],
    instruction: '※ [37～38] 다음은 교양 프로그램입니다. 잘 듣고 물음에 답하십시오. (각 2점)',
    grouped: true,
  },
  {
    range: [39, 40],
    instruction: '※ [39～40] 다음은 대담입니다. 잘 듣고 물음에 답하십시오. (각 2점)',
    grouped: true,
  },
  {
    range: [41, 42],
    instruction: '※ [41～42] 다음은 강연입니다. 잘 듣고 물음에 답하십시오. (각 2점)',
    grouped: true,
  },
  {
    range: [43, 44],
    instruction: '※ [43～44] 다음은 다큐멘터리입니다. 잘 듣고 물음에 답하십시오. (각 2점)',
    grouped: true,
  },
  {
    range: [45, 46],
    instruction: '※ [45～46] 다음은 강연입니다. 잘 듣고 물음에 답하십시오. (각 2점)',
    grouped: true,
  },
  {
    range: [47, 48],
    instruction: '※ [47～48] 다음은 대담입니다. 잘 듣고 물음에 답하십시오. (각 2점)',
    grouped: true,
  },
  {
    range: [49, 50],
    instruction: '※ [49～50] 다음은 강연입니다. 잘 듣고 물음에 답하십시오. (각 2점)',
    grouped: true,
  },
];
