import type { NextFunction, Request, Response } from 'express';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

const getBearerToken = (req: Request): string | null => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return null;
  }
  const token = header.slice('Bearer '.length).trim();
  return token || null;
};

const getIssuer = (): string | null => {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  if (!supabaseUrl) return null;
  return `${supabaseUrl.replace(/\/$/, '')}/auth/v1`;
};

const getJWKS = (() => {
  let cached: ReturnType<typeof createRemoteJWKSet> | null = null;
  return () => {
    if (cached) return cached;
    const issuer = getIssuer();
    if (!issuer) {
      throw new Error('SUPABASE_URL missing');
    }
    cached = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
    return cached;
  };
})();

const verifyJwt = async (token: string): Promise<JWTPayload> => {
  const issuer = getIssuer();
  if (!issuer) {
    throw new Error('SUPABASE_URL missing');
  }

  const hsSecret = process.env.SUPABASE_JWT_SECRET?.trim();
  if (hsSecret) {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(hsSecret), {
      issuer,
      audience: 'authenticated',
      algorithms: ['HS256'],
    });
    return payload;
  }

  const jwks = getJWKS();
  const { payload } = await jwtVerify(token, jwks, {
    issuer,
    audience: 'authenticated',
    algorithms: ['RS256'],
  });
  return payload;
};

const isDev = process.env.NODE_ENV === 'development';
const guestAllowed = isDev && process.env.MENTOR_ALLOW_GUEST === 'true';

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = getBearerToken(req);

    if (!token) {
      if (guestAllowed) {
        req.auth = {
          userId: 'guest-local',
          token: 'guest-local',
          claims: { role: 'guest' },
        };
        next();
        return;
      }

      res.status(401).json({ error: 'Unauthorized: token ausente.' });
      return;
    }

    const payload = await verifyJwt(token);
    const userId = payload.sub;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized: token invalido.' });
      return;
    }

    req.auth = {
      userId,
      token,
      claims: payload,
    };

    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized: token invalido ou expirado.' });
  }
};
