import type {
  ApiEnvelope,
  CompleteQuizAttemptRequest,
  CreateQuizAttemptRequest,
  QuizAnswerResultDto,
  QuizAttemptResultDto,
  QuizAttemptSessionDto,
  SubmitQuizAnswerRequest
} from '@/contracts/api';

async function parseApiResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as
    | ApiEnvelope<T>
    | { error?: { message?: string } };

  if (!response.ok) {
    const errorPayload = payload as { error?: { message?: string } };
    throw new Error(errorPayload.error?.message ?? 'Request failed');
  }

  return (payload as ApiEnvelope<T>).data;
}

export async function createQuizAttemptRequest(input: CreateQuizAttemptRequest) {
  const response = await fetch('/api/quiz-attempts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(input)
  });

  return parseApiResponse<QuizAttemptSessionDto>(response);
}

export async function submitQuizAnswerRequest(
  attemptId: string,
  input: SubmitQuizAnswerRequest
) {
  const response = await fetch(`/api/quiz-attempts/${attemptId}/answers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(input)
  });

  return parseApiResponse<QuizAnswerResultDto>(response);
}

export async function completeQuizAttemptRequest(
  attemptId: string,
  input: CompleteQuizAttemptRequest
) {
  const response = await fetch(`/api/quiz-attempts/${attemptId}/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(input)
  });

  return parseApiResponse<QuizAttemptResultDto>(response);
}
