import { RequestHandler, ParamsDictionary } from 'express-serve-static-core';
import { ParsedQs } from 'qs';
import { Request, Response, NextFunction } from 'express';

export const asyncHandler = <
  P extends ParamsDictionary = ParamsDictionary,
  ResBody = void,
  ReqBody extends Record<string, unknown> = Record<string, never>,
  ReqQuery extends ParsedQs = ParsedQs,
  Locals extends Record<string, unknown> = Record<string, never>,
>(
  handler: (
    req: Request<P, ResBody, ReqBody, ReqQuery, Locals>,
    res: Response<ResBody, Locals>,
    next: NextFunction,
  ) => Promise<void> | void,
): RequestHandler<P, ResBody, ReqBody, ReqQuery, Locals> => {
  return (
    req: Request<P, ResBody, ReqBody, ReqQuery, Locals>,
    res: Response<ResBody, Locals>,
    next: NextFunction,
  ): void => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
};
