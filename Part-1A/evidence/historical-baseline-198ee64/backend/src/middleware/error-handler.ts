import type { ErrorRequestHandler } from 'express';
import mongoose from 'mongoose';
import { logger } from '../observability/logger';

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  if (error instanceof HttpError) {
    res.status(error.status).json({ code: error.code, message: error.message });
    return;
  }
  if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError) {
    res.status(400).json({ code: 'VALIDATION_ERROR', message: 'The submitted data is invalid.' });
    return;
  }
  if (isDuplicateKeyError(error)) {
    res.status(409).json({ code: 'DUPLICATE_VALUE', message: 'A record with that unique value already exists.' });
    return;
  }
  logger.error({ event: 'request_error', message: errorMessage(error) });
  res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An unexpected server error occurred.' });
};

function isDuplicateKeyError(error: unknown): error is { code: number } {
  return typeof error === 'object' && error !== null && 'code' in error &&
    (error as { code?: unknown }).code === 11000;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}
