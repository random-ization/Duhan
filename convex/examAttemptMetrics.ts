export type ExamScoreInfo = {
  totalScore: number;
  correctAnswerMap: Map<number, number>;
  indexToNumber: number[];
  numberToIndex: Map<number, number>;
};

export const buildExamScoreInfo = (
  questions: ReadonlyArray<{ number: number; correctAnswer: number; score?: number }>
): ExamScoreInfo => {
  const sortedQuestions = questions.slice().sort((a, b) => a.number - b.number);
  return {
    totalScore: sortedQuestions.reduce((sum, q) => sum + (q.score || 0), 0),
    correctAnswerMap: new Map<number, number>(
      sortedQuestions.map(q => [q.number, q.correctAnswer])
    ),
    indexToNumber: sortedQuestions.map(q => q.number),
    numberToIndex: new Map<number, number>(sortedQuestions.map((q, idx) => [q.number, idx])),
  };
};

export const normalizeExamAttemptAnswers = (
  answers: Record<string, number> | undefined,
  scoreInfo: ExamScoreInfo
) => {
  const entries = Object.entries(answers || {})
    .map(([k, v]) => [Number(k), v] as const)
    .filter(([k]) => Number.isFinite(k));

  const numericKeys = entries.map(([k]) => k);
  const maxKey = numericKeys.length > 0 ? Math.max(...numericKeys) : -1;
  const hasZero = numericKeys.includes(0);
  const isZeroBased =
    hasZero ||
    (numericKeys.length > 0 && maxKey <= Math.max(scoreInfo.indexToNumber.length - 1, 0));

  const answersByNumber = new Map<number, number>();
  const userAnswers: Record<number, number> = {};

  for (const [key, value] of entries) {
    if (isZeroBased) {
      userAnswers[key] = value;
      const questionNumber = scoreInfo.indexToNumber[key] ?? key + 1;
      if (Number.isFinite(questionNumber)) {
        answersByNumber.set(questionNumber, value);
      }
      continue;
    }

    answersByNumber.set(key, value);
    const questionIndex = scoreInfo.numberToIndex.get(key);
    if (questionIndex !== undefined) {
      userAnswers[questionIndex] = value;
    } else if (key > 0) {
      userAnswers[key - 1] = value;
    }
  }

  return { answersByNumber, userAnswers };
};

export const countCorrectAnswers = (
  answersByNumber: Map<number, number>,
  correctAnswerMap: Map<number, number>
) => {
  let correctCount = 0;
  for (const [questionNumber, answer] of answersByNumber.entries()) {
    if (correctAnswerMap.get(questionNumber) === answer) {
      correctCount++;
    }
  }
  return correctCount;
};
