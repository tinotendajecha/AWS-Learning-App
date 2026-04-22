'use client';

import { useState } from 'react';

import type { PreferencesDto, QuestionCountsDto, QuizOrder, QuizSource } from '@/contracts/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { patchPreferences } from '@/features/preferences/preferences.client';
import { useQuizSession } from '@/features/quiz/useQuizSession';

type QuizPageClientProps = {
  initialPreferences: PreferencesDto;
  counts: QuestionCountsDto;
};

export default function QuizPageClient({
  initialPreferences,
  counts
}: QuizPageClientProps) {
  const [source, setSource] = useState<QuizSource>('FILTERED');
  const [count, setCount] = useState(20);
  const [order, setOrder] = useState<QuizOrder>('RANDOM');
  const [query, setQuery] = useState('');
  const [preferences, setPreferences] = useState(initialPreferences);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);

  const quiz = useQuizSession();
  const question = quiz.currentQuestion;

  async function updatePreference(
    key: keyof PreferencesDto,
    value: boolean
  ) {
    const nextPreferences = {
      ...preferences,
      [key]: value
    };

    setPreferences(nextPreferences);

    try {
      await patchPreferences(nextPreferences);
      setSettingsMessage('Preferences saved.');
    } catch (error) {
      setSettingsMessage(
        error instanceof Error ? error.message : 'Unable to save preferences'
      );
    }
  }

  const isLastQuestion =
    quiz.state.session !== null &&
    quiz.state.currentIndex === quiz.state.session.questions.length - 1;

  return (
    <div className="stack">
      <Card elevated>
        <div className="row-between row-wrap gap-md">
          <div className="stack-tight">
            <h2>Quiz Setup</h2>
            <p className="muted">
              Build a session from the full bank, your current filtered search, or the
              questions you keep missing.
            </p>
          </div>
          <div className="row gap-sm row-wrap">
            <Pill>{counts.activeExamCode}</Pill>
            <Pill>Total questions: {counts.totalQuestions}</Pill>
            <Pill tone="warning">Challenging: {counts.challengingQuestions}</Pill>
          </div>
        </div>

        <div className="setup-grid">
          <label className="field">
            <span>Question source</span>
            <select
              className="input"
              value={source}
              onChange={(event) => setSource(event.target.value as QuizSource)}
            >
              <option value="FILTERED">Use filtered search results</option>
              <option value="ALL">Use all questions</option>
              <option value="CHALLENGING">Use challenging questions</option>
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
            <span>Order</span>
            <select
              className="input"
              value={order}
              onChange={(event) => setOrder(event.target.value as QuizOrder)}
            >
              <option value="RANDOM">Random order</option>
              <option value="SEQUENTIAL">Sequential order</option>
            </select>
          </label>

          <label className="field">
            <span>Search query</span>
            <input
              className="input"
              placeholder="Only used when source is filtered"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>

        <div className="toggle-grid">
          <label className="toggle-item">
            <input
              type="checkbox"
              checked={preferences.noRepeatMode}
              onChange={(event) =>
                void updatePreference('noRepeatMode', event.target.checked)
              }
            />
            <span>No repeat mode until all questions are seen</span>
          </label>
          <label className="toggle-item">
            <input
              type="checkbox"
              checked={preferences.removeChallengeOnCorrect}
              onChange={(event) =>
                void updatePreference(
                  'removeChallengeOnCorrect',
                  event.target.checked
                )
              }
            />
            <span>Auto-remove a challenge after a correct answer</span>
          </label>
        </div>

        {settingsMessage ? <p className="muted">{settingsMessage}</p> : null}

        <div className="row gap-sm row-wrap">
          <Button
            type="button"
            onClick={() =>
              void quiz.startQuiz({
                source,
                count,
                order,
                query,
                noRepeatMode: preferences.noRepeatMode,
                removeChallengeOnCorrect: preferences.removeChallengeOnCorrect
              })
            }
            disabled={quiz.state.status === 'starting'}
          >
            {quiz.state.status === 'starting' ? 'Starting...' : 'Start Quiz'}
          </Button>
          <Button type="button" variant="secondary" onClick={quiz.resetQuiz}>
            Reset
          </Button>
        </div>

        {quiz.state.error ? (
          <div className="error-card">
            <strong>Quiz setup issue</strong>
            <p>{quiz.state.error}</p>
          </div>
        ) : null}
      </Card>

      {quiz.state.session && question ? (
        <Card elevated>
          <div className="row-between row-wrap gap-md">
            <div className="row gap-sm row-wrap">
              <Pill>
                Question {quiz.state.currentIndex + 1} of {quiz.state.session.actualCount}
              </Pill>
              <Pill tone="success">Score {quiz.state.session.score}</Pill>
              <Pill tone={question.selectionType === 'MULTI' ? 'warning' : 'neutral'}>
                {question.selectionType === 'MULTI' ? 'Multi select' : 'Single answer'}
              </Pill>
            </div>
          </div>

          <div className="question-copy">
            <h2>{question.prompt}</h2>
            <div className="option-list">
              {question.options.map((option) => {
                const isSelected = quiz.state.selectedOptionLetters.includes(option.letter);
                const wasSubmitted = Boolean(quiz.state.feedback);
                const isCorrect =
                  quiz.state.feedback?.correctOptionLetters.includes(option.letter) ?? false;
                const isWrongChoice =
                  wasSubmitted &&
                  isSelected &&
                  !quiz.state.feedback?.correctOptionLetters.includes(option.letter);

                return (
                  <label
                    key={option.letter}
                    className={`option-card interactive ${
                      isSelected ? 'option-selected' : ''
                    } ${isCorrect ? 'option-correct' : ''} ${
                      isWrongChoice ? 'option-incorrect' : ''
                    }`}
                  >
                    <input
                      type={question.selectionType === 'MULTI' ? 'checkbox' : 'radio'}
                      checked={isSelected}
                      disabled={wasSubmitted}
                      onChange={() =>
                        quiz.toggleSelection(option.letter, question.selectionType)
                      }
                    />
                    <div className="option-letter">{option.letter}</div>
                    <div>{option.text}</div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="row gap-sm row-wrap">
            <Button
              type="button"
              onClick={() => void quiz.submitCurrentAnswer()}
              disabled={
                quiz.state.status === 'submitting' ||
                quiz.state.selectedOptionLetters.length === 0 ||
                Boolean(quiz.state.feedback)
              }
            >
              {quiz.state.status === 'submitting' ? 'Submitting...' : 'Submit Answer'}
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={quiz.nextQuestion}
              disabled={!quiz.state.feedback || isLastQuestion}
            >
              Next Question
            </Button>

            <Button
              type="button"
              variant={isLastQuestion ? 'primary' : 'danger'}
              onClick={() => void quiz.finishQuiz(!isLastQuestion || !quiz.state.feedback)}
              disabled={quiz.state.status === 'finishing'}
            >
              {isLastQuestion && quiz.state.feedback ? 'View Results' : 'End Quiz Now'}
            </Button>
          </div>

          {quiz.state.feedback ? (
            <Card className="answer-panel">
              <p>
                <strong>{quiz.state.feedback.isCorrect ? 'Correct.' : 'Not quite.'}</strong>{' '}
                Selected: {quiz.state.feedback.selectedOptionLetters.join(', ')}. Correct answer:{' '}
                {quiz.state.feedback.correctOptionLetters.join(', ')}.
              </p>
              <p>{quiz.state.feedback.explanation || 'No explanation available.'}</p>
            </Card>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}
