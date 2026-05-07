import { createHmac, createHash, timingSafeEqual } from 'crypto';

export function verifySignature(payload: string, signature: string): boolean {
  if (!process.env.WEBHOOK_SECRET) {
    throw new Error('WEBHOOK_SECRET not set');
  }

  const expected = createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  const expectedBuffer = Buffer.from(`sha256=${expected}`);
  const signatureBuffer = Buffer.from(signature || '');

  if (expectedBuffer.length !== signatureBuffer.length) return false;

  return timingSafeEqual(expectedBuffer, signatureBuffer);
}

export function hashPhone(phone: string): string {
  return createHash('sha256').update(phone).digest('hex').slice(0, 32);
}

const rateLimitMap = new Map<string, number[]>();

export function isRateLimited(userHash: string): boolean {
  const now = Date.now();
  const windowMs = 60000;

  const times = (rateLimitMap.get(userHash) ?? []).filter(t => now - t < windowMs);

  if (times.length >= 10) return true;

  times.push(now);
  rateLimitMap.set(userHash, times);

  if (Math.random() < 0.01) {
    for (const [key, arr] of rateLimitMap.entries()) {
      if (arr.length === 0 || now - arr[arr.length - 1] > windowMs) {
        rateLimitMap.delete(key);
      }
    }
  }

  return false;
}