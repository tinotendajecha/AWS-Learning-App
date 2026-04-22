import type { QuizSessionAction, QuizSessionState } from '@/features/quiz/quiz.types';

export const initialQuizSessionState: QuizSessionState = {
  status: 'idle',
  session: null,
  currentIndex: 0,
  selectedOptionLetters: [],
  feedback: null,
  error: null
};

export function quizReducer(
  state: QuizSessionState,
  action: QuizSessionAction
): QuizSessionState {
  switch (action.type) {
    case 'startPending':
      return {
        ...initialQuizSessionState,
        status: 'starting'
      };
    case 'startSuccess':
      return {
        status: 'active',
        session: action.session,
        currentIndex: 0,
        selectedOptionLetters: [],
        feedback: null,
        error: null
      };
    case 'startError':
      return {
        ...initialQuizSessionState,
        status: 'idle',
        error: action.message
      };
    case 'toggleSelection': {
      if (!state.session || state.feedback) {
        return state;
      }

      if (action.selectionType === 'SINGLE') {
        return {
          ...state,
          selectedOptionLetters: [action.letter]
        };
      }

      const isAlreadySelected = state.selectedOptionLetters.includes(action.letter);

      return {
        ...state,
        selectedOptionLetters: isAlreadySelected
          ? state.selectedOptionLetters.filter((letter) => letter !== action.letter)
          : [...state.selectedOptionLetters, action.letter]
      };
    }
    case 'submitPending':
      return {
        ...state,
        status: 'submitting',
        error: null
      };
    case 'submitSuccess':
      return state.session
        ? {
            ...state,
            status: 'active',
            feedback: action.result,
            session: {
              ...state.session,
              score: action.result.score,
              correctCount: action.result.correctCount,
              wrongCount: action.result.wrongCount
            },
            error: null
          }
        : state;
    case 'submitError':
      return {
        ...state,
        status: 'active',
        error: action.message
      };
    case 'nextQuestion':
      if (!state.session) {
        return state;
      }

      return {
        ...state,
        currentIndex: Math.min(state.currentIndex + 1, state.session.questions.length - 1),
        selectedOptionLetters: [],
        feedback: null,
        error: null
      };
    case 'finishPending':
      return {
        ...state,
        status: 'finishing',
        error: null
      };
    case 'reset':
      return initialQuizSessionState;
    default:
      return state;
  }
}
