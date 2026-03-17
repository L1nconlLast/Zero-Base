import type { Request, Response } from 'express';
import { ZodError } from 'zod';

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
  requestId: string;
}

export const sendError = (
  req: Request,
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown,
): void => {
  res.status(statusCode).json({
    error: {
      code,
      message,
      details,
      requestId: req.id,
    } satisfies ApiErrorPayload,
  });
};

export const sendValidationError = (req: Request, res: Response, error: ZodError, message = 'Payload invalido.'): void => {
  sendError(req, res, 400, 'VALIDATION_ERROR', message, error.flatten().fieldErrors);
};

export const sendUnauthorized = (req: Request, res: Response, message = 'Nao autenticado.'): void => {
  sendError(req, res, 401, 'UNAUTHORIZED', message);
};

export const sendForbidden = (req: Request, res: Response, message = 'Acesso negado.'): void => {
  sendError(req, res, 403, 'FORBIDDEN', message);
};

export const sendTooManyRequests = (req: Request, res: Response, message = 'Muitas requisicoes em pouco tempo.'): void => {
  sendError(req, res, 429, 'RATE_LIMITED', message);
};

export const sendInternalError = (req: Request, res: Response, message = 'Erro interno do servidor.', details?: unknown): void => {
  sendError(req, res, 500, 'INTERNAL_ERROR', message, details);
};