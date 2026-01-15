import React, { useState } from 'react';
import { useQuery, useMutation, usePaginatedQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import {
    FileText, Headphones, Save, Trash2, Loader2,
    ArrowLeft, Upload, CheckSquare, ImageIcon, FileUp, X
} from 'lucide-react';
import * as XLSX from 'xlsx';

// --- Types ---
interface TopikQuestion {
    id: number;
    number: number;
    passage: string;
    question: string;
    contextBox?: string;
    options: string[];
    correctAnswer: number;
    image?: string;
    optionImages?: string[];
    explanation?: string;
    score: number;
    instruction?: string;
    layout?: string;
    groupCount?: number;
}

interface TopikExam {
    id: string;
    type: 'READING' | 'LISTENING';
    title: string;
    description?: string;
    round: number;
    timeLimit: number;
    isPaid: boolean;
    questions: TopikQuestion[];
    audioUrl?: string;
    paperType?: string;
    questionsUrl?: string;
}

// --- Structure Definitions ---
interface ExamSectionStructure {
    range: number[];
    instruction: string;
    type?: string;
    grouped?: boolean;
    style?: string;
    hasBox?: boolean;
}

// Question types for UI display
type QuestionUIType =
    | 'FILL_QUESTION'    // 1-4: 问题即文段，可编辑question
    | 'IMAGE_REQUIRED'   // 5-8: 仅图片+选项
    | 'IMAGE_OR_PASSAGE' // 9-12: 图片或文段
    | 'ORDERING'         // 13-15: 排序题
    | 'PASSAGE_ONLY'     // 16-18, 25-38: 仅文段+选项
    | 'GROUPED'          // 19-24, 42-50: 分组阅读
    | 'INSERT_SENTENCE'; // 39-41: 句子插入

// Per-question configuration
interface QuestionConfig {
    instruction: string;
    question: string;        // Fixed question text (empty if variable)
    score: number;
    uiType: QuestionUIType;
    needsQuestionInput?: boolean;  // 是否需要手动输入问题
    needsPassage?: boolean;        // 是否需要阅读文段
    needsImage?: boolean;          // 是否需要图片
    needsContextBox?: boolean;     // 是否需要보기框
    grouped?: boolean;             // 是否为分组题
    groupStart?: number;           // 分组起始题号
    fixedOptions?: string[];       // 固定选项 (如 ㉠㉡㉢㉣)
}

// Reading Section (읽기) - Questions 1-50
const TOPIK_READING_QUESTIONS: Record<number, QuestionConfig> = {
    // 1-4: 填空/近义词 - 问题即文段，可编辑
    1: { instruction: "※ [1~2] (    )에 들어갈 가장 알맞은 것을 고르십시오. (각 2점)", question: "", score: 2, uiType: 'FILL_QUESTION' },
    2: { instruction: "※ [1~2] (    )에 들어갈 가장 알맞은 것을 고르십시오. (각 2점)", question: "", score: 2, uiType: 'FILL_QUESTION' },
    3: { instruction: "※ [3～4] 다음 밑줄 친 부분과 의미가 비슷한 것을 고르십시오. (각 2점)", question: "", score: 2, uiType: 'FILL_QUESTION' },
    4: { instruction: "※ [3～4] 다음 밑줄 친 부분과 의미가 비슷한 것을 고르십시오. (각 2점)", question: "", score: 2, uiType: 'FILL_QUESTION' },
    // 5-8: 图片题 - 仅图片+选项
    5: { instruction: "※ [5～8] 다음은 무엇에 대한 글인지 고르십시오. (각 2점)", question: "", score: 2, uiType: 'IMAGE_REQUIRED', needsImage: true },
    6: { instruction: "※ [5～8] 다음은 무엇에 대한 글인지 고르십시오. (각 2점)", question: "", score: 2, uiType: 'IMAGE_REQUIRED', needsImage: true },
    7: { instruction: "※ [5～8] 다음은 무엇에 대한 글인지 고르십시오. (각 2점)", question: "", score: 2, uiType: 'IMAGE_REQUIRED', needsImage: true },
    8: { instruction: "※ [5～8] 다음은 무엇에 대한 글인지 고르십시오. (각 2점)", question: "", score: 2, uiType: 'IMAGE_REQUIRED', needsImage: true },
    // 9-12: 图片或文段
    9: { instruction: "※ [9～12] 다음 글 또는 도표의 내용과 같은 것을 고르십시오. (각 2점)", question: "", score: 2, uiType: 'IMAGE_OR_PASSAGE', needsPassage: true, needsImage: true },
    10: { instruction: "※ [9～12] 다음 글 또는 도표의 내용과 같은 것을 고르십시오. (각 2점)", question: "", score: 2, uiType: 'IMAGE_OR_PASSAGE', needsPassage: true, needsImage: true },
    11: { instruction: "※ [9～12] 다음 글 또는 도표의 내용과 같은 것을 고르십시오. (각 2점)", question: "", score: 2, uiType: 'PASSAGE_ONLY', needsPassage: true },
    12: { instruction: "※ [9～12] 다음 글 또는 도표의 내용과 같은 것을 고르십시오. (각 2점)", question: "", score: 2, uiType: 'PASSAGE_ONLY', needsPassage: true },
    // 13-15: 排序题 - 보기框
    13: { instruction: "※ [13～15] 다음을 순서대로 맞게 배열한 것을 고르십시오. (각 2점)", question: "", score: 2, uiType: 'ORDERING', needsContextBox: true },
    14: { instruction: "※ [13～15] 다음을 순서대로 맞게 배열한 것을 고르십시오. (각 2점)", question: "", score: 2, uiType: 'ORDERING', needsContextBox: true },
    15: { instruction: "※ [13～15] 다음을 순서대로 맞게 배열한 것을 고르십시오. (각 2점)", question: "", score: 2, uiType: 'ORDERING', needsContextBox: true },
    // 16-18: 填空 - 仅文段
    16: { instruction: "※ [16～18] 다음을 읽고 (    )에 들어갈 내용으로 가장 알맞은 것을 고르십시오. (각 2점)", question: "", score: 2, uiType: 'PASSAGE_ONLY', needsPassage: true },
    17: { instruction: "※ [16～18] 다음을 읽고 (    )에 들어갈 내용으로 가장 알맞은 것을 고르십시오. (각 2점)", question: "", score: 2, uiType: 'PASSAGE_ONLY', needsPassage: true },
    18: { instruction: "※ [16～18] 다음을 읽고 (    )에 들어갈 내용으로 가장 알맞은 것을 고르십시오. (각 2점)", question: "", score: 2, uiType: 'PASSAGE_ONLY', needsPassage: true },
    // 19-20: 分组阅读 - 问题可编辑
    19: { instruction: "※ [19～20] 다음을 읽고 물음에 답하십시오. (각 2점)", question: "글쓴이가 말하는 방식으로 가장 알맞은 것을 고르십시오.", score: 2, uiType: 'GROUPED', grouped: true, groupStart: 19, needsPassage: true, needsQuestionInput: true },
    20: { instruction: "※ [19～20] 다음을 읽고 물음에 답하십시오. (각 2점)", question: "위 글의 내용과 같은 것을 고르십시오.", score: 2, uiType: 'GROUPED', grouped: true, groupStart: 19, needsQuestionInput: true },
    // 21-22: 分组阅读 - 问题可编辑
    21: { instruction: "※ [21～22] 다음을 읽고 물음에 답하십시오. (각 2점)", question: "밑줄 친 부분에 나타난 '나'의 심정으로 알맞은 것을 고르십시오.", score: 2, uiType: 'GROUPED', grouped: true, groupStart: 21, needsPassage: true, needsQuestionInput: true },
    22: { instruction: "※ [21～22] 다음을 읽고 물음에 답하십시오. (각 2점)", question: "위 글의 내용과 같은 것을 고르십시오.", score: 2, uiType: 'GROUPED', grouped: true, groupStart: 21, needsQuestionInput: true },
    // 23-24: 分组阅读 - 问题可编辑
    23: { instruction: "※ [23～24] 다음을 읽고 물음에 답하십시오. (각 2점)", question: "이 글을 쓴 목적을 고르십시오.", score: 2, uiType: 'GROUPED', grouped: true, groupStart: 23, needsPassage: true, needsQuestionInput: true },
    24: { instruction: "※ [23～24] 다음을 읽고 물음에 답하십시오. (각 2점)", question: "위 글의 내용과 같은 것을 고르십시오.", score: 2, uiType: 'GROUPED', grouped: true, groupStart: 23, needsQuestionInput: true },
    // 25-27: 新闻标题
    25: { instruction: "※ [25～27] 다음 신문 기사의 제목을 가장 잘 설명한 것을 고르십시오. (각 2점)", question: "", score: 2, uiType: 'PASSAGE_ONLY', needsPassage: true },
    26: { instruction: "※ [25～27] 다음 신문 기사의 제목을 가장 잘 설명한 것을 고르십시오. (각 2점)", question: "", score: 2, uiType: 'PASSAGE_ONLY', needsPassage: true },
    27: { instruction: "※ [25～27] 다음 신문 기사의 제목을 가장 잘 설명한 것을 고르십시오. (각 2점)", question: "", score: 2, uiType: 'PASSAGE_ONLY', needsPassage: true },
    // 28-31: 高级填空
    28: { instruction: "※ [28～31] 다음을 읽고 (    )에 들어갈 내용으로 가장 알맞은 것을 고르십시오. (각 2점)", question: "", score: 2, uiType: 'PASSAGE_ONLY', needsPassage: true },
    29: { instruction: "※ [28～31] 다음을 읽고 (    )에 들어갈 내용으로 가장 알맞은 것을 고르십시오. (각 2점)", question: "", score: 2, uiType: 'PASSAGE_ONLY', needsPassage: true },
    30: { instruction: "※ [28～31] 다음을 읽고 (    )에 들어갈 내용으로 가장 알맞은 것을 고르십시오. (각 2점)", question: "", score: 2, uiType: 'PASSAGE_ONLY', needsPassage: true },
    31: { instruction: "※ [28～31] 다음을 읽고 (    )에 들어갈 내용으로 가장 알맞은 것을 고르십시오. (각 2점)", question: "", score: 2, uiType: 'PASSAGE_ONLY', needsPassage: true },
    // 32-34: 内容匹配
    32: { instruction: "※ [32～34] 다음을 읽고 내용이 같은 것을 고르십시오. (각 2점)", question: "", score: 2, uiType: 'PASSAGE_ONLY', needsPassage: true },
    33: { instruction: "※ [32～34] 다음을 읽고 내용이 같은 것을 고르십시오. (각 2점)", question: "", score: 2, uiType: 'PASSAGE_ONLY', needsPassage: true },
    34: { instruction: "※ [32～34] 다음을 읽고 내용이 같은 것을 고르십시오. (각 2점)", question: "", score: 2, uiType: 'PASSAGE_ONLY', needsPassage: true },
    // 35-38: 主题
    35: { instruction: "※ [35～38] 다음 글의 주제로 가장 알맞은 것을 고르십시오. (각 2점)", question: "", score: 2, uiType: 'PASSAGE_ONLY', needsPassage: true },
    36: { instruction: "※ [35～38] 다음 글의 주제로 가장 알맞은 것을 고르십시오. (각 2점)", question: "", score: 2, uiType: 'PASSAGE_ONLY', needsPassage: true },
    37: { instruction: "※ [35～38] 다음 글의 주제로 가장 알맞은 것을 고르십시오. (각 2점)", question: "", score: 2, uiType: 'PASSAGE_ONLY', needsPassage: true },
    38: { instruction: "※ [35～38] 다음 글의 주제로 가장 알맞은 것을 고르십시오. (각 2점)", question: "", score: 2, uiType: 'PASSAGE_ONLY', needsPassage: true },
    // 39-41: 句子插入 - 固定选项㉠㉡㉢㉣
    39: { instruction: "※ [39～41] 다음 글에서 <보기>의 문장이 들어가기에 가장 알맞은 곳을 고르십시오. (각 2점)", question: "", score: 2, uiType: 'INSERT_SENTENCE', needsPassage: true, needsContextBox: true, fixedOptions: ['㉠', '㉡', '㉢', '㉣'] },
    40: { instruction: "※ [39～41] 다음 글에서 <보기>의 문장이 들어가기에 가장 알맞은 곳을 고르십시오. (각 2점)", question: "", score: 2, uiType: 'INSERT_SENTENCE', needsPassage: true, needsContextBox: true, fixedOptions: ['㉠', '㉡', '㉢', '㉣'] },
    41: { instruction: "※ [39～41] 다음 글에서 <보기>의 문장이 들어가기에 가장 알맞은 곳을 고르십시오. (각 2점)", question: "", score: 2, uiType: 'INSERT_SENTENCE', needsPassage: true, needsContextBox: true, fixedOptions: ['㉠', '㉡', '㉢', '㉣'] },
    // 42-43: 分组阅读
    42: { instruction: "※ [42～43] 다음을 읽고 물음에 답하십시오. (각 2점)", question: "밑줄 친 부분에 나타난 사람들의 태도로 알맞은 것을 고르십시오.", score: 2, uiType: 'GROUPED', grouped: true, groupStart: 42, needsPassage: true, needsQuestionInput: true },
    43: { instruction: "※ [42～43] 다음을 읽고 물음에 답하십시오. (각 2점)", question: "이 글의 내용과 같은 것을 고르십시오.", score: 2, uiType: 'GROUPED', grouped: true, groupStart: 42, needsQuestionInput: true },
    // 44-45: 分组阅读
    44: { instruction: "※ [44～45] 다음을 읽고 물음에 답하십시오. (각 2점)", question: "이 글의 주제로 알맞은 것을 고르십시오.", score: 2, uiType: 'GROUPED', grouped: true, groupStart: 44, needsPassage: true, needsQuestionInput: true },
    45: { instruction: "※ [44～45] 다음을 읽고 물음에 답하십시오. (각 2점)", question: "(    )에 들어갈 내용으로 알맞은 것을 고르십시오.", score: 2, uiType: 'GROUPED', grouped: true, groupStart: 44, needsQuestionInput: true },
    // 46-47: 分组阅读
    46: { instruction: "※ [46～47] 다음을 읽고 물음에 답하십시오. (각 2점)", question: "윗글에 나타난 필자의 태도로 가장 알맞은 것을 고르십시오.", score: 2, uiType: 'GROUPED', grouped: true, groupStart: 46, needsPassage: true, needsQuestionInput: true },
    47: { instruction: "※ [46～47] 다음을 읽고 물음에 답하십시오. (각 2점)", question: "윗글의 내용과 같은 것을 고르십시오.", score: 2, uiType: 'GROUPED', grouped: true, groupStart: 46, needsQuestionInput: true },
    // 48-50: 分组阅读
    48: { instruction: "※ [48～50] 다음을 읽고 물음에 답하십시오. (각 2점)", question: "필자가 이 글을 쓴 목적을 고르십시오.", score: 2, uiType: 'GROUPED', grouped: true, groupStart: 48, needsPassage: true, needsQuestionInput: true },
    49: { instruction: "※ [48～50] 다음을 읽고 물음에 답하십시오. (각 2점)", question: "(    )에 들어갈 내용으로 알맞은 것을 고르십시오.", score: 2, uiType: 'GROUPED', grouped: true, groupStart: 48, needsQuestionInput: true },
    50: { instruction: "※ [48～50] 다음을 읽고 물음에 답하십시오. (각 2점)", question: "밑줄 친 부분에 나타난 필자의 태도로 알맞은 것을 고르십시오.", score: 2, uiType: 'GROUPED', grouped: true, groupStart: 48, needsQuestionInput: true },
};

// Helper to get question config
function getQuestionConfig(num: number, type: 'READING' | 'LISTENING'): QuestionConfig | null {
    return type === 'READING' ? TOPIK_READING_QUESTIONS[num] : null;
}

const TOPIK_READING_STRUCTURE: ExamSectionStructure[] = [
    { range: [1, 2], instruction: "※ [1~2] (    )에 들어갈 가장 알맞은 것을 고르십시오. (각 2점)" },
    { range: [3, 4], instruction: "※ [3～4] 다음 밑줄 친 부분과 의미가 비슷한 것을 고르십시오. (각 2점)" },
    { range: [5, 8], instruction: "※ [5～8] 다음은 무엇에 대한 글인지 고르십시오. (각 2점)", type: "IMAGE_REQUIRED" },
    { range: [9, 10], instruction: "※ [9～12] 다음 글 또는 도표의 내용과 같은 것을 고르십시오. (각 2점)", type: "IMAGE_OR_PASSAGE" },
    { range: [11, 12], instruction: "※ [9～12] 다음 글 또는 도표의 내용과 같은 것을 고르십시오. (각 2점)" },
    { range: [13, 15], instruction: "※ [13～15] 다음을 순서대로 맞게 배열한 것을 고르십시오. (각 2점)", hasBox: true },
    { range: [16, 18], instruction: "※ [16～18] 다음을 읽고 (    )에 들어갈 내용으로 가장 알맞은 것을 고르십시오. (각 2점)" },
    { range: [19, 20], instruction: "※ [19～20] 다음을 읽고 물음에 답하십시오. (각 2점)", grouped: true },
    { range: [21, 22], instruction: "※ [21～22] 다음을 읽고 물음에 답하십시오. (각 2점)", grouped: true },
    { range: [23, 24], instruction: "※ [23～24] 다음을 읽고 물음에 답하십시오. (각 2점)", grouped: true },
    { range: [25, 27], instruction: "※ [25～27] 다음은 신문 기사의 제목입니다. 가장 잘 설명한 것을 고르십시오. (각 2점)", style: "HEADLINE" },
    { range: [28, 31], instruction: "※ [28～31] 다음을 읽고 (    )에 들어갈 내용으로 가장 알맞은 것을 고르십시오. (각 2점)" },
    { range: [32, 34], instruction: "※ [32～34] 다음을 읽고 내용이 같은 것을 고르십시오. (각 2점)" },
    { range: [35, 38], instruction: "※ [35～38] 다음 글의 주제로 가장 알맞은 것을 고르십시오. (각 2점)" },
    { range: [39, 41], instruction: "※ [39～41] 다음 글에서 <보기>의 문장이 들어가기에 가장 알맞은 곳을 고르십시오. (각 2점)", hasBox: true },
    { range: [42, 43], instruction: "※ [42～43] 다음을 읽고 물음에 답하십시오. (각 2점)", grouped: true },
    { range: [44, 45], instruction: "※ [44～45] 다음을 읽고 물음에 답하십시오. (각 2점)", grouped: true },
    { range: [46, 47], instruction: "※ [46～47] 다음을 읽고 물음에 답하십시오. (각 2점)", grouped: true, hasBox: true },
    { range: [48, 50], instruction: "※ [48～50] 다음을 읽고 물음에 답하십시오. (각 2점)", grouped: true },
];

const TOPIK_LISTENING_STRUCTURE: ExamSectionStructure[] = [
    { range: [1, 3], instruction: "※ [1～3] 다음을 듣고 알맞은 그림을 고르십시오. (각 2점)", type: "IMAGE_CHOICE" },
    { range: [4, 8], instruction: "※ [4～8] 다음 대화를 잘 듣고 이어질 수 있는 말을 고르십시오. (각 2점)" },
    { range: [9, 12], instruction: "※ [9～12] 다음 대화를 잘 듣고 여자가 이어서 할 행동으로 알맞은 것을 고르십시오. (각 2점)" },
    { range: [13, 16], instruction: "※ [13～16] 다음을 듣고 내용과 일치하는 것을 고르십시오. (각 2점)" },
    { range: [17, 20], instruction: "※ [17～20] 다음을 듣고 남자의 중심 생각을 고르십시오. (각 2점)" },
    { range: [21, 22], instruction: "※ [21～22] 다음을 듣고 물음에 답하십시오. (각 2점)", grouped: true },
    { range: [23, 24], instruction: "※ [23～24] 다음을 듣고 물음에 답하십시오. (각 2점)", grouped: true },
    { range: [25, 26], instruction: "※ [25～26] 다음을 듣고 물음에 답하십시오. (각 2점)", grouped: true },
    { range: [27, 28], instruction: "※ [27～28] 다음을 듣고 물음에 답하십시오. (각 2점)", grouped: true },
    { range: [29, 30], instruction: "※ [29～30] 다음을 듣고 물음에 답하십시오. (각 2점)", grouped: true },
    { range: [31, 32], instruction: "※ [31～32] 다음을 듣고 물음에 답하십시오. (각 2점)", grouped: true },
    { range: [33, 34], instruction: "※ [33～34] 다음을 듣고 물음에 답하십시오. (각 2점)", grouped: true },
    { range: [35, 36], instruction: "※ [35～36] 다음을 듣고 물음에 답하십시오. (각 2점)", grouped: true },
    { range: [37, 38], instruction: "※ [37～38] 다음은 교양 프로그램입니다. 잘 듣고 물음에 답하십시오. (각 2점)", grouped: true },
    { range: [39, 40], instruction: "※ [39～40] 다음은 대담입니다. 잘 듣고 물음에 답하십시오. (각 2점)", grouped: true },
    { range: [41, 42], instruction: "※ [41～42] 다음은 강연입니다. 잘 듣고 물음에 답하십시오. (각 2점)", grouped: true },
    { range: [43, 44], instruction: "※ [43～44] 다음은 다큐멘터리입니다. 잘 듣고 물음에 답하십시오. (각 2점)", grouped: true },
    { range: [45, 46], instruction: "※ [45～46] 다음은 강연입니다. 잘 듣고 물음에 답하십시오. (각 2점)", grouped: true },
    { range: [47, 48], instruction: "※ [47～48] 다음은 대담입니다. 잘 듣고 물음에 답하십시오. (각 2점)", grouped: true },
    { range: [49, 50], instruction: "※ [49～50] 다음은 강연입니다. 잘 듣고 물음에 답하십시오. (각 2점)", grouped: true },
];

export const TopikManager: React.FC = () => {
    // ========================================
    // Convex Queries (Reactive)
    // ========================================
    // ========================================
    // Convex Queries (Reactive)
    // ========================================
    const { results, status, loadMore } = usePaginatedQuery(
        api.topik.getExams as any,
        {},
        { initialNumItems: 20 }
    );

    const exams: TopikExam[] = (results || []).map((e: any) => ({
        ...e,
        questions: [], // Questions loaded separately
    }));

    const loading = status === 'LoadingFirstPage';

    // ========================================
    // Convex Mutations
    // ========================================
    const saveExamMutation = useMutation(api.topik.saveExam);
    const deleteExamMutation = useMutation(api.topik.deleteExam);

    // ========================================
    // Local UI State
    // ========================================
    const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
    const [selectedExam, setSelectedExam] = useState<TopikExam | null>(null);
    const [activeQuestionId, setActiveQuestionId] = useState<number>(1);
    const [saving, setSaving] = useState(false);
    const [uploadingItems, setUploadingItems] = useState<Set<string>>(new Set());
    const [loadingQuestions, setLoadingQuestions] = useState(false);

    // Upload Hook
    const { uploadFile } = useFileUpload();

    // Bulk Import Modal
    const [showImportModal, setShowImportModal] = useState(false);
    const [importText, setImportText] = useState('');
    const [importError, setImportError] = useState('');

    // Query for questions when exam is selected
    const convexQuestions = useQuery(
        api.topik.getExamQuestions,
        selectedExamId ? { examId: selectedExamId } : "skip"
    );

    // Track if we've loaded questions for current exam
    const loadedExamIdRef = React.useRef<string | null>(null);

    // Update selectedExam when questions load - only on initial load
    useEffect(() => {
        if (!selectedExamId) {
            loadedExamIdRef.current = null;
            return;
        }

        // Skip if we already loaded this exam
        if (loadedExamIdRef.current === selectedExamId) {
            return;
        }

        const examMeta = exams.find(e => e.id === selectedExamId);
        if (!examMeta) return;

        if (convexQuestions === undefined) {
            setLoadingQuestions(true);
        } else {
            setLoadingQuestions(false);
            // Deep clone to make it mutable
            const questions = convexQuestions.length > 0
                ? JSON.parse(JSON.stringify(convexQuestions)) as TopikQuestion[]
                : createEmptyQuestions();
            setSelectedExam({
                ...examMeta,
                questions,
            });
            loadedExamIdRef.current = selectedExamId;
        }
    }, [selectedExamId, convexQuestions, exams]);

    const createEmptyQuestions = (examType: 'READING' | 'LISTENING' = 'READING'): TopikQuestion[] => {
        const questions: TopikQuestion[] = [];
        for (let i = 1; i <= 50; i++) {
            const config = getQuestionConfig(i, examType);
            questions.push({
                id: i,
                number: i,
                passage: '',
                question: config?.question || '',
                options: ['', '', '', ''],
                correctAnswer: 0,
                image: '',
                score: config?.score || 2,
                instruction: config?.instruction || ''
            });
        }
        return questions;
    };

    const handleFileUpload = async (file: File, onSuccess: (url: string) => void, uploadKey?: string) => {
        const key = uploadKey || `upload-${Date.now()}`;
        setUploadingItems(prev => new Set(prev).add(key));
        try {
            const { url } = await uploadFile(file);
            onSuccess(url);
        } catch (e) {
            console.error(e);
            alert('Upload failed. Please try again.');
        } finally {
            setUploadingItems(prev => {
                const next = new Set(prev);
                next.delete(key);
                return next;
            });
        }
    };

    const createNewExam = (type: 'READING' | 'LISTENING') => {
        const questions = createEmptyQuestions(type).map(q => ({
            ...q,
            optionImages: type === 'LISTENING' ? ['', '', '', ''] : undefined,
        }));

        const newExam: TopikExam = {
            id: `exam-${Date.now()}`,
            type,
            title: `TOPIK II ${type === 'READING' ? 'Reading' : 'Listening'} - New`,
            description: '',
            round: 35,
            timeLimit: type === 'READING' ? 70 : 60,
            isPaid: false,
            questions,
            audioUrl: '',
        };

        // Set locally for editing (will be saved to Convex on save)
        setSelectedExam(newExam);
        setSelectedExamId(newExam.id);
        setActiveQuestionId(1);
    };

    const updateExamField = (field: keyof TopikExam, value: any) => {
        if (selectedExam) {
            setSelectedExam({ ...selectedExam, [field]: value });
        }
    };

    const updateQuestion = (id: number, field: keyof TopikQuestion, value: any) => {
        if (!selectedExam || !selectedExam.questions) return;
        const updatedQuestions = selectedExam.questions.map(q =>
            q.id === id ? { ...q, [field]: value } : q
        );
        setSelectedExam({ ...selectedExam, questions: updatedQuestions });
    };

    const updateOption = (qId: number, optIdx: number, value: string) => {
        if (!selectedExam || !selectedExam.questions) return;
        const q = selectedExam.questions.find(q => q.id === qId);
        if (!q) return;
        const newOptions = [...q.options];
        newOptions[optIdx] = value;
        updateQuestion(qId, 'options', newOptions);
    };

    const updateOptionImage = (qId: number, optIdx: number, url: string) => {
        if (!selectedExam || !selectedExam.questions) return;
        const q = selectedExam.questions.find(q => q.id === qId);
        if (!q) return;
        const newImages = [...(q.optionImages || ['', '', '', ''])];
        newImages[optIdx] = url;
        updateQuestion(qId, 'optionImages', newImages);
    };

    // Bulk upload option images - parses filenames like Q1_Option1.png, Q1_1.png, 1_1.png
    const handleBulkImageUpload = async (files: FileList) => {
        if (!selectedExam || !selectedExam.questions) {
            console.log('No exam selected or no questions');
            alert('请先选择一套试卷');
            return;
        }

        console.log(`Starting bulk upload of ${files.length} files`);

        // Store questions reference at start (for finding question by number)
        const questionsRef = selectedExam.questions;

        const results: { success: number; failed: number; errors: string[] } = { success: 0, failed: 0, errors: [] };
        const totalFiles = files.length;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const fileName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
            console.log(`Processing file ${i + 1}/${totalFiles}: ${file.name} -> parsed name: ${fileName}`);

            // Parse filename: Q1_Option1, Q1_1, 1_1, Q1O1, etc.
            const patterns = [
                /^Q?(\d+)[_-]?O?p?t?i?o?n?(\d+)$/i,  // Q1_Option1, Q1Option1, Q1_1, 1_1
                /^(\d+)[_-](\d+)$/,                    // 1_1, 1-1
            ];

            let questionNum: number | null = null;
            let optionNum: number | null = null;

            for (const pattern of patterns) {
                const match = fileName.match(pattern);
                if (match) {
                    questionNum = parseInt(match[1]);
                    optionNum = parseInt(match[2]);
                    console.log(`Matched pattern: Q${questionNum}, Option${optionNum}`);
                    break;
                }
            }

            if (questionNum === null || optionNum === null || optionNum < 1 || optionNum > 4) {
                results.failed++;
                results.errors.push(`${file.name}: 无法识别格式`);
                continue;
            }

            // Find the question (using stored reference to avoid closure issues)
            const question = questionsRef.find(q => q.number === questionNum);
            if (!question) {
                results.failed++;
                results.errors.push(`${file.name}: 找不到第 ${questionNum} 题`);
                continue;
            }

            // Show loading on this specific option
            const uploadKey = `opt-${question.id}-${optionNum - 1}`;
            setUploadingItems(prev => new Set(prev).add(uploadKey));

            try {
                const { url } = await uploadFile(file);

                // Update state immediately after each successful upload
                setSelectedExam(prev => {
                    if (!prev || !prev.questions) return prev;
                    return {
                        ...prev,
                        questions: prev.questions.map(q => {
                            if (q.id === question.id) {
                                const newImages = [...(q.optionImages || ['', '', '', ''])];
                                newImages[optionNum! - 1] = url;
                                return { ...q, optionImages: newImages };
                            }
                            return q;
                        })
                    };
                });
                results.success++;
            } catch (e) {
                results.failed++;
                results.errors.push(`${file.name}: 上传失败`);
            } finally {
                // Remove loading state for this option
                setUploadingItems(prev => {
                    const next = new Set(prev);
                    next.delete(uploadKey);
                    return next;
                });
            }
        }

        // Show final result
        let message = `✅ 批量上传完成：成功 ${results.success}/${totalFiles} 张`;
        if (results.failed > 0) {
            message += `\n\n❌ 失败 ${results.failed} 张：\n` + results.errors.slice(0, 5).join('\n');
            if (results.errors.length > 5) {
                message += `\n... 还有 ${results.errors.length - 5} 个错误`;
            }
        }
        alert(message);
    };

    const handleSave = async () => {
        if (!selectedExam) return;
        setSaving(true);
        try {
            await saveExamMutation({
                id: selectedExam.id,
                title: selectedExam.title,
                round: selectedExam.round,
                type: selectedExam.type,
                paperType: selectedExam.paperType,
                timeLimit: selectedExam.timeLimit,
                audioUrl: selectedExam.audioUrl,
                description: selectedExam.description,
                isPaid: selectedExam.isPaid,
                questions: selectedExam.questions.map(q => ({
                    id: q.id,
                    number: q.number,
                    passage: q.passage,
                    question: q.question,
                    contextBox: q.contextBox,
                    options: q.options,
                    correctAnswer: q.correctAnswer,
                    image: q.image,
                    optionImages: q.optionImages,
                    explanation: q.explanation,
                    score: q.score,
                    instruction: q.instruction,
                    layout: q.layout,
                    groupCount: q.groupCount,
                })),
            });
            // Convex queries will auto-refresh
            alert('保存成功！');
        } catch (e) {
            console.error('Save failed', e);
            alert('保存失败');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedExam || !confirm(`删除考试 "${selectedExam.title}"？`)) return;
        try {
            await deleteExamMutation({ examId: selectedExam.id });
            // Convex queries will auto-refresh
            setSelectedExam(null);
            setSelectedExamId(null);
        } catch (e) {
            console.error('Delete failed', e);
            alert('删除失败');
        }
    };

    const handleImportQuestions = () => {
        if (!selectedExam || !importText.trim()) return;

        try {
            let importedQuestions: TopikQuestion[];
            const trimmed = importText.trim();
            if (trimmed.startsWith('[')) {
                importedQuestions = JSON.parse(trimmed);
            } else if (trimmed.startsWith('{')) {
                importedQuestions = [JSON.parse(trimmed)];
            } else {
                throw new Error('请输入有效的 JSON 格式（数组或对象）');
            }

            if (!Array.isArray(importedQuestions)) {
                throw new Error('导入数据必须是题目数组');
            }

            const validatedQuestions = importedQuestions.map((q, idx) => {
                if (!q.id || typeof q.id !== 'number') {
                    throw new Error(`第 ${idx + 1} 题缺少有效的 id 字段`);
                }
                if (!q.options || !Array.isArray(q.options) || q.options.length !== 4) {
                    throw new Error(`第 ${q.id} 题的 options 必须是包含4个选项的数组`);
                }
                return {
                    id: q.id,
                    number: q.number || q.id,
                    passage: q.passage || '',
                    question: q.question || '',
                    contextBox: q.contextBox || '',
                    options: q.options,
                    correctAnswer: q.correctAnswer ?? 0,
                    score: q.score || 2,
                    instruction: q.instruction || '',
                    image: q.image || '',
                    layout: q.layout || undefined,
                    groupCount: q.groupCount || undefined,
                } as TopikQuestion;
            });

            const existingQuestions = selectedExam.questions || [];
            const mergedQuestions = [...existingQuestions];
            validatedQuestions.forEach(newQ => {
                const existingIdx = mergedQuestions.findIndex(q => q.id === newQ.id);
                if (existingIdx >= 0) {
                    mergedQuestions[existingIdx] = newQ;
                } else {
                    mergedQuestions.push(newQ);
                }
            });
            mergedQuestions.sort((a, b) => a.id - b.id);

            setSelectedExam({ ...selectedExam, questions: mergedQuestions });
            setShowImportModal(false);
            setImportText('');
            setImportError('');
            alert(`成功导入 ${validatedQuestions.length} 道题目！请检查后点击"保存"。`);
        } catch (e: any) {
            setImportError(e.message || '解析失败，请检查 JSON 格式');
        }
    };

    // Excel/CSV Partial Import
    const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedExam) return;

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            if (!jsonData || jsonData.length === 0) {
                alert('表格为空或格式错误');
                return;
            }

            // Merge logic (Partial Update)
            const existingQuestions = [...(selectedExam.questions || [])];
            let updatedCount = 0;

            console.log("Excel Import: Processing", jsonData.length, "rows");

            jsonData.forEach((row: any) => {
                // Support both English and Chinese headers
                const qId = row.id || row.ID || row.Id || row.number || row.Number || row['题号'];
                if (!qId) return;

                const idNum = parseInt(qId);
                const existingIdx = existingQuestions.findIndex(q => q.id === idNum);

                if (existingIdx >= 0) {
                    const existing = existingQuestions[existingIdx];
                    const updated = { ...existing };
                    let changed = false;

                    // Helper to update if present
                    const updateIfPresent = (field: keyof TopikQuestion, value: any) => {
                        if (value !== undefined) {
                            (updated as any)[field] = String(value);
                            changed = true;
                        }
                    };

                    // Map Chinese headers to fields
                    updateIfPresent('question', row.question ?? row['问题']);
                    updateIfPresent('passage', row.passage ?? row['文章']);
                    updateIfPresent('instruction', row.instruction ?? row['指令']);
                    updateIfPresent('contextBox', row.contextBox ?? row['보기']);
                    updateIfPresent('explanation', row.explanation ?? row['解释'] ?? row['解析']);

                    // Options (support option1..4 and Chinese 选项1..4)
                    const opt1 = row.option1 ?? row['选项1'];
                    const opt2 = row.option2 ?? row['选项2'];
                    const opt3 = row.option3 ?? row['选项3'];
                    const opt4 = row.option4 ?? row['选项4'];

                    if (opt1 !== undefined || opt2 !== undefined || opt3 !== undefined || opt4 !== undefined) {
                        const newOpts = [...updated.options];
                        if (opt1 !== undefined) newOpts[0] = String(opt1);
                        if (opt2 !== undefined) newOpts[1] = String(opt2);
                        if (opt3 !== undefined) newOpts[2] = String(opt3);
                        if (opt4 !== undefined) newOpts[3] = String(opt4);
                        updated.options = newOpts;
                        changed = true;
                    }

                    // Correct Answer (1-based)
                    const ans = row.correctAnswer ?? row['答案'];
                    if (ans !== undefined) {
                        const ca = parseInt(ans);
                        if (!isNaN(ca)) {
                            updated.correctAnswer = ca - 1;
                            changed = true;
                        }
                    }

                    // Score
                    const score = row.score ?? row['分数'];
                    if (score !== undefined) {
                        updated.score = parseInt(score);
                        changed = true;
                    }

                    if (changed) {
                        existingQuestions[existingIdx] = updated;
                        updatedCount++;
                    }
                }
            });

            setSelectedExam({ ...selectedExam, questions: existingQuestions });
            alert(`✅ 成功更新 ${updatedCount} 道题目数据！\n（只更新了表格中存在的字段，原有图片/音频未受影响）`);

            // Reset input
            e.target.value = '';

        } catch (error) {
            console.error(error);
            alert('解析表格失败，请确保格式正确');
        }
    };

    const currentExam = selectedExam;
    const STRUCTURE = currentExam?.type === 'LISTENING' ? TOPIK_LISTENING_STRUCTURE : TOPIK_READING_STRUCTURE;
    const getQ = (id: number) => currentExam?.questions?.find(q => q.id === id);

    // --- Render Visual Editor ---
    const renderVisualEditor = () => {
        if (loadingQuestions) {
            return (
                <div className="flex h-full items-center justify-center text-zinc-500">
                    <Loader2 className="w-8 h-8 animate-spin mb-2" /> Loading Exam Content...
                </div>
            );
        }
        if (!currentExam || !currentExam.questions) {
            return <div className="flex h-full items-center justify-center text-zinc-400">Content not available</div>;
        }

        return (
            <div className="flex h-full bg-zinc-100">
                {/* Left Sidebar: Navigation */}
                <div className="w-16 bg-white border-r-2 border-zinc-200 overflow-y-auto flex flex-col items-center py-4 gap-2">
                    {STRUCTURE.map((section, idx) => (
                        <button
                            key={idx}
                            onClick={() => {
                                setActiveQuestionId(section.range[0]);
                                document.getElementById(`q-anchor-${section.range[0]}`)?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all border-2 ${activeQuestionId >= section.range[0] && activeQuestionId <= section.range[1]
                                ? 'bg-zinc-900 text-white border-zinc-900'
                                : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400'
                                }`}
                            title={section.instruction}
                        >
                            {section.range[0]}
                        </button>
                    ))}
                </div>

                {/* Main Canvas: The Exam Paper */}
                <div className="flex-1 overflow-y-auto p-8 flex justify-center">
                    <div className="bg-white w-full max-w-[900px] min-h-[1200px] shadow-[6px_6px_0px_0px_#18181B] border-2 border-zinc-900 p-12 relative">

                        {/* Header */}
                        <div className="border-b-4 border-black pb-6 mb-8 text-center relative">
                            {currentExam.type === 'LISTENING' && (
                                <div className="absolute top-0 right-0">
                                    <label className="flex items-center px-4 py-2 bg-purple-100 border-2 border-zinc-900 rounded-lg text-zinc-900 font-bold text-sm cursor-pointer hover:bg-purple-200 transition-colors shadow-[2px_2px_0px_0px_#18181B]">
                                        {uploadingItems.has('audio') ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                                        {currentExam.audioUrl ? "Change Audio" : "Upload Audio"}
                                        <input
                                            type="file" hidden accept="audio/*"
                                            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], (url) => updateExamField('audioUrl', url), 'audio')}
                                        />
                                    </label>
                                    {currentExam.audioUrl && (
                                        <div className="mt-2 text-xs text-emerald-600 font-bold flex items-center justify-end">
                                            <CheckSquare className="w-3 h-3 mr-1" /> Ready
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex justify-center items-center gap-3 mb-4">
                                <h1 className="text-4xl font-extrabold tracking-widest font-serif text-zinc-900">TOPIK Ⅱ</h1>
                                <select
                                    value={currentExam.paperType || 'B'}
                                    onChange={(e) => updateExamField('paperType', e.target.value)}
                                    className="appearance-none bg-black text-white text-2xl font-serif font-bold rounded-full w-10 h-10 text-center cursor-pointer"
                                    style={{ textAlignLast: 'center' }}
                                >
                                    <option value="A">A</option>
                                    <option value="B">B</option>
                                </select>
                            </div>

                            <div className="flex justify-center items-center text-xl font-bold text-zinc-700 font-serif gap-1">
                                <span>제</span>
                                <input
                                    type="number"
                                    className="w-16 text-center bg-white border-b-2 border-zinc-300 focus:border-zinc-900 outline-none px-1"
                                    value={currentExam.round}
                                    onChange={(e) => updateExamField('round', parseInt(e.target.value) || 0)}
                                />
                                <span>회 한국어능력시험</span>
                            </div>

                            <input
                                className="mt-4 text-center text-zinc-400 font-medium bg-white border-b-2 border-transparent hover:border-zinc-200 focus:border-zinc-900 outline-none w-1/2 transition-colors mx-auto block"
                                value={currentExam.title}
                                onChange={(e) => updateExamField('title', e.target.value)}
                                placeholder="Internal Exam Title"
                            />
                        </div>

                        {/* Sections Loop */}
                        {STRUCTURE.map((section, sIdx) => {
                            const [start, end] = section.range;
                            const isGrouped = section.grouped;
                            const questionsInRange = [];
                            for (let i = start; i <= end; i++) {
                                const q = getQ(i);
                                if (q) questionsInRange.push(q);
                            }
                            if (questionsInRange.length === 0) return null;

                            return (
                                <div key={sIdx} className="mb-12 relative" id={`q-anchor-${start}`}>
                                    {/* Instruction Bar - 可编辑 (听力) / 静态显示 (阅读) */}
                                    <div className="bg-zinc-100 border-l-4 border-zinc-800 p-2 mb-6 font-bold text-zinc-800 text-[17px] font-serif">
                                        {currentExam?.type === 'LISTENING' ? (
                                            <input
                                                className="w-full bg-transparent outline-none font-bold text-zinc-800 text-[17px] font-serif"
                                                value={questionsInRange[0].instruction || section.instruction}
                                                onChange={(e) => updateQuestion(questionsInRange[0].id, 'instruction', e.target.value)}
                                                placeholder={section.instruction}
                                            />
                                        ) : (
                                            <span>{section.instruction}</span>
                                        )}
                                    </div>

                                    {/* Shared Passage */}
                                    {isGrouped && (
                                        <div className="mb-6 p-4 border-2 border-dashed border-zinc-300 rounded-xl hover:border-zinc-500 transition-colors bg-zinc-50/50">
                                            <textarea
                                                className="w-full bg-transparent border-none focus:ring-0 text-[17px] leading-8 font-serif resize-none h-48 outline-none"
                                                placeholder="Enter shared passage here..."
                                                value={questionsInRange[0].passage || ''}
                                                onChange={(e) => updateQuestion(questionsInRange[0].id, 'passage', e.target.value)}
                                            />
                                        </div>
                                    )}

                                    {/* Questions */}
                                    <div className={isGrouped ? "pl-2" : ""}>
                                        {questionsInRange.map((q) => {
                                            // Get config for this specific question
                                            const qConfig = getQuestionConfig(q.id, currentExam?.type || 'READING');
                                            const isGroupStart = qConfig?.groupStart === q.id;

                                            return (
                                                <div key={q.id} className="mb-8 p-4 rounded-xl hover:bg-zinc-50 transition-colors border-2 border-transparent hover:border-zinc-200">
                                                    <div className="flex gap-4">
                                                        <span className="text-xl font-bold font-serif pt-1">{q.id}.</span>
                                                        <div className="flex-1 space-y-4">

                                                            {/* 1-4题: 问题即文段（可编辑） */}
                                                            {qConfig?.uiType === 'FILL_QUESTION' && (
                                                                <textarea
                                                                    className="w-full bg-white border-2 border-zinc-200 rounded-lg p-3 text-[16px] leading-7 font-serif resize-none outline-none focus:border-zinc-900 h-20"
                                                                    placeholder="输入句子（含填空或下划线）..."
                                                                    value={q.question || ''}
                                                                    onChange={(e) => updateQuestion(q.id, 'question', e.target.value)}
                                                                />
                                                            )}

                                                            {/* 5-8题: 仅图片 */}
                                                            {qConfig?.uiType === 'IMAGE_REQUIRED' && (
                                                                <div className="mb-2">
                                                                    {q.image ? (
                                                                        <div className="relative inline-block group/img">
                                                                            <img src={q.image} className="max-h-48 border-2 border-zinc-200 rounded-lg" alt="Q" />
                                                                            <button onClick={() => updateQuestion(q.id, 'image', '')} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded opacity-0 group-hover/img:opacity-100">
                                                                                <Trash2 className="w-3 h-3" />
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <label className="cursor-pointer inline-flex items-center px-4 py-3 bg-blue-50 text-blue-600 text-sm rounded-lg border-2 border-blue-200 hover:border-blue-400">
                                                                            {uploadingItems.has(`img-${q.id}`) ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ImageIcon className="w-4 h-4 mr-2" />}
                                                                            上传图片 (必须)
                                                                            <input type="file" hidden accept="image/*" onChange={(e) => {
                                                                                e.target.files?.[0] && handleFileUpload(e.target.files[0], (url) => updateQuestion(q.id, 'image', url), `img-${q.id}`);
                                                                            }} />
                                                                        </label>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {/* 9-12题: 图片或文段 */}
                                                            {qConfig?.uiType === 'IMAGE_OR_PASSAGE' && (
                                                                <div className="space-y-3">
                                                                    <div className="flex gap-3">
                                                                        {q.image ? (
                                                                            <div className="relative inline-block group/img">
                                                                                <img src={q.image} className="max-h-40 border-2 border-zinc-200 rounded-lg" alt="Q" />
                                                                                <button onClick={() => updateQuestion(q.id, 'image', '')} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded opacity-0 group-hover/img:opacity-100">
                                                                                    <Trash2 className="w-3 h-3" />
                                                                                </button>
                                                                            </div>
                                                                        ) : (
                                                                            <label className="cursor-pointer inline-flex items-center px-3 py-2 bg-zinc-100 text-zinc-600 text-xs rounded-lg border-2 border-zinc-200 hover:border-zinc-400">
                                                                                <ImageIcon className="w-3 h-3 mr-1" /> 上传图表
                                                                                <input type="file" hidden accept="image/*" onChange={(e) => {
                                                                                    e.target.files?.[0] && handleFileUpload(e.target.files[0], (url) => updateQuestion(q.id, 'image', url));
                                                                                }} />
                                                                            </label>
                                                                        )}
                                                                    </div>
                                                                    <textarea
                                                                        className="w-full bg-white border-2 border-zinc-200 rounded-lg p-3 text-[16px] leading-7 font-serif resize-none outline-none focus:border-zinc-900 h-32"
                                                                        placeholder="或输入文段..."
                                                                        value={q.passage || ''}
                                                                        onChange={(e) => updateQuestion(q.id, 'passage', e.target.value)}
                                                                    />
                                                                </div>
                                                            )}

                                                            {/* 13-15题: 排序题 - 보기框 */}
                                                            {qConfig?.uiType === 'ORDERING' && (
                                                                <div className="border-2 border-zinc-800 p-4 relative rounded-lg">
                                                                    <span className="absolute -top-3 left-4 bg-white px-2 text-xs font-bold border border-zinc-300 rounded">보기</span>
                                                                    <textarea
                                                                        className="w-full bg-white p-2 text-[15px] resize-none outline-none h-24"
                                                                        placeholder="输入排序内容 (가), (나), (다), (라)..."
                                                                        value={q.contextBox || ''}
                                                                        onChange={(e) => updateQuestion(q.id, 'contextBox', e.target.value)}
                                                                    />
                                                                </div>
                                                            )}

                                                            {/* 16-18, 25-38题: 仅文段 (非分组) */}
                                                            {qConfig?.uiType === 'PASSAGE_ONLY' && (
                                                                <textarea
                                                                    className={`w-full bg-white border-2 border-zinc-200 rounded-lg p-3 text-[16px] leading-7 font-serif resize-none outline-none focus:border-zinc-900 ${section.style === 'HEADLINE' ? 'font-bold border-zinc-800 shadow-[3px_3px_0px_#000] h-24' : 'h-32'}`}
                                                                    placeholder={section.style === 'HEADLINE' ? "输入新闻标题..." : "输入阅读文段..."}
                                                                    value={q.passage || ''}
                                                                    onChange={(e) => updateQuestion(q.id, 'passage', e.target.value)}
                                                                />
                                                            )}

                                                            {/* 39-41题: 句子插入 (非分组) */}
                                                            {qConfig?.uiType === 'INSERT_SENTENCE' && !qConfig?.grouped && (
                                                                <div className="space-y-4">
                                                                    <textarea
                                                                        className="w-full bg-white border-2 border-zinc-200 rounded-lg p-3 text-[16px] leading-7 font-serif resize-none outline-none focus:border-zinc-900 h-40"
                                                                        placeholder="输入主文段 (含 ㉠ ㉡ ㉢ ㉣ 标记)..."
                                                                        value={q.passage || ''}
                                                                        onChange={(e) => updateQuestion(q.id, 'passage', e.target.value)}
                                                                    />
                                                                    <div className="border-2 border-zinc-800 p-4 relative rounded-lg">
                                                                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-2 text-xs font-bold border border-zinc-300 rounded">&lt;보 기&gt;</span>
                                                                        <textarea
                                                                            className="w-full bg-white p-2 text-[15px] resize-none outline-none h-16"
                                                                            placeholder="输入要插入的句子..."
                                                                            value={q.contextBox || ''}
                                                                            onChange={(e) => updateQuestion(q.id, 'contextBox', e.target.value)}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* 46题: 分组的句子插入 - 只显示보기框 */}
                                                            {qConfig?.uiType === 'INSERT_SENTENCE' && qConfig?.grouped && (
                                                                <div className="border-2 border-zinc-800 p-4 relative rounded-lg">
                                                                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-2 text-xs font-bold border border-zinc-300 rounded">&lt;보 기&gt;</span>
                                                                    <textarea
                                                                        className="w-full bg-white p-2 text-[15px] resize-none outline-none h-16"
                                                                        placeholder="输入要插入的句子..."
                                                                        value={q.contextBox || ''}
                                                                        onChange={(e) => updateQuestion(q.id, 'contextBox', e.target.value)}
                                                                    />
                                                                </div>
                                                            )}

                                                            {/* 分组题 - 只有第一题显示文段输入 */}
                                                            {qConfig?.uiType === 'GROUPED' && isGroupStart && !isGrouped && (
                                                                <div className="space-y-4">
                                                                    <textarea
                                                                        className="w-full bg-white border-2 border-zinc-200 rounded-lg p-3 text-[16px] leading-7 font-serif resize-none outline-none focus:border-zinc-900 h-48"
                                                                        placeholder="输入共享阅读文段..."
                                                                        value={q.passage || ''}
                                                                        onChange={(e) => updateQuestion(q.id, 'passage', e.target.value)}
                                                                    />
                                                                    {qConfig?.needsContextBox && (
                                                                        <div className="border-2 border-zinc-800 p-4 relative rounded-lg">
                                                                            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-2 text-xs font-bold border border-zinc-300 rounded">&lt;보 기&gt;</span>
                                                                            <textarea
                                                                                className="w-full bg-white p-2 text-[15px] resize-none outline-none h-16"
                                                                                placeholder="输入要插入的句子..."
                                                                                value={q.contextBox || ''}
                                                                                onChange={(e) => updateQuestion(q.id, 'contextBox', e.target.value)}
                                                                            />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {/* 可编辑问题输入框 (19-24, 47等) */}
                                                            {qConfig?.needsQuestionInput && (
                                                                <input
                                                                    className="w-full font-bold text-[17px] bg-white border-b-2 border-zinc-200 hover:border-zinc-400 focus:border-zinc-900 outline-none py-2"
                                                                    placeholder="输入问题..."
                                                                    value={q.question || ''}
                                                                    onChange={(e) => updateQuestion(q.id, 'question', e.target.value)}
                                                                />
                                                            )}

                                                            {/* 固定问题文字显示 (非可编辑) */}
                                                            {qConfig?.question && !qConfig?.needsQuestionInput && (
                                                                <div className="font-bold text-[17px] text-zinc-700 py-2 border-b border-zinc-200">
                                                                    {qConfig.question}
                                                                </div>
                                                            )}

                                                            {/* 听力题目 - 允许编辑问题文本（当没有特定配置时） */}
                                                            {!qConfig && (currentExam?.type === 'LISTENING') && (
                                                                <input
                                                                    className="w-full font-bold text-[17px] bg-white border-b-2 border-zinc-200 hover:border-zinc-400 focus:border-zinc-900 outline-none py-2"
                                                                    placeholder="输入问题..."
                                                                    value={q.question || ''}
                                                                    onChange={(e) => updateQuestion(q.id, 'question', e.target.value)}
                                                                />
                                                            )}

                                                            {/* Options - 固定选项 (39-41, 46题: ㉠㉡㉢㉣) */}
                                                            {qConfig?.fixedOptions && section.type !== 'IMAGE_CHOICE' && (
                                                                <div className="grid grid-cols-4 gap-3">
                                                                    {qConfig.fixedOptions.map((opt, oIdx) => (
                                                                        <button
                                                                            key={oIdx}
                                                                            onClick={() => updateQuestion(q.id, 'correctAnswer', oIdx)}
                                                                            className={`py-3 px-4 rounded-lg border-2 text-lg font-bold transition-colors ${q.correctAnswer === oIdx ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white border-zinc-300 text-zinc-600 hover:border-zinc-600'}`}
                                                                        >
                                                                            {oIdx + 1} {opt}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            )}

                                                            {/* Options - 可编辑文本选项 */}
                                                            {!qConfig?.fixedOptions && section.type !== 'IMAGE_CHOICE' && (
                                                                <div className={`grid ${q.options.some(o => o.length > 25) ? 'grid-cols-1' : 'grid-cols-2'} gap-x-8 gap-y-2`}>
                                                                    {q.options.map((opt, oIdx) => (
                                                                        <div key={oIdx} className="flex items-center gap-2">
                                                                            <button
                                                                                onClick={() => updateQuestion(q.id, 'correctAnswer', oIdx)}
                                                                                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-sans transition-colors ${q.correctAnswer === oIdx ? 'bg-zinc-900 text-white border-zinc-900' : 'border-zinc-300 text-zinc-400 hover:border-zinc-600'}`}
                                                                            >
                                                                                {oIdx + 1}
                                                                            </button>
                                                                            <input
                                                                                className="flex-1 bg-white border-b-2 border-transparent hover:border-zinc-200 focus:border-zinc-900 outline-none text-[16px] py-1"
                                                                                value={opt}
                                                                                onChange={(e) => updateOption(q.id, oIdx, e.target.value)}
                                                                                placeholder={`选项 ${oIdx + 1}`}
                                                                            />
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}

                                                            {/* Options - 图片选项 (听力1-3题) */}
                                                            {section.type === 'IMAGE_CHOICE' && (
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    {[0, 1, 2, 3].map((optIdx) => {
                                                                        const img = q.optionImages?.[optIdx];
                                                                        return (
                                                                            <div key={optIdx} className="flex flex-col items-center gap-2">
                                                                                <button
                                                                                    onClick={() => updateQuestion(q.id, 'correctAnswer', optIdx)}
                                                                                    className={`w-full aspect-[4/3] border-2 rounded-lg flex flex-col items-center justify-center relative overflow-hidden group/optImg ${q.correctAnswer === optIdx ? 'border-zinc-900 ring-2 ring-lime-300' : 'border-zinc-200 hover:border-zinc-400'}`}
                                                                                >
                                                                                    {img ? (
                                                                                        <>
                                                                                            <img src={img} className="w-full h-full object-contain" alt={`Opt ${optIdx}`} />
                                                                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/optImg:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                                                                <div className="p-2 bg-white rounded-full text-red-500 hover:bg-red-50 cursor-pointer" onClick={(e) => { e.stopPropagation(); updateOptionImage(q.id, optIdx, '') }}>
                                                                                                    <Trash2 className="w-4 h-4" />
                                                                                                </div>
                                                                                            </div>
                                                                                        </>
                                                                                    ) : (
                                                                                        <label
                                                                                            onClick={(e) => e.stopPropagation()}
                                                                                            className="cursor-pointer flex flex-col items-center text-zinc-400 hover:text-zinc-600 p-4 w-full h-full justify-center"
                                                                                        >
                                                                                            {uploadingItems.has(`opt-${q.id}-${optIdx}`) ? <Loader2 className="w-6 h-6 animate-spin" /> : <ImageIcon className="w-8 h-8 mb-2" />}
                                                                                            <span className="text-xs font-bold">上传选项 {optIdx + 1}</span>
                                                                                            <input type="file" hidden accept="image/*" onChange={(e) => {
                                                                                                e.target.files?.[0] && handleFileUpload(e.target.files[0], (url) => updateOptionImage(q.id, optIdx, url), `opt-${q.id}-${optIdx}`);
                                                                                            }} />
                                                                                        </label>
                                                                                    )}
                                                                                    <div className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${q.correctAnswer === optIdx ? 'bg-zinc-900 text-white' : 'bg-zinc-200 text-zinc-600'}`}>
                                                                                        {optIdx + 1}
                                                                                    </div>
                                                                                </button>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex h-[calc(100vh-200px)] gap-6">
            {/* List Sidebar */}
            <div className="w-72 flex-shrink-0 flex flex-col bg-white border-2 border-zinc-900 rounded-xl shadow-[4px_4px_0px_0px_#18181B] overflow-hidden">
                <div className="p-4 border-b-2 border-zinc-200">
                    <button
                        onClick={() => createNewExam('READING')}
                        className="w-full mb-2 px-4 py-3 bg-blue-100 border-2 border-zinc-900 text-zinc-900 rounded-lg hover:bg-blue-200 transition-colors flex items-center justify-center gap-2 font-bold shadow-[2px_2px_0px_0px_#18181B] active:translate-y-0.5 active:shadow-none"
                    >
                        <FileText className="w-4 h-4" /> 新建阅读考试
                    </button>
                    <button
                        onClick={() => createNewExam('LISTENING')}
                        className="w-full px-4 py-3 bg-purple-100 border-2 border-zinc-900 text-zinc-900 rounded-lg hover:bg-purple-200 transition-colors flex items-center justify-center gap-2 font-bold shadow-[2px_2px_0px_0px_#18181B] active:translate-y-0.5 active:shadow-none"
                    >
                        <Headphones className="w-4 h-4" /> 新建听力考试
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-3">
                    {loading ? (
                        <div className="text-center text-zinc-400 py-10"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
                    ) : exams.length === 0 ? (
                        <div className="text-center text-zinc-400 py-10 text-sm">暂无考试</div>
                    ) : (
                        exams.map(exam => (
                            <div
                                key={exam.id}
                                onClick={() => setSelectedExamId(exam.id)}
                                className={`p-4 rounded-xl cursor-pointer mb-2 transition-all border-2 ${selectedExam?.id === exam.id
                                    ? 'bg-lime-100 border-zinc-900 shadow-[2px_2px_0px_0px_#18181B]'
                                    : 'border-zinc-200 hover:border-zinc-400'
                                    }`}
                            >
                                <div className="font-bold text-zinc-800 text-sm truncate">{exam.title}</div>
                                <div className="text-xs text-zinc-500 flex justify-between mt-1">
                                    <span>Round {exam.round}</span>
                                    <span className={exam.type === 'READING' ? 'text-blue-500 font-bold' : 'text-purple-500 font-bold'}>{exam.type}</span>
                                </div>
                            </div>
                        ))
                    )}
                    {status === 'CanLoadMore' && (
                        <button
                            onClick={() => loadMore(10)}
                            className="w-full py-2 text-sm text-zinc-500 hover:bg-zinc-50 rounded-lg mt-2 font-bold"
                        >
                            Load More
                        </button>
                    )}
                    {status === 'LoadingMore' && (
                        <div className="text-center py-2 text-sm text-zinc-400">Loading more...</div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 bg-white border-2 border-zinc-900 rounded-xl shadow-[4px_4px_0px_0px_#18181B] overflow-hidden flex flex-col">
                {selectedExam ? (
                    <>
                        {/* Top Bar */}
                        <div className="bg-zinc-50 border-b-2 border-zinc-200 px-6 py-3 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-2 text-zinc-500 text-sm">
                                <button onClick={() => { setSelectedExam(null); setSelectedExamId(null); }} className="hover:text-zinc-900">
                                    <ArrowLeft className="w-4 h-4" />
                                </button>
                                <span className="text-zinc-300">/</span>
                                <span className="font-bold text-zinc-700">{selectedExam.title}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <label className="px-4 py-2 bg-emerald-100 border-2 border-emerald-300 text-emerald-700 rounded-lg hover:border-emerald-500 transition-colors font-bold flex items-center gap-2 cursor-pointer shadow-[2px_2px_0px_0px_#064e3b] active:translate-y-0.5 active:shadow-none">
                                    <FileText className="w-4 h-4" />
                                    Excel/CSV 更新
                                    <input
                                        type="file"
                                        hidden
                                        accept=".xlsx, .xls, .csv"
                                        onChange={handleExcelImport}
                                    />
                                </label>
                                <button
                                    onClick={() => setShowImportModal(true)}
                                    className="px-4 py-2 bg-zinc-100 border-2 border-zinc-300 text-zinc-700 rounded-lg hover:border-zinc-900 transition-colors font-bold flex items-center gap-2"
                                >
                                    <FileUp className="w-4 h-4" />
                                    批量导入
                                </button>
                                {selectedExam.type === 'LISTENING' && (
                                    <label className="px-4 py-2 bg-violet-100 border-2 border-violet-300 text-violet-700 rounded-lg hover:border-violet-500 transition-colors font-bold flex items-center gap-2 cursor-pointer">
                                        <ImageIcon className="w-4 h-4" />
                                        批量上传图片
                                        <input
                                            type="file"
                                            hidden
                                            multiple
                                            accept="image/*"
                                            onChange={(e) => e.target.files && handleBulkImageUpload(e.target.files)}
                                        />
                                    </label>
                                )}
                                <button
                                    onClick={handleDelete}
                                    className="px-4 py-2 bg-red-100 border-2 border-red-300 text-red-700 rounded-lg hover:border-red-500 transition-colors font-bold flex items-center gap-2"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    删除
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="px-6 py-2 bg-lime-300 border-2 border-zinc-900 text-zinc-900 rounded-lg hover:bg-lime-400 transition-colors font-bold shadow-[2px_2px_0px_0px_#18181B] active:translate-y-0.5 active:shadow-none flex items-center gap-2 disabled:opacity-50"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    保存
                                </button>
                            </div>
                        </div>
                        {/* Editor */}
                        <div className="flex-1 overflow-hidden">
                            {renderVisualEditor()}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-400">
                        <FileText size={48} className="mb-4 opacity-20" />
                        <p className="font-bold">选择考试进行编辑</p>
                        <p className="text-sm mt-1">或点击左侧按钮创建新考试</p>
                    </div>
                )}
            </div>

            {/* Bulk Import Modal */}
            {showImportModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl border-2 border-zinc-900 shadow-[6px_6px_0px_0px_#18181B] w-full max-w-3xl max-h-[90vh] flex flex-col">
                        <div className="flex items-center justify-between p-6 border-b-2 border-zinc-200">
                            <h2 className="text-xl font-black text-zinc-800">批量导入题目</h2>
                            <button onClick={() => { setShowImportModal(false); setImportError(''); }} className="text-zinc-400 hover:text-zinc-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 flex-1 overflow-y-auto">
                            <div className="mb-4">
                                <div className="text-sm text-zinc-600 mb-2">
                                    <strong>JSON 格式说明：</strong>粘贴包含题目的 JSON 数组
                                </div>
                                <pre className="text-xs bg-zinc-50 p-3 rounded-lg border-2 border-zinc-200 overflow-x-auto text-zinc-600 mb-4">
                                    {`[
  {
    "id": 32,
    "passage": "正文内容...",
    "question": "题目问题...",
    "contextBox": "보기内容（可选）",
    "options": ["选项1", "选项2", "选项3", "选项4"],
    "correctAnswer": 0,
    "instruction": "指示语（可选）"
  },
  ...
]`}
                                </pre>
                            </div>
                            <textarea
                                value={importText}
                                onChange={(e) => { setImportText(e.target.value); setImportError(''); }}
                                placeholder="在此粘贴 JSON 数据..."
                                className="w-full h-64 p-4 border-2 border-zinc-300 rounded-xl resize-none focus:ring-0 focus:border-zinc-900 outline-none font-mono text-sm"
                            />
                            {importError && (
                                <div className="mt-3 p-3 bg-red-50 border-2 border-red-200 rounded-lg text-red-700 text-sm">
                                    ❌ {importError}
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end gap-3 p-6 border-t-2 border-zinc-200">
                            <button
                                onClick={() => { setShowImportModal(false); setImportError(''); }}
                                className="px-6 py-2 text-zinc-600 hover:bg-zinc-100 rounded-lg font-bold transition-colors"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleImportQuestions}
                                disabled={!importText.trim()}
                                className="px-6 py-2 bg-lime-300 border-2 border-zinc-900 text-zinc-900 rounded-lg hover:bg-lime-400 transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-[2px_2px_0px_0px_#18181B] active:translate-y-0.5 active:shadow-none"
                            >
                                <FileUp className="w-4 h-4" />
                                导入并预览
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TopikManager;
