'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import type {
  CreateHotSeatSessionRequest,
  HotSeatSelectionMode,
  QuestionCountsDto,
  QuizOrder,
  QuizSource
} from '@/contracts/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import {
  createHotSeatSessionRequest,
  joinHotSeatSessionRequest
} from '@/features/hot-seat/hot-seat.client';

type HotSeatHomeClientProps = {
  counts: QuestionCountsDto;
};

export default function HotSeatHomeClient({ counts }: HotSeatHomeClientProps) {
  const router = useRouter();
  const [source, setSource] = useState<QuizSource>('ALL');
  const [count, setCount] = useState(12);
  const [order, setOrder] = useState<QuizOrder>('RANDOM');
  const [query, setQuery] = useState('');
  const [timerSeconds, setTimerSeconds] = useState(45);
  const [selectionMode, setSelectionMode] = useState<HotSeatSelectionMode>('FAIR');
  const [basePoints, setBasePoints] = useState(10);
  const [speedBonusEnabled, setSpeedBonusEnabled] = useState(true);
  const [maxSpeedBonus, setMaxSpeedBonus] = useState(5);
  const [title, setTitle] = useState('');
  const [sessionCode, setSessionCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [createBusy, setCreateBusy] = useState(false);
  const [joinBusy, setJoinBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  async function handleCreateSession() {
    setCreateBusy(true);
    setCreateError(null);

    try {
      const session = await createHotSeatSessionRequest({
        title,
        source,
        count,
        order,
        query,
        timerSeconds,
        selectionMode,
        basePoints,
        speedBonusEnabled,
        maxSpeedBonus
      } satisfies CreateHotSeatSessionRequest);

      router.push(`/hot-seat/session/${session.code}`);
    } catch (error) {
      setCreateError(
        error instanceof Error ? error.message : 'Unable to create Hot Seat session'
      );
    } finally {
      setCreateBusy(false);
    }
  }

  async function handleJoinSession() {
    setJoinBusy(true);
    setJoinError(null);

    try {
      const session = await joinHotSeatSessionRequest({
        code: sessionCode,
        displayName
      });

      router.push(`/hot-seat/session/${session.code}`);
    } catch (error) {
      setJoinError(
        error instanceof Error ? error.message : 'Unable to join Hot Seat session'
      );
    } finally {
      setJoinBusy(false);
    }
  }

  return (
    <div className="stack">
      <Card elevated>
        <div className="row-between row-wrap gap-md">
          <div className="stack-tight">
            <h2>Teacher Setup</h2>
            <p className="muted">
              Build a classroom session, let students join with a code, then rotate one
              student into the hot seat for each question.
            </p>
          </div>
          <div className="row gap-sm row-wrap">
            <Pill>{counts.activeExamCode}</Pill>
            <Pill>Total questions: {counts.totalQuestions}</Pill>
            <Pill tone="warning">Challenge bank: {counts.challengingQuestions}</Pill>
          </div>
        </div>

        <div className="setup-grid">
          <label className="field">
            <span>Session title</span>
            <input
              className="input"
              placeholder="Friday review, Cloud essentials, ..."
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>

          <label className="field">
            <span>Question source</span>
            <select
              className="input"
              value={source}
              onChange={(event) => setSource(event.target.value as QuizSource)}
            >
              <option value="ALL">Use the full question bank</option>
              <option value="FILTERED">Use a filtered search</option>
              <option value="CHALLENGING">Use the challenging list</option>
            </select>
          </label>

          <label className="field">
            <span>Question count</span>
            <input
              className="input"
              type="number"
              min={1}
              max={counts.totalQuestions}
              value={count}
              onChange={(event) => setCount(Number(event.target.value))}
            />
          </label>

          <label className="field">
            <span>Question order</span>
            <select
              className="input"
              value={order}
              onChange={(event) => setOrder(event.target.value as QuizOrder)}
            >
              <option value="RANDOM">Random question order</option>
              <option value="SEQUENTIAL">Sequential question order</option>
            </select>
          </label>

          <label className="field">
            <span>Search query</span>
            <input
              className="input"
              placeholder="Only used for filtered sessions"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          <label className="field">
            <span>Student selection</span>
            <select
              className="input"
              value={selectionMode}
              onChange={(event) =>
                setSelectionMode(event.target.value as HotSeatSelectionMode)
              }
            >
              <option value="FAIR">Fair rotation</option>
              <option value="RANDOM">Pure random</option>
            </select>
          </label>

          <label className="field">
            <span>Timer (seconds)</span>
            <select
              className="input"
              value={timerSeconds}
              onChange={(event) => setTimerSeconds(Number(event.target.value))}
            >
              <option value={45}>45 seconds</option>
              <option value={50}>50 seconds</option>
              <option value={60}>60 seconds</option>
            </select>
          </label>

          <label className="field">
            <span>Base points</span>
            <input
              className="input"
              type="number"
              min={1}
              max={100}
              value={basePoints}
              onChange={(event) => setBasePoints(Number(event.target.value))}
            />
          </label>

          <label className="field">
            <span>Max speed bonus</span>
            <input
              className="input"
              type="number"
              min={0}
              max={50}
              value={maxSpeedBonus}
              disabled={!speedBonusEnabled}
              onChange={(event) => setMaxSpeedBonus(Number(event.target.value))}
            />
          </label>
        </div>

        <div className="toggle-grid">
          <label className="toggle-item">
            <input
              type="checkbox"
              checked={speedBonusEnabled}
              onChange={(event) => setSpeedBonusEnabled(event.target.checked)}
            />
            <span>Award extra points for faster correct answers</span>
          </label>
        </div>

        <div className="row gap-sm row-wrap">
          <Button type="button" onClick={() => void handleCreateSession()} disabled={createBusy}>
            {createBusy ? 'Creating...' : 'Create Session'}
          </Button>
        </div>

        {createError ? (
          <div className="error-card">
            <strong>Unable to create session</strong>
            <p>{createError}</p>
          </div>
        ) : null}
      </Card>

      <Card>
        <div className="stack-tight">
          <h2>Student Join</h2>
          <p className="muted">
            Students only need a session code and a display name. The assigned student can
            answer, and everyone else stays in spectator mode.
          </p>
        </div>

        <div className="setup-grid">
          <label className="field">
            <span>Session code</span>
            <input
              className="input hot-seat-code-input"
              placeholder="ABC123"
              value={sessionCode}
              onChange={(event) => setSessionCode(event.target.value.toUpperCase())}
            />
          </label>
          <label className="field">
            <span>Display name</span>
            <input
              className="input"
              placeholder="Student name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </label>
        </div>

        <div className="row gap-sm row-wrap">
          <Button type="button" variant="secondary" onClick={() => void handleJoinSession()} disabled={joinBusy}>
            {joinBusy ? 'Joining...' : 'Join Session'}
          </Button>
        </div>

        {joinError ? (
          <div className="error-card">
            <strong>Unable to join session</strong>
            <p>{joinError}</p>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
