import type { JwtPayload } from 'jose';

declare global {
  namespace Express {
    interface Request {
      id: string;
      auth?: {
        userId: string;
        token: string;
        claims: JwtPayload;
      };
    }
  }
}

export {};
