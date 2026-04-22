import { AppError, jsonError, jsonResponse } from '@/lib/http';
import { getRouteRequestContext } from '@/lib/request-context';
import { advanceHotSeatSession } from '@/server/services/hot-seat.service';

type HotSeatAdvanceRouteProps = {
  params: Promise<{
    code: string;
  }>;
};

export async function POST(request: Request, { params }: HotSeatAdvanceRouteProps) {
  const context = await getRouteRequestContext(request);

  try {
    const { code } = await params;

    if (!code) {
      throw new AppError(400, 'HOT_SEAT_INVALID_CODE', 'A session code is required.');
    }

    context.logger.info(
      {
        path: '/api/hot-seat/sessions/[code]/advance',
        code
      },
      'Handling Hot Seat session advance request'
    );

    const session = await advanceHotSeatSession(context.learner.id, code, context.logger);
    return jsonResponse(context.requestId, session);
  } catch (error) {
    return jsonError(context.requestId, error, context.logger);
  }
}
