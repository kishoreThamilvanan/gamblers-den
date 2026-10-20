'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { UserProfile, AuthProviderType, LeakEntry } from '@/types/poker';
import {
  getAllRegisteredUsers,
  getStoredUserProfile,
  isAdminUser,
  isAdminEmailWhitelisted,
  getConfiguredAdminEmails,
  verifyAdminPasscode,
  lockAdminSession,
  computeReadinessGrade,
  adminUpdateUserBankroll,
  adminResetUserStats,
  adminDeleteUserAccount,
  adminPruneGuestAccounts,
  adminSeedDemoPlayers,
  isGoogleCloudAuthConfigured,
  hasAdminPasskeyRegistered,
  registerAdminPasskey,
  unlockAdminWithPasskey,
} from '@/lib/auth/authService';
import {
  ShieldAlert,
  ShieldCheck,
  Users,
  Coins,
  Flame,
  Award,
  Search,
  Download,
  RefreshCw,
  Trash2,
  Sparkles,
  Lock,
  ArrowLeft,
  CheckCircle2,
  Cloud,
  UserCheck,
  Activity,
  Sliders,
  KeyRound,
  AlertTriangle,
  Fingerprint,
} from 'lucide-react';
import { clsx } from 'clsx';

type SortField = 'lastActive' | 'bankroll' | 'hands' | 'profit' | 'evLoss';

