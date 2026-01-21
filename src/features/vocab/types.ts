import { VocabularyItem } from '../../types';

export interface ExtendedVocabularyItem extends VocabularyItem {
  unit: number;
  id: string;
  // FSRS Fields
  state?: number;
  stability?: number;
  difficulty?: number;
  elapsed_days?: number;
  scheduled_days?: number;
  reps?: number;
  learning_steps?: number;
  lapses?: number;
  last_review?: number | null;
}

export type LearningMode = 'CARDS' | 'LEARN' | 'LIST';
export type QuestionType = 'CHOICE_K_TO_N' | 'CHOICE_N_TO_K' | 'WRITING_N_TO_K' | 'WRITING_K_TO_N';

export interface VocabSettings {
  flashcard: {
    batchSize: number;
    random: boolean;
    cardFront: 'KOREAN' | 'NATIVE';
    autoTTS: boolean;
  };
  learn: {
    batchSize: number;
    random: boolean;
    ratingMode: 'PASS_FAIL' | 'FOUR_BUTTONS'; // FSRS rating button mode
    types: {
      multipleChoice: boolean;
      writing: boolean;
    };
    answers: {
      korean: boolean;
      native: boolean;
    };
  };
}

export interface SessionStats {
  correct: ExtendedVocabularyItem[];
  incorrect: ExtendedVocabularyItem[];
}
