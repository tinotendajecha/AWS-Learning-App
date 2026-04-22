import { AppError, jsonError, jsonResponse } from '@/lib/http';
import { getRouteRequestContext } from '@/lib/request-context';
import { removeChallenge } from '@/server/services/challenging.service';

type ChallengeRouteProps = {
  params: Promise<{
    number: string;
  }>;
};

export async function DELETE(request: Request, { params }: ChallengeRouteProps) {
  const context = await getRouteRequestContext(request);

  try {
    const { number } = await params;
    const questionNumber = Number(number);

    if (!Number.isInteger(questionNumber)) {
      throw new AppError(400, 'INVALID_QUESTION_NUMBER', 'Question number must be numeric.');
    }

    context.logger.info(
      { path: '/api/challenging/[number]', questionNumber },
      'Handling challenging DELETE request'
    );

    const items = await removeChallenge(
      context.learner.id,
      questionNumber,
      context.logger
    );

    return jsonResponse(context.requestId, items);
  } catch (error) {
    return jsonError(context.requestId, error, context.logger);
  }
}
