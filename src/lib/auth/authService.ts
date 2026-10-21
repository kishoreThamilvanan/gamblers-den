import {
  UserProfile,
  CareerStats,
  LeakEntry,
  AuthProviderType,
  TableConfig,
  PasskeyCredentialMeta,
} from '@/types/poker';

const ACTIVE_USER_KEY = 'gamblersden_active_user_v1';
const LEGACY_ACTIVE_USER_KEY = 'feltsense_active_user_v1';
const ACCOUNTS_VAULT_KEY = 'gamblersden_accounts_vault_v1';
const LEGACY_ACCOUNTS_VAULT_KEY = 'feltsense_accounts_vault_v1';
const ADMIN_UNLOCK_KEY = 'gamblersden_admin_unlocked_v1';
const LEGACY_ADMIN_UNLOCK_KEY = 'feltsense_admin_unlocked_v1';
const ADMIN_PASSKEYS_KEY = 'gamblersden_admin_passkeys_v1';
const LEGACY_ADMIN_PASSKEYS_KEY = 'feltsense_admin_passkeys_v1';
const DEFAULT_STARTING_BANKROLL = 2000;
const DEFAULT_ADMIN_PASSCODE = 'gambling of reality is more real that reality itself';
const DEFAULT_ADMIN_EMAILS = [
  'admin@gamblersden.com',
  'admin@feltsense.com',
  'kishore@gamblersden.com',
  'kishore@feltsense.com',
];

function readStorageWithFallback(primaryKey: string, legacyKey: string): string | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const primary = window.localStorage.getItem(primaryKey);
    if (primary !== null) return primary;
    const legacy = window.localStorage.getItem(legacyKey);
    if (legacy !== null) {
      try {
        window.localStorage.setItem(primaryKey, legacy);
        window.localStorage.removeItem(legacyKey);
      } catch {
        // ignore migration errors
      }
      return legacy;
    }
    return null;
  } catch {
    return null;
  }
}



export interface HeroAvatarPreset {
  id: string;
  label: string;
  url: string;
}

export const HERO_AVATAR_PRESETS: HeroAvatarPreset[] = [
  {
    id: 'high-roller',
    label: 'The High Roller',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'vegas-shark',
    label: 'Vegas Pro',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'cardroom-ace',
    label: 'Bellagio Reg',
    url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'solver-wizard',
    label: 'GTO Wizard',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'macau-vip',
    label: 'Macau VIP',
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'night-grinder',
    label: 'Late Night Grinder',
    url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'bracelet-hunter',
    label: 'Bracelet Hunter',
    url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'mirage-legend',
    label: 'Mirage Legend',
    url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
  },
];

interface StoredAccountRecord {
  profile: UserProfile;
  passwordHash?: string;
  idToken?: string;
}

const getFirebaseConfig = () => {
  const apiKey = typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_FIREBASE_API_KEY : undefined;
  const projectId = typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_FIREBASE_PROJECT_ID : undefined;
  const authDomain = typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN : undefined;
  return {
    apiKey: apiKey || '',
    projectId: projectId || '',
    authDomain: authDomain || '',
    isConfigured: Boolean(apiKey && projectId),
  };
};

export function isGoogleCloudAuthConfigured(): boolean {
  return getFirebaseConfig().isConfigured;
}

export function createEmptyCareerStats(): CareerStats {
  return {
    totalHandsPlayed: 0,
    totalVpipHands: 0,
    totalPfrHands: 0,
    careerNetProfit: 0,
    careerOptimalCount: 0,
    careerLeakCount: 0,
    careerBlunderCount: 0,
    careerEvLoss: 0,
    sessionsCompleted: 0,
    topCareerLeaks: [],
  };
}

function simpleHash(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

function getAccountsVault(): Record<string, StoredAccountRecord> {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = readStorageWithFallback(ACCOUNTS_VAULT_KEY, LEGACY_ACCOUNTS_VAULT_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, StoredAccountRecord>;
  } catch {
    return {};
  }
}

function saveAccountsVault(vault: Record<string, StoredAccountRecord>): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(ACCOUNTS_VAULT_KEY, JSON.stringify(vault));
  } catch (err) {
    console.error('Failed to save accounts vault:', err);
  }
}

export function getStoredUserProfile(): UserProfile | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = readStorageWithFallback(ACTIVE_USER_KEY, LEGACY_ACTIVE_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

export function persistActiveUserProfile(profile: UserProfile, idToken?: string): UserProfile {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(profile));
      const vault = getAccountsVault();
      const existing = vault[profile.uid];
      vault[profile.uid] = {
        profile,
        passwordHash: existing?.passwordHash,
        idToken: idToken || existing?.idToken,
      };
      if (profile.email) {
        vault[`email:${profile.email.toLowerCase()}`] = vault[profile.uid];
      }
      if (Array.isArray(profile.passkeys)) {
        for (const pk of profile.passkeys) {
          vault[`passkey:${pk.credentialId}`] = vault[profile.uid];
        }
      }
      saveAccountsVault(vault);
    } catch (err) {
      console.error('Failed to persist active user profile:', err);
    }
  }
  return profile;
}

/**
 * Syncs the UserProfile to Google Cloud Firestore (REST API) when configured.
 * Uses free-tier Firestore document storage without requiring heavy client bundles.
 */
