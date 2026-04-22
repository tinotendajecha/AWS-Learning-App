import { AppError, jsonError, jsonResponse, parseRequestBody } from '@/lib/http';
import { getRouteRequestContext } from '@/lib/request-context';
import { completeQuizAttemptSchema } from '@/lib/validation';
import { completeAttempt } from '@/server/services/quiz.service';

type CompleteRouteProps = {
  params: Promise<{
    attemptId: string;
  }>;
};

export async function POST(request: Request, { params }: CompleteRouteProps) {
  const context = await getRouteRequestContext(request);

  try {
    const { attemptId } = await params;
    const input = await parseRequestBody(request, completeQuizAttemptSchema);

    if (!attemptId) {
      throw new AppError(400, 'INVALID_ATTEMPT_ID', 'Attempt ID is required.');
    }

    context.logger.info(
      { path: '/api/quiz-attempts/[attemptId]/complete', attemptId, abandoned: input.abandoned },
      'Handling quiz completion request'
    );

    const result = await completeAttempt(
      context.learner.id,
      attemptId,
      input.abandoned ?? false,
      context.logger
    );

    return jsonResponse(context.requestId, result);
  } catch (error) {
    return jsonError(context.requestId, error, context.logger);
  }
}
