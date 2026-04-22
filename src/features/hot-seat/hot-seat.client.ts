import type {
  ApiEnvelope,
  CreateHotSeatSessionRequest,
  HotSeatSessionDto,
  JoinHotSeatSessionRequest,
  SubmitHotSeatResponseRequest
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

export async function createHotSeatSessionRequest(input: CreateHotSeatSessionRequest) {
  const response = await fetch('/api/hot-seat/sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(input)
  });

  return parseApiResponse<HotSeatSessionDto>(response);
}

export async function joinHotSeatSessionRequest(input: JoinHotSeatSessionRequest) {
  const response = await fetch('/api/hot-seat/sessions/join', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(input)
  });

  return parseApiResponse<HotSeatSessionDto>(response);
}

export async function fetchHotSeatSessionRequest(code: string) {
  const response = await fetch(`/api/hot-seat/sessions/${code}`, {
    method: 'GET',
    cache: 'no-store'
  });

  return parseApiResponse<HotSeatSessionDto>(response);
}

export async function startHotSeatSessionRequest(code: string) {
  const response = await fetch(`/api/hot-seat/sessions/${code}/start`, {
    method: 'POST'
  });

  return parseApiResponse<HotSeatSessionDto>(response);
}

export async function advanceHotSeatSessionRequest(code: string) {
  const response = await fetch(`/api/hot-seat/sessions/${code}/advance`, {
    method: 'POST'
  });

  return parseApiResponse<HotSeatSessionDto>(response);
}

export async function submitHotSeatResponseRequest(
  code: string,
  input: SubmitHotSeatResponseRequest
) {
  const response = await fetch(`/api/hot-seat/sessions/${code}/responses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(input)
  });

  return parseApiResponse<HotSeatSessionDto>(response);
}
