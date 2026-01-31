export type { TopikExam, TopikQuestion, ExamAttempt, Annotation } from '../../types';
import type { TopikExam, ExamAttempt } from '../../types';

export interface TopikModuleState {
  view: 'LIST' | 'HISTORY_LIST' | 'COVER' | 'EXAM' | 'RESULT' | 'REVIEW';
  currentExam: TopikExam | null;
  currentReviewAttempt: ExamAttempt | null;
  userAnswers: Record<number, number>;
  timeLeft: number;
  timerActive: boolean;
}

export interface AudioState {
  currentAudio: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}
