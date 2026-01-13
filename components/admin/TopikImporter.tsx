import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { CheckCircle2, Loader2, Upload, FileSpreadsheet, FileText, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";

interface ExamMetadata {
    id: string;
    title: string;
    round: number;
    type: "READING" | "LISTENING";
    paperType?: string;
    timeLimit: number;
    audioUrl?: string;
    isPaid: boolean;
}

interface ParsedQuestion {
    id: number;
    number: number;
    passage: string;
    question: string;
    contextBox?: string;
    options: string[];
    correctAnswer: number;
    score: number;
    instruction?: string;
    image?: string;
    optionImages?: string[];
    layout?: string;
    groupCount?: number;
    explanation?: string;
}

interface ParsedExam {
    metadata: ExamMetadata;
    questions: ParsedQuestion[];
    sheetName: string;
    errors: string[];
}

// ============================================
// Fixed TOPIK Exam Structures
// Each question has fixed instruction, question text, and score
// ============================================

interface QuestionConfig {
    instruction: string;
    question: string;
    score: number;
    grouped?: boolean;
    hasBox?: boolean;
    fixedOptions?: string[];        // 固定选项 (如 ㉠㉡㉢㉣)
    needsQuestionInput?: boolean;  // 是否允许Excel覆盖问题
}

// Reading Section (읽기) - Questions 1-50
const TOPIK_READING_QUESTIONS: Record<number, QuestionConfig> = {
    // 1-2: Fill in the blank - 问题需从Excel填写
    1: { instruction: "※ [1~2] (    )에 들어갈 가장 알맞은 것을 고르십시오. (각 2점)", question: "", score: 2, needsQuestionInput: true },
    2: { instruction: "※ [1~2] (    )에 들어갈 가장 알맞은 것을 고르십시오. (각 2점)", question: "", score: 2, needsQuestionInput: true },
    // 3-4: Similar meaning - 问题需从Excel填写
    3: { instruction: "※ [3～4] 다음 밑줄 친 부분과 의미가 비슷한 것을 고르십시오. (각 2점)", question: "", score: 2, needsQuestionInput: true },
    4: { instruction: "※ [3～4] 다음 밑줄 친 부분과 의미가 비슷한 것을 고르십시오. (각 2점)", question: "", score: 2, needsQuestionInput: true },
    // 5-8: What is this about
    5: { instruction: "※ [5～8] 다음은 무엇에 대한 글인지 고르십시오. (각 2점)", question: "", score: 2 },
    6: { instruction: "※ [5～8] 다음은 무엇에 대한 글인지 고르십시오. (각 2점)", question: "", score: 2 },
    7: { instruction: "※ [5～8] 다음은 무엇에 대한 글인지 고르십시오. (각 2점)", question: "", score: 2 },
    8: { instruction: "※ [5～8] 다음은 무엇에 대한 글인지 고르십시오. (각 2점)", question: "", score: 2 },
    // 9-12: Content matching
    9: { instruction: "※ [9～12] 다음 글 또는 도표의 내용과 같은 것을 고르십시오. (각 2점)", question: "", score: 2 },
    10: { instruction: "※ [9～12] 다음 글 또는 도표의 내용과 같은 것을 고르십시오. (각 2점)", question: "", score: 2 },
    11: { instruction: "※ [9～12] 다음 글 또는 도표의 내용과 같은 것을 고르십시오. (각 2점)", question: "", score: 2 },
    12: { instruction: "※ [9～12] 다음 글 또는 도표의 내용과 같은 것을 고르십시오. (각 2점)", question: "", score: 2 },
    // 13-15: Ordering
    13: { instruction: "※ [13～15] 다음을 순서대로 맞게 배열한 것을 고르십시오. (각 2점)", question: "", score: 2, hasBox: true },
    14: { instruction: "※ [13～15] 다음을 순서대로 맞게 배열한 것을 고르십시오. (각 2점)", question: "", score: 2, hasBox: true },
    15: { instruction: "※ [13～15] 다음을 순서대로 맞게 배열한 것을 고르십시오. (각 2점)", question: "", score: 2, hasBox: true },
    // 16-18: Fill in content
    16: { instruction: "※ [16～18] 다음을 읽고 (    )에 들어갈 내용으로 가장 알맞은 것을 고르십시오. (각 2점)", question: "", score: 2 },
    17: { instruction: "※ [16～18] 다음을 읽고 (    )에 들어갈 내용으로 가장 알맞은 것을 고르십시오. (각 2점)", question: "", score: 2 },
    18: { instruction: "※ [16～18] 다음을 읽고 (    )에 들어갈 내용으로 가장 알맞은 것을 고르십시오. (각 2점)", question: "", score: 2 },
    // 19-20: Grouped questions - 问题可编辑
    19: { instruction: "※ [19～20] 다음을 읽고 물음에 답하십시오. (각 2점)", question: "글쓴이가 말하는 방식으로 가장 알맞은 것을 고르십시오.", score: 2, grouped: true, needsQuestionInput: true },
    20: { instruction: "※ [19～20] 다음을 읽고 물음에 답하십시오. (각 2점)", question: "위 글의 내용과 같은 것을 고르십시오.", score: 2, grouped: true, needsQuestionInput: true },
    // 21-22 - 问题可编辑
    21: { instruction: "※ [21～22] 다음을 읽고 물음에 답하십시오. (각 2점)", question: "밑줄 친 부분에 나타난 '나'의 심정으로 알맞은 것을 고르십시오.", score: 2, grouped: true, needsQuestionInput: true },
    22: { instruction: "※ [21～22] 다음을 읽고 물음에 답하십시오. (각 2점)", question: "위 글의 내용과 같은 것을 고르십시오.", score: 2, grouped: true, needsQuestionInput: true },
    // 23-24 - 问题可编辑
    23: { instruction: "※ [23～24] 다음을 읽고 물음에 답하십시오. (각 2점)", question: "이 글을 쓴 목적을 고르십시오.", score: 2, grouped: true, needsQuestionInput: true },
    24: { instruction: "※ [23～24] 다음을 읽고 물음에 답하십시오. (각 2점)", question: "위 글의 내용과 같은 것을 고르십시오.", score: 2, grouped: true, needsQuestionInput: true },
    // 25-27: Newspaper headlines
    25: { instruction: "※ [25～27] 다음 신문 기사의 제목을 가장 잘 설명한 것을 고르십시오. (각 2점)", question: "", score: 2 },
    26: { instruction: "※ [25～27] 다음 신문 기사의 제목을 가장 잘 설명한 것을 고르십시오. (각 2점)", question: "", score: 2 },
    27: { instruction: "※ [25～27] 다음 신문 기사의 제목을 가장 잘 설명한 것을 고르십시오. (각 2점)", question: "", score: 2 },
    // 28-31: Fill in content (advanced)
    28: { instruction: "※ [28～31] 다음을 읽고 (    )에 들어갈 내용으로 가장 알맞은 것을 고르십시오. (각 2점)", question: "", score: 2 },
    29: { instruction: "※ [28～31] 다음을 읽고 (    )에 들어갈 내용으로 가장 알맞은 것을 고르십시오. (각 2점)", question: "", score: 2 },
    30: { instruction: "※ [28～31] 다음을 읽고 (    )에 들어갈 내용으로 가장 알맞은 것을 고르십시오. (각 2점)", question: "", score: 2 },
    31: { instruction: "※ [28～31] 다음을 읽고 (    )에 들어갈 내용으로 가장 알맞은 것을 고르십시오. (각 2점)", question: "", score: 2 },
    // 32-34: Content matching (advanced)
    32: { instruction: "※ [32～34] 다음을 읽고 내용이 같은 것을 고르십시오. (각 2점)", question: "", score: 2 },
    33: { instruction: "※ [32～34] 다음을 읽고 내용이 같은 것을 고르십시오. (각 2점)", question: "", score: 2 },
    34: { instruction: "※ [32～34] 다음을 읽고 내용이 같은 것을 고르십시오. (각 2점)", question: "", score: 2 },
    // 35-38: Main topic
    35: { instruction: "※ [35～38] 다음 글의 주제로 가장 알맞은 것을 고르십시오. (각 2점)", question: "", score: 2 },
    36: { instruction: "※ [35～38] 다음 글의 주제로 가장 알맞은 것을 고르십시오. (각 2점)", question: "", score: 2 },
    37: { instruction: "※ [35～38] 다음 글의 주제로 가장 알맞은 것을 고르십시오. (각 2점)", question: "", score: 2 },
    38: { instruction: "※ [35～38] 다음 글의 주제로 가장 알맞은 것을 고르십시오. (각 2점)", question: "", score: 2 },
    // 39-41: Insert sentence - 固定选项㉠㉡㉢㉣
    39: { instruction: "※ [39～41] 다음 글에서 <보기>의 문장이 들어가기에 가장 알맞은 곳을 고르십시오. (각 2점)", question: "", score: 2, hasBox: true, fixedOptions: ['㉠', '㉡', '㉢', '㉣'] },
    40: { instruction: "※ [39～41] 다음 글에서 <보기>의 문장이 들어가기에 가장 알맞은 곳을 고르십시오. (각 2점)", question: "", score: 2, hasBox: true, fixedOptions: ['㉠', '㉡', '㉢', '㉣'] },
    41: { instruction: "※ [39～41] 다음 글에서 <보기>의 문장이 들어가기에 가장 알맞은 곳을 고르십시오. (각 2점)", question: "", score: 2, hasBox: true, fixedOptions: ['㉠', '㉡', '㉢', '㉣'] },
    // 42-43
    42: { instruction: "※ [42～43] 다음을 읽고 물음에 답하십시오. (각 2점)", question: "이 글의 중심 생각을 고르십시오.", score: 2, grouped: true },
    43: { instruction: "※ [42～43] 다음을 읽고 물음에 답하십시오. (각 2점)", question: "밑줄 친 부분에 나타난 필자의 태도로 알맞은 것을 고르십시오.", score: 2, grouped: true },
    // 44-45
    44: { instruction: "※ [44～45] 다음을 읽고 물음에 답하십시오. (각 2점)", question: "위 글의 내용과 같은 것을 고르십시오.", score: 2, grouped: true },
    45: { instruction: "※ [44～45] 다음을 읽고 물음에 답하십시오. (각 2점)", question: "위 글을 읽고 알 수 있는 것을 고르십시오.", score: 2, grouped: true },
    // 46-47: 分组阅读（新样式：普通阅读理解）
    46: { instruction: "※ [46～47] 다음을 읽고 물음에 답하십시오. (각 2점)", question: "윗글에 나타난 필자의 태도로 가장 알맞은 것을 고르십시오.", score: 2, grouped: true, needsQuestionInput: true },
    47: { instruction: "※ [46～47] 다음을 읽고 물음에 답하십시오. (각 2점)", question: "윗글의 내용과 같은 것을 고르십시오.", score: 2, grouped: true, needsQuestionInput: true },
    // 48-50
    48: { instruction: "※ [48～50] 다음을 읽고 물음에 답하십시오. (각 2점)", question: "밑줄 친 부분에 나타난 '나'의 심정으로 알맞은 것을 고르십시오.", score: 2, grouped: true },
    49: { instruction: "※ [48～50] 다음을 읽고 물음에 답하십시오. (각 2점)", question: "위 글의 내용으로 알맞은 것을 고르십시오.", score: 2, grouped: true },
    50: { instruction: "※ [48～50] 다음을 읽고 물음에 답하십시오. (각 2점)", question: "위 글을 읽고 나서의 추론으로 알맞지 않은 것을 고르십시오.", score: 2, grouped: true },
};

// Listening Section (듣기) - Questions 1-50
const TOPIK_LISTENING_QUESTIONS: Record<number, QuestionConfig> = {
    1: { instruction: "※ [1～3] 다음을 듣고 알맞은 그림을 고르십시오. (각 2점)", question: "", score: 2 },
    2: { instruction: "※ [1～3] 다음을 듣고 알맞은 그림을 고르십시오. (각 2점)", question: "", score: 2 },
    3: { instruction: "※ [1～3] 다음을 듣고 알맞은 그림을 고르십시오. (각 2점)", question: "", score: 2 },
    4: { instruction: "※ [4～8] 다음 대화를 잘 듣고 이어질 수 있는 말을 고르십시오. (각 2점)", question: "", score: 2 },
    5: { instruction: "※ [4～8] 다음 대화를 잘 듣고 이어질 수 있는 말을 고르십시오. (각 2점)", question: "", score: 2 },
    6: { instruction: "※ [4～8] 다음 대화를 잘 듣고 이어질 수 있는 말을 고르십시오. (각 2점)", question: "", score: 2 },
    7: { instruction: "※ [4～8] 다음 대화를 잘 듣고 이어질 수 있는 말을 고르십시오. (각 2점)", question: "", score: 2 },
    8: { instruction: "※ [4～8] 다음 대화를 잘 듣고 이어질 수 있는 말을 고르십시오. (각 2점)", question: "", score: 2 },
    9: { instruction: "※ [9～12] 다음 대화를 잘 듣고 여자가 이어서 할 행동으로 알맞은 것을 고르십시오. (각 2점)", question: "", score: 2 },
    10: { instruction: "※ [9～12] 다음 대화를 잘 듣고 여자가 이어서 할 행동으로 알맞은 것을 고르십시오. (각 2점)", question: "", score: 2 },
    11: { instruction: "※ [9～12] 다음 대화를 잘 듣고 여자가 이어서 할 행동으로 알맞은 것을 고르십시오. (각 2점)", question: "", score: 2 },
    12: { instruction: "※ [9～12] 다음 대화를 잘 듣고 여자가 이어서 할 행동으로 알맞은 것을 고르십시오. (각 2점)", question: "", score: 2 },
    13: { instruction: "※ [13～16] 다음을 듣고 내용과 일치하는 것을 고르십시오. (각 2점)", question: "", score: 2 },
    14: { instruction: "※ [13～16] 다음을 듣고 내용과 일치하는 것을 고르십시오. (각 2점)", question: "", score: 2 },
    15: { instruction: "※ [13～16] 다음을 듣고 내용과 일치하는 것을 고르십시오. (각 2점)", question: "", score: 2 },
    16: { instruction: "※ [13～16] 다음을 듣고 내용과 일치하는 것을 고르십시오. (각 2점)", question: "", score: 2 },
    17: { instruction: "※ [17～20] 다음을 듣고 남자의 중심 생각을 고르십시오. (각 2점)", question: "", score: 2 },
    18: { instruction: "※ [17～20] 다음을 듣고 남자의 중심 생각을 고르십시오. (각 2점)", question: "", score: 2 },
    19: { instruction: "※ [17～20] 다음을 듣고 남자의 중심 생각을 고르십시오. (각 2점)", question: "", score: 2 },
    20: { instruction: "※ [17～20] 다음을 듣고 남자의 중심 생각을 고르십시오. (각 2점)", question: "", score: 2 },
    21: { instruction: "※ [21～22] 다음을 듣고 물음에 답하십시오. (각 2점)", question: "남자의 중심 생각으로 맞는 것을 고르십시오.", score: 2, grouped: true },
    22: { instruction: "※ [21～22] 다음을 듣고 물음에 답하십시오. (각 2점)", question: "들은 내용으로 맞는 것을 고르십시오.", score: 2, grouped: true },
    23: { instruction: "※ [23～24] 다음을 듣고 물음에 답하십시오. (각 2점)", question: "남자가 무엇을 하고 있는지 고르십시오.", score: 2, grouped: true },
    24: { instruction: "※ [23～24] 다음을 듣고 물음에 답하십시오. (각 2점)", question: "들은 내용으로 맞는 것을 고르십시오.", score: 2, grouped: true },
    25: { instruction: "※ [25～26] 다음을 듣고 물음에 답하십시오. (각 2점)", question: "남자의 중심 생각으로 맞는 것을 고르십시오.", score: 2, grouped: true },
    26: { instruction: "※ [25～26] 다음을 듣고 물음에 답하십시오. (각 2점)", question: "들은 내용으로 맞는 것을 고르십시오.", score: 2, grouped: true },
    27: { instruction: "※ [27～28] 다음을 듣고 물음에 답하십시오. (각 2점)", question: "남자가 여자에게 말하는 의도를 고르십시오.", score: 2, grouped: true },
    28: { instruction: "※ [27～28] 다음을 듣고 물음에 답하십시오. (각 2점)", question: "들은 내용으로 맞는 것을 고르십시오.", score: 2, grouped: true },
    29: { instruction: "※ [29～30] 다음을 듣고 물음에 답하십시오. (각 2점)", question: "남자가 누구인지 고르십시오.", score: 2, grouped: true },
    30: { instruction: "※ [29～30] 다음을 듣고 물음에 답하십시오. (각 2점)", question: "들은 내용으로 맞는 것을 고르십시오.", score: 2, grouped: true },
    31: { instruction: "※ [31～32] 다음을 듣고 물음에 답하십시오. (각 2점)", question: "남자의 생각으로 맞는 것을 고르십시오.", score: 2, grouped: true },
    32: { instruction: "※ [31～32] 다음을 듣고 물음에 답하십시오. (각 2점)", question: "남자의 태도로 맞는 것을 고르십시오.", score: 2, grouped: true },
    33: { instruction: "※ [33～34] 다음을 듣고 물음에 답하십시오. (각 2점)", question: "무엇에 대한 내용인지 맞는 것을 고르십시오.", score: 2, grouped: true },
    34: { instruction: "※ [33～34] 다음을 듣고 물음에 답하십시오. (각 2점)", question: "들은 내용으로 맞는 것을 고르십시오.", score: 2, grouped: true },
    35: { instruction: "※ [35～36] 다음을 듣고 물음에 답하십시오. (각 2점)", question: "남자가 무엇을 하고 있는지 고르십시오.", score: 2, grouped: true },
    36: { instruction: "※ [35～36] 다음을 듣고 물음에 답하십시오. (각 2점)", question: "들은 내용으로 맞는 것을 고르십시오.", score: 2, grouped: true },
    37: { instruction: "※ [37～38] 다음은 교양 프로그램입니다. 잘 듣고 물음에 답하십시오. (각 2점)", question: "여자의 중심 생각으로 맞는 것을 고르십시오.", score: 2, grouped: true },
    38: { instruction: "※ [37～38] 다음은 교양 프로그램입니다. 잘 듣고 물음에 답하십시오. (각 2점)", question: "들은 내용으로 맞는 것을 고르십시오.", score: 2, grouped: true },
    39: { instruction: "※ [39～40] 다음은 대담입니다. 잘 듣고 물음에 답하십시오. (각 2점)", question: "이 담화 앞의 내용으로 알맞은 것을 고르십시오.", score: 2, grouped: true },
    40: { instruction: "※ [39～40] 다음은 대담입니다. 잘 듣고 물음에 답하십시오. (각 2점)", question: "들은 내용으로 맞는 것을 고르십시오.", score: 2, grouped: true },
    41: { instruction: "※ [41～42] 다음은 강연입니다. 잘 듣고 물음에 답하십시오. (각 2점)", question: "이 강연의 중심 내용으로 맞는 것을 고르십시오.", score: 2, grouped: true },
    42: { instruction: "※ [41～42] 다음은 강연입니다. 잘 듣고 물음에 답하십시오. (각 2점)", question: "들은 내용으로 맞는 것을 고르십시오.", score: 2, grouped: true },
    43: { instruction: "※ [43～44] 다음은 다큐멘터리입니다. 잘 듣고 물음에 답하십시오. (각 2점)", question: "이 이야기의 중심 내용으로 맞는 것을 고르십시오.", score: 2, grouped: true },
    44: { instruction: "※ [43～44] 다음은 다큐멘터리입니다. 잘 듣고 물음에 답하십시오. (각 2점)", question: "들은 내용으로 맞는 것을 고르십시오.", score: 2, grouped: true },
    45: { instruction: "※ [45～46] 다음은 강연입니다. 잘 듣고 물음에 답하십시오. (각 2점)", question: "들은 내용과 일치하는 것을 고르십시오.", score: 2, grouped: true },
    46: { instruction: "※ [45～46] 다음은 강연입니다. 잘 듣고 물음에 답하십시오. (각 2점)", question: "남자의 태도로 가장 알맞은 것을 고르십시오.", score: 2, grouped: true },
    47: { instruction: "※ [47～48] 다음은 대담입니다. 잘 듣고 물음에 답하십시오. (각 2점)", question: "들은 내용과 일치하는 것을 고르십시오.", score: 2, grouped: true },
    48: { instruction: "※ [47～48] 다음은 대담입니다. 잘 듣고 물음에 답하십시오. (각 2점)", question: "남자의 태도로 가장 알맞은 것을 고르십시오.", score: 2, grouped: true },
    49: { instruction: "※ [49～50] 다음은 강연입니다. 잘 듣고 물음에 답하십시오. (각 2점)", question: "들은 내용과 일치하는 것을 고르십시오.", score: 2, grouped: true },
    50: { instruction: "※ [49～50] 다음은 강연입니다. 잘 듣고 물음에 답하십시오. (각 2점)", question: "남자의 태도로 가장 알맞은 것을 고르십시오.", score: 2, grouped: true },
};

/**
 * Get fixed config for a question number
 */
function getQuestionConfig(questionNum: number, type: "READING" | "LISTENING"): QuestionConfig | null {
    const config = type === "READING" ? TOPIK_READING_QUESTIONS : TOPIK_LISTENING_QUESTIONS;
    return config[questionNum] || null;
}

/**
 * Parse sheet name to extract exam metadata
 * Examples: "第93届阅读A", "93 Reading A", "TOPIK 93 Listening"
 */
function parseSheetName(sheetName: string): Partial<ExamMetadata> {
    const result: Partial<ExamMetadata> = {
        timeLimit: 70, // Default
        isPaid: false,
    };

    // Extract round number
    const roundMatch = sheetName.match(/(\d+)/);
    if (roundMatch) {
        result.round = parseInt(roundMatch[1], 10);
    }

    // Determine type
    const upperName = sheetName.toUpperCase();
    if (upperName.includes("阅读") || upperName.includes("READING") || upperName.includes("읽기")) {
        result.type = "READING";
        result.timeLimit = 70;
    } else if (upperName.includes("听力") || upperName.includes("LISTENING") || upperName.includes("듣기")) {
        result.type = "LISTENING";
        result.timeLimit = 60;
    }

    // Paper type (A/B)
    if (upperName.includes("A") || upperName.includes("A卷")) {
        result.paperType = "A";
    } else if (upperName.includes("B") || upperName.includes("B卷")) {
        result.paperType = "B";
    }

    // Generate title - use Korean format
    if (result.round && result.type) {
        const typeLabel = result.type === "READING" ? "읽기" : "듣기";
        result.title = `제${result.round}회 한국어능력시험 TOPIK II ${typeLabel}${result.paperType ? ` (${result.paperType})` : ""}`;
    }

    return result;
}

/**
 * Parse a single row into a question, using fixed structure for instruction/score
 */
function parseQuestionRow(row: Record<string, any>, rowIndex: number, examType: "READING" | "LISTENING"): { question: ParsedQuestion | null; error: string | null } {
    // Get values with flexible column names
    const getValue = (keys: string[]): string => {
        for (const key of keys) {
            const val = row[key];
            if (val !== undefined && val !== null && val !== "") {
                return String(val).trim();
            }
        }
        return "";
    };

    const getNumber = (keys: string[], defaultVal: number = 0): number => {
        const val = getValue(keys);
        const num = parseInt(val, 10);
        return isNaN(num) ? defaultVal : num;
    };

    // Question number (required)
    const questionNum = getNumber(["题号", "number", "id", "No", "序号", "번호"], rowIndex);
    if (questionNum <= 0) {
        return { question: null, error: `第${rowIndex}行: 缺少有效题号` };
    }

    // Options (required) - support both 选项A/B/C/D and 选项1/2/3/4
    const optionA = getValue(["选项A", "选项1", "A", "optionA", "option1", "①"]);
    const optionB = getValue(["选项B", "选项2", "B", "optionB", "option2", "②"]);
    const optionC = getValue(["选项C", "选项3", "C", "optionC", "option3", "③"]);
    const optionD = getValue(["选项D", "选项4", "D", "optionD", "option4", "④"]);

    if (!optionA || !optionB || !optionC || !optionD) {
        return { question: null, error: `第${questionNum}题: 选项不完整` };
    }

    // Correct answer (required)
    const answerRaw = getValue(["正确答案", "答案", "answer", "correct", "정답"]);
    let correctAnswer = 0;
    if (answerRaw) {
        const upper = answerRaw.toUpperCase();
        if (upper === "A" || upper === "①" || upper === "1") correctAnswer = 0;
        else if (upper === "B" || upper === "②" || upper === "2") correctAnswer = 1;
        else if (upper === "C" || upper === "③" || upper === "3") correctAnswer = 2;
        else if (upper === "D" || upper === "④" || upper === "4") correctAnswer = 3;
        else {
            const num = parseInt(answerRaw, 10);
            if (num >= 1 && num <= 4) correctAnswer = num - 1;
        }
    }

    // Get fixed config for this question number
    const config = getQuestionConfig(questionNum, examType);

    // Handle fixed options (Q39-41, Q46 use ㉠㉡㉢㉣)
    const useFixedOptions = config?.fixedOptions && config.fixedOptions.length === 4;
    const finalOptions = useFixedOptions ? config.fixedOptions : [optionA, optionB, optionC, optionD];

    // Handle question text - allow Excel to override for needsQuestionInput questions
    const excelQuestion = getValue(["问题", "question", "질문"]);
    const finalQuestion = config?.needsQuestionInput && excelQuestion
        ? excelQuestion
        : (config?.question || "");

    const question: ParsedQuestion = {
        id: questionNum,
        number: questionNum,
        // Variable content (from Excel) - only passage and contextBox
        passage: getValue(["阅读文段", "passage", "지문", "文段"]),
        contextBox: getValue(["보기", "contextBox", "보기内容", "context"]),
        options: finalOptions as [string, string, string, string],
        correctAnswer,
        // Fixed content (from config - automatically filled)
        question: finalQuestion,
        score: config?.score || 2,
        instruction: config?.instruction || "",
    };

    // Optional: image URL
    const imageUrl = getValue(["图片URL", "image", "imageUrl", "图片"]);
    if (imageUrl) question.image = imageUrl;

    // Optional: explanation
    const explanation = getValue(["解析", "explanation", "해설"]);
    if (explanation) question.explanation = explanation;

    // Handle option images (listening section 1-3)
    const optImgA = getValue(["选项A图片", "optionImageA"]);
    const optImgB = getValue(["选项B图片", "optionImageB"]);
    const optImgC = getValue(["选项C图片", "optionImageC"]);
    const optImgD = getValue(["选项D图片", "optionImageD"]);
    if (optImgA || optImgB || optImgC || optImgD) {
        question.optionImages = [optImgA, optImgB, optImgC, optImgD];
    }

    return { question, error: null };
}

const TopikImporter: React.FC = () => {
    const saveExamMutation = useMutation(api.topik.saveExam);

    const [parsedExams, setParsedExams] = useState<ParsedExam[]>([]);
    const [status, setStatus] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [selectedExamIndex, setSelectedExamIndex] = useState<number | null>(null);

    // Handle Excel file upload
    const handleExcelFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: "array" });

                const exams: ParsedExam[] = [];

                for (const sheetName of workbook.SheetNames) {
                    // Skip common non-exam sheets
                    const lowerName = sheetName.toLowerCase();
                    if (lowerName.includes("说明") || lowerName.includes("readme") || lowerName.includes("template")) {
                        continue;
                    }

                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" }) as Record<string, any>[];

                    if (jsonData.length === 0) continue;

                    const metadata = parseSheetName(sheetName);
                    const questions: ParsedQuestion[] = [];
                    const errors: string[] = [];

                    // Validate required metadata
                    if (!metadata.round || !metadata.type) {
                        errors.push(`无法从表名"${sheetName}"解析届数和类型，请手动设置`);
                    }

                    // Determine exam type for structure lookup
                    const examType: "READING" | "LISTENING" = metadata.type || "READING";

                    // Parse each row
                    jsonData.forEach((row, idx) => {
                        const { question, error } = parseQuestionRow(row, idx + 1, examType);
                        if (question) {
                            questions.push(question);
                        }
                        if (error) {
                            errors.push(error);
                        }
                    });

                    if (questions.length > 0) {
                        exams.push({
                            metadata: {
                                id: `exam-${Date.now()}-${sheetName.replace(/\s/g, "_")}`,
                                title: metadata.title || sheetName,
                                round: metadata.round || 0,
                                type: metadata.type || "READING",
                                paperType: metadata.paperType,
                                timeLimit: metadata.timeLimit || 70,
                                isPaid: false,
                            },
                            questions,
                            sheetName,
                            errors,
                        });
                    }
                }

                setParsedExams(exams);
                setStatus(`解析完成：${exams.length} 套试卷，共 ${exams.reduce((sum, e) => sum + e.questions.length, 0)} 道题目`);
            } catch (e: any) {
                console.error("Excel parse error:", e);
                setStatus(`解析失败: ${e.message}`);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    // Import a single exam
    const handleImportExam = async (exam: ParsedExam) => {
        setSubmitting(true);
        try {
            await saveExamMutation({
                id: exam.metadata.id,
                title: exam.metadata.title,
                round: exam.metadata.round,
                type: exam.metadata.type,
                paperType: exam.metadata.paperType,
                timeLimit: exam.metadata.timeLimit,
                audioUrl: exam.metadata.audioUrl,
                isPaid: exam.metadata.isPaid,
                questions: exam.questions.map(q => ({
                    id: q.id,
                    number: q.number,
                    passage: q.passage || undefined,
                    question: q.question,
                    contextBox: q.contextBox || undefined,
                    options: q.options,
                    correctAnswer: q.correctAnswer,
                    score: q.score,
                    instruction: q.instruction || undefined,
                    image: q.image || undefined,
                    optionImages: q.optionImages,
                    layout: q.layout,
                    groupCount: q.groupCount,
                    explanation: q.explanation || undefined,
                })),
            });

            setStatus(`✅ 成功导入: ${exam.metadata.title} (${exam.questions.length} 道题)`);
            // Remove from list
            setParsedExams(prev => prev.filter(e => e.metadata.id !== exam.metadata.id));
        } catch (e: any) {
            console.error("Import error:", e);
            setStatus(`❌ 导入失败: ${e.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    // Import all exams
    const handleImportAll = async () => {
        if (parsedExams.length === 0) return;

        setSubmitting(true);
        let successCount = 0;
        let failCount = 0;

        for (const exam of parsedExams) {
            try {
                await saveExamMutation({
                    id: exam.metadata.id,
                    title: exam.metadata.title,
                    round: exam.metadata.round,
                    type: exam.metadata.type,
                    paperType: exam.metadata.paperType,
                    timeLimit: exam.metadata.timeLimit,
                    audioUrl: exam.metadata.audioUrl,
                    isPaid: exam.metadata.isPaid,
                    questions: exam.questions.map(q => ({
                        id: q.id,
                        number: q.number,
                        passage: q.passage || undefined,
                        question: q.question,
                        contextBox: q.contextBox || undefined,
                        options: q.options,
                        correctAnswer: q.correctAnswer,
                        score: q.score,
                        instruction: q.instruction || undefined,
                        image: q.image || undefined,
                        optionImages: q.optionImages,
                        layout: q.layout,
                        groupCount: q.groupCount,
                        explanation: q.explanation || undefined,
                    })),
                });
                successCount++;
            } catch (e) {
                failCount++;
                console.error("Import error for", exam.metadata.title, e);
            }
        }

        setStatus(`导入完成：成功 ${successCount} 套，失败 ${failCount} 套`);
        if (successCount > 0) {
            setParsedExams([]);
        }
        setSubmitting(false);
    };

    return (
        <div className="p-6 space-y-6">
            <div>
                <h2 className="text-2xl font-black text-zinc-900 flex items-center gap-2">
                    <FileText className="w-6 h-6" />
                    TOPIK 试卷批量导入
                </h2>
                <p className="text-sm text-zinc-500">上传 Excel 文件，每个工作表 = 一套试卷</p>
            </div>

            {/* Upload Area */}
            <div className="bg-white border-2 border-zinc-900 rounded-2xl shadow-[6px_6px_0px_0px_#18181B] p-5 space-y-4">
                <div className="flex items-center gap-2 font-bold text-zinc-800">
                    <Upload className="w-4 h-4" />
                    上传 Excel 文件
                </div>

                <div className="relative">
                    <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleExcelFile(file);
                            e.target.value = "";
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="border-2 border-dashed border-zinc-300 rounded-xl p-6 text-center hover:border-blue-500 hover:bg-blue-50 transition-all group">
                        <FileSpreadsheet className="w-10 h-10 mx-auto text-zinc-400 mb-2 group-hover:text-blue-500 transition-colors" />
                        <p className="text-sm font-bold text-zinc-700">点击上传 Excel 文件</p>
                        <p className="text-xs text-zinc-400 mt-1">每个工作表名应包含届数和类型，如 "第93届阅读A"</p>
                    </div>
                </div>

                {/* Format Guide */}
                <div className="bg-zinc-50 rounded-lg p-3 text-xs space-y-2 border border-zinc-100">
                    <div className="font-bold text-zinc-700">Excel 列格式说明：</div>
                    <div className="text-zinc-500 space-y-1">
                        <div><span className="text-green-600 font-bold">必填：</span>题号, 选项1/A, 选项2/B, 选项3/C, 选项4/D, 正确答案</div>
                        <div><span className="text-blue-600 font-bold">选填：</span>阅读文段, 보기内容, 图片URL, 解析</div>
                    </div>
                    <div className="text-zinc-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                        <span>分值、题目指令、问题 均由系统根据题号自动填充</span>
                    </div>
                    <div className="text-zinc-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-blue-500" />
                        <span>正确答案支持：A/B/C/D 或 1/2/3/4</span>
                    </div>
                </div>
            </div>

            {/* Parsed Exams Preview */}
            {parsedExams.length > 0 && (
                <div className="bg-white border-2 border-zinc-900 rounded-2xl shadow-[6px_6px_0px_0px_#18181B] p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="font-bold text-zinc-800">
                            解析预览：{parsedExams.length} 套试卷
                        </div>
                        <button
                            onClick={handleImportAll}
                            disabled={submitting}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            全部导入
                        </button>
                    </div>

                    <div className="space-y-3 max-h-96 overflow-y-auto">
                        {parsedExams.map((exam, idx) => (
                            <div
                                key={exam.metadata.id}
                                className={`p-4 rounded-xl border-2 transition-all ${exam.errors.length > 0
                                    ? "border-amber-300 bg-amber-50"
                                    : "border-zinc-200 bg-zinc-50"
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <input
                                            type="text"
                                            value={exam.metadata.title}
                                            onChange={(e) => {
                                                const newExams = [...parsedExams];
                                                newExams[idx] = {
                                                    ...newExams[idx],
                                                    metadata: {
                                                        ...newExams[idx].metadata,
                                                        title: e.target.value
                                                    }
                                                };
                                                setParsedExams(newExams);
                                            }}
                                            className="font-bold text-zinc-900 border-b border-transparent hover:border-zinc-300 focus:border-zinc-900 focus:outline-none bg-transparent w-full"
                                        />
                                        <div className="text-xs text-zinc-500 flex items-center gap-2">
                                            <select
                                                value={exam.metadata.type}
                                                onChange={(e) => {
                                                    const newExams = [...parsedExams];
                                                    const newType = e.target.value as "READING" | "LISTENING";
                                                    newExams[idx] = {
                                                        ...newExams[idx],
                                                        metadata: {
                                                            ...newExams[idx].metadata,
                                                            type: newType,
                                                            timeLimit: newType === "READING" ? 70 : 60
                                                        }
                                                    };
                                                    setParsedExams(newExams);
                                                }}
                                                className="bg-zinc-200 px-2 py-0.5 rounded font-bold text-xs border-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                            >
                                                <option value="READING">📖 阅读</option>
                                                <option value="LISTENING">🎧 听力</option>
                                            </select>
                                            <span>{exam.questions.length} 道题</span>
                                            <span>{exam.metadata.timeLimit} 分钟</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleImportExam(exam)}
                                        disabled={submitting}
                                        className="px-3 py-1.5 bg-green-600 text-white rounded-lg font-bold text-xs hover:bg-green-700 disabled:opacity-50"
                                    >
                                        导入
                                    </button>
                                </div>

                                {exam.errors.length > 0 && (
                                    <div className="mt-2 p-2 bg-amber-100 rounded-lg">
                                        <div className="text-xs text-amber-800 flex items-center gap-1 mb-1">
                                            <AlertCircle className="w-3 h-3" />
                                            <span className="font-bold">警告 ({exam.errors.length})</span>
                                        </div>
                                        <div className="text-xs text-amber-700 space-y-0.5">
                                            {exam.errors.slice(0, 3).map((err, i) => (
                                                <div key={i}>• {err}</div>
                                            ))}
                                            {exam.errors.length > 3 && (
                                                <div>... 还有 {exam.errors.length - 3} 条</div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Question Preview */}
                                <div className="mt-2 text-xs text-zinc-600">
                                    <details>
                                        <summary className="cursor-pointer hover:text-zinc-900">查看题目预览</summary>
                                        <div className="mt-2 max-h-40 overflow-y-auto space-y-1 pl-2 border-l-2 border-zinc-200">
                                            {exam.questions.slice(0, 5).map(q => (
                                                <div key={q.id} className="flex gap-2">
                                                    <span className="font-bold text-zinc-400">#{q.number}</span>
                                                    <span className="truncate">{q.question || q.passage?.slice(0, 50) || "(无问题文本)"}</span>
                                                    <span className="text-green-600">答案: {["A", "B", "C", "D"][q.correctAnswer]}</span>
                                                </div>
                                            ))}
                                            {exam.questions.length > 5 && (
                                                <div className="text-zinc-400">... 还有 {exam.questions.length - 5} 道题</div>
                                            )}
                                        </div>
                                    </details>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Status */}
            {status && (
                <div className="px-4 py-3 rounded-xl border-2 border-zinc-900 bg-amber-50 text-sm text-zinc-800 whitespace-pre-wrap">
                    {status}
                </div>
            )}
        </div>
    );
};

export default TopikImporter;
