import { getRouteRequestContext } from '@/lib/request-context';
import { jsonError, jsonResponse } from '@/lib/http';
import { listQuestions } from '@/server/services/question.service';

export async function GET(request: Request) {
  const context = await getRouteRequestContext(request);

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') ?? '';
    const scope = searchParams.get('scope') === 'challenging' ? 'challenging' : 'all';
    const questionNumberValue = searchParams.get('questionNumber');
    const questionNumber = questionNumberValue ? Number(questionNumberValue) : undefined;

    context.logger.info({ path: '/api/questions', query, scope }, 'Handling questions request');

    const items = await listQuestions(
      context.learner.id,
      {
        query,
        scope,
        questionNumber: Number.isFinite(questionNumber) ? questionNumber : undefined
      },
      context.logger
    );

    return jsonResponse(context.requestId, { items });
  } catch (error) {
    return jsonError(context.requestId, error, context.logger);
  }
}
