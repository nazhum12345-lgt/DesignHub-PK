import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { SESSION_SECRET } from './config';
import { DatabaseSchema } from './db';

const revokedAuthTokens = new Set<string>();

export function invalidateAuthToken(token?: string) {
  if (token && typeof token === 'string') {
    revokedAuthTokens.add(token.trim());
  }
}

export function hashPassword(password: string): string {
  return crypto.createHmac('sha256', SESSION_SECRET).update(password).digest('hex');
}

export function createAuthToken(payload: { role: 'admin' | 'customer'; id: string; email?: string }): string {
  const data = Buffer.from(
    JSON.stringify({ ...payload, exp: Date.now() + 1000 * 60 * 60 * 24 * 7 })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

export function verifyAuthToken(token?: string): { role: 'admin' | 'customer'; id: string; email?: string } | null {
  if (!token || revokedAuthTokens.has(token.trim())) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
  if (sig !== expectedSig) return null;
  try {
    const parsed = JSON.parse(Buffer.from(data, 'base64url').toString('utf-8'));
    if (parsed.exp && Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

export interface SecurityVerificationPayload {
  purpose: 'customer_reset' | 'admin_reset' | 'admin_email_change';
  targetEmail: string;
  newEmail?: string;
  nonce: string;
  exp: number;
}

export function createVerificationToken(
  payload: Omit<SecurityVerificationPayload, 'nonce' | 'exp'>,
  ttlMs = 1000 * 60 * 30
): string {
  const full: SecurityVerificationPayload = {
    ...payload,
    nonce: crypto.randomBytes(16).toString('hex'),
    exp: Date.now() + ttlMs,
  };
  const jsonStr = JSON.stringify(full);
  const data = Buffer.from(jsonStr).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

export function verifyVerificationToken(token: string): SecurityVerificationPayload | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
  if (sig !== expectedSig) return null;
  try {
    const payload: SecurityVerificationPayload = JSON.parse(
      Buffer.from(data, 'base64url').toString('utf-8')
    );
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  const decoded = verifyAuthToken(token);

  if (!decoded || decoded.role !== 'admin') {
    res.status(401).json({ error: 'Unauthorized: Admin authentication required.' });
    return;
  }
  (req as any).adminUser = decoded;
  next();
}

export function requireCustomer(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  const decoded = verifyAuthToken(token);

  if (!decoded || decoded.role !== 'customer') {
    res.status(401).json({ error: 'Unauthorized: Customer authentication required.' });
    return;
  }
  (req as any).customerUser = decoded;
  next();
}
