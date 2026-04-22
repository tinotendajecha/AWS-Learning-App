'use client';

import { startTransition, useMemo, useReducer } from 'react';
import { useRouter } from 'next/navigation';

import {
  completeQuizAttemptRequest,
  createQuizAttemptRequest,
  submitQuizAnswerRequest
} from '@/features/quiz/quiz.client';
import {
  initialQuizSessionState,
  quizReducer
} from '@/features/quiz/quiz.reducer';
import type { UseQuizSessionApi } from '@/features/quiz/quiz.types';

export function useQuizSession(): UseQuizSessionApi {
  const [state, dispatch] = useReducer(quizReducer, initialQuizSessionState);
  const router = useRouter();

  const currentQuestion = useMemo(() => {
    if (!state.session) {
      return null;
    }

    return state.session.questions[state.currentIndex] ?? null;
  }, [state.currentIndex, state.session]);

  async function startQuiz(input: Parameters<UseQuizSessionApi['startQuiz']>[0]) {
    dispatch({ type: 'startPending' });

    try {
      const session = await createQuizAttemptRequest(input);
      startTransition(() => {
        dispatch({ type: 'startSuccess', session });
      });
    } catch (error) {
      dispatch({
        type: 'startError',
        message: error instanceof Error ? error.message : 'Unable to start quiz'
      });
    }
  }

  function toggleSelection(
    letter: string,
    selectionType: Parameters<UseQuizSessionApi['toggleSelection']>[1]
  ) {
    dispatch({
      type: 'toggleSelection',
      letter,
      selectionType
    });
  }

  async function submitCurrentAnswer() {
    if (!state.session || !currentQuestion || state.selectedOptionLetters.length === 0) {
      return;
    }

    dispatch({ type: 'submitPending' });

    try {
      const result = await submitQuizAnswerRequest(state.session.attemptId, {
        questionNumber: currentQuestion.number,
        selectedOptionLetters: state.selectedOptionLetters
      });

      startTransition(() => {
        dispatch({ type: 'submitSuccess', result });
      });
    } catch (error) {
      dispatch({
        type: 'submitError',
        message: error instanceof Error ? error.message : 'Unable to submit answer'
      });
    }
  }

  function nextQuestion() {
    dispatch({ type: 'nextQuestion' });
  }

  async function finishQuiz(abandoned = false) {
    if (!state.session) {
      return;
    }

    dispatch({ type: 'finishPending' });

    try {
      await completeQuizAttemptRequest(state.session.attemptId, {
        abandoned
      });

      router.push(`/results/${state.session.attemptId}`);
    } catch (error) {
      dispatch({
        type: 'submitError',
        message: error instanceof Error ? error.message : 'Unable to finish quiz'
      });
    }
  }

  function resetQuiz() {
    dispatch({ type: 'reset' });
  }

  return {
    state,
    currentQuestion,
    startQuiz,
    toggleSelection,
    submitCurrentAnswer,
    nextQuestion,
    finishQuiz,
    resetQuiz
  };
}
