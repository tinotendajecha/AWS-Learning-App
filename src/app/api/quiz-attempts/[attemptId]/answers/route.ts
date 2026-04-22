import { AppError, jsonError, jsonResponse, parseRequestBody } from '@/lib/http';
import { getRouteRequestContext } from '@/lib/request-context';
import { submitQuizAnswerSchema } from '@/lib/validation';
import { submitAnswer } from '@/server/services/quiz.service';

type AnswerRouteProps = {
  params: Promise<{
    attemptId: string;
  }>;
};

export async function POST(request: Request, { params }: AnswerRouteProps) {
  const context = await getRouteRequestContext(request);

  try {
    const { attemptId } = await params;
    const input = await parseRequestBody(request, submitQuizAnswerSchema);

    if (!attemptId) {
      throw new AppError(400, 'INVALID_ATTEMPT_ID', 'Attempt ID is required.');
    }

    context.logger.info(
      {
        path: '/api/quiz-attempts/[attemptId]/answers',
        attemptId,
        questionNumber: input.questionNumber
      },
      'Handling quiz answer submission'
    );

    const result = await submitAnswer(
      context.learner.id,
      attemptId,
      input.questionNumber,
      input.selectedOptionLetters,
      context.logger
    );

    return jsonResponse(context.requestId, result);
  } catch (error) {
    return jsonError(context.requestId, error, context.logger);
  }
}
