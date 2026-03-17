import type { NextFunction, Request, Response } from 'express';
import { sendForbidden, sendUnauthorized } from '../utils/apiResponse';

const parseAdminEmails = (): string[] => {
  const raw = [
    process.env.MENTOR_ADMIN_EMAIL,
    process.env.MENTOR_ADMIN_EMAILS,
  ]
    .filter(Boolean)
    .join(',');

  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
};

const getClaimString = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  return null;
};

export const adminAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const claims = req.auth?.claims;

  if (!claims) {
    sendUnauthorized(req, res, 'Autenticacao administrativa ausente.');
    return;
  }

  const email = getClaimString((claims as Record<string, unknown>).email)?.toLowerCase();
  const role = getClaimString((claims as Record<string, unknown>).role)?.toLowerCase();

  const appMetadata = (claims as Record<string, unknown>).app_metadata as Record<string, unknown> | undefined;
  const userMetadata = (claims as Record<string, unknown>).user_metadata as Record<string, unknown> | undefined;

  const appRole = getClaimString(appMetadata?.role)?.toLowerCase();
  const userRole = getClaimString(userMetadata?.role)?.toLowerCase();

  const allowedEmails = parseAdminEmails();
  const isEmailAllowed = Boolean(email && allowedEmails.includes(email));
  const isAdminRole = role === 'admin' || appRole === 'admin' || userRole === 'admin';

  if (!isAdminRole && !isEmailAllowed) {
    sendForbidden(req, res, 'Acesso restrito ao admin.');
    return;
  }

  next();
};
