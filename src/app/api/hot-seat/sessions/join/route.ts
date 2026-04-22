import { jsonError, jsonResponse, parseRequestBody } from '@/lib/http';
import { getRouteRequestContext } from '@/lib/request-context';
import { joinHotSeatSessionSchema } from '@/lib/validation';
import { joinHotSeatSession } from '@/server/services/hot-seat.service';

export async function POST(request: Request) {
  const context = await getRouteRequestContext(request);

  try {
    const input = await parseRequestBody(request, joinHotSeatSessionSchema);
    context.logger.info(
      {
        path: '/api/hot-seat/sessions/join',
        code: input.code
      },
      'Handling Hot Seat join request'
    );

    const session = await joinHotSeatSession(context.learner.id, input, context.logger);
    return jsonResponse(context.requestId, session);
  } catch (error) {
    return jsonError(context.requestId, error, context.logger);
  }
}
