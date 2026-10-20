import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { usePokerStore } from '@/lib/store';
import {
  HERO_AVATAR_PRESETS,
  isAdminUser,
  verifyAdminPasscode,
  lockAdminSession,
  getAllRegisteredUsers,
  adminUpdateUserBankroll,
  adminResetUserStats,
  adminDeleteUserAccount,
  adminPruneGuestAccounts,
  adminSeedDemoPlayers,
  computeReadinessGrade,
  hasAdminPasskeyRegistered,
  registerAdminPasskey,
  unlockAdminWithPasskey,
  checkEmailRegistrationStatus,
  hasEligiblePasskeyUser,
  isProfileEligibleForPasskey,
  isAdminEmailWhitelisted,
} from '@/lib/auth/authService';

// Setup an in-memory localStorage mock for Node test runner
const memoryStorage = new Map<string, string>();
const mockLocalStorage = {
  getItem: (key: string) => memoryStorage.get(key) ?? null,
  setItem: (key: string, val: string) => memoryStorage.set(key, val),
  removeItem: (key: string) => memoryStorage.delete(key),
  clear: () => memoryStorage.clear(),
};

if (typeof globalThis.window === 'undefined') {
  Object.defineProperty(globalThis, 'window', {
    value: { localStorage: mockLocalStorage },
    writable: true,
    configurable: true,
  });
} else {
  Object.defineProperty(globalThis.window, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
    configurable: true,
  });
}