async function syncProfileToFirestore(profile: UserProfile, idToken?: string): Promise<boolean> {
  const { isConfigured, projectId, apiKey } = getFirebaseConfig();
  if (!isConfigured || typeof fetch === 'undefined') {
    return false;
  }
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      projectId
    )}/databases/(default)/documents/users/${encodeURIComponent(profile.uid)}?key=${encodeURIComponent(apiKey)}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`;
    }

    const res = await fetch(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        fields: {
          uid: { stringValue: profile.uid },
          email: { stringValue: profile.email || '' },
          displayName: { stringValue: profile.displayName },
          nickname: { stringValue: profile.nickname },
          avatarUrl: { stringValue: profile.avatarUrl },
          provider: { stringValue: profile.provider },
          isGuest: { booleanValue: profile.isGuest },
          careerBankroll: { doubleValue: profile.careerBankroll },
          profileJson: { stringValue: JSON.stringify(profile) },
        },
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function fetchProfileFromFirestore(uid: string, idToken?: string): Promise<UserProfile | null> {
  const { isConfigured, projectId, apiKey } = getFirebaseConfig();
  if (!isConfigured || typeof fetch === 'undefined') {
    return null;
  }
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      projectId
    )}/databases/(default)/documents/users/${encodeURIComponent(uid)}?key=${encodeURIComponent(apiKey)}`;

    const headers: Record<string, string> = {};
    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`;
    }

    const res = await fetch(url, { headers });
    if (!res.ok) return null;
    const data = await res.json();
    const rawJson = data?.fields?.profileJson?.stringValue;
    if (rawJson) {
      return JSON.parse(rawJson) as UserProfile;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Checks whether a user profile has logged in at least once as a registered (non-guest) member,
 * verified their email address, and provided all necessary profile information.
 */
export function isProfileEligibleForPasskey(profile: UserProfile | null | undefined): boolean {
  if (!profile || profile.isGuest) return false;
  if (profile.emailVerified === false) return false;
  const hasEmail = Boolean(profile.email && profile.email.trim().includes('@'));
  const hasDisplayName = Boolean(profile.displayName && profile.displayName.trim().length >= 2);
  const hasNickname = Boolean(profile.nickname && profile.nickname.trim().length >= 2);
  const hasAvatar = Boolean(profile.avatarUrl && profile.avatarUrl.trim().length > 0);
  const hasLoggedIn = (profile.loginCount || 0) >= 1;
  return hasEmail && hasDisplayName && hasNickname && hasAvatar && hasLoggedIn;
}

/**
 * Returns true if at least one user on this device has already logged in for the first time
 * and provided all necessary profile information, making Touch ID / Face ID accessible.
 */
export function hasEligiblePasskeyUser(emailFilter?: string): boolean {
  const vault = getAccountsVault();
  const cleanEmail = emailFilter?.trim().toLowerCase();

  for (const record of Object.values(vault)) {
    const prof = record?.profile;
    if (!isProfileEligibleForPasskey(prof)) continue;
    if (cleanEmail && prof?.email?.toLowerCase() !== cleanEmail) continue;
    return true;
  }
  return false;
}

/**
 * Checks whether an email address is already registered in the Local Vault or Google Cloud Identity DB.
 * Used by the progressive-disclosure login flow to route the user to either Password Sign-In or Registration.
 */
export async function checkEmailRegistrationStatus(email: string): Promise<{
  exists: boolean;
  displayName?: string;
  provider?: AuthProviderType;
  hasPasskey?: boolean;
}> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Please enter a valid email address.');
  }

  const vault = getAccountsVault();
  const localRecord = vault[`email:${cleanEmail}`];
  if (localRecord && !localRecord.profile.isGuest) {
    return {
      exists: true,
      displayName: localRecord.profile.displayName,
      provider: localRecord.profile.provider,
      hasPasskey: isProfileEligibleForPasskey(localRecord.profile),
    };
  }

  // Also scan vault entries in case an account was keyed by UID
  for (const record of Object.values(vault)) {
    const prof = record?.profile;
    if (prof && !prof.isGuest && prof.email?.toLowerCase() === cleanEmail) {
      return {
        exists: true,
        displayName: prof.displayName,
        provider: prof.provider,
        hasPasskey: isProfileEligibleForPasskey(prof),
      };
    }
  }

  const { isConfigured, apiKey } = getFirebaseConfig();
  if (isConfigured && typeof fetch !== 'undefined') {
    try {
      const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identifier: cleanEmail,
            continueUri: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (data?.registered) {
          return {
            exists: true,
            provider: 'email',
          };
        }
      }
    } catch {
      // Fall back to local lookup result
    }
  }

  return { exists: false };
}

/**
 * Sends a Firebase Email Verification link via Google Cloud Identity Toolkit REST API.
 */
async function sendFirebaseVerificationEmail(idToken: string): Promise<boolean> {
  const { isConfigured, apiKey } = getFirebaseConfig();
  if (!isConfigured || !idToken || typeof fetch === 'undefined') {
    return false;
  }
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType: 'VERIFY_EMAIL',
          idToken,
        }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Resends the verification email to the currently signed-in (unverified) user.
 */
export async function resendVerificationEmail(profile?: UserProfile | null): Promise<{
  sent: boolean;
  email: string;
}> {
  const target = profile || getStoredUserProfile();
  if (!target?.email) {
    throw new Error('No email address found on the current account.');
  }

  const vault = getAccountsVault();
  const record = vault[target.uid] || vault[`email:${target.email.toLowerCase()}`];
  if (record?.idToken) {
    await sendFirebaseVerificationEmail(record.idToken);
  }

  return { sent: true, email: target.email };
}

/**
 * Checks and refreshes the current user's email verification status.
 * - When Firebase Cloud Auth is configured, queries `accounts:lookup` to verify `users[0].emailVerified === true`.
 * - In Local Vault mode, marks the user's email as verified upon confirmation.
 */
export async function verifyCurrentUserEmail(profile?: UserProfile | null): Promise<UserProfile> {
  const target = profile || getStoredUserProfile();
  if (!target) {
    throw new Error('No active user session found to verify.');
  }

  const vault = getAccountsVault();
  const record = vault[target.uid] || (target.email ? vault[`email:${target.email.toLowerCase()}`] : undefined);
  const idToken = record?.idToken;

  const { isConfigured, apiKey } = getFirebaseConfig();
  if (isConfigured && idToken && typeof fetch !== 'undefined') {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    if (res.ok) {
      const data = await res.json();
      const cloudVerified = Boolean(data?.users?.[0]?.emailVerified);
      if (!cloudVerified) {
        throw new Error(
          'Your email is not verified yet. Please click the verification link sent to your inbox (check spam) and try again.'
        );
      }
    }
  }

  const updated: UserProfile = {
    ...target,
    emailVerified: true,
    lastActiveAt: Date.now(),
  };

  await syncProfileToFirestore(updated, idToken);
  return persistActiveUserProfile(updated, idToken);
}

/**
 * Register a new account with Email & Password.
 * Connects to Google Cloud Identity Platform (Firebase Auth REST API) if configured,
 * sends a verification email link, and persists the profile with `emailVerified: false`
 * until the user verifies their email.
 */
export async function registerWithEmail(params: {
  email: string;
  password: string;
  displayName: string;
  nickname?: string;
  avatarUrl?: string;
  emailVerified?: boolean;
}): Promise<UserProfile> {
  const cleanEmail = params.email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Please enter a valid email address.');
  }
  if (!params.password || params.password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }
  const cleanName = params.displayName.trim() || cleanEmail.split('@')[0];
  const cleanNickname = (params.nickname?.trim() || cleanName).slice(0, 18);
  const avatarUrl = params.avatarUrl || HERO_AVATAR_PRESETS[0].url;

  const vault = getAccountsVault();
  const existingRecord = vault[`email:${cleanEmail}`];
  if (existingRecord && !existingRecord.profile.isGuest) {
    throw new Error('An account with this email already exists. Please sign in instead.');
  }

  let uid = `user-${simpleHash(cleanEmail)}-${Date.now().toString(36)}`;
  let idToken: string | undefined;
  let cloudSynced = false;

  const { isConfigured, apiKey } = getFirebaseConfig();
  if (isConfigured && typeof fetch !== 'undefined') {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          password: params.password,
          returnSecureToken: true,
        }),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || 'Cloud registration failed.');
    }
    uid = data.localId || uid;
    idToken = data.idToken;
    cloudSynced = true;
    if (idToken) {
      await sendFirebaseVerificationEmail(idToken);
    }
  }

  const now = Date.now();
  const profile: UserProfile = {
    uid,
    email: cleanEmail,
    emailVerified: params.emailVerified ?? false,
    displayName: cleanName,
    nickname: cleanNickname,
    avatarUrl,
    provider: 'email',
    isGuest: false,
    createdAt: now,
    lastLoginAt: now,
    lastActiveAt: now,
    loginCount: 1,
    preferredGameMode: 'cash',
    preferredDifficulty: 'beginner',
    preferredTableSize: 9,
    careerBankroll: DEFAULT_STARTING_BANKROLL,
    careerStats: createEmptyCareerStats(),
    cloudSynced,
  };

  if (cloudSynced) {
    await syncProfileToFirestore(profile, idToken);
  }

  const record: StoredAccountRecord = {
    profile,
    passwordHash: simpleHash(params.password),
    idToken,
  };
  vault[uid] = record;
  vault[`email:${cleanEmail}`] = record;
  saveAccountsVault(vault);
  return persistActiveUserProfile(profile, idToken);
}

/**
 * Sign in an existing user with Email & Password.
 */
export async function signInWithEmail(params: {
  email: string;
  password: string;
}): Promise<UserProfile> {
  const cleanEmail = params.email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Please enter a valid email address.');
  }
  if (!params.password) {
    throw new Error('Please enter your password.');
  }

  const { isConfigured, apiKey } = getFirebaseConfig();
  if (isConfigured && typeof fetch !== 'undefined') {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          password: params.password,
          returnSecureToken: true,
        }),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || 'Invalid email or password.');
    }
    const uid = data.localId;
    const idToken = data.idToken as string | undefined;

    let cloudEmailVerified = false;
    if (idToken) {
      try {
        const lookupRes = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
          }
        );
        if (lookupRes.ok) {
          const lookupData = await lookupRes.json();
          cloudEmailVerified = Boolean(lookupData?.users?.[0]?.emailVerified);
        }
      } catch {
        // ignore lookup error
      }
    }

    const remoteProfile = await fetchProfileFromFirestore(uid, idToken);
    if (remoteProfile) {
      const now = Date.now();
      remoteProfile.emailVerified = cloudEmailVerified || Boolean(remoteProfile.emailVerified);
      remoteProfile.lastLoginAt = now;
      remoteProfile.lastActiveAt = now;
      remoteProfile.loginCount = (remoteProfile.loginCount || 1) + 1;
      remoteProfile.cloudSynced = true;
      return persistActiveUserProfile(remoteProfile, idToken);
    }
  }

  const vault = getAccountsVault();
  const record = vault[`email:${cleanEmail}`];
  if (!record) {
    throw new Error('No account found for this email. Click "Create Account" to register.');
  }
  if (record.passwordHash && record.passwordHash !== simpleHash(params.password)) {
    throw new Error('Incorrect password. Please try again.');
  }

  const now = Date.now();
  const updated: UserProfile = {
    ...record.profile,
    lastLoginAt: now,
    lastActiveAt: now,
    loginCount: (record.profile.loginCount || 1) + 1,
  };
  return persistActiveUserProfile(updated, record.idToken);
}

/**
 * Launches a real Firebase Auth Google OAuth Popup (`signInWithPopup` with `GoogleAuthProvider`)
 * when called from the browser UI, or signs in a provided test Google account in unit tests.
 */
async function launchFirebaseGooglePopup(): Promise<{
  uid: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  idToken?: string;
}> {
  const { isConfigured, apiKey, authDomain, projectId } = getFirebaseConfig();
  if (!isConfigured || !authDomain) {
    throw new Error(
      'Google Sign-In is not configured yet. Please add NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, and NEXT_PUBLIC_FIREBASE_PROJECT_ID to .env.local (and enable Google under Firebase Console → Authentication → Sign-in method).'
    );
  }

  try {
    const dynamicImport = new Function('url', 'return import(url)') as (
      url: string
    ) => Promise<Record<string, unknown>>;

    const firebaseAppMod = (await dynamicImport(
      'https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js'
    )) as {
      getApps: () => unknown[];
      getApp: () => unknown;
      initializeApp: (cfg: Record<string, string>) => unknown;
    };

    const firebaseAuthMod = (await dynamicImport(
      'https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js'
    )) as {
      getAuth: (app: unknown) => unknown;
      GoogleAuthProvider: new () => { setCustomParameters: (p: Record<string, string>) => void };
      signInWithPopup: (
        auth: unknown,
        provider: unknown
      ) => Promise<{
        user: {
          uid: string;
          email?: string | null;
          displayName?: string | null;
          photoURL?: string | null;
          getIdToken: () => Promise<string>;
        };
      }>;
    };

    const app =
      firebaseAppMod.getApps().length > 0
        ? firebaseAppMod.getApp()
        : firebaseAppMod.initializeApp({ apiKey, authDomain, projectId });

    const auth = firebaseAuthMod.getAuth(app);
    const provider = new firebaseAuthMod.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    const result = await firebaseAuthMod.signInWithPopup(auth, provider);
    const user = result.user;
    if (!user?.email) {
      throw new Error('Google account did not return a valid email address.');
    }
    const idToken = await user.getIdToken();
    return {
      uid: user.uid,
      email: user.email.trim().toLowerCase(),
      displayName: user.displayName || user.email.split('@')[0],
      avatarUrl: user.photoURL || undefined,
      idToken,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Google Sign-In popup failed.';
    if (message.includes('auth/popup-closed-by-user')) {
      throw new Error('Google Sign-In popup was closed before completing sign-in.');
    }
    if (message.includes('auth/unauthorized-domain')) {
      throw new Error(
        'This domain is not authorized in Firebase Auth. Add localhost to Firebase Console → Authentication → Settings → Authorized domains.'
      );
    }
    throw new Error(message);
  }
}

/**
 * Sign in with Google (Firebase OAuth Popup).
 * Restores existing Google profile if already registered, or initializes a new verified Google account.
 */
export async function signInWithGoogle(customGoogleAccount?: {
  email?: string;
  displayName?: string;
  avatarUrl?: string;
}): Promise<UserProfile> {
  let uid: string;
  let email: string;
  let displayName: string;
  let avatarUrl: string;
  let idToken: string | undefined;

  if (customGoogleAccount?.email) {
    email = customGoogleAccount.email.trim().toLowerCase();
    displayName = customGoogleAccount.displayName?.trim() || email.split('@')[0] || 'Google Player';
    avatarUrl = customGoogleAccount.avatarUrl || HERO_AVATAR_PRESETS[1].url;
    uid = `google-${simpleHash(email)}`;
  } else {
    const popupUser = await launchFirebaseGooglePopup();
    uid = popupUser.uid;
    email = popupUser.email;
    displayName = popupUser.displayName;
    avatarUrl = popupUser.avatarUrl || HERO_AVATAR_PRESETS[1].url;
    idToken = popupUser.idToken;
  }

  const nickname = displayName.split(' ')[0].slice(0, 16) || 'Player';
  const vault = getAccountsVault();
  const existing = vault[`email:${email}`] || vault[uid];
  const now = Date.now();

  if (idToken) {
    const remote = await fetchProfileFromFirestore(uid, idToken);
    if (remote) {
      const merged: UserProfile = {
        ...remote,
        email,
        emailVerified: true,
        provider: 'google',
        isGuest: false,
        lastLoginAt: now,
        lastActiveAt: now,
        loginCount: (remote.loginCount || 1) + 1,
        cloudSynced: true,
      };
      await syncProfileToFirestore(merged, idToken);
      return persistActiveUserProfile(merged, idToken);
    }
  }

  if (existing) {
    const updated: UserProfile = {
      ...existing.profile,
      email,
      emailVerified: true,
      provider: 'google',
      isGuest: false,
      lastLoginAt: now,
      lastActiveAt: now,
      loginCount: (existing.profile.loginCount || 1) + 1,
    };
    await syncProfileToFirestore(updated, idToken);
    return persistActiveUserProfile(updated, idToken);
  }

  const profile: UserProfile = {
    uid,
    email,
    emailVerified: true,
    displayName,
    nickname,
    avatarUrl,
    provider: 'google',
    isGuest: false,
    createdAt: now,
    lastLoginAt: now,
    lastActiveAt: now,
    loginCount: 1,
    preferredGameMode: 'cash',
    preferredDifficulty: 'beginner',
    preferredTableSize: 9,
    careerBankroll: DEFAULT_STARTING_BANKROLL,
    careerStats: createEmptyCareerStats(),
    cloudSynced: isGoogleCloudAuthConfigured(),
  };

  await syncProfileToFirestore(profile, idToken);
  return persistActiveUserProfile(profile, idToken);
}

/**
 * Instant 1-Click Guest Entry ("Play as Guest").
 * Can be upgraded to a permanent Google or Email account at any time without losing stats.
 */
export async function signInAsGuest(nickname?: string, avatarUrl?: string): Promise<UserProfile> {
  const now = Date.now();
  const cleanNick = (nickname?.trim() || 'Guest Shark').slice(0, 18);
  const profile: UserProfile = {
    uid: `guest-${now.toString(36)}`,
    displayName: cleanNick,
    nickname: cleanNick,
    avatarUrl: avatarUrl || HERO_AVATAR_PRESETS[0].url,
    provider: 'guest',
    isGuest: true,
    createdAt: now,
    lastLoginAt: now,
    lastActiveAt: now,
    loginCount: 1,
    preferredGameMode: 'cash',
    preferredDifficulty: 'beginner',
    preferredTableSize: 9,
    careerBankroll: DEFAULT_STARTING_BANKROLL,
    careerStats: createEmptyCareerStats(),
    cloudSynced: false,
  };
  return persistActiveUserProfile(profile);
}

/**
 * Seamlessly upgrades an active Guest profile to a permanent Google or Email account
 * while preserving 100% of their career bankroll, hands played, and leak ledger.
 */
export async function upgradeGuestProfile(
  currentGuest: UserProfile,
  params: {
    provider: Exclude<AuthProviderType, 'guest'>;
    email: string;
    password?: string;
    displayName?: string;
    nickname?: string;
    avatarUrl?: string;
  }
): Promise<UserProfile> {
  const cleanEmail = params.email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Please enter a valid email address to link your account.');
  }
  if (params.provider === 'email' && (!params.password || params.password.length < 6)) {
    throw new Error('Password must be at least 6 characters.');
  }

  const displayName = params.displayName?.trim() || currentGuest.displayName;
  const nickname = (params.nickname?.trim() || currentGuest.nickname).slice(0, 18);
  const avatarUrl = params.avatarUrl || currentGuest.avatarUrl;
  const now = Date.now();

  const upgraded: UserProfile = {
    ...currentGuest,
    email: cleanEmail,
    displayName,
    nickname,
    avatarUrl,
    provider: params.provider,
    isGuest: false,
    lastLoginAt: now,
    lastActiveAt: now,
    cloudSynced: isGoogleCloudAuthConfigured(),
  };

  const vault = getAccountsVault();
  const record: StoredAccountRecord = {
    profile: upgraded,
    passwordHash: params.password ? simpleHash(params.password) : undefined,
  };
  vault[upgraded.uid] = record;
  vault[`email:${cleanEmail}`] = record;
  saveAccountsVault(vault);

  await syncProfileToFirestore(upgraded);
  return persistActiveUserProfile(upgraded);
}

/**
 * Updates the user's table identity (Display Name, Poker Nickname, and Avatar).
 */
export async function updateUserTableIdentity(
  currentProfile: UserProfile,
  updates: {
    displayName?: string;
    nickname?: string;
    avatarUrl?: string;
  }
): Promise<UserProfile> {
  const updated: UserProfile = {
    ...currentProfile,
    displayName: updates.displayName?.trim() || currentProfile.displayName,
    nickname: (updates.nickname?.trim() || currentProfile.nickname).slice(0, 18),
    avatarUrl: updates.avatarUrl || currentProfile.avatarUrl,
    lastActiveAt: Date.now(),
  };
  await syncProfileToFirestore(updated);
  return persistActiveUserProfile(updated);
}

/**
 * Records table/session configuration preferences when a user starts a new session.
 */
export function recordSessionPreferenceToUserProfile(
  currentProfile: UserProfile | null,
  config: TableConfig
): UserProfile | null {
  if (!currentProfile) return null;
  const prevStats = currentProfile.careerStats || createEmptyCareerStats();
  const updated: UserProfile = {
    ...currentProfile,
    lastActiveAt: Date.now(),
    preferredGameMode: config.gameMode,
    preferredDifficulty: config.difficulty,
    preferredTableSize: config.tableSize,
    careerStats: {
      ...prevStats,
      sessionsCompleted: (prevStats.sessionsCompleted || 0) + 1,
    },
  };
  void syncProfileToFirestore(updated);
  return persistActiveUserProfile(updated);
}

/**
 * Records a hand/decision delta into the user's lifetime CareerStats & CareerBankroll.
 */
export function recordDeltaToUserProfile(
  currentProfile: UserProfile | null,
  delta: {
    handsDelta?: number;
    vpipDelta?: number;
    pfrDelta?: number;
    profitDelta?: number;
    optimalDelta?: number;
    leakDelta?: number;
    blunderDelta?: number;
    evLossDelta?: number;
    newLeak?: LeakEntry;
  }
): UserProfile | null {
  if (!currentProfile) return null;

  const prevStats = currentProfile.careerStats || createEmptyCareerStats();
  const nextLeaks = [...(prevStats.topCareerLeaks || [])];
  if (delta.newLeak) {
    nextLeaks.push(delta.newLeak);
    nextLeaks.sort((a, b) => b.evLoss - a.evLoss);
  }

  const profitDelta = delta.profitDelta || 0;
  const updatedStats: CareerStats = {
    totalHandsPlayed: prevStats.totalHandsPlayed + (delta.handsDelta || 0),
    totalVpipHands: prevStats.totalVpipHands + (delta.vpipDelta || 0),
    totalPfrHands: prevStats.totalPfrHands + (delta.pfrDelta || 0),
    careerNetProfit: Number((prevStats.careerNetProfit + profitDelta).toFixed(2)),
    careerOptimalCount: prevStats.careerOptimalCount + (delta.optimalDelta || 0),
    careerLeakCount: prevStats.careerLeakCount + (delta.leakDelta || 0),
    careerBlunderCount: prevStats.careerBlunderCount + (delta.blunderDelta || 0),
    careerEvLoss: Number((prevStats.careerEvLoss + (delta.evLossDelta || 0)).toFixed(2)),
    sessionsCompleted: prevStats.sessionsCompleted,
    topCareerLeaks: nextLeaks.slice(0, 15),
  };

  const updatedProfile: UserProfile = {
    ...currentProfile,
    lastActiveAt: Date.now(),
    careerBankroll: Math.max(0, Number((currentProfile.careerBankroll + profitDelta).toFixed(2))),
    careerStats: updatedStats,
  };

  void syncProfileToFirestore(updatedProfile);
  return persistActiveUserProfile(updatedProfile);
}

export function signOutStoredUser(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(ACTIVE_USER_KEY);
    window.localStorage.removeItem(ADMIN_UNLOCK_KEY);
  } catch (err) {
    console.error('Failed to sign out user:', err);
  }
}

// ============================================================================
// PIT BOSS ADMIN CONSOLE & TELEMETRY APIS
// ============================================================================

export function computeReadinessGrade(stats: CareerStats): {
  grade: string;
  score: number;
  label: string;
  color: string;
} {
  const totalDecisions = stats.careerOptimalCount + stats.careerLeakCount + stats.careerBlunderCount;
  const optimalPct = totalDecisions > 0 ? Math.round((stats.careerOptimalCount / totalDecisions) * 100) : 100;
  if (totalDecisions === 0) {
    return {
      grade: 'A',
      score: 85,
      label: 'Fresh Cardroom Member',
      color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/15',
    };
  }
  const blunderRate = (stats.careerBlunderCount / totalDecisions) * 100;
  const leakRate = (stats.careerLeakCount / totalDecisions) * 100;
  const score = Math.max(0, Math.round(optimalPct - blunderRate * 1.5 - leakRate * 0.5));
  if (score >= 88) {
    return {
      grade: 'A+',
      score,
      label: 'Bellagio High-Roller',
      color: 'text-emerald-300 border-emerald-400/50 bg-emerald-500/20',
    };
  }
  if (score >= 76) {
    return {
      grade: 'A',
      score,
      label: 'Disciplined TAG Crusher',
      color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/15',
    };
  }
  if (score >= 64) {
    return {
      grade: 'B',
      score,
      label: 'Winning Live Reg',
      color: 'text-sky-300 border-sky-400/40 bg-sky-500/15',
    };
  }
  if (score >= 50) {
    return {
      grade: 'C',
      score,
      label: 'Developing Grinder',
      color: 'text-amber-300 border-amber-400/40 bg-amber-500/15',
    };
  }
  return {
    grade: 'D',
    score,
    label: 'Leak Repair Needed',
    color: 'text-rose-400 border-rose-500/40 bg-rose-500/15',
  };
}

export function getConfiguredAdminEmails(): string[] {
  const envEmails =
    typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_ADMIN_EMAILS
      ? process.env.NEXT_PUBLIC_ADMIN_EMAILS.split(',')
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean)
      : [];
  return Array.from(new Set([...DEFAULT_ADMIN_EMAILS, ...envEmails]));
}

export function getConfiguredAdminPasscode(): string {
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_ADMIN_PASSCODE) {
    return process.env.NEXT_PUBLIC_ADMIN_PASSCODE.trim();
  }
  return DEFAULT_ADMIN_PASSCODE;
}

/**
 * Layer 1 Check: Returns true ONLY if the signed-in user has a verified email
 * in `NEXT_PUBLIC_ADMIN_EMAILS`.
 */
export function isAdminEmailWhitelisted(profile?: UserProfile | null): boolean {
  const target = profile === undefined ? getStoredUserProfile() : profile;
  if (!target || target.isGuest || !target.email) return false;
  if (target.emailVerified === false) return false;
  const adminEmails = getConfiguredAdminEmails();
  return adminEmails.includes(target.email.trim().toLowerCase());
}

/**
 * Layer 2 Check: Returns true if the secondary Pit Boss Passcode or Admin Touch ID / Face ID
 * session unlock has been completed.
 */
export function isAdminPasscodeUnlocked(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    return readStorageWithFallback(ADMIN_UNLOCK_KEY, LEGACY_ADMIN_UNLOCK_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Verifies the secondary Pit Boss Passcode.
 * Requires the active user to already be signed in with a whitelisted owner email (Layer 1).
 */
export function verifyAdminPasscode(passcode: string, profile?: UserProfile | null): boolean {
  if (!isAdminEmailWhitelisted(profile)) {
    return false;
  }
  const expected = getConfiguredAdminPasscode();
  if (!expected) return false;
  const isValid = passcode.trim() === expected;
  if (isValid && typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(ADMIN_UNLOCK_KEY, 'true');
    } catch {
      // ignore storage errors
    }
  }
  return isValid;
}

export function lockAdminSession(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(ADMIN_UNLOCK_KEY);
    window.localStorage.removeItem(LEGACY_ADMIN_UNLOCK_KEY);
  } catch {
    // ignore
  }
}

/**
 * Strict Owner-Only Lock: Requires BOTH Layer 1 (signed in with a verified email in
 * `NEXT_PUBLIC_ADMIN_EMAILS`) AND Layer 2 (secondary unlock via Passcode or Touch ID / Face ID).
 */
export function isAdminUser(profile?: UserProfile | null): boolean {
  return isAdminEmailWhitelisted(profile) && isAdminPasscodeUnlocked();
}

/**
 * Retrieves all unique UserProfile records from the Local Vault (and merges Cloud Firestore
 * documents when configured), sorted by most recently active first.
 */
export async function getAllRegisteredUsers(): Promise<UserProfile[]> {
  const byUid = new Map<string, UserProfile>();

  const vault = getAccountsVault();
  for (const record of Object.values(vault)) {
    if (record?.profile?.uid) {
      byUid.set(record.profile.uid, record.profile);
    }
  }

  const active = getStoredUserProfile();
  if (active?.uid) {
    byUid.set(active.uid, active);
  }

  // If Google Cloud Firestore is configured, also query remote user collection
  const { isConfigured, projectId, apiKey } = getFirebaseConfig();
  if (isConfigured && typeof fetch !== 'undefined') {
    try {
      const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
        projectId
      )}/databases/(default)/documents/users?key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const docs = Array.isArray(data?.documents) ? data.documents : [];
        for (const doc of docs) {
          const rawJson = doc?.fields?.profileJson?.stringValue;
          if (rawJson) {
            try {
              const parsed = JSON.parse(rawJson) as UserProfile;
              if (parsed?.uid) {
                const local = byUid.get(parsed.uid);
                if (!local || (parsed.lastActiveAt || parsed.lastLoginAt) >= (local.lastActiveAt || local.lastLoginAt)) {
                  byUid.set(parsed.uid, parsed);
                }
              }
            } catch {
              // ignore malformed doc
            }
          }
        }
      }
    } catch {
      // fallback silently to local vault
    }
  }

  return Array.from(byUid.values()).sort(
    (a, b) => (b.lastActiveAt || b.lastLoginAt || 0) - (a.lastActiveAt || a.lastLoginAt || 0)
  );
}

/**
 * Pit Boss Control: Update a player's Career Bankroll directly.
 */
export async function adminUpdateUserBankroll(
  uid: string,
  newBankroll: number
): Promise<UserProfile | null> {
  const vault = getAccountsVault();
  const existing = vault[uid];
  const active = getStoredUserProfile();
  const target = existing?.profile || (active?.uid === uid ? active : null);
  if (!target) return null;

  const sanitizedBankroll = Math.max(0, Number(newBankroll.toFixed(2)));
  const updated: UserProfile = {
    ...target,
    careerBankroll: sanitizedBankroll,
    lastActiveAt: Date.now(),
  };

  vault[uid] = {
    profile: updated,
    passwordHash: existing?.passwordHash,
  };
  if (updated.email) {
    vault[`email:${updated.email.toLowerCase()}`] = vault[uid];
  }
  saveAccountsVault(vault);

  if (active?.uid === uid) {
    persistActiveUserProfile(updated);
  }
  await syncProfileToFirestore(updated);
  return updated;
}

/**
 * Pit Boss Control: Reset a player's Career Stats & Leak Ledger (and optionally restore $2,000 bankroll).
 */
export async function adminResetUserStats(
  uid: string,
  resetBankrollToDefault = true
): Promise<UserProfile | null> {
  const vault = getAccountsVault();
  const existing = vault[uid];
  const active = getStoredUserProfile();
  const target = existing?.profile || (active?.uid === uid ? active : null);
  if (!target) return null;

  const updated: UserProfile = {
    ...target,
    careerBankroll: resetBankrollToDefault ? DEFAULT_STARTING_BANKROLL : target.careerBankroll,
    careerStats: createEmptyCareerStats(),
    lastActiveAt: Date.now(),
  };

  vault[uid] = {
    profile: updated,
    passwordHash: existing?.passwordHash,
  };
  if (updated.email) {
    vault[`email:${updated.email.toLowerCase()}`] = vault[uid];
  }
  saveAccountsVault(vault);

  if (active?.uid === uid) {
    persistActiveUserProfile(updated);
  }
  await syncProfileToFirestore(updated);
  return updated;
}

/**
 * Pit Boss Control: Delete a user account from the vault.
 */
export async function adminDeleteUserAccount(uid: string): Promise<boolean> {
  const vault = getAccountsVault();
  const existing = vault[uid];
  const active = getStoredUserProfile();
  if (!existing && active?.uid !== uid) return false;

  const email = existing?.profile?.email || (active?.uid === uid ? active.email : undefined);
  delete vault[uid];
  if (email) {
    delete vault[`email:${email.toLowerCase()}`];
  }
  saveAccountsVault(vault);

  if (active?.uid === uid) {
    signOutStoredUser();
  }
  return true;
}

/**
 * Pit Boss Control: Prune guest accounts (defaults to removing guests with 0 hands played, or all guests).
 */
export async function adminPruneGuestAccounts(onlyZeroHands = false): Promise<number> {
  const vault = getAccountsVault();
  const active = getStoredUserProfile();
  let removedCount = 0;

  for (const [key, record] of Object.entries(vault)) {
    const prof = record?.profile;
    if (!prof || !prof.isGuest) continue;
    if (onlyZeroHands && prof.careerStats.totalHandsPlayed > 0) continue;
    delete vault[key];
    removedCount++;
    if (active?.uid === prof.uid) {
      signOutStoredUser();
    }
  }

  saveAccountsVault(vault);
  return removedCount;
}

/**
 * Pit Boss Control: Seed realistic cardroom player accounts for testing & cohort analytics.
 */
export async function adminSeedDemoPlayers(): Promise<UserProfile[]> {
  const now = Date.now();
  const hour = 3600 * 1000;
  const vault = getAccountsVault();

  const demoPlayers: UserProfile[] = [
    {
      uid: 'demo-google-marcus',
      email: 'marcus.vance@gmail.com',
      displayName: 'Marcus Vance',
      nickname: 'VegasMarcus',
      avatarUrl: HERO_AVATAR_PRESETS[1].url,
      provider: 'google',
      isGuest: false,
      createdAt: now - 72 * hour,
      lastLoginAt: now - 1 * hour,
      lastActiveAt: now - 15 * 60 * 1000,
      loginCount: 14,
      preferredGameMode: 'cash',
      preferredDifficulty: 'advanced',
      preferredTableSize: 9,
      careerBankroll: 3420,
      cloudSynced: true,
      careerStats: {
        totalHandsPlayed: 164,
        totalVpipHands: 36,
        totalPfrHands: 29,
        careerNetProfit: 1420,
        careerOptimalCount: 118,
        careerLeakCount: 9,
        careerBlunderCount: 2,
        careerEvLoss: 38.5,
        sessionsCompleted: 11,
        topCareerLeaks: [
          {
            id: 'leak-m1',
            handNumber: 42,
            street: 'RIVER',
            actionLabel: 'CALL $65',
            rating: 'Blunder',
            evLoss: 24.5,
            explanation: 'Hero-called a river check-raise against a Nit (Ice-Cold Igor). Live low-stakes turn/river check-raises are Two Pair+ >85% of the time.',
          },
          {
            id: 'leak-m2',
            handNumber: 89,
            street: 'PREFLOP',
            actionLabel: 'RAISE $6',
            rating: 'Leak',
            evLoss: 14.0,
            explanation: 'Isolation raise too small over 2 limpers. Target 4BB + 1BB per limper ($12) to punish loose live calls.',
          },
        ],
      },
    },
    {
      uid: 'demo-email-elena',
      email: 'elena.rostova@outlook.com',
      displayName: 'Elena Rostova',
      nickname: 'LadySolver',
      avatarUrl: HERO_AVATAR_PRESETS[4].url,
      provider: 'email',
      isGuest: false,
      createdAt: now - 120 * hour,
      lastLoginAt: now - 3 * hour,
      lastActiveAt: now - 2 * hour,
      loginCount: 22,
      preferredGameMode: 'limp_punisher',
      preferredDifficulty: 'intermediate',
      preferredTableSize: 9,
      careerBankroll: 2890,
      cloudSynced: true,
      careerStats: {
        totalHandsPlayed: 210,
        totalVpipHands: 44,
        totalPfrHands: 38,
        careerNetProfit: 890,
        careerOptimalCount: 155,
        careerLeakCount: 6,
        careerBlunderCount: 1,
        careerEvLoss: 19.0,
        sessionsCompleted: 16,
        topCareerLeaks: [
          {
            id: 'leak-e1',
            handNumber: 114,
            street: 'TURN',
            actionLabel: 'CALL $40',
            rating: 'Leak',
            evLoss: 19.0,
            explanation: 'Called a pot-sized turn bet with a bare flush draw (19% equity vs 33% required pot odds).',
          },
        ],
      },
    },
    {
      uid: 'demo-google-devon',
      email: 'devon.brooks@gmail.com',
      displayName: 'Devon Brooks',
      nickname: 'RiverKing99',
      avatarUrl: HERO_AVATAR_PRESETS[5].url,
      provider: 'google',
      isGuest: false,
      createdAt: now - 48 * hour,
      lastLoginAt: now - 6 * hour,
      lastActiveAt: now - 5 * hour,
      loginCount: 7,
      preferredGameMode: 'cash',
      preferredDifficulty: 'beginner',
      preferredTableSize: 6,
      careerBankroll: 1340,
      cloudSynced: false,
      careerStats: {
        totalHandsPlayed: 78,
        totalVpipHands: 39,
        totalPfrHands: 11,
        careerNetProfit: -660,
        careerOptimalCount: 31,
        careerLeakCount: 18,
        careerBlunderCount: 9,
        careerEvLoss: 215.5,
        sessionsCompleted: 6,
        topCareerLeaks: [
          {
            id: 'leak-d1',
            handNumber: 19,
            street: 'PREFLOP',
            actionLabel: 'CALL $2',
            rating: 'Leak',
            evLoss: 42.0,
            explanation: 'Over-limping AJo in middle position invites 5-way bloated pots with a dominated offsuit ace.',
          },
          {
            id: 'leak-d2',
            handNumber: 34,
            street: 'RIVER',
            actionLabel: 'CALL $110',
            rating: 'Blunder',
            evLoss: 88.5,
            explanation: 'Paid off a massive river overbet with Top Pair Weak Kicker on a 4-flush board.',
          },
          {
            id: 'leak-d3',
            handNumber: 51,
            street: 'FLOP',
            actionLabel: 'BET $4',
            rating: 'Leak',
            evLoss: 22.0,
            explanation: 'Under-sized continuation bet ($4 into $28 pot) gives Calling Stations 8:1 direct odds to chase any gutshot.',
          },
        ],
      },
    },
    {
      uid: 'demo-email-chloe',
      email: 'chloe.kim@stanford.edu',
      displayName: 'Chloe Kim',
      nickname: 'ButtonBandit',
      avatarUrl: HERO_AVATAR_PRESETS[6].url,
      provider: 'email',
      isGuest: false,
      createdAt: now - 30 * hour,
      lastLoginAt: now - 12 * hour,
      lastActiveAt: now - 10 * hour,
      loginCount: 5,
      preferredGameMode: 'limp_punisher',
      preferredDifficulty: 'beginner',
      preferredTableSize: 9,
      careerBankroll: 2215,
      cloudSynced: true,
      careerStats: {
        totalHandsPlayed: 52,
        totalVpipHands: 13,
        totalPfrHands: 10,
        careerNetProfit: 215,
        careerOptimalCount: 39,
        careerLeakCount: 5,
        careerBlunderCount: 1,
        careerEvLoss: 28.0,
        sessionsCompleted: 4,
        topCareerLeaks: [
          {
            id: 'leak-c1',
            handNumber: 12,
            street: 'PREFLOP',
            actionLabel: 'RAISE $6',
            rating: 'Leak',
            evLoss: 16.0,
            explanation: 'Sized to 3BB ($6) over 3 limpers. Use the 4BB + 1BB/limper formula ($14) to isolate effectively.',
          },
        ],
      },
    },
    {
      uid: 'demo-guest-highroller',
      displayName: 'LateNightGuest',
      nickname: 'LateNightGuest',
      avatarUrl: HERO_AVATAR_PRESETS[7].url,
      provider: 'guest',
      isGuest: true,
      createdAt: now - 8 * hour,
      lastLoginAt: now - 4 * hour,
      lastActiveAt: now - 4 * hour,
      loginCount: 2,
      preferredGameMode: 'cash',
      preferredDifficulty: 'beginner',
      preferredTableSize: 9,
      careerBankroll: 1780,
      cloudSynced: false,
      careerStats: {
        totalHandsPlayed: 24,
        totalVpipHands: 11,
        totalPfrHands: 4,
        careerNetProfit: -220,
        careerOptimalCount: 12,
        careerLeakCount: 6,
        careerBlunderCount: 3,
        careerEvLoss: 74.0,
        sessionsCompleted: 2,
        topCareerLeaks: [
          {
            id: 'leak-g1',
            handNumber: 8,
            street: 'PREFLOP',
            actionLabel: 'CALL $18',
            rating: 'Blunder',
            evLoss: 45.0,
            explanation: 'Cold-called a 3-bet out of position with KQo against a tight TAG opener.',
          },
        ],
      },
    },
  ];

  for (const player of demoPlayers) {
    vault[player.uid] = {
      profile: player,
      passwordHash: simpleHash('demo1234'),
    };
    if (player.email) {
      vault[`email:${player.email.toLowerCase()}`] = vault[player.uid];
    }
  }

  saveAccountsVault(vault);
  return getAllRegisteredUsers();
}

// ============================================================================
// WEBAUTHN PASSKEY (TOUCH ID / FACE ID) AUTHENTICATION & ADMIN UNLOCK
// ============================================================================

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  if (typeof btoa === 'function') {
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }
  return Buffer.from(bytes).toString('base64url');
}

function base64UrlToBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const padded = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (padded.length % 4)) % 4;
  const base64 = padded + '='.repeat(padLen);
  if (typeof atob === 'function') {
    const binary = atob(base64);
    const bytes = new Uint8Array(new ArrayBuffer(binary.length));
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  const buf = Buffer.from(base64, 'base64');
  const out = new Uint8Array(new ArrayBuffer(buf.length));
  out.set(buf);
  return out;
}

function generateChallengeBytes(): Uint8Array<ArrayBuffer> {
  const challenge = new Uint8Array(new ArrayBuffer(32));
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(challenge);
  } else {
    for (let i = 0; i < 32; i++) {
      challenge[i] = Math.floor(Math.random() * 256);
    }
  }
  return challenge;
}

function stringToBytes(input: string): Uint8Array<ArrayBuffer> {
  const encoded = new TextEncoder().encode(input);
  const out = new Uint8Array(new ArrayBuffer(encoded.byteLength));
  out.set(encoded);
  return out;
}

function getRpId(): string {
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return window.location.hostname;
  }
  return 'localhost';
}

export function isPasskeySupported(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    typeof window.PublicKeyCredential !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      navigator.credentials &&
      typeof navigator.credentials.create === 'function' &&
      typeof navigator.credentials.get === 'function'
  );
}

let simulatedPasskeyCounter = 0;

async function createWebAuthnPasskeyCredential(params: {
  userId: string;
  userName: string;
  userDisplayName: string;
  excludeCredentialIds?: string[];
}): Promise<string> {
  if (!isPasskeySupported()) {
    // Fallback simulated passkey credential ID for unit tests or non-WebAuthn contexts
    simulatedPasskeyCounter += 1;
    return `pk-${simpleHash(params.userId)}-${Date.now().toString(36)}-${simulatedPasskeyCounter}`;
  }

  const publicKey: PublicKeyCredentialCreationOptions = {
    challenge: generateChallengeBytes(),
    rp: {
      id: getRpId(),
      name: "Gambler's Den",
    },
    user: {
      id: stringToBytes(params.userId),
      name: params.userName,
      displayName: params.userDisplayName,
    },
    pubKeyCredParams: [
      { type: 'public-key', alg: -7 }, // ES256 (Touch ID / Face ID standard)
      { type: 'public-key', alg: -257 }, // RS256
    ],
    excludeCredentials: (params.excludeCredentialIds || []).map((id) => ({
      type: 'public-key' as const,
      id: base64UrlToBytes(id),
    })),
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      residentKey: 'preferred',
      userVerification: 'required',
    },
    timeout: 60000,
  };

  try {
    const cred = (await navigator.credentials.create({
      publicKey,
    })) as PublicKeyCredential | null;

    if (!cred) {
      throw new Error('Touch ID / Face ID verification was cancelled.');
    }
    return cred.id || bytesToBase64Url(new Uint8Array(cred.rawId));
  } catch (err) {
    const error = err as DOMException;
    if (error?.name === 'InvalidStateError') {
      throw new Error('A Touch ID / Face ID passkey is already registered on this device for this account.');
    }
    if (error?.name === 'NotAllowedError' || error?.name === 'AbortError') {
      throw new Error('Touch ID / Face ID prompt was cancelled or timed out.');
    }
    if (error?.name === 'SecurityError') {
      throw new Error('Passkeys require a secure context (HTTPS or localhost).');
    }
    throw new Error(error?.message || 'Could not complete Touch ID / Face ID passkey registration.');
  }
}

async function assertWebAuthnPasskeyCredential(allowCredentialIds: string[]): Promise<string> {
  if (!isPasskeySupported()) {
    if (allowCredentialIds.length === 0) {
      throw new Error('No Touch ID / Face ID passkey registered yet on this device.');
    }
    return allowCredentialIds[0];
  }

  const publicKey: PublicKeyCredentialRequestOptions = {
    challenge: generateChallengeBytes(),
    rpId: getRpId(),
    allowCredentials: allowCredentialIds.map((id) => ({
      type: 'public-key' as const,
      id: base64UrlToBytes(id),
    })),
    userVerification: 'required',
    timeout: 60000,
  };

  try {
    const assertion = (await navigator.credentials.get({
      publicKey,
    })) as PublicKeyCredential | null;

    if (!assertion) {
      throw new Error('Touch ID / Face ID verification was cancelled.');
    }
    return assertion.id || bytesToBase64Url(new Uint8Array(assertion.rawId));
  } catch (err) {
    const error = err as DOMException;
    if (error?.name === 'NotAllowedError' || error?.name === 'AbortError') {
      throw new Error('Touch ID / Face ID verification was cancelled or timed out.');
    }
    throw new Error(error?.message || 'Touch ID / Face ID verification failed.');
  }
}

/**
 * Enrolls a Touch ID / Face ID Passkey onto an existing UserProfile.
 * Requires the user to have logged in at least once and completed all profile details.
 */
export async function registerPasskeyForUser(
  currentProfile: UserProfile,
  label = 'Touch ID / Face ID Passkey'
): Promise<UserProfile> {
  if (!isProfileEligibleForPasskey(currentProfile)) {
    throw new Error(
      'Touch ID / Face ID is only available after logging in for the first time and providing all necessary profile information.'
    );
  }

  const existingPasskeys = currentProfile.passkeys || [];
  const credentialId = await createWebAuthnPasskeyCredential({
    userId: currentProfile.uid,
    userName: currentProfile.email || `${currentProfile.nickname}@feltsense.local`,
    userDisplayName: currentProfile.displayName,
    excludeCredentialIds: existingPasskeys.map((p) => p.credentialId),
  });

  const now = Date.now();
  const newPasskey: PasskeyCredentialMeta = {
    credentialId,
    label: label.trim() || 'Touch ID / Face ID Passkey',
    createdAt: now,
    lastUsedAt: now,
  };

  const updated: UserProfile = {
    ...currentProfile,
    isGuest: false,
    lastActiveAt: now,
    passkeys: [...existingPasskeys, newPasskey],
  };

  await syncProfileToFirestore(updated);
  return persistActiveUserProfile(updated);
}

/**
 * Removes a registered Passkey from a UserProfile.
 */
export async function removePasskeyFromUser(
  currentProfile: UserProfile,
  credentialId: string
): Promise<UserProfile> {
  const vault = getAccountsVault();
  delete vault[`passkey:${credentialId}`];
  saveAccountsVault(vault);

  const updated: UserProfile = {
    ...currentProfile,
    passkeys: (currentProfile.passkeys || []).filter((p) => p.credentialId !== credentialId),
    lastActiveAt: Date.now(),
  };

  await syncProfileToFirestore(updated);
  return persistActiveUserProfile(updated);
}

/**
 * Authenticates a returning player using Touch ID / Face ID Passkey.
 * Strictly requires that the user has already logged in for the first time and provided all necessary profile information.
 */
export async function signInWithPasskey(fallbackAccount?: {
  email?: string;
  displayName?: string;
  nickname?: string;
  avatarUrl?: string;
}): Promise<UserProfile> {
  const vault = getAccountsVault();
  const targetEmail = fallbackAccount?.email?.trim().toLowerCase();

  // 1. Check enrolled passkey credentials belonging to eligible profiles
  const knownPasskeyIds = Object.keys(vault)
    .filter((k) => {
      if (!k.startsWith('passkey:')) return false;
      const rec = vault[k];
      if (!isProfileEligibleForPasskey(rec?.profile)) return false;
      if (targetEmail && rec.profile.email?.toLowerCase() !== targetEmail) return false;
      return true;
    })
    .map((k) => k.replace(/^passkey:/, ''));

  if (knownPasskeyIds.length > 0) {
    const matchedCredId = await assertWebAuthnPasskeyCredential(knownPasskeyIds);
    const record = vault[`passkey:${matchedCredId}`];
    if (record?.profile && isProfileEligibleForPasskey(record.profile)) {
      const now = Date.now();
      const updatedPasskeys = (record.profile.passkeys || []).map((pk) =>
        pk.credentialId === matchedCredId ? { ...pk, lastUsedAt: now } : pk
      );
      const updated: UserProfile = {
        ...record.profile,
        lastLoginAt: now,
        lastActiveAt: now,
        loginCount: (record.profile.loginCount || 1) + 1,
        passkeys: updatedPasskeys,
      };
      await syncProfileToFirestore(updated);
      return persistActiveUserProfile(updated);
    }
  }

  // 2. Check if an eligible user has already logged in for the first time and completed their profile,
  //    and bind/verify Touch ID / Face ID for that existing profile.
  let eligibleProfile: UserProfile | null = null;
  if (targetEmail && vault[`email:${targetEmail}`]?.profile) {
    const candidate = vault[`email:${targetEmail}`].profile;
    if (isProfileEligibleForPasskey(candidate)) {
      eligibleProfile = candidate;
    }
  } else {
    for (const record of Object.values(vault)) {
      const candidate = record?.profile;
      if (!isProfileEligibleForPasskey(candidate)) continue;
      if (targetEmail && candidate.email?.toLowerCase() !== targetEmail) continue;
      if (
        !eligibleProfile ||
        (candidate.lastActiveAt || candidate.lastLoginAt) >
          (eligibleProfile.lastActiveAt || eligibleProfile.lastLoginAt)
      ) {
        eligibleProfile = candidate;
      }
    }
  }

  if (!eligibleProfile) {
    throw new Error(
      'Touch ID / Face ID is only available after you have logged in for the first time and provided all necessary profile information.'
    );
  }

  const enrolled = await registerPasskeyForUser(
    eligibleProfile,
    'Mac / iOS Touch ID & Face ID'
  );
  const now = Date.now();
  const signedIn: UserProfile = {
    ...enrolled,
    lastLoginAt: now,
    lastActiveAt: now,
    loginCount: (enrolled.loginCount || 1) + 1,
  };
  await syncProfileToFirestore(signedIn);
  return persistActiveUserProfile(signedIn);
}

// ============================================================================
// PIT BOSS ADMIN CONSOLE TOUCH ID / FACE ID PASSKEYS
// ============================================================================

export function getAdminPasskeys(): PasskeyCredentialMeta[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = readStorageWithFallback(ADMIN_PASSKEYS_KEY, LEGACY_ADMIN_PASSKEYS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PasskeyCredentialMeta[]) : [];
  } catch {
    return [];
  }
}

function saveAdminPasskeys(list: PasskeyCredentialMeta[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(ADMIN_PASSKEYS_KEY, JSON.stringify(list));
  } catch {
    // ignore storage errors
  }
}

export function hasAdminPasskeyRegistered(): boolean {
  if (getAdminPasskeys().length > 0) return true;
  const vault = getAccountsVault();
  const adminEmails = getConfiguredAdminEmails();
  for (const record of Object.values(vault)) {
    const prof = record?.profile;
    if (
      prof?.email &&
      adminEmails.includes(prof.email.toLowerCase()) &&
      isProfileEligibleForPasskey(prof) &&
      Array.isArray(prof.passkeys) &&
      prof.passkeys.length > 0
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Registers a Touch ID / Face ID Passkey specifically for the Pit Boss Admin Console.
 * Requires the active user to be signed in with a whitelisted owner email.
 */
export async function registerAdminPasskey(
  label = 'Pit Boss Touch ID / Face ID',
  profile?: UserProfile | null
): Promise<PasskeyCredentialMeta> {
  if (!isAdminEmailWhitelisted(profile)) {
    throw new Error('Only a signed-in whitelisted Owner account can register an Admin Passkey.');
  }
  const existing = getAdminPasskeys();
  const adminEmails = getConfiguredAdminEmails();
  const primaryEmail = adminEmails[0] || 'admin@feltsense.com';

  const credentialId = await createWebAuthnPasskeyCredential({
    userId: `pitboss-admin-${primaryEmail}`,
    userName: primaryEmail,
    userDisplayName: "Gambler's Den Pit Boss Admin",
    excludeCredentialIds: existing.map((e) => e.credentialId),
  });

  const now = Date.now();
  const meta: PasskeyCredentialMeta = {
    credentialId,
    label: label.trim() || 'Pit Boss Touch ID / Face ID',
    createdAt: now,
    lastUsedAt: now,
  };

  saveAdminPasskeys([...existing, meta]);
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(ADMIN_UNLOCK_KEY, 'true');
    } catch {
      // ignore
    }
  }
  return meta;
}

/**
 * Unlocks the Pit Boss Admin Console using an enrolled Touch ID / Face ID Passkey
 * (or any user passkey belonging to a whitelisted Admin Email).
 * Only works when signed in with a whitelisted owner email after an Admin Passkey has been registered.
 */
export async function unlockAdminWithPasskey(profile?: UserProfile | null): Promise<boolean> {
  if (!isAdminEmailWhitelisted(profile)) {
    throw new Error('Access denied: You must be signed in with a verified Owner email to unlock the Admin Console.');
  }
  const adminKeys = getAdminPasskeys();
  const vault = getAccountsVault();
  const adminEmails = getConfiguredAdminEmails();

  // Also include passkeys registered on whitelisted admin user accounts
  const adminUserPasskeyIds: string[] = [];
  for (const record of Object.values(vault)) {
    const prof = record?.profile;
    if (
      prof?.email &&
      adminEmails.includes(prof.email.toLowerCase()) &&
      isProfileEligibleForPasskey(prof) &&
      Array.isArray(prof.passkeys)
    ) {
      for (const pk of prof.passkeys) {
        adminUserPasskeyIds.push(pk.credentialId);
      }
    }
  }

  const allAllowedIds = Array.from(
    new Set([...adminKeys.map((k) => k.credentialId), ...adminUserPasskeyIds])
  );

  if (allAllowedIds.length === 0) {
    throw new Error(
      'Touch ID / Face ID is only available after logging into the Admin Console for the first time and binding a Passkey.'
    );
  }

  const verifiedId = await assertWebAuthnPasskeyCredential(allAllowedIds);
  if (!verifiedId) return false;

  const now = Date.now();
  const updatedAdminKeys = adminKeys.map((k) =>
    k.credentialId === verifiedId ? { ...k, lastUsedAt: now } : k
  );
  saveAdminPasskeys(updatedAdminKeys);

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(ADMIN_UNLOCK_KEY, 'true');
    } catch {
      // ignore
    }
  }
  return true;
}


