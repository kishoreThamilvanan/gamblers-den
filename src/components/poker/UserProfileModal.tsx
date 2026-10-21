'use client';

import React, { useState } from 'react';
import { usePokerStore } from '@/lib/store';
import {
  HERO_AVATAR_PRESETS,
  isGoogleCloudAuthConfigured,
  computeReadinessGrade,
  isProfileEligibleForPasskey,
} from '@/lib/auth/authService';
import {
  X, User, Award, Coins, ShieldCheck, LogOut, Flame, Sparkles, Check, Cloud, Fingerprint, Trash2
} from 'lucide-react';
import { clsx } from 'clsx';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const {
    userProfile,
    updateUserIdentity,
    upgradeGuestUser,
    registerUserPasskey,
    removeUserPasskey,
    logoutUser,
  } = usePokerStore();

  const [activeTab, setActiveTab] = useState<'career' | 'identity' | 'account'>('career');
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [nickname, setNickname] = useState(userProfile?.nickname || '');
  const [selectedAvatar, setSelectedAvatar] = useState(userProfile?.avatarUrl || HERO_AVATAR_PRESETS[0].url);
  const [savedNotice, setSavedNotice] = useState(false);

  // Guest upgrade fields
  const [upgradeEmail, setUpgradeEmail] = useState('');
  const [upgradePassword, setUpgradePassword] = useState('');
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);
  const [passkeyNotice, setPasskeyNotice] = useState<string | null>(null);

  if (!isOpen || !userProfile) return null;

  const stats = userProfile.careerStats;
  const totalDecisions = stats.careerOptimalCount + stats.careerLeakCount + stats.careerBlunderCount;
  const optimalPct = totalDecisions > 0 ? Math.round((stats.careerOptimalCount / totalDecisions) * 100) : 100;
  const vpipPct = stats.totalHandsPlayed > 0 ? Math.round((stats.totalVpipHands / stats.totalHandsPlayed) * 100) : 0;
  const pfrPct = stats.totalHandsPlayed > 0 ? Math.round((stats.totalPfrHands / stats.totalHandsPlayed) * 100) : 0;
  const careerTheoreticalEv = stats.careerNetProfit + stats.careerEvLoss;
  const careerGrade = computeReadinessGrade(stats);

  const handleSaveIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateUserIdentity({
      displayName: displayName.trim() || userProfile.displayName,
      nickname: nickname.trim() || userProfile.nickname,
      avatarUrl: selectedAvatar,
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  const handleUpgradeWithGoogle = async () => {
    setUpgradeError(null);
    try {
      await upgradeGuestUser({
        provider: 'google',
        email: upgradeEmail.trim() || `${userProfile.nickname.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
        displayName: displayName.trim() || userProfile.displayName,
        nickname: nickname.trim() || userProfile.nickname,
        avatarUrl: selectedAvatar,
      });
      setUpgradeSuccess(true);
    } catch (err) {
      setUpgradeError(err instanceof Error ? err.message : 'Upgrade failed.');
    }
  };

  const handleUpgradeWithEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpgradeError(null);
    try {
      await upgradeGuestUser({
        provider: 'email',
        email: upgradeEmail,
        password: upgradePassword,
        displayName: displayName.trim() || userProfile.displayName,
        nickname: nickname.trim() || userProfile.nickname,
        avatarUrl: selectedAvatar,
      });
      setUpgradeSuccess(true);
    } catch (err) {
      setUpgradeError(err instanceof Error ? err.message : 'Upgrade failed.');
    }
  };

  const handleRegisterPasskey = async () => {
    setUpgradeError(null);
    setPasskeyNotice(null);
    try {
      await registerUserPasskey('Touch ID / Face ID Passkey');
      setPasskeyNotice('Touch ID / Face ID Passkey linked to your account!');
    } catch (err) {
      setUpgradeError(err instanceof Error ? err.message : 'Passkey registration failed.');
    }
  };

  const handleRemovePasskey = async (credentialId: string) => {
    setUpgradeError(null);
    await removeUserPasskey(credentialId);
    setPasskeyNotice('Passkey removed.');
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div
        className="bg-[#121620] border border-white/15 rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl text-white flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Profile Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={userProfile.avatarUrl}
              alt={userProfile.nickname}
              style={{ width: '54px', height: '54px', borderRadius: '9999px', objectFit: 'cover' }}
              className="w-13 h-13 rounded-full object-cover border-2 border-amber-400 shadow-lg"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  {userProfile.displayName}
                </h2>
                <span
                  className={clsx(
                    'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border',
                    userProfile.isGuest
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                      : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                  )}
                >
                  {userProfile.isGuest ? 'Guest Pass' : `${userProfile.provider.toUpperCase()} Member`}
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Table Alias: <span className="text-amber-300 font-bold">{userProfile.nickname}</span>
                {userProfile.email ? ` • ${userProfile.email}` : ''}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 gap-2 bg-zinc-900/90 p-1 rounded-2xl border border-zinc-800">
          <button
            onClick={() => setActiveTab('career')}
            className={clsx(
              'py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer',
              activeTab === 'career' ? 'bg-emerald-600 text-white shadow' : 'text-zinc-400 hover:text-white'
            )}
          >
            <Award size={14} />
            <span>Career &amp; Bankroll</span>
          </button>
          <button
            onClick={() => {
              setDisplayName(userProfile.displayName);
              setNickname(userProfile.nickname);
              setSelectedAvatar(userProfile.avatarUrl);
              setActiveTab('identity');
            }}
            className={clsx(
              'py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer',
              activeTab === 'identity' ? 'bg-emerald-600 text-white shadow' : 'text-zinc-400 hover:text-white'
            )}
          >
            <User size={14} />
            <span>Table Identity</span>
          </button>
          <button
            onClick={() => setActiveTab('account')}
            className={clsx(
              'py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer',
              activeTab === 'account' ? 'bg-emerald-600 text-white shadow' : 'text-zinc-400 hover:text-white'
            )}
          >
            <ShieldCheck size={14} />
            <span>{userProfile.isGuest ? 'Upgrade Account' : 'Account & Cloud'}</span>
          </button>
        </div>

        {/* TAB 1: Career Bankroll & Lifetime Stats */}
        {activeTab === 'career' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-zinc-900/80 border border-amber-500/30 rounded-2xl p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                  <Coins size={12} />
                  <span>Career Bankroll</span>
                </span>
                <div className="text-2xl font-black font-mono text-white mt-1">
                  ${userProfile.careerBankroll.toFixed(2)}
                </div>
                <span className="text-[10px] text-zinc-400 block mt-0.5">
                  Started at $2,000.00
                </span>
              </div>

              <div className="bg-zinc-900/80 border border-white/10 rounded-2xl p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                  Lifetime Net Profit vs. $EV
                </span>
                <div
                  className={clsx(
                    'text-xl font-black font-mono mt-1',
                    stats.careerNetProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  )}
                >
                  {stats.careerNetProfit >= 0 ? '+' : '-'}${Math.abs(stats.careerNetProfit).toFixed(2)}
                </div>
                <span className="text-[10px] text-sky-400 font-mono block mt-0.5">
                  Leak-Free EV: {careerTheoreticalEv >= 0 ? '+' : '-'}${Math.abs(careerTheoreticalEv).toFixed(2)}
                </span>
              </div>

              <div className={clsx('rounded-2xl p-4 border flex items-center justify-between', careerGrade.color)}>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">
                    Career Grade
                  </span>
                  <span className="text-xs font-bold block mt-1">{careerGrade.label}</span>
                  <span className="text-[10px] opacity-75 block mt-0.5">{optimalPct}% Optimal</span>
                </div>
                <div className="text-3xl font-black font-mono">{careerGrade.grade}</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 text-center">
                <span className="text-[10px] text-zinc-400 uppercase font-bold block">Hands Played</span>
                <span className="text-lg font-black text-white font-mono">{stats.totalHandsPlayed}</span>
              </div>
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 text-center">
                <span className="text-[10px] text-zinc-400 uppercase font-bold block">Lifetime VPIP</span>
                <span className="text-lg font-black text-emerald-400 font-mono">{vpipPct}%</span>
              </div>
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 text-center">
                <span className="text-[10px] text-zinc-400 uppercase font-bold block">Lifetime PFR</span>
                <span className="text-lg font-black text-amber-400 font-mono">{pfrPct}%</span>
              </div>
            </div>

            {/* Top Career Leaks */}
            <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                  <Flame size={14} />
                  <span>Career Leak Bank ({stats.topCareerLeaks.length})</span>
                </span>
                <span className="text-xs font-mono text-rose-300 font-bold">
                  Total EV Lost: -${stats.careerEvLoss.toFixed(2)}
                </span>
              </div>

              {stats.topCareerLeaks.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {stats.topCareerLeaks.slice(0, 5).map((leak) => (
                    <div
                      key={leak.id}
                      className="p-2.5 rounded-xl bg-black/50 border border-rose-500/20 flex items-start justify-between gap-3 text-xs"
                    >
                      <div>
                        <span className="font-bold text-white">
                          Hand #{leak.handNumber} ({leak.street}) • {leak.actionLabel}
                        </span>
                        <p className="text-[11px] text-zinc-400 mt-0.5">{leak.explanation}</p>
                      </div>
                      <span className="font-mono font-black text-rose-400 shrink-0">
                        -${leak.evLoss.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-400 py-2">
                  No major EV leaks recorded on your profile yet. Keep playing disciplined TAG poker!
                </p>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Table Identity & Avatar Customizer */}
        {activeTab === 'identity' && (
          <form onSubmit={handleSaveIdentity} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                  Table Seat Nickname (Shown on Felt)
                </label>
                <input
                  type="text"
                  required
                  maxLength={18}
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                Choose Your Cardroom Avatar
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
                {HERO_AVATAR_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedAvatar(preset.url)}
                    className={clsx(
                      'flex flex-col items-center gap-1 p-1.5 rounded-xl border transition cursor-pointer',
                      selectedAvatar === preset.url
                        ? 'bg-amber-500/20 border-amber-400'
                        : 'bg-zinc-900/60 border-zinc-800 opacity-70 hover:opacity-100'
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preset.url}
                      alt={preset.label}
                      style={{ width: '40px', height: '40px', borderRadius: '9999px', objectFit: 'cover' }}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <span className="text-[9px] text-zinc-300 truncate w-full text-center">
                      {preset.label.split(' ')[0]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              {savedNotice && (
                <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                  <Check size={14} />
                  <span>Table identity updated!</span>
                </span>
              )}
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider shadow-lg transition cursor-pointer"
              >
                Save Table Identity
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: Account Security, Guest Upgrade & Sign Out */}
        {activeTab === 'account' && (
          <div className="space-y-4">
            {userProfile.isGuest ? (
              <div className="bg-gradient-to-b from-amber-950/40 to-zinc-900 border border-amber-500/40 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-amber-300 font-extrabold text-xs uppercase tracking-wider">
                  <Sparkles size={15} />
                  <span>Upgrade Guest Account — Keep All Stats &amp; ${userProfile.careerBankroll.toFixed(0)} Bankroll</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Link your current Guest session to a permanent Google or Email account so your career bankroll, readiness grade, and saved tables are permanently backed up.
                </p>

                {upgradeError && (
                  <div className="p-2 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs">
                    {upgradeError}
                  </div>
                )}

                {upgradeSuccess && (
                  <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
                    Account successfully upgraded!
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleUpgradeWithGoogle}
                  className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 font-extrabold text-xs flex items-center justify-center gap-2 shadow cursor-pointer"
                >
                  <span>Link with Google (1-Click Upgrade)</span>
                </button>

                <form onSubmit={handleUpgradeWithEmail} className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                  <input
                    type="email"
                    required
                    placeholder="Email address"
                    value={upgradeEmail}
                    onChange={(e) => setUpgradeEmail(e.target.value)}
                    className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Password (6+ chars)"
                    value={upgradePassword}
                    onChange={(e) => setUpgradePassword(e.target.value)}
                    className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                  <button
                    type="submit"
                    className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider cursor-pointer"
                  >
                    Link Email
                  </button>
                </form>
              </div>
            ) : (
              <div className="bg-zinc-900/80 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <Cloud size={14} />
                    <span>
                      {isGoogleCloudAuthConfigured()
                        ? 'Synced with Google Cloud Identity & Firestore'
                        : 'Verified Member Account (Local & Cloud Ready)'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Signed in as <strong className="text-white">{userProfile.email || userProfile.displayName}</strong> via{' '}
                    <span className="uppercase font-mono text-zinc-300">{userProfile.provider}</span>.
                  </p>
                </div>
              </div>
            )}

            {/* Touch ID / Face ID Biometric Passkeys Section */}
            <div className="bg-zinc-900/90 border border-indigo-500/30 rounded-2xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-extrabold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Fingerprint size={15} />
                    <span>Touch ID &amp; Face ID Passkeys</span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {isProfileEligibleForPasskey(userProfile)
                      ? "Link your device's biometric sensor for 1-click sign-in without passwords."
                      : 'Sign in with a permanent account and complete your profile information (email, display name, and table alias) to enable Touch ID / Face ID.'}
                  </p>
                </div>
                {isProfileEligibleForPasskey(userProfile) && (
                  <button
                    type="button"
                    onClick={() => void handleRegisterPasskey()}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow transition cursor-pointer shrink-0"
                  >
                    <Fingerprint size={14} />
                    <span>Add Touch ID / Face ID</span>
                  </button>
                )}
              </div>

              {passkeyNotice && (
                <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
                  {passkeyNotice}
                </div>
              )}

              {Array.isArray(userProfile.passkeys) && userProfile.passkeys.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {userProfile.passkeys.map((pk) => (
                    <div
                      key={pk.credentialId}
                      className="flex items-center justify-between bg-zinc-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Fingerprint size={13} className="text-indigo-400" />
                        <span className="font-bold text-white">{pk.label}</span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          ({pk.credentialId.slice(0, 10)}…)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleRemovePasskey(pk.credentialId)}
                        className="text-zinc-500 hover:text-rose-400 transition cursor-pointer"
                        title="Remove Passkey"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <span className="text-[11px] text-zinc-500">
                Signing out returns to the Cardroom Login Gate. Your account stats remain saved.
              </span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  logoutUser();
                }}
                className="px-4 py-2 rounded-xl bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-500/40 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <LogOut size={13} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
