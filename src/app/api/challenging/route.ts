import { jsonError, jsonResponse, parseRequestBody } from '@/lib/http';
import { getRouteRequestContext } from '@/lib/request-context';
import { markChallengeSchema } from '@/lib/validation';
import {
  addChallenge,
  listChallenges
} from '@/server/services/challenging.service';

export async function GET(request: Request) {
  const context = await getRouteRequestContext(request);

  try {
    context.logger.info({ path: '/api/challenging' }, 'Handling challenging GET request');
    const items = await listChallenges(context.learner.id, context.logger);
    return jsonResponse(context.requestId, items);
  } catch (error) {
    return jsonError(context.requestId, error, context.logger);
  }
}

export async function POST(request: Request) {
  const context = await getRouteRequestContext(request);

  try {
    const input = await parseRequestBody(request, markChallengeSchema);
    context.logger.info(
      { path: '/api/challenging', questionNumber: input.questionNumber, source: input.source },
      'Handling challenging POST request'
    );

    const items = await addChallenge(
      context.learner.id,
      input.questionNumber,
      input.source ?? 'MANUAL',
      context.logger
    );

    return jsonResponse(context.requestId, items);
  } catch (error) {
    return jsonError(context.requestId, error, context.logger);
  }
}
