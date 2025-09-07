import crypto from 'crypto';

export function verifyPaycrestSignature(rawBody: string | Buffer, signatureHeader: string | undefined, secret: string | undefined): boolean {
  if (!signatureHeader || !secret) return false;
  const hmac = crypto.createHmac('sha256', Buffer.from(secret));
  hmac.update(typeof rawBody === 'string' ? Buffer.from(rawBody) : rawBody);
  const digest = hmac.digest('hex');
  return signatureHeader === digest;
}


