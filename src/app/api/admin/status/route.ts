import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('gd_admin_session');
    return NextResponse.json({ authenticated: session?.value === 'authenticated' });
  } catch {
    return NextResponse.json({ authenticated: false });
  }
}
