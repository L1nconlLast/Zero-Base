import type { NextFunction, Request, Response } from 'express';

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
    res.status(401).json({ error: 'Unauthorized.' });
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
    res.status(403).json({ error: 'Forbidden: acesso restrito ao admin.' });
    return;
  }

  next();
};
