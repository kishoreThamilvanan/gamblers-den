'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePokerStore } from '@/lib/store';
import { AuthGateView } from '@/components/poker/AuthGateView';
import { UserProfileModal } from '@/components/poker/UserProfileModal';
import { computeReadinessGrade } from '@/lib/auth/authService';
import {
  Coins,
  Volume2,
  VolumeX,
  ArrowRight,
  Shield,
  Sparkles,
  Award,
  TrendingUp,
  TrendingDown,
  Flame,
} from 'lucide-react';
import { clsx } from 'clsx';

export default function CasinoFloorPage() {
  const { userProfile, soundMuted, toggleMute } = usePokerStore();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Global Casino Entry Authentication Gate
  if (!userProfile || userProfile.isGuest || userProfile.emailVerified === false) {
    return <AuthGateView />;
  }

  const careerBankroll = userProfile.careerBankroll ?? 2000;
  const careerStats = userProfile.careerStats || {
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

  const readiness = computeReadinessGrade(careerStats);
  const netProfit = careerStats.careerNetProfit || 0;
  const isProfitable = netProfit >= 0;

  return (
    <div className="min-h-screen w-full bg-[#07090e] text-white flex flex-col font-sans select-none relative overflow-x-hidden">
      {/* Background Ambience & Spotlights */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-emerald-600/10 blur-[130px] rounded-full" />
        <div className="absolute top-1/3 -left-40 w-[500px] h-[500px] bg-amber-500/5 blur-[150px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-600/5 blur-[140px] rounded-full" />
      </div>

      {/* Profile Modal */}
      <UserProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />

      {/* Top Resort Header */}
      <header className="relative z-20 border-b border-white/10 bg-[#0d1017]/80 backdrop-blur-md px-6 sm:px-10 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center text-black font-black text-lg italic shadow-[0_0_20px_rgba(245,158,11,0.35)]">
            GD
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-wider uppercase leading-none">
                Gambler&apos;s Den
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                Resort &amp; Casino
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">Grand Gaming Floor &bull; High-Stakes Simulation</p>
          </div>
        </div>

        {/* Header Right: Wallet Pill, Mute, Avatar */}
        <div className="flex items-center gap-3">
          {/* Live Unified Career Wallet Pill */}
          <div className="flex items-center gap-2 bg-gradient-to-r from-amber-500/10 to-emerald-500/10 border border-amber-500/30 px-3.5 py-1.5 rounded-full">
            <Coins size={15} className="text-amber-400" />
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider hidden sm:inline">
              Vault:
            </span>
            <span className="font-mono font-extrabold text-sm text-emerald-300">
              ${careerBankroll.toLocaleString()}
            </span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={toggleMute}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 transition cursor-pointer"
            title={soundMuted ? 'Unmute Casino Audio' : 'Mute Casino Audio'}
          >
            {soundMuted ? <VolumeX size={16} className="text-rose-400" /> : <Volume2 size={16} className="text-emerald-400" />}
          </button>

          {/* Profile Trigger */}
          <button
            onClick={() => setIsProfileOpen(true)}
            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-white/15 pl-1.5 pr-3 py-1.5 rounded-full transition cursor-pointer"
            title="Open Player Profile & Career Telemetry"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={userProfile.avatarUrl}
              alt={userProfile.nickname}
              className="w-6 h-6 rounded-full object-cover border border-amber-400/80"
            />
            <span className="text-xs font-bold text-amber-200 max-w-[90px] truncate">
              {userProfile.nickname}
            </span>
          </button>
        </div>
      </header>

      {/* Main Floor Content */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-6 sm:px-10 py-8 flex flex-col justify-between">
        {/* Hero Section */}
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
            <Sparkles size={13} />
            <span>Unified Casino Career Vault Active</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white uppercase">
            Choose Your Table
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Welcome to the floor of Gambler&apos;s Den. Your chips and career bankroll travel seamlessly between all rooms.
            Select a suite below to begin playing.
          </p>

          {/* Telemetry Snapshot Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Career Vault</span>
              <p className="text-lg font-black text-amber-300 font-mono mt-0.5">
                ${careerBankroll.toLocaleString()}
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">All-Time Net</span>
              <p
                className={clsx(
                  'text-lg font-black font-mono mt-0.5 flex items-center justify-center gap-1',
                  isProfitable ? 'text-emerald-400' : 'text-rose-400'
                )}
              >
                {isProfitable ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {isProfitable ? `+$${netProfit}` : `-$${Math.abs(netProfit)}`}
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Hands Logged</span>
              <p className="text-lg font-black text-white font-mono mt-0.5">
                {careerStats.totalHandsPlayed.toLocaleString()}
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Readiness</span>
              <div className="mt-0.5 flex items-center justify-center gap-1">
                <span className={clsx('px-2 py-0.5 rounded text-xs font-black uppercase border', readiness.color)}>
                  {readiness.grade}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Game Suites Showcase Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Card 1: Texas Hold'em Poker Room */}
          <div className="group relative rounded-3xl bg-gradient-to-b from-[#141d24] to-[#0d1419] border border-emerald-500/40 hover:border-emerald-400 transition-all duration-300 p-6 flex flex-col justify-between shadow-[0_10px_30px_rgba(16,185,129,0.1)] hover:shadow-[0_15px_40px_rgba(16,185,129,0.2)]">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live &bull; Open Now
                </span>
                <span className="text-2xl">♠️</span>
              </div>

              <h3 className="text-xl font-black text-white uppercase tracking-wide group-hover:text-emerald-300 transition">
                Texas Hold&apos;em
              </h3>
              <p className="text-xs text-emerald-400/90 font-bold uppercase tracking-wider mt-0.5">
                Championship Cardroom
              </p>

              <p className="text-xs text-zinc-300 leading-relaxed mt-3">
                Live casino simulation featuring 2/6/9-Max tables, adaptive bot personas, 3D peeking hole cards,
                real-time AI Coach, and post-session blunder analysis.
              </p>

              <div className="mt-5 space-y-2">
                <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                  <Shield size={13} className="text-emerald-400" />
                  <span>Configurable 2-Max, 6-Max &amp; 9-Max Tables</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                  <Award size={13} className="text-emerald-400" />
                  <span>3 Skill Tiers: Fish, Regulars, Vegas Sharks</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                  <Flame size={13} className="text-emerald-400" />
                  <span>Proactive Odds &amp; Exploitative Strategy Coach</span>
                </div>
              </div>
            </div>

            <Link
              href="/poker"
              className="mt-6 w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-lg cursor-pointer"
            >
              <span>Enter Poker Room</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Card 2: Blackjack 21 VIP Salon */}
          <div className="group relative rounded-3xl bg-gradient-to-b from-[#171422] to-[#0f0c19] border border-indigo-500/40 hover:border-indigo-400 transition-all duration-300 p-6 flex flex-col justify-between shadow-[0_10px_30px_rgba(99,102,241,0.1)] hover:shadow-[0_15px_40px_rgba(99,102,241,0.2)]">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  Live &bull; Open Now
                </span>
                <span className="text-2xl">🃏</span>
              </div>

              <h3 className="text-xl font-black text-white uppercase tracking-wide group-hover:text-indigo-300 transition">
                Blackjack 21
              </h3>
              <p className="text-xs text-indigo-400/90 font-bold uppercase tracking-wider mt-0.5">
                VIP High-Stakes Salon
              </p>

              <p className="text-xs text-zinc-300 leading-relaxed mt-3">
                Classic casino Blackjack with 6-deck shoe, dealer stands on soft 17, 3:2 payout, split hands, double
                down, insurance, and real-time Basic Strategy Advisor.
              </p>

              <div className="mt-5 space-y-2">
                <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                  <Shield size={13} className="text-indigo-400" />
                  <span>Multi-Hand Betting (1 to 3 Spots)</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                  <Award size={13} className="text-indigo-400" />
                  <span>Real-Time Basic Strategy Coach Overlay</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                  <Flame size={13} className="text-indigo-400" />
                  <span>Hi-Lo Running &amp; True Count Drills</span>
                </div>
              </div>
            </div>

            <Link
              href="/blackjack"
              className="mt-6 w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-lg cursor-pointer"
            >
              <span>Enter Blackjack Salon</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Card 3: Roulette VIP Pavilion */}
          <div className="group relative rounded-3xl bg-gradient-to-b from-[#221815] to-[#160e0c] border border-amber-500/40 hover:border-amber-400 transition-all duration-300 p-6 flex flex-col justify-between shadow-[0_10px_30px_rgba(245,158,11,0.1)] hover:shadow-[0_15px_40px_rgba(245,158,11,0.2)]">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Live &bull; Open Now
                </span>
                <span className="text-2xl">🎡</span>
              </div>

              <h3 className="text-xl font-black text-white uppercase tracking-wide group-hover:text-amber-300 transition">
                Roulette Pavilion
              </h3>
              <p className="text-xs text-amber-400/90 font-bold uppercase tracking-wider mt-0.5">
                European &amp; American Wheels
              </p>

              <p className="text-xs text-zinc-300 leading-relaxed mt-3">
                Experience authentic Roulette with 3D wheel physics, felt layout chip placement, inside and outside
                bets, hot/cold statistics, and realistic ball rattle audio.
              </p>

              <div className="mt-5 space-y-2">
                <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                  <Shield size={13} className="text-amber-400" />
                  <span>European (Single 0) &amp; American (Double 00)</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                  <Award size={13} className="text-amber-400" />
                  <span>Inside &amp; Outside Sector Payout Engine</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                  <Flame size={13} className="text-amber-400" />
                  <span>Wheel History Marquee &amp; Sector Heatmaps</span>
                </div>
              </div>
            </div>

            <Link
              href="/roulette"
              className="mt-6 w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-lg cursor-pointer"
            >
              <span>Enter Roulette Pavilion</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-white/10 pt-6 text-center text-xs text-zinc-500 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>
            Gambler&apos;s Den Resort &amp; Casino &bull; Educational Casino Simulation &bull; Simulated Currency Only
          </span>
          <span className="text-[11px] font-mono text-zinc-600">
            Owner Access: ⌘⇧A
          </span>
        </footer>
      </main>
    </div>
  );
}