export function AdminConsoleView() {
  const [activeUser, setActiveUser] = useState<UserProfile | null>(() => getStoredUserProfile());
  const [authorized, setAuthorized] = useState<boolean>(() => isAdminUser(getStoredUserProfile()));
  const [adminPasskeyReady, setAdminPasskeyReady] = useState<boolean>(() =>
    hasAdminPasskeyRegistered()
  );
  const [passcodeInput, setPasscodeInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [referenceNow, setReferenceNow] = useState<number>(0);

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [providerFilter, setProviderFilter] = useState<'all' | AuthProviderType>('all');
  const [sortBy, setSortBy] = useState<SortField>('lastActive');

  // Custom bankroll editor in inspector
  const [customBankrollInput, setCustomBankrollInput] = useState<string>('');

  const showNotice = (msg: string) => {
    setStatusBanner(msg);
    setTimeout(() => {
      setStatusBanner((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  const refreshUsers = async () => {
    setLoading(true);
    try {
      const current = getStoredUserProfile();
      const all = await getAllRegisteredUsers();
      setActiveUser(current);
      setAuthorized(isAdminUser(current));
      setAdminPasskeyReady(hasAdminPasskeyRegistered());
      setReferenceNow(Date.now());
      setUsers(all);
      if (all.length > 0 && !selectedUid) {
        setSelectedUid(all[0].uid);
        setCustomBankrollInput(String(all[0].careerBankroll));
      } else if (selectedUid) {
        const updatedSelected = all.find((u) => u.uid === selectedUid);
        if (updatedSelected) {
          setCustomBankrollInput(String(updatedSelected.careerBankroll));
        } else if (all.length > 0) {
          setSelectedUid(all[0].uid);
          setCustomBankrollInput(String(all[0].careerBankroll));
        } else {
          setSelectedUid(null);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    void getAllRegisteredUsers().then((all) => {
      if (!active) return;
      const current = getStoredUserProfile();
      setActiveUser(current);
      setAuthorized(isAdminUser(current));
      setAdminPasskeyReady(hasAdminPasskeyRegistered());
      setReferenceNow(Date.now());
      setUsers(all);
      if (all.length > 0) {
        setSelectedUid(all[0].uid);
        setCustomBankrollInput(String(all[0].careerBankroll));
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutSeconds((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSeconds]);

  const handleUnlockWithPasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutSeconds > 0 || isVerifying) return;
    setAuthError(null);
    setIsVerifying(true);

    try {
      let serverOk = false;
      try {
        const res = await fetch('/api/admin/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            passcode: passcodeInput,
            email: activeUser?.email,
          }),
        });

        if (res.status === 429) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          setAuthError(data.error || 'Too many failed attempts. Locked out for 60 seconds.');
          setLockoutSeconds(60);
          return;
        }

        if (res.ok) {
          serverOk = true;
        } else {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          setAuthError(data.error || 'Invalid Pit Boss Passcode.');
          return;
        }
      } catch {
        // Fallback to local evaluation if server route unavailable (offline/static)
        serverOk = verifyAdminPasscode(passcodeInput, activeUser);
      }

      if (!serverOk) {
        setAuthError('Invalid Pit Boss Passcode. Please check your credentials.');
        return;
      }

      verifyAdminPasscode(passcodeInput, activeUser);
      setPasscodeInput('');
      setAuthorized(true);
      await refreshUsers();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleUnlockWithBiometrics = async () => {
    setAuthError(null);
    try {
      const ok = await unlockAdminWithPasskey();
      if (ok) {
        setAuthorized(true);
        setAdminPasskeyReady(true);
        await refreshUsers();
      } else {
        setAuthError('Touch ID / Face ID verification did not match an authorized Admin Passkey.');
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Touch ID / Face ID unlock failed.');
    }
  };

  const handleEnrollAdminBiometrics = async () => {
    try {
      await registerAdminPasskey('Pit Boss Touch ID / Face ID');
      setAdminPasskeyReady(true);
      showNotice('Touch ID / Face ID Passkey bound to Pit Boss Admin Console!');
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Could not bind Touch ID / Face ID.');
    }
  };

  const handleLockAdmin = () => {
    void fetch('/api/admin/logout', { method: 'POST' }).catch(() => {});
    lockAdminSession();
    setAuthorized(false);
  };

  const handleSeedDemo = async () => {
    const seeded = await adminSeedDemoPlayers();
    setUsers(seeded);
    if (seeded.length > 0 && !selectedUid) {
      setSelectedUid(seeded[0].uid);
      setCustomBankrollInput(String(seeded[0].careerBankroll));
    }
    showNotice('Seeded 5 realistic cardroom player accounts into the telemetry vault.');
  };

  const handlePruneGuests = async () => {
    const count = await adminPruneGuestAccounts(false);
    await refreshUsers();
    showNotice(`Pruned ${count} guest account(s) from the vault.`);
  };

  const handleBankrollUpdate = async (uid: string, amount: number) => {
    const updated = await adminUpdateUserBankroll(uid, amount);
    if (updated) {
      setCustomBankrollInput(String(updated.careerBankroll));
      await refreshUsers();
      showNotice(`Updated ${updated.nickname}'s Career Bankroll to $${updated.careerBankroll.toFixed(0)}.`);
    }
  };

  const handleResetStats = async (uid: string) => {
    const updated = await adminResetUserStats(uid, true);
    if (updated) {
      setCustomBankrollInput(String(updated.careerBankroll));
      await refreshUsers();
      showNotice(`Reset ${updated.nickname}'s career stats and restored $2,000 bankroll.`);
    }
  };

  const handleDeleteAccount = async (uid: string, name: string) => {
    const ok = await adminDeleteUserAccount(uid);
    if (ok) {
      await refreshUsers();
      showNotice(`Deleted player account "${name}".`);
    }
  };

  const handleExportJSON = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      totalUsers: users.length,
      users,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gamblersden-users-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotice('Exported full player telemetry as JSON.');
  };

  const handleExportCSV = () => {
    const headers = [
      'UID',
      'Display Name',
      'Nickname',
      'Email',
      'Provider',
      'Is Guest',
      'Readiness Grade',
      'Career Bankroll ($)',
      'Hands Played',
      'VPIP (%)',
      'PFR (%)',
      'Career Net Profit ($)',
      'Cumulative EV Loss ($)',
      'Optimal Decisions',
      'Leaks',
      'Blunders',
      'Sessions Completed',
      'Login Count',
      'Preferred Mode',
      'Preferred Difficulty',
      'Created At',
      'Last Active At',
    ];

    const rows = users.map((u) => {
      const s = u.careerStats;
      const vpip = s.totalHandsPlayed > 0 ? Math.round((s.totalVpipHands / s.totalHandsPlayed) * 100) : 0;
      const pfr = s.totalHandsPlayed > 0 ? Math.round((s.totalPfrHands / s.totalHandsPlayed) * 100) : 0;
      const grade = computeReadinessGrade(s).grade;
      return [
        u.uid,
        `"${(u.displayName || '').replace(/"/g, '""')}"`,
        `"${(u.nickname || '').replace(/"/g, '""')}"`,
        u.email || '',
        u.provider,
        u.isGuest ? 'true' : 'false',
        grade,
        u.careerBankroll.toFixed(2),
        s.totalHandsPlayed,
        vpip,
        pfr,
        s.careerNetProfit.toFixed(2),
        s.careerEvLoss.toFixed(2),
        s.careerOptimalCount,
        s.careerLeakCount,
        s.careerBlunderCount,
        s.sessionsCompleted,
        u.loginCount || 1,
        u.preferredGameMode || 'cash',
        u.preferredDifficulty || 'beginner',
        new Date(u.createdAt).toISOString(),
        new Date(u.lastActiveAt || u.lastLoginAt).toISOString(),
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gamblersden-users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showNotice('Exported player telemetry table as CSV.');
  };

  // Aggregate Ecosystem Metrics
  const metrics = useMemo(() => {
    const dayMs = 24 * 3600 * 1000;
    let googleCount = 0;
    let emailCount = 0;
    let guestCount = 0;
    let active24h = 0;
    let totalHands = 0;
    let totalVpip = 0;
    let totalPfr = 0;
    let totalBankroll = 0;
    let totalNetProfit = 0;
    let totalEvLoss = 0;
    let totalSessions = 0;
    let cashModeCount = 0;
    let limpDrillCount = 0;

    const allLeaks: Array<LeakEntry & { playerName: string }> = [];

    for (const u of users) {
      if (u.provider === 'google') googleCount++;
      else if (u.provider === 'email') emailCount++;
      else guestCount++;

      const lastSeen = u.lastActiveAt || u.lastLoginAt || u.createdAt;
      if (referenceNow > 0 && referenceNow - lastSeen <= dayMs) active24h++;

      totalBankroll += u.careerBankroll || 0;
      const s = u.careerStats;
      totalHands += s.totalHandsPlayed || 0;
      totalVpip += s.totalVpipHands || 0;
      totalPfr += s.totalPfrHands || 0;
      totalNetProfit += s.careerNetProfit || 0;
      totalEvLoss += s.careerEvLoss || 0;
      totalSessions += s.sessionsCompleted || 0;

      if (u.preferredGameMode === 'limp_punisher') limpDrillCount++;
      else cashModeCount++;

      if (Array.isArray(s.topCareerLeaks)) {
        for (const l of s.topCareerLeaks) {
          allLeaks.push({ ...l, playerName: u.nickname });
        }
      }
    }

    allLeaks.sort((a, b) => b.evLoss - a.evLoss);

    return {
      totalUsers: users.length,
      googleCount,
      emailCount,
      guestCount,
      active24h,
      totalHands,
      avgVpip: totalHands > 0 ? Math.round((totalVpip / totalHands) * 100) : 0,
      avgPfr: totalHands > 0 ? Math.round((totalPfr / totalHands) * 100) : 0,
      totalBankroll,
      totalNetProfit,
      totalEvLoss,
      totalSessions,
      cashModeCount,
      limpDrillCount,
      topEcosystemLeaks: allLeaks.slice(0, 5),
    };
  }, [users, referenceNow]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return users
      .filter((u) => {
        if (providerFilter !== 'all' && u.provider !== providerFilter) return false;
        if (!q) return true;
        return (
          u.displayName.toLowerCase().includes(q) ||
          u.nickname.toLowerCase().includes(q) ||
          (u.email && u.email.toLowerCase().includes(q)) ||
          u.uid.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortBy === 'bankroll') return b.careerBankroll - a.careerBankroll;
        if (sortBy === 'hands') return b.careerStats.totalHandsPlayed - a.careerStats.totalHandsPlayed;
        if (sortBy === 'profit') return b.careerStats.careerNetProfit - a.careerStats.careerNetProfit;
        if (sortBy === 'evLoss') return b.careerStats.careerEvLoss - a.careerStats.careerEvLoss;
        return (b.lastActiveAt || b.lastLoginAt) - (a.lastActiveAt || a.lastLoginAt);
      });
  }, [users, searchQuery, providerFilter, sortBy]);

  const selectedUser = useMemo(
    () => users.find((u) => u.uid === selectedUid) || filteredUsers[0] || null,
    [users, selectedUid, filteredUsers]
  );

  const formatRelativeTime = (ts?: number) => {
    if (!ts || !referenceNow) return 'Just now';
    const diffSec = Math.max(0, Math.floor((referenceNow - ts) / 1000));
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  };

  // ============================================================================
  // GATE VIEW WHEN NOT AUTHORIZED AS ADMIN
  // ============================================================================
  // STRICT OWNER-ONLY GATE VIEW WHEN NOT AUTHORIZED AS ADMIN
  // ============================================================================
  const ownerWhitelisted = isAdminEmailWhitelisted(activeUser);

  if (!ownerWhitelisted) {
    return (
      <div className="min-h-screen w-full bg-[#0A0D12] text-white flex flex-col items-center justify-center p-6 font-sans select-none">
        <div className="max-w-sm w-full bg-[#121722] border border-rose-500/30 rounded-2xl p-7 shadow-2xl space-y-5 text-center">
          <div className="w-11 h-11 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
            <Lock size={20} />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-lg font-bold tracking-tight text-white">
              403 — Restricted Area
            </h1>
            <p className="text-xs text-zinc-400 leading-relaxed">
              The Pit Boss Console is strictly restricted to the verified cardroom owner account.
            </p>
          </div>
          <Link
            href="/"
            className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition"
          >
            <ArrowLeft size={14} />
            <span>Return to Cardroom</span>
          </Link>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen w-full bg-[#0A0D12] text-white flex flex-col items-center justify-center p-6 font-sans select-none">
        <div className="max-w-sm w-full bg-[#121722] border border-amber-500/30 rounded-2xl p-7 shadow-2xl space-y-5">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-bold uppercase tracking-wider">
              <ShieldAlert size={13} />
              <span>Pit Boss Security Lock</span>
            </div>
            <Link
              href="/"
              className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition"
            >
              <ArrowLeft size={13} />
              <span>Lobby</span>
            </Link>
          </div>

          <div>
            <h1 className="text-xl font-black tracking-tight text-white">
              Verify Owner Session
            </h1>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Signed in as verified owner <span className="text-white font-semibold">{activeUser?.email}</span>. Complete secondary verification to unlock the Pit Boss Console.
            </p>
          </div>

          {authError && (
            <div className="bg-rose-950/70 border border-rose-500/40 rounded-xl p-3 text-xs text-rose-200 font-medium">
              {authError}
            </div>
          )}

          {/* 1-Click Biometric Touch ID / Face ID Admin Passkey Unlock (Only shown after first login & Passkey enrollment) */}
          {adminPasskeyReady && (
            <>
              <button
                type="button"
                onClick={() => void handleUnlockWithBiometrics()}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg border border-indigo-400/30 transition cursor-pointer"
              >
                <Fingerprint size={16} className="text-indigo-200" />
                <span>Unlock with Touch ID / Face ID</span>
              </button>

              <div className="flex items-center gap-3 text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                <div className="h-px flex-1 bg-zinc-800" />
                <span>Or Pit Boss Passcode</span>
                <div className="h-px flex-1 bg-zinc-800" />
              </div>
            </>
          )}

          <form onSubmit={handleUnlockWithPasscode} className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Pit Boss Passcode
              </label>
              <div className="relative">
                <KeyRound size={15} className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={passcodeInput}
                  onChange={(e) => setPasscodeInput(e.target.value)}
                  placeholder={lockoutSeconds > 0 ? `Locked for ${lockoutSeconds}s` : "Enter secret Pit Boss passcode"}
                  disabled={lockoutSeconds > 0 || isVerifying}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={lockoutSeconds > 0 || isVerifying}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black text-xs uppercase tracking-wider transition cursor-pointer shadow-lg"
            >
              {isVerifying ? 'Verifying Credentials...' : lockoutSeconds > 0 ? `Locked Out (${lockoutSeconds}s)` : 'Unlock Pit Boss Console'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ============================================================================
  // AUTHORIZED PIT BOSS ADMIN CONSOLE
  // ============================================================================
  return (
    <div className="min-h-screen w-full bg-[#0B0E14] text-white flex flex-col font-sans">
      {/* Top Admin Header */}
      <header className="border-b border-white/10 bg-[#121722]/90 backdrop-blur-md px-6 py-4 sticky top-0 z-40 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black font-black text-base shadow-[0_0_20px_rgba(245,158,11,0.35)]">
            PB
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black tracking-wide uppercase">
                Pit Boss Admin Console
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <ShieldCheck size={11} />
                <span>Owner Verified</span>
              </span>
              <span className="hidden sm:inline-block text-[10px] font-mono bg-white/5 border border-white/10 px-2 py-0.5 rounded text-zinc-400">
                Shortcut: ⌘⇧A
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Player Telemetry, Cohort Readiness, Leak Intelligence &amp; Vault Controls
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => void handleEnrollAdminBiometrics()}
            className={clsx(
              'px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border',
              adminPasskeyReady
                ? 'bg-indigo-500/15 hover:bg-indigo-500/25 border-indigo-500/40 text-indigo-300'
                : 'bg-indigo-600 hover:bg-indigo-500 border-indigo-400/40 text-white'
            )}
            title="Bind macOS Touch ID or iOS Face ID to unlock the Pit Boss Admin Console"
          >
            <Fingerprint size={14} />
            <span>{adminPasskeyReady ? 'Touch ID / Face ID Ready' : 'Bind Touch ID / Face ID'}</span>
          </button>

          <button
            onClick={handleSeedDemo}
            className="px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            title="Populate 5 realistic demo players to explore analytics"
          >
            <Sparkles size={14} />
            <span>Seed Demo Players</span>
          </button>

          <button
            onClick={handlePruneGuests}
            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            title="Remove temporary guest accounts"
          >
            <Trash2 size={14} />
            <span>Prune Guests</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleExportJSON}
            className="px-3 py-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download size={14} />
            <span>Export JSON</span>
          </button>

          <button
            onClick={() => void refreshUsers()}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 transition cursor-pointer"
            title="Refresh Telemetry"
          >
            <RefreshCw size={15} className={clsx(loading && 'animate-spin')} />
          </button>

          <button
            onClick={handleLockAdmin}
            className="p-2 rounded-xl bg-white/5 hover:bg-rose-950/60 border border-white/10 text-zinc-400 hover:text-rose-300 transition cursor-pointer"
            title="Lock Passcode Session"
          >
            <Lock size={15} />
          </button>

          <Link
            href="/"
            className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold flex items-center gap-1.5 transition"
          >
            <ArrowLeft size={14} />
            <span>Back to Lobby</span>
          </Link>
        </div>
      </header>

      {/* Status Notice Toast */}
      {statusBanner && (
        <div className="bg-emerald-950/90 border-b border-emerald-500/40 px-6 py-2.5 text-xs text-emerald-200 font-bold flex items-center justify-center gap-2">
          <CheckCircle2 size={14} className="text-emerald-400" />
          <span>{statusBanner}</span>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6 space-y-6">
        {/* 1. Executive KPI Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#131824] border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-zinc-400 font-bold uppercase tracking-wider">
              <span>Registered Players</span>
              <Users size={15} className="text-sky-400" />
            </div>
            <div className="text-3xl font-black font-mono text-white mt-2">
              {metrics.totalUsers}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-2">
              <span className="text-sky-300 font-bold">{metrics.googleCount} Google</span>
              <span>•</span>
              <span className="text-emerald-300 font-bold">{metrics.emailCount} Email</span>
              <span>•</span>
              <span className="text-amber-300 font-bold">{metrics.guestCount} Guest</span>
            </div>
          </div>

          <div className="bg-[#131824] border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-zinc-400 font-bold uppercase tracking-wider">
              <span>Activity &amp; Volume</span>
              <Activity size={15} className="text-emerald-400" />
            </div>
            <div className="text-3xl font-black font-mono text-white mt-2">
              {metrics.totalHands}{' '}
              <span className="text-sm font-sans font-bold text-zinc-400">hands dealt</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-2">
              <span className="text-emerald-300 font-bold">{metrics.active24h} active (24h)</span>
              <span>•</span>
              <span>{metrics.totalSessions} sessions</span>
            </div>
          </div>

          <div className="bg-[#131824] border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-zinc-400 font-bold uppercase tracking-wider">
              <span>Cardroom Bankroll &amp; P/L</span>
              <Coins size={15} className="text-amber-400" />
            </div>
            <div className="text-3xl font-black font-mono text-amber-300 mt-2">
              ${metrics.totalBankroll.toFixed(0)}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-2">
              <span>Net P/L:</span>
              <span
                className={clsx(
                  'font-mono font-bold',
                  metrics.totalNetProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                )}
              >
                {metrics.totalNetProfit >= 0 ? '+' : ''}${metrics.totalNetProfit.toFixed(0)}
              </span>
            </div>
          </div>

          <div className="bg-[#131824] border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-zinc-400 font-bold uppercase tracking-wider">
              <span>Ecosystem Leaks &amp; Style</span>
              <Flame size={15} className="text-rose-400" />
            </div>
            <div className="text-3xl font-black font-mono text-rose-400 mt-2">
              -${metrics.totalEvLoss.toFixed(2)}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-2">
              <span>Avg VPIP: <strong className="text-white">{metrics.avgVpip}%</strong></span>
              <span>•</span>
              <span>Avg PFR: <strong className="text-white">{metrics.avgPfr}%</strong></span>
            </div>
          </div>
        </section>

        {/* 2. Ecosystem Leak Intelligence & Mode Preferences */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-[#131824] border border-white/10 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
                <AlertTriangle size={14} />
                <span>Top Costliest Leaks Across All Players</span>
              </h2>
              <span className="text-[11px] text-zinc-400">
                Sorted by theoretical $EV lost
              </span>
            </div>

            {metrics.topEcosystemLeaks.length === 0 ? (
              <div className="text-xs text-zinc-400 bg-zinc-900/60 border border-white/5 rounded-xl p-4">
                No player leaks recorded yet. Click <strong>Seed Demo Players</strong> above or play a few hands to populate telemetry.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {metrics.topEcosystemLeaks.map((leak, idx) => (
                  <div
                    key={`${leak.id}-${idx}`}
                    className="bg-zinc-900/90 border border-white/10 rounded-xl p-3 flex flex-col justify-between gap-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={clsx(
                            'text-[10px] font-black uppercase px-2 py-0.5 rounded',
                            leak.rating === 'Blunder'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          )}
                        >
                          {leak.rating}
                        </span>
                        <span className="text-xs font-bold text-white">
                          {leak.playerName} • {leak.street} ({leak.actionLabel})
                        </span>
                      </div>
                      <span className="text-xs font-mono font-black text-rose-400">
                        -${leak.evLoss.toFixed(2)} EV
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-2">
                      {leak.explanation}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-[#131824] border border-white/10 rounded-2xl p-5 flex flex-col justify-between gap-4">
            <div>
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                <Sliders size={14} />
                <span>Training Mode &amp; Cloud Sync Status</span>
              </h2>
              <div className="mt-4 space-y-3 text-xs">
                <div className="flex items-center justify-between bg-zinc-900/80 px-3.5 py-2.5 rounded-xl border border-white/5">
                  <span className="text-zinc-300">🎰 Standard Cash Game</span>
                  <span className="font-mono font-bold text-emerald-400">{metrics.cashModeCount} players</span>
                </div>
                <div className="flex items-center justify-between bg-zinc-900/80 px-3.5 py-2.5 rounded-xl border border-white/5">
                  <span className="text-zinc-300">🎯 Limp-Punisher Drill</span>
                  <span className="font-mono font-bold text-amber-300">{metrics.limpDrillCount} players</span>
                </div>
                <div className="flex items-center justify-between bg-zinc-900/80 px-3.5 py-2.5 rounded-xl border border-white/5">
                  <span className="text-zinc-300 flex items-center gap-1.5">
                    <Cloud size={13} className="text-sky-400" />
                    <span>Auth &amp; Storage Engine</span>
                  </span>
                  <span className="font-bold text-sky-300">
                    {isGoogleCloudAuthConfigured() ? 'GCP Firestore Live' : 'Local Cardroom Vault'}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-zinc-500 border-t border-white/10 pt-3">
              Admin Whitelist: <span className="text-zinc-300 font-mono">{getConfiguredAdminEmails().join(', ')}</span>
            </div>
          </div>
        </section>

        {/* 3. Player Directory Table + Individual Player Dossier Inspector */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left 2 Columns: Searchable, Sortable Semantic Data Table */}
          <div className="lg:col-span-2 bg-[#131824] border border-white/10 rounded-3xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <UserCheck size={16} className="text-emerald-400" />
                  <span>Player Directory ({filteredUsers.length})</span>
                </h2>
                <p className="text-xs text-zinc-400">
                  Click any player row to inspect their complete dossier, leaks, and Pit Boss bankroll controls.
                </p>
              </div>

              {/* Filter & Sort Controls */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search size={13} className="text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name, alias, email..."
                    className="bg-zinc-900 border border-zinc-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <select
                  aria-label="Filter by provider"
                  value={providerFilter}
                  onChange={(e) => setProviderFilter(e.target.value as 'all' | AuthProviderType)}
                  className="bg-zinc-900 border border-zinc-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="all">All Providers</option>
                  <option value="google">Google SSO</option>
                  <option value="passkey">Touch ID / Passkey</option>
                  <option value="email">Email</option>
                  <option value="guest">Guest Pass</option>
                </select>

                <select
                  aria-label="Sort players by"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortField)}
                  className="bg-zinc-900 border border-zinc-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="lastActive">Sort: Recently Active</option>
                  <option value="bankroll">Sort: Highest Bankroll</option>
                  <option value="hands">Sort: Most Hands</option>
                  <option value="profit">Sort: Net Profit</option>
                  <option value="evLoss">Sort: Most Leaks ($EV)</option>
                </select>
              </div>
            </div>

            {/* Responsive Semantic Table */}
            <div className="overflow-x-auto max-h-[540px] custom-scrollbar rounded-2xl border border-white/10">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-[#1A2130] text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 border-b border-white/10">
                  <tr>
                    <th className="py-3 px-4">Player</th>
                    <th className="py-3 px-3">Provider</th>
                    <th className="py-3 px-3">Grade</th>
                    <th className="py-3 px-3">Bankroll</th>
                    <th className="py-3 px-3">Hands</th>
                    <th className="py-3 px-3">VPIP / PFR</th>
                    <th className="py-3 px-3">Net P/L</th>
                    <th className="py-3 px-3">EV Loss</th>
                    <th className="py-3 px-3">Last Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-zinc-400">
                        No matching players found. Use <strong>Seed Demo Players</strong> in the top bar to populate test data.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const s = u.careerStats;
                      const vpip =
                        s.totalHandsPlayed > 0
                          ? Math.round((s.totalVpipHands / s.totalHandsPlayed) * 100)
                          : 0;
                      const pfr =
                        s.totalHandsPlayed > 0
                          ? Math.round((s.totalPfrHands / s.totalHandsPlayed) * 100)
                          : 0;
                      const gradeInfo = computeReadinessGrade(s);
                      const isSelected = selectedUser?.uid === u.uid;

                      return (
                        <tr
                          key={u.uid}
                          onClick={() => {
                            setSelectedUid(u.uid);
                            setCustomBankrollInput(String(u.careerBankroll));
                          }}
                          className={clsx(
                            'transition cursor-pointer',
                            isSelected
                              ? 'bg-emerald-500/15 hover:bg-emerald-500/20'
                              : 'hover:bg-white/5'
                          )}
                        >
                          <th scope="row" className="py-3 px-4 font-normal">
                            <div className="flex items-center gap-2.5">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={u.avatarUrl}
                                alt={u.nickname}
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '9999px',
                                  objectFit: 'cover',
                                }}
                                className="w-8 h-8 rounded-full object-cover border border-amber-400/60 shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="font-bold text-white truncate">
                                  {u.displayName}{' '}
                                  <span className="text-amber-300 font-mono text-[11px]">
                                    @{u.nickname}
                                  </span>
                                </div>
                                <div className="text-[11px] text-zinc-400 truncate">
                                  {u.email || 'Anonymous Guest Pass'}
                                </div>
                              </div>
                            </div>
                          </th>
                          <td className="py-3 px-3">
                            <span
                              className={clsx(
                                'text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border',
                                u.provider === 'google'
                                  ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                                  : u.provider === 'email'
                                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              )}
                            >
                              {u.provider}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={clsx(
                                'text-xs font-black px-2 py-0.5 rounded-lg border',
                                gradeInfo.color
                              )}
                            >
                              {gradeInfo.grade}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-amber-300">
                            ${u.careerBankroll.toFixed(0)}
                          </td>
                          <td className="py-3 px-3 font-mono text-white">
                            {s.totalHandsPlayed}
                          </td>
                          <td className="py-3 px-3 font-mono text-zinc-300">
                            {vpip}% / {pfr}%
                          </td>
                          <td
                            className={clsx(
                              'py-3 px-3 font-mono font-bold',
                              s.careerNetProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            )}
                          >
                            {s.careerNetProfit >= 0 ? '+' : ''}${s.careerNetProfit.toFixed(0)}
                          </td>
                          <td className="py-3 px-3 font-mono text-rose-400">
                            -${s.careerEvLoss.toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-zinc-400 whitespace-nowrap">
                            {formatRelativeTime(u.lastActiveAt || u.lastLoginAt)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Column: Individual Player Dossier Inspector & Pit Boss Controls */}
          <div className="bg-[#131824] border border-white/15 rounded-3xl p-5 space-y-5 sticky top-24">
            {!selectedUser ? (
              <div className="text-center py-12 text-zinc-400 text-xs">
                Select a player from the directory to inspect their full telemetry dossier and Pit Boss controls.
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedUser.avatarUrl}
                      alt={selectedUser.nickname}
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '9999px',
                        objectFit: 'cover',
                      }}
                      className="w-12 h-12 rounded-full object-cover border-2 border-amber-400"
                    />
                    <div>
                      <h3 className="text-base font-black text-white">
                        {selectedUser.displayName}
                      </h3>
                      <p className="text-xs text-amber-300 font-mono">
                        Table Alias: {selectedUser.nickname}
                      </p>
                      <p className="text-[11px] text-zinc-400">
                        {selectedUser.email || 'Guest Pass (No Email Linked)'}
                      </p>
                    </div>
                  </div>
                  <span
                    className={clsx(
                      'text-sm font-black px-2.5 py-1 rounded-xl border',
                      computeReadinessGrade(selectedUser.careerStats).color
                    )}
                  >
                    {computeReadinessGrade(selectedUser.careerStats).grade}
                  </span>
                </div>

                {/* User Metadata & Telemetry Grid */}
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="bg-zinc-900/80 border border-white/5 rounded-xl p-2.5">
                    <div className="text-[10px] text-zinc-400 uppercase font-bold">Account UID</div>
                    <div className="font-mono text-zinc-200 truncate mt-0.5" title={selectedUser.uid}>
                      {selectedUser.uid}
                    </div>
                  </div>
                  <div className="bg-zinc-900/80 border border-white/5 rounded-xl p-2.5">
                    <div className="text-[10px] text-zinc-400 uppercase font-bold">Logins / Sessions</div>
                    <div className="font-mono text-zinc-200 mt-0.5">
                      {selectedUser.loginCount || 1} logins • {selectedUser.careerStats.sessionsCompleted} sessions
                    </div>
                  </div>
                  <div className="bg-zinc-900/80 border border-white/5 rounded-xl p-2.5">
                    <div className="text-[10px] text-zinc-400 uppercase font-bold">Preferred Setup</div>
                    <div className="text-zinc-200 font-bold mt-0.5">
                      {selectedUser.preferredGameMode === 'limp_punisher' ? 'Limp-Punisher' : 'Cash Game'} •{' '}
                      {(selectedUser.preferredDifficulty || 'beginner').toUpperCase()}
                    </div>
                  </div>
                  <div className="bg-zinc-900/80 border border-white/5 rounded-xl p-2.5">
                    <div className="text-[10px] text-zinc-400 uppercase font-bold">Joined / Active</div>
                    <div className="text-zinc-200 mt-0.5">
                      {new Date(selectedUser.createdAt).toLocaleDateString()} •{' '}
                      {formatRelativeTime(selectedUser.lastActiveAt || selectedUser.lastLoginAt)}
                    </div>
                  </div>
                </div>

                {/* Decision Quality Summary */}
                <div className="bg-zinc-900/90 border border-white/10 rounded-2xl p-3.5 space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                    <span>Coaching Decision Breakdown</span>
                    <span className="text-emerald-400 font-mono">
                      {selectedUser.careerStats.totalHandsPlayed} Hands
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center pt-1">
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl py-2">
                      <div className="text-sm font-black font-mono text-emerald-300">
                        {selectedUser.careerStats.careerOptimalCount}
                      </div>
                      <div className="text-[10px] text-zinc-400 uppercase font-bold">Optimal</div>
                    </div>
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl py-2">
                      <div className="text-sm font-black font-mono text-amber-300">
                        {selectedUser.careerStats.careerLeakCount}
                      </div>
                      <div className="text-[10px] text-zinc-400 uppercase font-bold">Leaks</div>
                    </div>
                    <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl py-2">
                      <div className="text-sm font-black font-mono text-rose-300">
                        {selectedUser.careerStats.careerBlunderCount}
                      </div>
                      <div className="text-[10px] text-zinc-400 uppercase font-bold">Blunders</div>
                    </div>
                  </div>
                </div>

                {/* Player's Top Recorded Leaks */}
                <div className="space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                    <span>Recorded Player Leaks ({selectedUser.careerStats.topCareerLeaks.length})</span>
                    <span className="text-rose-400 font-mono font-bold">
                      -${selectedUser.careerStats.careerEvLoss.toFixed(2)} EV
                    </span>
                  </div>
                  {selectedUser.careerStats.topCareerLeaks.length === 0 ? (
                    <div className="text-xs text-zinc-500 bg-zinc-900/50 border border-white/5 rounded-xl p-3">
                      No coaching leaks recorded for this player.
                    </div>
                  ) : (
                    <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                      {selectedUser.careerStats.topCareerLeaks.map((leak, i) => (
                        <div
                          key={`${leak.id}-${i}`}
                          className="bg-zinc-900/90 border border-white/10 rounded-xl p-2.5 text-xs"
                        >
                          <div className="flex items-center justify-between font-bold">
                            <span className="text-amber-300">
                              Hand #{leak.handNumber} • {leak.street} ({leak.actionLabel})
                            </span>
                            <span className="text-rose-400 font-mono">
                              -${leak.evLoss.toFixed(2)}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400 mt-1 leading-snug">
                            {leak.explanation}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pit Boss Administrative Controls */}
                <div className="border-t border-white/10 pt-4 space-y-3">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Award size={13} />
                    <span>Pit Boss Account Controls</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      step={50}
                      value={customBankrollInput}
                      onChange={(e) => setCustomBankrollInput(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                      placeholder="Set bankroll ($)"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        void handleBankrollUpdate(
                          selectedUser.uid,
                          Number(customBankrollInput) || 0
                        )
                      }
                      className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase whitespace-nowrap transition cursor-pointer"
                    >
                      Set Bankroll
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        void handleBankrollUpdate(
                          selectedUser.uid,
                          selectedUser.careerBankroll + 500
                        )
                      }
                      className="py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition cursor-pointer"
                    >
                      +$500 Chip Grant
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleResetStats(selectedUser.uid)}
                      className="py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-xs font-bold transition cursor-pointer"
                    >
                      Reset Stats &amp; $2K
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      void handleDeleteAccount(selectedUser.uid, selectedUser.displayName)
                    }
                    className="w-full py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/70 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Trash2 size={13} />
                    <span>Delete Player Account</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
