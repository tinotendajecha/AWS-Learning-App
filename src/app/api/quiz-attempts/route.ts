import { jsonError, jsonResponse, parseRequestBody } from '@/lib/http';
import { getRouteRequestContext } from '@/lib/request-context';
import { createQuizAttemptSchema } from '@/lib/validation';
import { createAttempt } from '@/server/services/quiz.service';

export async function POST(request: Request) {
  const context = await getRouteRequestContext(request);

  try {
    const input = await parseRequestBody(request, createQuizAttemptSchema);
    context.logger.info(
      {
        path: '/api/quiz-attempts',
        source: input.source,
        count: input.count,
        order: input.order
      },
      'Handling quiz attempt creation'
    );

    const attempt = await createAttempt(context.learner.id, input, context.logger);
    return jsonResponse(context.requestId, attempt, { status: 201 });
  } catch (error) {
    return jsonError(context.requestId, error, context.logger);
  }
}
