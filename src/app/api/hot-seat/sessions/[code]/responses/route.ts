import { AppError, jsonError, jsonResponse, parseRequestBody } from '@/lib/http';
import { getRouteRequestContext } from '@/lib/request-context';
import { submitHotSeatResponseSchema } from '@/lib/validation';
import { submitHotSeatResponse } from '@/server/services/hot-seat.service';

type HotSeatResponseRouteProps = {
  params: Promise<{
    code: string;
  }>;
};

export async function POST(request: Request, { params }: HotSeatResponseRouteProps) {
  const context = await getRouteRequestContext(request);

  try {
    const { code } = await params;
    const input = await parseRequestBody(request, submitHotSeatResponseSchema);

    if (!code) {
      throw new AppError(400, 'HOT_SEAT_INVALID_CODE', 'A session code is required.');
    }

    context.logger.info(
      {
        path: '/api/hot-seat/sessions/[code]/responses',
        code
      },
      'Handling Hot Seat response submission'
    );

    const session = await submitHotSeatResponse(
      context.learner.id,
      code,
      input,
      context.logger
    );
    return jsonResponse(context.requestId, session);
  } catch (error) {
    return jsonError(context.requestId, error, context.logger);
  }
}
