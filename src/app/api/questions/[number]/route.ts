import { AppError, jsonError, jsonResponse } from '@/lib/http';
import { getRouteRequestContext } from '@/lib/request-context';
import { getQuestionByNumber } from '@/server/services/question.service';

type QuestionRouteProps = {
  params: Promise<{
    number: string;
  }>;
};

export async function GET(request: Request, { params }: QuestionRouteProps) {
  const context = await getRouteRequestContext(request);

  try {
    const { number } = await params;
    const questionNumber = Number(number);

    if (!Number.isInteger(questionNumber)) {
      throw new AppError(400, 'INVALID_QUESTION_NUMBER', 'Question number must be numeric.');
    }

    context.logger.info(
      { path: '/api/questions/[number]', questionNumber },
      'Handling question detail request'
    );

    const item = await getQuestionByNumber(
      context.learner.id,
      questionNumber,
      context.logger
    );

    return jsonResponse(context.requestId, item);
  } catch (error) {
    return jsonError(context.requestId, error, context.logger);
  }
}
