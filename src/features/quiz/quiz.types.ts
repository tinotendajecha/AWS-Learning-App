import type {
  CreateQuizAttemptRequest,
  QuizAnswerResultDto,
  QuizAttemptSessionDto,
  SelectionType
} from '@/contracts/api';

export type QuizSessionState = {
  status: 'idle' | 'starting' | 'active' | 'submitting' | 'finishing';
  session: QuizAttemptSessionDto | null;
  currentIndex: number;
  selectedOptionLetters: string[];
  feedback: QuizAnswerResultDto | null;
  error: string | null;
};

export type QuizSessionAction =
  | { type: 'startPending' }
  | { type: 'startSuccess'; session: QuizAttemptSessionDto }
  | { type: 'startError'; message: string }
  | { type: 'toggleSelection'; letter: string; selectionType: SelectionType }
  | { type: 'submitPending' }
  | { type: 'submitSuccess'; result: QuizAnswerResultDto }
  | { type: 'submitError'; message: string }
  | { type: 'nextQuestion' }
  | { type: 'finishPending' }
  | { type: 'reset' };

export type UseQuizSessionApi = {
  state: QuizSessionState;
  currentQuestion: QuizAttemptSessionDto['questions'][number] | null;
  startQuiz: (input: CreateQuizAttemptRequest) => Promise<void>;
  toggleSelection: (letter: string, selectionType: SelectionType) => void;
  submitCurrentAnswer: () => Promise<void>;
  nextQuestion: () => void;
  finishQuiz: (abandoned?: boolean) => Promise<void>;
  resetQuiz: () => void;
};