describe('User Authentication, Profile Identity & Career Bankroll (src/lib/auth/authService.ts)', () => {
  beforeEach(() => {
    memoryStorage.clear();
    usePokerStore.getState().logoutUser();
  });

  it('registers a new Email & Password account with mandatory email verification and $2,000 career bankroll', async () => {
    const profile = await usePokerStore.getState().registerUserWithEmail({
      email: 'shark@vegas.com',
      password: 'password123',
      displayName: 'Daniel Negreanu',
      nickname: 'KidPoker',
      avatarUrl: HERO_AVATAR_PRESETS[2].url,
    });

    assert.equal(profile.email, 'shark@vegas.com');
    assert.equal(profile.nickname, 'KidPoker');
    assert.equal(profile.isGuest, false);
    assert.equal(profile.provider, 'email');
    assert.equal(profile.emailVerified, false);
    assert.equal(profile.careerBankroll, 2000);

    // Verify email address before entering lobby
    const verified = await usePokerStore.getState().verifyUserEmail();
    assert.equal(verified.emailVerified, true);

    // Sign out and sign back in with email & password
    usePokerStore.getState().logoutUser();
    assert.equal(usePokerStore.getState().userProfile, null);

    const signedIn = await usePokerStore.getState().loginWithEmail({
      email: 'shark@vegas.com',
      password: 'password123',
    });
    assert.equal(signedIn.nickname, 'KidPoker');
    assert.equal(signedIn.emailVerified, true);
    assert.equal(signedIn.careerBankroll, 2000);
  });

  it('supports 1-click Play as Guest and seamlessly upgrades Guest to a permanent account while preserving stats', async () => {
    const guest = await usePokerStore.getState().loginAsGuest('FridayGrinder');
    assert.equal(guest.isGuest, true);
    assert.equal(guest.nickname, 'FridayGrinder');

    // Start a game in Limp-Punisher mode and make a decision so career stats & bankroll update
    usePokerStore.getState().setTableConfig({
      tableSize: 6,
      buyInAmount: 200,
      difficulty: 'intermediate',
      gameMode: 'limp_punisher',
    });
    usePokerStore.getState().startNewGame();
    // Hero seat 0 should now display 'FridayGrinder (You)'
    assert.equal(usePokerStore.getState().players[0].name, 'FridayGrinder (You)');

    // Hero flat-calls (triggers a Limp-Punisher leak and VPIP increment)
    usePokerStore.getState().playerAction('call');
    usePokerStore.getState().quitToLobby();

    const guestAfterPlay = usePokerStore.getState().userProfile!;
    assert.equal(guestAfterPlay.careerStats.totalVpipHands, 1);
    assert.ok(guestAfterPlay.careerStats.topCareerLeaks.length >= 1);

    // Upgrade Guest to permanent Google account -> preserves all stats!
    const upgraded = await usePokerStore.getState().upgradeGuestUser({
      provider: 'google',
      email: 'fridaygrinder@gmail.com',
      displayName: 'Friday Grinder Pro',
      nickname: 'GrinderPro',
    });

    assert.equal(upgraded.isGuest, false);
    assert.equal(upgraded.provider, 'google');
    assert.equal(upgraded.nickname, 'GrinderPro');
    assert.equal(upgraded.careerStats.totalVpipHands, 1);
    assert.ok(upgraded.careerStats.topCareerLeaks.length >= 1);
  });

  it('updates Hero seat name and avatar live on the table when updateUserIdentity is called', async () => {
    await usePokerStore.getState().loginWithGoogle({
      email: 'ace@gmail.com',
      displayName: 'Ace High',
    });

    usePokerStore.getState().startNewGame();
    await usePokerStore.getState().updateUserIdentity({
      displayName: 'Phil Ivey',
      nickname: 'NoHomeJerome',
      avatarUrl: HERO_AVATAR_PRESETS[4].url,
    });

    const state = usePokerStore.getState();
    assert.equal(state.userProfile?.nickname, 'NoHomeJerome');
    assert.equal(state.players[0].name, 'NoHomeJerome (You)');
    assert.equal(state.players[0].avatarUrl, HERO_AVATAR_PRESETS[4].url);

    usePokerStore.getState().quitToLobby();
  });

  it('enforces Strict Owner-Only Admin Access Gate (requires whitelisted verified owner email + secondary passcode/passkey unlock)', async () => {
    const regularUser = await usePokerStore.getState().loginWithGoogle({
      email: 'regularplayer@gmail.com',
      displayName: 'Regular Player',
    });
    assert.equal(isAdminEmailWhitelisted(regularUser), false);
    assert.equal(isAdminUser(regularUser), false);

    // Non-owner user CANNOT unlock Admin Console even if they enter the Pit Boss passcode
    assert.equal(verifyAdminPasscode('PITBOSS-777'), false);
    assert.equal(isAdminUser(regularUser), false);

    // Signing in with a whitelisted owner email passes Layer 1 (isAdminEmailWhitelisted),
    // and requires Layer 2 (secondary passcode or passkey) to unlock isAdminUser
    const adminUser = await usePokerStore.getState().loginWithGoogle({
      email: 'admin@feltsense.com',
      displayName: 'Owner Admin',
    });
    assert.equal(isAdminEmailWhitelisted(adminUser), true);
    assert.equal(isAdminUser(adminUser), false);

    // Wrong passcode fails
    assert.equal(verifyAdminPasscode('WRONG-CODE'), false);
    assert.equal(isAdminUser(adminUser), false);

    // Correct passcode unlocks Pit Boss Console for the verified owner
    assert.equal(verifyAdminPasscode('PITBOSS-777'), true);
    assert.equal(isAdminUser(adminUser), true);

    // Locking session requires re-verification
    lockAdminSession();
    assert.equal(isAdminUser(adminUser), false);
  });

  it('supports Pit Boss Console directory queries, demo seeding, bankroll grants, stat resets, and pruning', async () => {
    const seeded = await adminSeedDemoPlayers();
    assert.equal(seeded.length, 5);

    const marcus = seeded.find((u) => u.uid === 'demo-google-marcus')!;
    assert.ok(marcus);
    assert.equal(marcus.careerBankroll, 3420);
    const gradeInfo = computeReadinessGrade(marcus.careerStats);
    assert.ok(['A+', 'A', 'B'].includes(gradeInfo.grade));

    // Update bankroll via Pit Boss control
    const updatedBankroll = await adminUpdateUserBankroll('demo-google-marcus', 5000);
    assert.equal(updatedBankroll?.careerBankroll, 5000);

    // Reset career stats via Pit Boss control
    const resetMarcus = await adminResetUserStats('demo-google-marcus', true);
    assert.equal(resetMarcus?.careerBankroll, 2000);
    assert.equal(resetMarcus?.careerStats.totalHandsPlayed, 0);
    assert.equal(resetMarcus?.careerStats.topCareerLeaks.length, 0);

    // Prune guest accounts
    const prunedCount = await adminPruneGuestAccounts(false);
    assert.equal(prunedCount, 1);

    // Delete specific account
    const deleted = await adminDeleteUserAccount('demo-email-chloe');
    assert.equal(deleted, true);

    const remaining = await getAllRegisteredUsers();
    assert.equal(remaining.length, 3);
  });

  it('supports Touch ID / Face ID Passkey sign-in only after first-time login, email verification, and profile completion', async () => {
    // 1. Before any user has logged in and completed their profile, Touch ID / Face ID is inaccessible
    assert.equal(hasEligiblePasskeyUser(), false);
    await assert.rejects(async () => {
      await usePokerStore.getState().loginWithPasskey();
    }, /Touch ID \/ Face ID is only available after you have logged in for the first time/);

    // 2. User registers with email -> unverified email is not yet eligible for Passkey
    const unverifiedUser = await usePokerStore.getState().registerUserWithEmail({
      email: 'biometric@vegas.com',
      password: 'password123',
      displayName: 'Biometric Pro',
      nickname: 'TouchIDPro',
    });
    assert.equal(isProfileEligibleForPasskey(unverifiedUser), false);
    assert.equal(hasEligiblePasskeyUser(), false);

    // 3. User verifies their email -> now eligible for Touch ID / Face ID
    const verifiedUser = await usePokerStore.getState().verifyUserEmail();
    assert.equal(isProfileEligibleForPasskey(verifiedUser), true);
    assert.equal(hasEligiblePasskeyUser(), true);

    // 4. Sign out and sign back in using Touch ID / Face ID -> restores existing account & increments loginCount
    usePokerStore.getState().logoutUser();
    assert.equal(usePokerStore.getState().userProfile, null);

    const returningUser = await usePokerStore.getState().loginWithPasskey();
    assert.equal(returningUser.uid, verifiedUser.uid);
    assert.equal(returningUser.nickname, 'TouchIDPro');
    assert.equal(returningUser.loginCount, 2);
    assert.equal(returningUser.passkeys?.length, 1);

    // 5. Enroll a second Passkey and remove the first one
    const withSecondKey = await usePokerStore.getState().registerUserPasskey('iPhone Face ID');
    assert.equal(withSecondKey?.passkeys?.length, 2);

    const firstKeyId = withSecondKey!.passkeys![0].credentialId;
    const afterRemove = await usePokerStore.getState().removeUserPasskey(firstKeyId);
    assert.equal(afterRemove?.passkeys?.length, 1);
    assert.equal(afterRemove?.passkeys?.[0].label, 'iPhone Face ID');
  });

  it('supports Touch ID / Face ID Passkey enrollment and biometric unlock for the Pit Boss Admin Console (owner-only)', async () => {
    assert.equal(hasAdminPasskeyRegistered(), false);
    assert.equal(isAdminUser(null), false);

    // Non-owner cannot register an Admin Passkey
    await assert.rejects(async () => {
      await registerAdminPasskey('Unauthorized Key');
    }, /Only a signed-in whitelisted Owner account/);

    // Sign in as whitelisted owner
    const owner = await usePokerStore.getState().loginWithGoogle({
      email: 'admin@feltsense.com',
      displayName: 'Owner Admin',
    });

    // Register Admin Touch ID / Face ID Passkey
    const adminKey = await registerAdminPasskey('MacBook Pro Touch ID', owner);
    assert.ok(adminKey.credentialId);
    assert.equal(hasAdminPasskeyRegistered(), true);
    assert.equal(isAdminUser(owner), true);

    // Lock Admin session, then unlock via Touch ID / Face ID Passkey
    lockAdminSession();
    assert.equal(isAdminUser(owner), false);

    const unlocked = await unlockAdminWithPasskey(owner);
    assert.equal(unlocked, true);
    assert.equal(isAdminUser(owner), true);
  });

  it('checks whether an email is already registered via checkEmailRegistrationStatus for progressive login', async () => {
    const unknown = await checkEmailRegistrationStatus('newplayer@vegas.com');
    assert.equal(unknown.exists, false);

    await usePokerStore.getState().registerUserWithEmail({
      email: 'newplayer@vegas.com',
      password: 'password123',
      displayName: 'Vegas Grinder',
      nickname: 'VegasGrinder',
    });

    const registered = await checkEmailRegistrationStatus('NEWPLAYER@vegas.com');
    assert.equal(registered.exists, true);
    assert.equal(registered.displayName, 'Vegas Grinder');
    assert.equal(registered.provider, 'email');
  });
});


