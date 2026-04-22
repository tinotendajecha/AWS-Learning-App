import { jsonError } from '@/lib/http';
import { getRouteRequestContext } from '@/lib/request-context';
import { exportChallengesCsv } from '@/server/services/challenging.service';

export async function GET(request: Request) {
  const context = await getRouteRequestContext(request);

  try {
    context.logger.info(
      { path: '/api/challenging/export' },
      'Handling challenge export request'
    );

    const csv = await exportChallengesCsv(context.learner.id, context.logger);
    const datePart = new Date().toISOString().slice(0, 10);

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="aws-challenging-concepts-${datePart}.csv"`,
        'x-request-id': context.requestId
      }
    });
  } catch (error) {
    return jsonError(context.requestId, error, context.logger);
  }
}
