import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { LEARNER_ID_HEADER, REQUEST_ID_HEADER } from '@/lib/request-headers';

const LEARNER_COOKIE = 'learner_id';

export function middleware(request: NextRequest) {
  const requestId = request.headers.get(REQUEST_ID_HEADER) ?? crypto.randomUUID();
  const learnerId = request.cookies.get(LEARNER_COOKIE)?.value ?? crypto.randomUUID();

  const headers = new Headers(request.headers);
  headers.set(REQUEST_ID_HEADER, requestId);
  headers.set(LEARNER_ID_HEADER, learnerId);

  const response = NextResponse.next({
    request: {
      headers
    }
  });

  response.headers.set(REQUEST_ID_HEADER, requestId);

  if (!request.cookies.get(LEARNER_COOKIE)) {
    response.cookies.set(LEARNER_COOKIE, learnerId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 365
    });
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
