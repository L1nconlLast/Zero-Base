import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';

const REQUEST_ID_HEADER = 'x-request-id';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const incoming = req.headers[REQUEST_ID_HEADER];
  const provided = Array.isArray(incoming) ? incoming[0] : incoming;
  const normalized = (provided && String(provided).trim()) || '';

  const requestId = UUID_REGEX.test(normalized) ? normalized : randomUUID();
  req.id = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);

  next();
};
