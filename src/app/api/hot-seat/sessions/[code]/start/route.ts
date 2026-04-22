import { AppError, jsonError, jsonResponse } from '@/lib/http';
import { getRouteRequestContext } from '@/lib/request-context';
import { startHotSeatSession } from '@/server/services/hot-seat.service';

type HotSeatStartRouteProps = {
  params: Promise<{
    code: string;
  }>;
};

export async function POST(request: Request, { params }: HotSeatStartRouteProps) {
  const context = await getRouteRequestContext(request);

  try {
    const { code } = await params;

    if (!code) {
      throw new AppError(400, 'HOT_SEAT_INVALID_CODE', 'A session code is required.');
    }

    context.logger.info(
      {
        path: '/api/hot-seat/sessions/[code]/start',
        code
      },
      'Handling Hot Seat session start request'
    );

    const session = await startHotSeatSession(context.learner.id, code, context.logger);
    return jsonResponse(context.requestId, session);
  } catch (error) {
    return jsonError(context.requestId, error, context.logger);
  }
}
