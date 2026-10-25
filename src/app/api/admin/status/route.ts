import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSessionToken } from '@/lib/auth/adminSession';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('gd_admin_session');
    const isValid = session?.value ? verifyAdminSessionToken(session.value) : false;
    return NextResponse.json({ authenticated: isValid });
  } catch {
    return NextResponse.json({ authenticated: false });
  }
}
