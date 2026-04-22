import { jsonError, jsonResponse, parseRequestBody } from '@/lib/http';
import { getRouteRequestContext } from '@/lib/request-context';
import { preferencesSchema } from '@/lib/validation';
import {
  getPreferences,
  updatePreferences
} from '@/server/services/preferences.service';

export async function GET(request: Request) {
  const context = await getRouteRequestContext(request);

  try {
    context.logger.info({ path: '/api/preferences' }, 'Handling preferences GET request');
    const preferences = await getPreferences(context.learner.id, context.logger);
    return jsonResponse(context.requestId, preferences);
  } catch (error) {
    return jsonError(context.requestId, error, context.logger);
  }
}

export async function PATCH(request: Request) {
  const context = await getRouteRequestContext(request);

  try {
    const input = await parseRequestBody(request, preferencesSchema);
    context.logger.info(
      { path: '/api/preferences', preferences: input },
      'Handling preferences PATCH request'
    );

    const preferences = await updatePreferences(
      context.learner.id,
      input,
      context.logger
    );

    return jsonResponse(context.requestId, preferences);
  } catch (error) {
    return jsonError(context.requestId, error, context.logger);
  }
}
