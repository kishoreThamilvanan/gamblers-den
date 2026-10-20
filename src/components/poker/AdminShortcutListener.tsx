'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getStoredUserProfile, isAdminEmailWhitelisted } from '@/lib/auth/authService';

/**
 * Global keyboard shortcut listener:
 * Pressing Cmd + Shift + A (macOS) or Ctrl + Shift + A (Windows/Linux)
 * toggles navigation to the Pit Boss Admin Console (/admin), strictly restricted
 * to users signed in with a verified email in NEXT_PUBLIC_ADMIN_EMAILS.
 */
export function AdminShortcutListener() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        if (!isAdminEmailWhitelisted(getStoredUserProfile())) {
          return;
        }
        e.preventDefault();
        if (pathname === '/admin') {
          router.push('/');
        } else {
          router.push('/admin');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pathname, router]);

  return null;
}
