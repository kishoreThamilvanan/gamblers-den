import crypto from 'crypto';

const SESSION_MAX_AGE_SEC = 3600 * 4; // 4 hours

const SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET ||
  crypto.createHash('sha256').update(process.env.ADMIN_PASSCODE || 'gd_internal_session_secret').digest('hex');

export function createAdminSessionToken(email: string): string {
  const timestamp = Date.now().toString();
  const payload = `${email}:${timestamp}`;
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  return `${Buffer.from(payload).toString('base64url')}.${signature}`;
}

export function verifyAdminSessionToken(token: string): boolean {
  try {
    const [b64Payload, signature] = token.split('.');
    if (!b64Payload || !signature) return false;
    const payload = Buffer.from(b64Payload, 'base64url').toString('utf8');
    const parts = payload.split(':');
    if (parts.length < 2) return false;
    const timestampStr = parts[parts.length - 1];
    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp) || Date.now() - timestamp > SESSION_MAX_AGE_SEC * 1000) {
      return false; // Expired
    }
    const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}
