import { jsonError, jsonResponse, parseRequestBody } from '@/lib/http';
import { getRouteRequestContext } from '@/lib/request-context';
import { createHotSeatSessionSchema } from '@/lib/validation';
import { createHotSeatSession } from '@/server/services/hot-seat.service';

export async function POST(request: Request) {
  const context = await getRouteRequestContext(request);

  try {
    const input = await parseRequestBody(request, createHotSeatSessionSchema);
    context.logger.info(
      {
        path: '/api/hot-seat/sessions',
        source: input.source,
        count: input.count,
        order: input.order
      },
      'Handling Hot Seat session creation'
    );

    const session = await createHotSeatSession(
      context.learner.id,
      {
        title: input.title,
        source: input.source,
        count: input.count,
        order: input.order,
        query: input.query,
        timerSeconds: input.timerSeconds,
        selectionMode: input.selectionMode ?? 'FAIR',
        basePoints: input.basePoints ?? 10,
        speedBonusEnabled: input.speedBonusEnabled ?? false,
        maxSpeedBonus: input.maxSpeedBonus ?? 5
      },
      context.logger
    );
    return jsonResponse(context.requestId, session, { status: 201 });
  } catch (error) {
    return jsonError(context.requestId, error, context.logger);
  }
}
