import { getRouteRequestContext } from '@/lib/request-context';
import { AppError, jsonError, jsonResponse } from '@/lib/http';
import { getAttemptResult } from '@/server/services/quiz.service';

type AttemptRouteProps = {
  params: Promise<{
    attemptId: string;
  }>;
};

export async function GET(request: Request, { params }: AttemptRouteProps) {
  const context = await getRouteRequestContext(request);

  try {
    const { attemptId } = await params;

    if (!attemptId) {
      throw new AppError(400, 'INVALID_ATTEMPT_ID', 'Attempt ID is required.');
    }

    context.logger.info(
      { path: '/api/quiz-attempts/[attemptId]', attemptId },
      'Handling quiz attempt result request'
    );

    const attempt = await getAttemptResult(
      context.learner.id,
      attemptId,
      context.logger
    );

    return jsonResponse(context.requestId, attempt);
  } catch (error) {
    return jsonError(context.requestId, error, context.logger);
  }
}
