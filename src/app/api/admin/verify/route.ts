import { NextResponse } from 'next/server';
import crypto from 'crypto';

// In-memory rate limiting tracker (per IP / identifier)
const failedAttemptsMap = new Map<string, { count: number; lockedUntil: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 60 * 1000; // 60 seconds

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return '127.0.0.1';
}

function isTimingSafeMatch(expected: string, provided: string): boolean {
  const expBuf = crypto.createHash('sha256').update(expected.trim()).digest();
  const provBuf = crypto.createHash('sha256').update(provided.trim()).digest();
  return crypto.timingSafeEqual(expBuf, provBuf);
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const now = Date.now();
  const rateLimit = failedAttemptsMap.get(ip);

  if (rateLimit && rateLimit.lockedUntil > now) {
    const remainingSeconds = Math.ceil((rateLimit.lockedUntil - now) / 1000);
    return NextResponse.json(
      { error: `Too many failed attempts. Locked out for ${remainingSeconds} more seconds.` },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { passcode, email } = body || {};

    const configuredEmails = (process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    const defaultEmails = ['admin@gamblersden.com', 'admin@feltsense.com', 'kishore@gamblersden.com', 'kishore@feltsense.com'];
    const validEmails = Array.from(new Set([...defaultEmails, ...configuredEmails]));

    if (!email || !validEmails.includes(String(email).trim().toLowerCase())) {
      return NextResponse.json(
        { error: 'Email is not recognized as an authorized Pit Boss Owner.' },
        { status: 403 }
      );
    }

    const expectedPasscode = (
      process.env.ADMIN_PASSCODE ||
      process.env.NEXT_PUBLIC_ADMIN_PASSCODE ||
      'PITBOSS-777'
    ).trim();

    const isValid = isTimingSafeMatch(expectedPasscode, String(passcode || ''));

    if (!isValid) {
      const current = failedAttemptsMap.get(ip) || { count: 0, lockedUntil: 0 };
      const nextCount = current.count + 1;
      if (nextCount >= MAX_ATTEMPTS) {
        failedAttemptsMap.set(ip, { count: 0, lockedUntil: now + LOCKOUT_MS });
        return NextResponse.json(
          { error: `Invalid passcode. Maximum attempts exceeded. Locked out for 60 seconds.` },
          { status: 429 }
        );
      } else {
        failedAttemptsMap.set(ip, { count: nextCount, lockedUntil: 0 });
        const remaining = MAX_ATTEMPTS - nextCount;
        return NextResponse.json(
          { error: `Invalid passcode. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` },
          { status: 401 }
        );
      }
    }

    // Success: clear rate limit tracker
    failedAttemptsMap.delete(ip);

    const response = NextResponse.json({ success: true });
    // Issue secure HTTP-only cookie
    response.cookies.set('gd_admin_session', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600 * 4, // 4 hours
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Malformed request payload.' }, { status: 400 });
  }
}
