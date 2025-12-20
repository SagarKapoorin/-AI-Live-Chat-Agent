import { Request, Response, NextFunction } from 'express';
import { HttpError } from '../utils/httpError.js';

type KnownError = Error | { message?: string } | null | undefined;

export const errorHandler = (
  err: KnownError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const nextRef = _next;
  void nextRef;
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.publicMessage });
    return;
  }
  if (err instanceof Error) {
    res.status(500).json({ error: 'Internal server error', details: err.message });
    return;
  }
  res.status(500).json({ error: 'Internal server error' });
};
