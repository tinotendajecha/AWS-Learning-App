import type {
  ApiEnvelope,
  ChallengeItemDto,
  MarkChallengeRequest
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

export async function fetchChallenges() {
  const response = await fetch('/api/challenging', {
    cache: 'no-store'
  });

  return parseApiResponse<ChallengeItemDto[]>(response);
}

export async function markChallenge(input: MarkChallengeRequest) {
  const response = await fetch('/api/challenging', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(input)
  });

  return parseApiResponse<ChallengeItemDto[]>(response);
}

export async function deleteChallenge(questionNumber: number) {
  const response = await fetch(`/api/challenging/${questionNumber}`, {
    method: 'DELETE'
  });

  return parseApiResponse<ChallengeItemDto[]>(response);
}
