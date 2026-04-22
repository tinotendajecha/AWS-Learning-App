import { Card } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import type { ChallengingListProps } from '@/features/challenging/challenging.types';

export function ChallengingList({ items, isLoading = false }: ChallengingListProps) {
  if (isLoading) {
    return (
      <Card>
        <div className="muted">Refreshing challenging concepts...</div>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <div className="muted">
          No challenging concepts saved yet. Miss a quiz question or mark one manually
          in study mode to collect it here.
        </div>
      </Card>
    );
  }

  return (
    <div className="stack">
      {items.map((item) => (
        <Card key={item.questionNumber} className="challenge-item">
          <div className="row-between">
            <strong>Question {item.questionNumber}</strong>
            <Pill tone={item.addedFrom === 'WRONG_ANSWER' ? 'warning' : 'neutral'}>
              {item.addedFrom === 'WRONG_ANSWER' ? 'Wrong answer' : 'Manual'}
            </Pill>
          </div>
          <p className="challenge-title">{item.question}</p>
          <p className="muted">
            Answer: <strong>{item.answerList.join(', ') || 'N/A'}</strong>
          </p>
          <p className="muted">{item.explanation || 'No explanation available.'}</p>
        </Card>
      ))}
    </div>
  );
}
