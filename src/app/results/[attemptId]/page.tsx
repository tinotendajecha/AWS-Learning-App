import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AppShell } from '@/components/layout/app-shell';
import { Card } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { getServerRequestContext } from '@/lib/request-context';
import { getAttemptResult } from '@/server/services/quiz.service';

type ResultsPageProps = {
  params: Promise<{
    attemptId: string;
  }>;
};

export default async function ResultsPage({ params }: ResultsPageProps) {
  const { attemptId } = await params;
  const context = await getServerRequestContext();

  try {
    const result = await getAttemptResult(context.learner.id, attemptId, context.logger);

    return (
      <AppShell
        title="Quiz Results"
        description="Review your score, see what remains unanswered, and dig into every incorrect response."
        actions={
          <div className="row gap-sm row-wrap">
            <Link href="/quiz" className="button button-primary">
              Start Another Quiz
            </Link>
            <Link href="/study" className="button button-secondary">
              Back to Study
            </Link>
          </div>
        }
      >
        <Card elevated>
          <div className="row gap-sm row-wrap">
            <Pill>{result.examCode}</Pill>
            <Pill tone="success">Score {result.score}</Pill>
            <Pill>Correct {result.correctCount}</Pill>
            <Pill tone="warning">Wrong {result.wrongCount}</Pill>
            <Pill>Answered {result.answeredCount}</Pill>
            <Pill>Unanswered {result.unansweredCount}</Pill>
          </div>
        </Card>

        <Card>
          <h2>Wrong Answer Review</h2>
          {result.wrongAnswers.length === 0 ? (
            <p className="muted">Perfect score. There are no wrong answers to review.</p>
          ) : (
            <div className="stack">
              {result.wrongAnswers.map((item) => (
                <Card key={item.number} className="challenge-item">
                  <div className="row-between row-wrap gap-md">
                    <strong>Question {item.number}</strong>
                    <Pill tone="warning">Needs review</Pill>
                  </div>
                  <p className="challenge-title">{item.prompt}</p>
                  <p className="muted">
                    Your answer: <strong>{item.selectedOptionLetters.join(', ') || 'None'}</strong>
                  </p>
                  <p className="muted">
                    Correct answer: <strong>{item.correctOptionLetters.join(', ')}</strong>
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
          )}
        </Card>
      </AppShell>
    );
  } catch {
    notFound();
  }
}
