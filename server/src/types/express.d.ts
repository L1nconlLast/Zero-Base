import type { JwtPayload } from 'jose';

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        token: string;
        claims: JwtPayload;
      };
    }
  }
}

export {};
