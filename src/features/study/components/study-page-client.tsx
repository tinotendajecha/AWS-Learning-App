'use client';

import Link from 'next/link';
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react';

import type {
  ApiEnvelope,
  QuestionDto
} from '@/contracts/api';
import { ChallengingList } from '@/features/challenging/components/challenging-list';
import {
  deleteChallenge,
  fetchChallenges,
  markChallenge
} from '@/features/challenging/challenging.client';
import type { StudyPageClientProps } from '@/features/study/study.types';
import { clampIndex, randomIndex } from '@/features/study/study.utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';

async function fetchQuestions(query: string) {
  const params = new URLSearchParams();
  if (query.trim()) {
    params.set('query', query.trim());
  }

  const response = await fetch(`/api/questions?${params.toString()}`, {
    cache: 'no-store'
  });

  const payload = (await response.json()) as
    | ApiEnvelope<{ items: QuestionDto[] }>
    | { error?: { message?: string } };

  if (!response.ok) {
    const errorPayload = payload as { error?: { message?: string } };
    throw new Error(errorPayload.error?.message ?? 'Unable to load questions');
  }

  return (payload as ApiEnvelope<{ items: QuestionDto[] }>).data.items;
}

export default function StudyPageClient({
  initialQuestions,
  initialChallenges,
  counts
}: StudyPageClientProps) {
  const [query, setQuery] = useState('');
  const [questions, setQuestions] = useState(initialQuestions);
  const [challenges, setChallenges] = useState(initialChallenges);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answerVisible, setAnswerVisible] = useState(false);
  const [showChallenges, setShowChallenges] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isUpdatingChallenge, setIsUpdatingChallenge] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deferredQuery = useDeferredValue(query);
  const currentQuestion = questions[currentIndex] ?? null;
  const isCurrentQuestionChallenging = useMemo(
    () => currentQuestion?.learnerState.isChallenging ?? false,
    [currentQuestion]
  );

  useEffect(() => {
    let active = true;
    setIsSearching(true);

    fetchQuestions(deferredQuery)
      .then((items) => {
        if (!active) {
          return;
        }

        startTransition(() => {
          setQuestions(items);
          setCurrentIndex(0);
          setAnswerVisible(false);
          setError(null);
        });
      })
      .catch((nextError: unknown) => {
        if (!active) {
          return;
        }

        setError(nextError instanceof Error ? nextError.message : 'Unable to load questions');
      })
      .finally(() => {
        if (active) {
          setIsSearching(false);
        }
      });

    return () => {
      active = false;
    };
  }, [deferredQuery]);

  async function refreshChallenges() {
    const items = await fetchChallenges();
    startTransition(() => {
      setChallenges(items);
    });
  }

  async function handleToggleChallenge() {
    if (!currentQuestion) {
      return;
    }

    setIsUpdatingChallenge(true);

    try {
      if (isCurrentQuestionChallenging) {
        await deleteChallenge(currentQuestion.number);
      } else {
        await markChallenge({
          questionNumber: currentQuestion.number,
          source: 'MANUAL'
        });
      }

      const [latestQuestions, latestChallenges] = await Promise.all([
        fetchQuestions(deferredQuery),
        fetchChallenges()
      ]);

      startTransition(() => {
        setQuestions(latestQuestions);
        setChallenges(latestChallenges);
        setCurrentIndex((existingIndex) =>
          clampIndex(existingIndex, latestQuestions.length)
        );
      });
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : 'Unable to update challenging state'
      );
    } finally {
      setIsUpdatingChallenge(false);
    }
  }

  return (
    <div className="stack">
      <Card elevated>
        <div className="row-between row-wrap gap-md">
          <div className="stack-tight">
            <div className="controls">
              <input
                aria-label="Search question bank"
                className="input"
                placeholder="Search question number or keyword"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <div className="row gap-sm row-wrap">
              <Pill>{counts.activeExamCode}</Pill>
              <Pill>Total questions: {counts.totalQuestions}</Pill>
              <Pill tone="warning">Challenging: {challenges.length}</Pill>
              {isSearching ? <Pill>Searching...</Pill> : null}
            </div>
          </div>
          <div className="row gap-sm row-wrap">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCurrentIndex(randomIndex(questions.length))}
              disabled={questions.length === 0}
            >
              Random
            </Button>
            <Link href="/quiz" className="button button-primary">
              Switch to Quiz
            </Link>
          </div>
        </div>
      </Card>

      {error ? (
        <Card className="error-card">
          <strong>Something needs attention.</strong>
          <p>{error}</p>
        </Card>
      ) : null}

      <Card elevated>
        {currentQuestion ? (
          <>
            <div className="row-between row-wrap gap-md">
              <div className="row gap-sm row-wrap">
                <Pill>Question {currentQuestion.number}</Pill>
                <Pill>
                  Showing {currentIndex + 1} of {questions.length}
                </Pill>
                <Pill tone={currentQuestion.selectionType === 'MULTI' ? 'warning' : 'success'}>
                  {currentQuestion.selectionType === 'MULTI' ? 'Multi select' : 'Single answer'}
                </Pill>
              </div>
            </div>

            <div className="question-copy">
              <h2>{currentQuestion.prompt}</h2>
              <div className="option-list">
                {currentQuestion.options.map((option) => (
                  <div key={option.letter} className="option-card">
                    <div className="option-letter">{option.letter}</div>
                    <div>{option.text}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="row gap-sm row-wrap">
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  setCurrentIndex((existingIndex) =>
                    clampIndex(existingIndex - 1, questions.length)
                  )
                }
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  setCurrentIndex((existingIndex) =>
                    clampIndex(existingIndex + 1, questions.length)
                  )
                }
              >
                Next
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setAnswerVisible((visible) => !visible)}
              >
                {answerVisible ? 'Hide Answer' : 'Reveal Answer'}
              </Button>
              <Button
                type="button"
                variant={isCurrentQuestionChallenging ? 'danger' : 'primary'}
                onClick={handleToggleChallenge}
                disabled={isUpdatingChallenge}
              >
                {isCurrentQuestionChallenging ? 'Remove Challenge' : 'Mark Challenging'}
              </Button>
            </div>

            {answerVisible ? (
              <Card className="answer-panel">
                <p className="muted">
                  Answer: <strong>{currentQuestion.correctOptionLetters.join(', ')}</strong>
                </p>
                <p>{currentQuestion.explanation || 'No explanation available.'}</p>
              </Card>
            ) : null}
          </>
        ) : (
          <div className="empty-state">
            <h2>No questions found</h2>
            <p>Try a different search term to bring the study set back into view.</p>
          </div>
        )}
      </Card>

      <Card>
        <div className="row-between row-wrap gap-md">
          <div>
            <h2>Challenging Concepts</h2>
            <p className="muted">
              Keep a focused list of topics that need extra repetition.
            </p>
          </div>
          <div className="row gap-sm row-wrap">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowChallenges((visible) => !visible);
                void refreshChallenges();
              }}
            >
              {showChallenges ? 'Hide List' : 'Review List'}
            </Button>
            <a className="button button-primary" href="/api/challenging/export">
              Export CSV
            </a>
          </div>
        </div>

        {showChallenges ? (
          <div className="stack">
            <ChallengingList items={challenges} isLoading={false} />
          </div>
        ) : null}
      </Card>
    </div>
  );
}
