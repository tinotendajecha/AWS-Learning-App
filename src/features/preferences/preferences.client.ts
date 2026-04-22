import type { ApiEnvelope, PreferencesDto } from '@/contracts/api';

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

export async function fetchPreferences() {
  const response = await fetch('/api/preferences', {
    cache: 'no-store'
  });

  return parseApiResponse<PreferencesDto>(response);
}

export async function patchPreferences(input: PreferencesDto) {
  const response = await fetch('/api/preferences', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(input)
  });

  return parseApiResponse<PreferencesDto>(response);
}
