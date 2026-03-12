import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Security: Require JWT_SECRET in production
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is required in production mode.');
  console.error('Generate a secure secret: openssl rand -base64 32');
  console.error('Set it in your .env file or docker-compose.yml');
  process.exit(1);
}

const JWT_SECRET: string = process.env.JWT_SECRET || (() => {
  const secret = require('crypto').randomBytes(32).toString('hex');
  console.warn('[WARN] JWT_SECRET not set — using random secret. Tokens will invalidate on restart. Set JWT_SECRET in your environment.');
  return secret;
})();

export interface AuthRequest extends Request {
  userId?: number;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number };
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function generateToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
}
