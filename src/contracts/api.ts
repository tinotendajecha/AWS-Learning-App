export type SelectionType = 'SINGLE' | 'MULTI';
export type ChallengeSource = 'MANUAL' | 'WRONG_ANSWER';
export type QuizSource = 'ALL' | 'FILTERED' | 'CHALLENGING';
export type QuizOrder = 'RANDOM' | 'SEQUENTIAL';
export type QuizAttemptStatus = 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
export type HotSeatSessionStatus = 'LOBBY' | 'ACTIVE' | 'COMPLETED';
export type HotSeatSelectionMode = 'RANDOM' | 'FAIR';
export type AutoChallengeAction = 'ADDED' | 'REMOVED' | 'NONE';

export type QuestionOptionDto = {
  letter: string;
  text: string;
};

export type LearnerQuestionStateDto = {
  isChallenging: boolean;
  challengingSource: ChallengeSource | null;
  timesSeen: number;
  timesAnswered: number;
  timesCorrect: number;
};

export type QuestionDto = {
  examCode: string;
  number: number;
  prompt: string;
  explanation: string;
  selectionType: SelectionType;
  options: QuestionOptionDto[];
  correctOptionLetters: string[];
  learnerState: LearnerQuestionStateDto;
};

export type QuizQuestionDto = {
  examCode: string;
  number: number;
  prompt: string;
  explanation: string;
  selectionType: SelectionType;
  options: QuestionOptionDto[];
  learnerState: LearnerQuestionStateDto;
};

export type ChallengeItemDto = {
  examCode: string;
  questionNumber: number;
  question: string;
  explanation: string;
  answerList: string[];
  addedFrom: ChallengeSource;
  updatedAt: string;
};

export type PreferencesDto = {
  noRepeatMode: boolean;
  removeChallengeOnCorrect: boolean;
};

export type MarkChallengeRequest = {
  questionNumber: number;
  source: ChallengeSource;
};

export type UpdatePreferencesRequest = PreferencesDto;

export type CreateQuizAttemptRequest = {
  source: QuizSource;
  count: number;
  order: QuizOrder;
  query?: string;
  noRepeatMode: boolean;
  removeChallengeOnCorrect: boolean;
};

export type QuizAttemptSessionDto = {
  attemptId: string;
  examCode: string;
  source: QuizSource;
  order: QuizOrder;
  filterQuery: string;
  requestedCount: number;
  actualCount: number;
  noRepeatMode: boolean;
  removeChallengeOnCorrect: boolean;
  status: QuizAttemptStatus;
  score: number;
  correctCount: number;
  wrongCount: number;
  questions: QuizQuestionDto[];
};

export type SubmitQuizAnswerRequest = {
  questionNumber: number;
  selectedOptionLetters: string[];
};

export type QuizAnswerResultDto = {
  questionNumber: number;
  selectedOptionLetters: string[];
  correctOptionLetters: string[];
  explanation: string;
  isCorrect: boolean;
  score: number;
  correctCount: number;
  wrongCount: number;
  autoChallengeAction: AutoChallengeAction;
  attemptCompleted: boolean;
};

export type CompleteQuizAttemptRequest = {
  abandoned?: boolean;
};

export type QuizAttemptReviewItemDto = {
  number: number;
  prompt: string;
  explanation: string;
  options: QuestionOptionDto[];
  selectedOptionLetters: string[];
  correctOptionLetters: string[];
  isCorrect: boolean;
};

export type QuizAttemptResultDto = {
  attemptId: string;
  examCode: string;
  status: QuizAttemptStatus;
  source: QuizSource;
  order: QuizOrder;
  filterQuery: string;
  requestedCount: number;
  actualCount: number;
  score: number;
  correctCount: number;
  wrongCount: number;
  answeredCount: number;
  unansweredCount: number;
  startedAt: string;
  completedAt: string | null;
  wrongAnswers: QuizAttemptReviewItemDto[];
};

export type HotSeatParticipantDto = {
  id: string;
  displayName: string;
  score: number;
  correctAnswers: number;
  timesSelected: number;
  joinedAt: string;
  isCurrentLearner: boolean;
  isAssignedForCurrentQuestion: boolean;
};

export type HotSeatCurrentQuestionDto = {
  orderIndex: number;
  totalQuestions: number;
  questionNumber: number;
  prompt: string;
  selectionType: SelectionType;
  options: QuestionOptionDto[];
  assignedParticipantId: string | null;
  assignedParticipantName: string | null;
  startedAt: string | null;
  expiresAt: string | null;
  responseSubmitted: boolean;
  responseTimedOut: boolean;
  viewerCanAnswer: boolean;
  viewerHasAnswered: boolean;
  viewerSelectedOptionLetters: string[];
};

export type HotSeatReviewItemDto = {
  orderIndex: number;
  questionNumber: number;
  prompt: string;
  explanation: string;
  options: QuestionOptionDto[];
  correctOptionLetters: string[];
  assignedParticipantName: string | null;
  selectedOptionLetters: string[];
  isCorrect: boolean;
  wasTimedOut: boolean;
  timeTakenSeconds: number | null;
  pointsAwarded: number;
  speedBonusPoints: number;
  answeredAt: string | null;
};

export type HotSeatSessionDto = {
  id: string;
  code: string;
  examCode: string;
  title: string | null;
  status: HotSeatSessionStatus;
  source: QuizSource;
  order: QuizOrder;
  filterQuery: string;
  requestedCount: number;
  actualCount: number;
  timerSeconds: number;
  selectionMode: HotSeatSelectionMode;
  basePoints: number;
  speedBonusEnabled: boolean;
  maxSpeedBonus: number;
  currentQuestionIndex: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  isTeacher: boolean;
  isParticipant: boolean;
  participantId: string | null;
  participants: HotSeatParticipantDto[];
  currentQuestion: HotSeatCurrentQuestionDto | null;
  reviewItems: HotSeatReviewItemDto[];
};

export type CreateHotSeatSessionRequest = {
  title?: string;
  source: QuizSource;
  count: number;
  order: QuizOrder;
  query?: string;
  timerSeconds: number;
  selectionMode: HotSeatSelectionMode;
  basePoints: number;
  speedBonusEnabled: boolean;
  maxSpeedBonus: number;
};

export type JoinHotSeatSessionRequest = {
  code: string;
  displayName: string;
};

export type SubmitHotSeatResponseRequest = {
  selectedOptionLetters: string[];
  timeTakenSeconds: number;
};

export type QuestionListResponseDto = {
  items: QuestionDto[];
};

export type QuestionCountsDto = {
  activeExamCode: string;
  totalQuestions: number;
  challengingQuestions: number;
};

export type ApiEnvelope<T> = {
  data: T;
};
