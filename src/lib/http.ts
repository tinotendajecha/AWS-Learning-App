import { NextResponse } from 'next/server';

import { ZodError, type ZodType } from 'zod';

import type { AppLogger } from '@/lib/logger';

export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function jsonResponse<T>(
  requestId: string,
  data: T,
  init?: ResponseInit
) {
  const headers = new Headers(init?.headers);
  headers.set('x-request-id', requestId);

  return NextResponse.json(
    { data },
    {
      ...init,
      headers
    }
  );
}

export function jsonError(
  requestId: string,
  error: unknown,
  log: AppLogger
) {
  if (error instanceof AppError) {
    log.warn(
      {
        requestId,
        code: error.code,
        details: error.details
      },
      error.message
    );

    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
          requestId
        }
      },
      {
        status: error.status,
        headers: {
          'x-request-id': requestId
        }
      }
    );
  }

  if (error instanceof ZodError) {
    log.warn(
      {
        requestId,
        issues: error.flatten()
      },
      'Validation error'
    );

    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: error.flatten(),
          requestId
        }
      },
      {
        status: 400,
        headers: {
          'x-request-id': requestId
        }
      }
    );
  }

  log.error({ requestId, error }, 'Unhandled request error');

  return NextResponse.json(
    {
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Something went wrong',
        requestId
      }
    },
    {
      status: 500,
      headers: {
        'x-request-id': requestId
      }
    }
  );
}

export async function parseRequestBody<T>(
  request: Request,
  schema: ZodType<T>
): Promise<T> {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch (error) {
    throw new AppError(400, 'INVALID_JSON', 'Request body must be valid JSON', {
      cause: error instanceof Error ? error.message : 'Unknown JSON parse error'
    });
  }

  return schema.parse(payload);
}
