'use client';

import { useEffect, useMemo, useState } from 'react';

import type { HotSeatSessionDto, JoinHotSeatSessionRequest } from '@/contracts/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import {
  advanceHotSeatSessionRequest,
  fetchHotSeatSessionRequest,
  joinHotSeatSessionRequest,
  startHotSeatSessionRequest,
  submitHotSeatResponseRequest
} from '@/features/hot-seat/hot-seat.client';
import type { HotSeatClientState } from '@/features/hot-seat/hot-seat.types';

type HotSeatSessionClientProps = {
  initialSession: HotSeatSessionDto;
};

function computeRemainingSeconds(expiresAt: string | null) {
  if (!expiresAt) {
    return 0;
  }

  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000));
}

export default function HotSeatSessionClient({
  initialSession
}: HotSeatSessionClientProps) {
  const [state, setState] = useState<HotSeatClientState>({
    session: initialSession,
    selectedOptionLetters: [],
    busyAction: null,
    message: null,
    error: null
  });
  const [joinName, setJoinName] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState(
    computeRemainingSeconds(initialSession.currentQuestion?.expiresAt ?? null)
  );

  const currentQuestion = state.session.currentQuestion;
  const isLastQuestion =
    currentQuestion !== null &&
    currentQuestion.orderIndex >= state.session.actualCount - 1;

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (state.session.status === 'COMPLETED') {
        return;
      }

      void fetchHotSeatSessionRequest(state.session.code)
        .then((session) => {
          setState((current) => ({
            ...current,
            session,
            error: null
          }));
        })
        .catch(() => {
          setState((current) => current);
        });
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [state.session.code, state.session.status]);

  useEffect(() => {
    setRemainingSeconds(computeRemainingSeconds(currentQuestion?.expiresAt ?? null));

    const intervalId = window.setInterval(() => {
      setRemainingSeconds(computeRemainingSeconds(currentQuestion?.expiresAt ?? null));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [currentQuestion?.expiresAt, currentQuestion?.orderIndex]);

  useEffect(() => {
    setState((current) => ({
      ...current,
      selectedOptionLetters: current.session.currentQuestion?.viewerSelectedOptionLetters ?? []
    }));
  }, [state.session.currentQuestion?.orderIndex, state.session.currentQuestion?.viewerHasAnswered]);

  const leaderboardLabel = useMemo(() => {
    if (state.session.participants.length === 0) {
      return 'No students have joined yet.';
    }

    return `${state.session.participants.length} student${
      state.session.participants.length === 1 ? '' : 's'
    } in the room`;
  }, [state.session.participants.length]);

  function toggleSelection(letter: string) {
    if (!currentQuestion || !currentQuestion.viewerCanAnswer || currentQuestion.viewerHasAnswered) {
      return;
    }

    setState((current) => {
      const alreadySelected = current.selectedOptionLetters.includes(letter);

      if (currentQuestion.selectionType === 'MULTI') {
        return {
          ...current,
          selectedOptionLetters: alreadySelected
            ? current.selectedOptionLetters.filter((item) => item !== letter)
            : [...current.selectedOptionLetters, letter].sort()
        };
      }

      return {
        ...current,
        selectedOptionLetters: alreadySelected ? [] : [letter]
      };
    });
  }

  async function refreshSession(nextSession: HotSeatSessionDto, message?: string) {
    setState((current) => ({
      ...current,
      session: nextSession,
      selectedOptionLetters: nextSession.currentQuestion?.viewerSelectedOptionLetters ?? [],
      busyAction: null,
      error: null,
      message: message ?? current.message
    }));
  }

  async function handleStart() {
    setState((current) => ({ ...current, busyAction: 'start', error: null, message: null }));

    try {
      const session = await startHotSeatSessionRequest(state.session.code);
      await refreshSession(session, 'Session started.');
    } catch (error) {
      setState((current) => ({
        ...current,
        busyAction: null,
        error: error instanceof Error ? error.message : 'Unable to start session'
      }));
    }
  }

  async function handleAdvance() {
    setState((current) => ({ ...current, busyAction: 'advance', error: null, message: null }));

    try {
      const session = await advanceHotSeatSessionRequest(state.session.code);
      await refreshSession(
        session,
        session.status === 'COMPLETED' ? 'Session completed.' : 'Moved to the next question.'
      );
    } catch (error) {
      setState((current) => ({
        ...current,
        busyAction: null,
        error: error instanceof Error ? error.message : 'Unable to advance session'
      }));
    }
  }

  async function handleSubmitAnswer() {
    if (!currentQuestion) {
      return;
    }

    setState((current) => ({ ...current, busyAction: 'submit', error: null, message: null }));

    try {
      const session = await submitHotSeatResponseRequest(state.session.code, {
        selectedOptionLetters: state.selectedOptionLetters,
        timeTakenSeconds: Math.max(state.session.timerSeconds - remainingSeconds, 0)
      });
      await refreshSession(session, 'Answer locked in. Waiting for the teacher to continue.');
    } catch (error) {
      setState((current) => ({
        ...current,
        busyAction: null,
        error: error instanceof Error ? error.message : 'Unable to submit answer'
      }));
    }
  }

  async function handleJoinFromSession() {
    setState((current) => ({ ...current, busyAction: 'join', error: null, message: null }));

    try {
      const session = await joinHotSeatSessionRequest({
        code: state.session.code,
        displayName: joinName
      } satisfies JoinHotSeatSessionRequest);

      await refreshSession(session, 'You joined the Hot Seat session.');
      setJoinName('');
    } catch (error) {
      setState((current) => ({
        ...current,
        busyAction: null,
        error: error instanceof Error ? error.message : 'Unable to join session'
      }));
    }
  }

  return (
    <div className="stack">
      <Card elevated>
        <div className="row-between row-wrap gap-md">
          <div className="stack-tight">
            <div className="row gap-sm row-wrap">
              <Pill>{state.session.examCode}</Pill>
              <Pill>{state.session.status}</Pill>
              <Pill tone="warning">Code {state.session.code}</Pill>
            </div>
            <h2>{state.session.title || 'Hot Seat Session'}</h2>
            <p className="muted">
              {leaderboardLabel} - {state.session.actualCount} questions -{' '}
              {state.session.selectionMode === 'FAIR'
                ? 'fair student rotation'
                : 'random student rotation'}
            </p>
          </div>
          <div className="row gap-sm row-wrap">
            <Pill>Timer {state.session.timerSeconds}s</Pill>
            <Pill tone="success">Base points {state.session.basePoints}</Pill>
            {state.session.speedBonusEnabled ? (
              <Pill tone="success">Speed bonus up to {state.session.maxSpeedBonus}</Pill>
            ) : null}
          </div>
        </div>

        {!state.session.isTeacher && !state.session.isParticipant && state.session.status !== 'COMPLETED' ? (
          <div className="hot-seat-inline-join">
            <label className="field">
              <span>Display name</span>
              <input
                className="input"
                placeholder="Enter your name to join"
                value={joinName}
                onChange={(event) => setJoinName(event.target.value)}
              />
            </label>
            <Button
              type="button"
              onClick={() => void handleJoinFromSession()}
              disabled={state.busyAction === 'join'}
            >
              {state.busyAction === 'join' ? 'Joining...' : 'Join This Session'}
            </Button>
          </div>
        ) : null}

        {state.error ? (
          <div className="error-card">
            <strong>Hot Seat issue</strong>
            <p>{state.error}</p>
          </div>
        ) : null}

        {state.message ? <p className="muted">{state.message}</p> : null}
      </Card>

      <div className="hot-seat-grid">
        <Card>
          <div className="row-between row-wrap gap-md">
            <div className="stack-tight">
              <h2>Classroom Leaderboard</h2>
              <p className="muted">
                Scores update when a student answers correctly, with optional speed bonuses.
              </p>
            </div>
            {state.session.isTeacher && state.session.status === 'LOBBY' ? (
              <Button
                type="button"
                onClick={() => void handleStart()}
                disabled={
                  state.busyAction === 'start' || state.session.participants.length === 0
                }
              >
                {state.busyAction === 'start' ? 'Starting...' : 'Start Session'}
              </Button>
            ) : null}
          </div>

          <div className="stack">
            {state.session.participants.length === 0 ? (
              <div className="empty-state">
                <h2>Waiting for students</h2>
                <p className="muted">Share the session code so participants can join.</p>
              </div>
            ) : (
              state.session.participants.map((participant, index) => (
                <div
                  key={participant.id}
                  className={`participant-row ${
                    participant.isAssignedForCurrentQuestion ? 'participant-row-active' : ''
                  }`}
                >
                  <div className="participant-rank">{index + 1}</div>
                  <div className="participant-details">
                    <strong>{participant.displayName}</strong>
                    <p className="muted">
                      Score {participant.score} - Correct {participant.correctAnswers} - Selected{' '}
                      {participant.timesSelected} times
                    </p>
                  </div>
                  <div className="row gap-sm row-wrap">
                    {participant.isCurrentLearner ? <Pill>You</Pill> : null}
                    {participant.isAssignedForCurrentQuestion ? (
                      <Pill tone="warning">On deck</Pill>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <div className="row-between row-wrap gap-md">
            <div className="stack-tight">
              <h2>Current Question</h2>
              {currentQuestion ? (
                <p className="muted">
                  Question {currentQuestion.orderIndex + 1} of {currentQuestion.totalQuestions}
                </p>
              ) : (
                <p className="muted">
                  {state.session.status === 'LOBBY'
                    ? 'The teacher can start once students have joined.'
                    : 'The session is complete.'}
                </p>
              )}
            </div>
            {currentQuestion ? (
              <div className="row gap-sm row-wrap">
                <Pill tone={remainingSeconds <= 10 ? 'warning' : 'neutral'}>
                  {currentQuestion.responseSubmitted ? 'Answered' : `${remainingSeconds}s left`}
                </Pill>
                {currentQuestion.assignedParticipantName ? (
                  <Pill>{currentQuestion.assignedParticipantName}</Pill>
                ) : null}
              </div>
            ) : null}
          </div>

          {currentQuestion ? (
            <div className="stack">
              <div className="question-copy">
                <h2>{currentQuestion.prompt}</h2>
                <div className="option-list">
                  {currentQuestion.options.map((option) => {
                    const isSelected = state.selectedOptionLetters.includes(option.letter);

                    return (
                      <label
                        key={option.letter}
                        className={`option-card interactive ${
                          isSelected ? 'option-selected' : ''
                        } ${!currentQuestion.viewerCanAnswer ? 'option-card-muted' : ''}`}
                      >
                        <input
                          type={currentQuestion.selectionType === 'MULTI' ? 'checkbox' : 'radio'}
                          checked={isSelected}
                          disabled={!currentQuestion.viewerCanAnswer || currentQuestion.viewerHasAnswered}
                          onChange={() => toggleSelection(option.letter)}
                        />
                        <div className="option-letter">{option.letter}</div>
                        <div>{option.text}</div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="hot-seat-status-banner">
                {currentQuestion.viewerCanAnswer ? (
                  <p>
                    It is your turn. Submit before the timer reaches zero to lock in your
                    answer.
                  </p>
                ) : currentQuestion.viewerHasAnswered ? (
                  <p>Your answer is locked in. The class can keep watching while the teacher advances.</p>
                ) : (
                  <p>
                    View-only mode. Only <strong>{currentQuestion.assignedParticipantName}</strong>{' '}
                    can answer this question.
                  </p>
                )}
              </div>

              <div className="row gap-sm row-wrap">
                {currentQuestion.viewerCanAnswer ? (
                  <Button
                    type="button"
                    onClick={() => void handleSubmitAnswer()}
                    disabled={
                      state.busyAction === 'submit' ||
                      state.selectedOptionLetters.length === 0 ||
                      remainingSeconds === 0
                    }
                  >
                    {state.busyAction === 'submit' ? 'Submitting...' : 'Submit Answer'}
                  </Button>
                ) : null}

                {state.session.isTeacher && state.session.status === 'ACTIVE' ? (
                  <Button
                    type="button"
                    variant={isLastQuestion ? 'primary' : 'secondary'}
                    onClick={() => void handleAdvance()}
                    disabled={state.busyAction === 'advance'}
                  >
                    {state.busyAction === 'advance'
                      ? 'Advancing...'
                      : isLastQuestion
                        ? 'Finish Session'
                        : 'Next Question'}
                  </Button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <h2>
                {state.session.status === 'COMPLETED'
                  ? 'Session complete'
                  : 'Ready to begin'}
              </h2>
              <p className="muted">
                {state.session.status === 'COMPLETED'
                  ? 'Scores are final and the teacher review is ready below.'
                  : 'Once the teacher starts, the assigned student will see answer controls here.'}
              </p>
            </div>
          )}
        </Card>
      </div>

      {state.session.isTeacher && state.session.reviewItems.length > 0 ? (
        <Card>
          <div className="stack-tight">
            <h2>Teacher Review</h2>
            <p className="muted">
              Review every asked question, the correct answer, the explanation, and how the
              assigned student performed.
            </p>
          </div>

          <div className="stack">
            {state.session.reviewItems.map((item) => (
              <Card key={`${item.orderIndex}-${item.questionNumber}`} className="challenge-item">
                <div className="row-between row-wrap gap-md">
                  <strong>
                    Question {item.questionNumber} - Turn {item.orderIndex + 1}
                  </strong>
                  <div className="row gap-sm row-wrap">
                    <Pill>{item.assignedParticipantName ?? 'Unassigned'}</Pill>
                    <Pill tone={item.isCorrect ? 'success' : 'warning'}>
                      {item.isCorrect ? 'Correct' : item.wasTimedOut ? 'Timed out' : 'Incorrect'}
                    </Pill>
                    <Pill tone="success">Points {item.pointsAwarded}</Pill>
                  </div>
                </div>
                <p className="challenge-title">{item.prompt}</p>
                <p className="muted">
                  Student answer: <strong>{item.selectedOptionLetters.join(', ') || 'No answer'}</strong>
                </p>
                <p className="muted">
                  Correct answer: <strong>{item.correctOptionLetters.join(', ')}</strong>
                </p>
                <p className="muted">
                  Time taken: <strong>{item.timeTakenSeconds ?? 'N/A'}s</strong> - Speed bonus:{' '}
                  <strong>{item.speedBonusPoints}</strong>
                </p>
                <div className="option-list">
                  {item.options.map((option) => (
                    <div key={option.letter} className="option-card">
                      <div className="option-letter">{option.letter}</div>
                      <div>{option.text}</div>
                    </div>
                  ))}
                </div>
                <Card className="answer-panel">
                  <p>{item.explanation || 'No explanation available.'}</p>
                </Card>
              </Card>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
