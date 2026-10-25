'use client';

import React from 'react';
import {
  PocketNumber,
  RouletteBet,
  RouletteBetType,
  RouletteStatistics,
  RED_NUMBERS,
  BLACK_NUMBERS,
  PAYOUT_RATIOS,
  VOISINS_DU_ZERO,
  TIERS_DU_CYLINDRE,
  ORPHELINS,
  JEU_ZERO,
} from '@/lib/roulette/rouletteEngine';
import {
  Flame,
  Snowflake,
  Activity,
  Sparkles,
  ShieldCheck,
  Compass,
} from 'lucide-react';
import { clsx } from 'clsx';

interface RouletteReaderBoardProps {
  stats: RouletteStatistics;
  bets: Record<string, RouletteBet>;
  totalWagered: number;
  isBettingLocked: boolean;
  isSpinning: boolean;
  onPlaceBet: (
    id: string,
    type: RouletteBetType,
    label: string,
    numbers: PocketNumber[],
    multiplier: number
  ) => void;
  onSeedSpins: () => void;
  onHoverNumbers: (numbers: PocketNumber[] | null) => void;
}

export function RouletteReaderBoard({
  stats,
  bets,
  totalWagered,
  isBettingLocked,
  isSpinning,
  onPlaceBet,
  onSeedSpins,
  onHoverNumbers,
}: RouletteReaderBoardProps) {
  const hasSpins = stats.totalSpins > 0;

  // Helper to get pocket badge color styling
  const getPocketBadgeClass = (pocket: PocketNumber) => {
    if (pocket === 0 || pocket === '00') {
      return 'bg-emerald-700 border-emerald-400 text-white';
    }
    if (typeof pocket === 'number' && RED_NUMBERS.includes(pocket)) {
      return 'bg-red-700 border-red-400 text-white';
    }
    return 'bg-zinc-900 border-zinc-500 text-zinc-100';
  };

  return (
    <div className="flex flex-col gap-2.5 w-full">
      {/* 1. Compact Croupier Chip Float & Live Telemetry Header */}
      <div className="bg-zinc-950/85 border border-amber-500/35 rounded-2xl px-3 py-2 shadow-xl flex flex-wrap items-center justify-between gap-2">
        {/* Left: Compact Croupier Chip Bank Tubes */}
        <div className="flex items-center gap-2">
          <div className="text-[10px] font-black text-amber-400/90 uppercase tracking-wider flex items-center gap-1 mr-1">
            <span>Chip Float</span>
          </div>
          <div className="flex items-center gap-1.5">
            {[
              { val: '$1', color: 'bg-blue-600 border-blue-400' },
              { val: '$5', color: 'bg-red-600 border-red-400' },
              { val: '$25', color: 'bg-emerald-600 border-emerald-400' },
              { val: '$100', color: 'bg-zinc-900 border-amber-400' },
              { val: '$500', color: 'bg-purple-700 border-purple-400' },
            ].map((rack) => (
              <div
                key={rack.val}
                className="flex items-center gap-1 bg-black/60 border border-white/10 rounded-lg px-1.5 py-1"
                title={`Croupier ${rack.val} Chip Tube`}
              >
                <div className="flex flex-col gap-0.5">
                  <span className={clsx('w-3.5 h-1 rounded-full border-t', rack.color)} />
                  <span className={clsx('w-3.5 h-1 rounded-full border-t', rack.color)} />
                  <span className={clsx('w-3.5 h-1 rounded-full border-t', rack.color)} />
                </div>
                <span className="text-[10px] font-mono font-bold text-zinc-300">{rack.val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Sample Size, Table Wager & Seed 25 Spins Button */}
        <div className="flex items-center gap-2 ml-auto">
          <div className="text-[11px] font-mono text-zinc-400 bg-black/50 px-2.5 py-1 rounded-lg border border-white/5">
            Spins: <span className="text-white font-bold">{stats.totalSpins}</span>
            <span className="mx-1.5 text-zinc-700">|</span>
            Wager: <span className="text-amber-300 font-bold">${totalWagered}</span>
          </div>
          <button
            type="button"
            onClick={onSeedSpins}
            disabled={isSpinning}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/50 text-amber-300 text-[11px] font-bold transition cursor-pointer disabled:opacity-40"
            title="Populate 25 authentic casino spins into the reader board telemetry"
          >
            <Sparkles size={12} className="text-amber-400" />
            <span>Seed 25 Spins</span>
          </button>
        </div>
      </div>

      {/* 2. Main Electronic Casino Reader Board Matrix */}
      <div className="bg-zinc-950/90 border-2 border-amber-500/40 rounded-2xl p-3 shadow-[0_12px_35px_rgba(0,0,0,0.75)] space-y-2.5">
        {/* Reader Board Top Title Strip */}
        <div className="flex items-center justify-between border-b border-zinc-800/90 pb-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-amber-300">
            <Activity size={13} className="text-amber-400" />
            <span>Monte Carlo Live Telemetry & Reader Board</span>
          </div>
          <span className="text-[10px] text-zinc-400 italic hidden sm:inline">
            Click any stat, number, or sector to place chip • Hover to illuminate wheel
          </span>
        </div>

        {/* Row A: Even-Money Percentage Split Bars (Red/Zero/Black, Even/Odd, Low/High) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* 1. Red / Zero / Black Distribution */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-2 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-bold mb-1">
              <button
                type="button"
                disabled={isBettingLocked}
                onClick={() => onPlaceBet('red', 'red', 'RED', [...RED_NUMBERS], PAYOUT_RATIOS.red)}
                onMouseEnter={() => onHoverNumbers([...RED_NUMBERS])}
                onMouseLeave={() => onHoverNumbers(null)}
                className="text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span>RED {hasSpins ? `${stats.redPercentage}%` : '—'}</span>
              </button>
              <span className="text-emerald-400 font-mono">
                0: {hasSpins ? `${stats.greenPercentage}%` : '—'}
              </span>
              <button
                type="button"
                disabled={isBettingLocked}
                onClick={() => onPlaceBet('black', 'black', 'BLACK', [...BLACK_NUMBERS], PAYOUT_RATIOS.black)}
                onMouseEnter={() => onHoverNumbers([...BLACK_NUMBERS])}
                onMouseLeave={() => onHoverNumbers(null)}
                className="text-zinc-200 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <span>BLK {hasSpins ? `${stats.blackPercentage}%` : '—'}</span>
                <span className="w-2 h-2 rounded-full bg-zinc-400" />
              </button>
            </div>
            <div className="h-2.5 w-full rounded-full overflow-hidden flex bg-zinc-950 border border-zinc-800">
              <div
                style={{ width: `${hasSpins ? stats.redPercentage : 48.6}%` }}
                className="bg-gradient-to-r from-red-700 to-red-500 transition-all duration-500"
              />
              <div
                style={{ width: `${hasSpins ? stats.greenPercentage : 2.8}%` }}
                className="bg-emerald-500 transition-all duration-500"
              />
              <div
                style={{ width: `${hasSpins ? stats.blackPercentage : 48.6}%` }}
                className="bg-gradient-to-r from-zinc-700 to-zinc-900 transition-all duration-500"
              />
            </div>
          </div>

          {/* 2. Even vs Odd Distribution */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-2 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-bold mb-1">
              <button
                type="button"
                disabled={isBettingLocked}
                onClick={() =>
                  onPlaceBet(
                    'even',
                    'even',
                    'EVEN',
                    [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36],
                    PAYOUT_RATIOS.even
                  )
                }
                onMouseEnter={() =>
                  onHoverNumbers([2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36])
                }
                onMouseLeave={() => onHoverNumbers(null)}
                className="text-sky-400 hover:text-sky-300 cursor-pointer"
              >
                EVEN {hasSpins ? `${stats.evenPercentage}%` : '—'}
              </button>
              <span className="text-zinc-500 text-[9px] font-mono">PARITY</span>
              <button
                type="button"
                disabled={isBettingLocked}
                onClick={() =>
                  onPlaceBet(
                    'odd',
                    'odd',
                    'ODD',
                    [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35],
                    PAYOUT_RATIOS.odd
                  )
                }
                onMouseEnter={() =>
                  onHoverNumbers([1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35])
                }
                onMouseLeave={() => onHoverNumbers(null)}
                className="text-amber-400 hover:text-amber-300 cursor-pointer"
              >
                ODD {hasSpins ? `${stats.oddPercentage}%` : '—'}
              </button>
            </div>
            <div className="h-2.5 w-full rounded-full overflow-hidden flex bg-zinc-950 border border-zinc-800">
              <div
                style={{ width: `${hasSpins ? stats.evenPercentage : 50}%` }}
                className="bg-gradient-to-r from-sky-600 to-sky-400 transition-all duration-500"
              />
              <div
                style={{ width: `${hasSpins ? stats.oddPercentage : 50}%` }}
                className="bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-500"
              />
            </div>
          </div>

          {/* 3. Low (1-18) vs High (19-36) Distribution */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-2 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-bold mb-1">
              <button
                type="button"
                disabled={isBettingLocked}
                onClick={() =>
                  onPlaceBet(
                    'low',
                    'low',
                    '1-18',
                    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
                    PAYOUT_RATIOS.low
                  )
                }
                onMouseEnter={() =>
                  onHoverNumbers([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18])
                }
                onMouseLeave={() => onHoverNumbers(null)}
                className="text-violet-400 hover:text-violet-300 cursor-pointer"
              >
                1-18 {hasSpins ? `${stats.lowPercentage}%` : '—'}
              </button>
              <span className="text-zinc-500 text-[9px] font-mono">HIGH / LOW</span>
              <button
                type="button"
                disabled={isBettingLocked}
                onClick={() =>
                  onPlaceBet(
                    'high',
                    'high',
                    '19-36',
                    [19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36],
                    PAYOUT_RATIOS.high
                  )
                }
                onMouseEnter={() =>
                  onHoverNumbers([19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36])
                }
                onMouseLeave={() => onHoverNumbers(null)}
                className="text-teal-400 hover:text-teal-300 cursor-pointer"
              >
                19-36 {hasSpins ? `${stats.highPercentage}%` : '—'}
              </button>
            </div>
            <div className="h-2.5 w-full rounded-full overflow-hidden flex bg-zinc-950 border border-zinc-800">
              <div
                style={{ width: `${hasSpins ? stats.lowPercentage : 50}%` }}
                className="bg-gradient-to-r from-violet-600 to-violet-400 transition-all duration-500"
              />
              <div
                style={{ width: `${hasSpins ? stats.highPercentage : 50}%` }}
                className="bg-gradient-to-r from-teal-600 to-teal-400 transition-all duration-500"
              />
            </div>
          </div>
        </div>

        {/* Row B: Dozens (1st/2nd/3rd 12) & Columns (Col 1/2/3) Percentage Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Dozens Breakdown */}
          <div className="bg-zinc-900/75 border border-zinc-800/90 rounded-xl p-2">
            <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Dozens Distribution (2:1)</span>
              <span className="font-mono text-zinc-500">1-12 • 13-24 • 25-36</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                {
                  id: 'dozen-1',
                  label: '1st 12',
                  pct: stats.dozen1Percentage,
                  count: stats.dozen1Count,
                  nums: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as PocketNumber[],
                },
                {
                  id: 'dozen-2',
                  label: '2nd 12',
                  pct: stats.dozen2Percentage,
                  count: stats.dozen2Count,
                  nums: [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24] as PocketNumber[],
                },
                {
                  id: 'dozen-3',
                  label: '3rd 12',
                  pct: stats.dozen3Percentage,
                  count: stats.dozen3Count,
                  nums: [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36] as PocketNumber[],
                },
              ].map((d) => (
                <button
                  key={d.id}
                  type="button"
                  disabled={isBettingLocked}
                  onClick={() => onPlaceBet(d.id, 'dozen', d.label, d.nums, PAYOUT_RATIOS.dozen)}
                  onMouseEnter={() => onHoverNumbers(d.nums)}
                  onMouseLeave={() => onHoverNumbers(null)}
                  className="bg-zinc-950 hover:bg-zinc-800/80 border border-amber-500/30 rounded-lg p-1.5 text-left transition relative group cursor-pointer"
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-amber-200">{d.label}</span>
                    <span className="font-mono font-black text-white">
                      {hasSpins ? `${d.pct}%` : '32%'}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${hasSpins ? d.pct : 32.4}%` }}
                      className="h-full bg-amber-400 transition-all duration-500"
                    />
                  </div>
                  {bets[d.id] && (
                    <span className="absolute -top-1.5 -right-1 bg-amber-400 text-black text-[8px] font-black px-1 rounded-full">
                      ${bets[d.id].amount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Columns Breakdown */}
          <div className="bg-zinc-900/75 border border-zinc-800/90 rounded-xl p-2">
            <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Columns Distribution (2:1)</span>
              <span className="font-mono text-zinc-500">Col 1 • Col 2 • Col 3</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                {
                  id: 'col-1',
                  label: 'Col 1',
                  pct: stats.column1Percentage,
                  count: stats.column1Count,
                  nums: [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34] as PocketNumber[],
                },
                {
                  id: 'col-2',
                  label: 'Col 2',
                  pct: stats.column2Percentage,
                  count: stats.column2Count,
                  nums: [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35] as PocketNumber[],
                },
                {
                  id: 'col-3',
                  label: 'Col 3',
                  pct: stats.column3Percentage,
                  count: stats.column3Count,
                  nums: [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36] as PocketNumber[],
                },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  disabled={isBettingLocked}
                  onClick={() => onPlaceBet(c.id, 'column', c.label, c.nums, PAYOUT_RATIOS.column)}
                  onMouseEnter={() => onHoverNumbers(c.nums)}
                  onMouseLeave={() => onHoverNumbers(null)}
                  className="bg-zinc-950 hover:bg-zinc-800/80 border border-amber-500/30 rounded-lg p-1.5 text-left transition relative group cursor-pointer"
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-amber-200">{c.label}</span>
                    <span className="font-mono font-black text-white">
                      {hasSpins ? `${c.pct}%` : '32%'}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${hasSpins ? c.pct : 32.4}%` }}
                      className="h-full bg-emerald-400 transition-all duration-500"
                    />
                  </div>
                  {bets[c.id] && (
                    <span className="absolute -top-1.5 -right-1 bg-amber-400 text-black text-[8px] font-black px-1 rounded-full">
                      ${bets[c.id].amount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Row C: Hot 🔥 & Cold ❄️ Numbers + Wheel Sector % */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
          {/* Hot Numbers (4 Cols) */}
          <div className="md:col-span-4 bg-zinc-900/85 border border-rose-500/30 rounded-xl p-2">
            <div className="flex items-center justify-between text-[10px] font-bold text-rose-400 mb-1.5">
              <span className="flex items-center gap-1">
                <Flame size={12} className="text-rose-400" />
                HOT NUMBERS
              </span>
              <span className="text-[9px] text-zinc-500 font-mono">35:1</span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {(hasSpins ? stats.hotNumbers.slice(0, 4) : [
                { pocket: 17 as PocketNumber, count: 0 },
                { pocket: 23 as PocketNumber, count: 0 },
                { pocket: 7 as PocketNumber, count: 0 },
                { pocket: 32 as PocketNumber, count: 0 },
              ]).map((item) => {
                const betKey = `straight-${item.pocket}`;
                return (
                  <button
                    key={`hot-${item.pocket}`}
                    type="button"
                    disabled={isBettingLocked}
                    onClick={() =>
                      onPlaceBet(betKey, 'straight', String(item.pocket), [item.pocket], PAYOUT_RATIOS.straight)
                    }
                    onMouseEnter={() => onHoverNumbers([item.pocket])}
                    onMouseLeave={() => onHoverNumbers(null)}
                    className={clsx(
                      'py-1 rounded-lg border flex flex-col items-center justify-center transition hover:scale-105 relative cursor-pointer',
                      getPocketBadgeClass(item.pocket)
                    )}
                    title={`Bet straight-up on Hot #${item.pocket} (${item.count} hits)`}
                  >
                    <span className="text-xs font-black leading-none">{item.pocket}</span>
                    <span className="text-[9px] font-mono opacity-85 mt-0.5">
                      {hasSpins ? `${item.count}x` : 'Hot'}
                    </span>
                    {bets[betKey] && (
                      <span className="absolute -top-1.5 -right-1 bg-amber-400 text-black text-[8px] font-black px-1 rounded-full">
                        ${bets[betKey].amount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cold Numbers (4 Cols) */}
          <div className="md:col-span-4 bg-zinc-900/85 border border-sky-500/30 rounded-xl p-2">
            <div className="flex items-center justify-between text-[10px] font-bold text-sky-400 mb-1.5">
              <span className="flex items-center gap-1">
                <Snowflake size={12} className="text-sky-400" />
                COLD / DUE
              </span>
              <span className="text-[9px] text-zinc-500 font-mono">35:1</span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {(hasSpins ? stats.coldNumbers.slice(0, 4) : [
                { pocket: 0 as PocketNumber, count: 0 },
                { pocket: 13 as PocketNumber, count: 0 },
                { pocket: 6 as PocketNumber, count: 0 },
                { pocket: 34 as PocketNumber, count: 0 },
              ]).map((item) => {
                const betKey = `straight-${item.pocket}`;
                return (
                  <button
                    key={`cold-${item.pocket}`}
                    type="button"
                    disabled={isBettingLocked}
                    onClick={() =>
                      onPlaceBet(betKey, 'straight', String(item.pocket), [item.pocket], PAYOUT_RATIOS.straight)
                    }
                    onMouseEnter={() => onHoverNumbers([item.pocket])}
                    onMouseLeave={() => onHoverNumbers(null)}
                    className={clsx(
                      'py-1 rounded-lg border flex flex-col items-center justify-center transition hover:scale-105 relative cursor-pointer',
                      getPocketBadgeClass(item.pocket)
                    )}
                    title={`Bet straight-up on Cold #${item.pocket} (${item.count} hits)`}
                  >
                    <span className="text-xs font-black leading-none">{item.pocket}</span>
                    <span className="text-[9px] font-mono opacity-85 mt-0.5">
                      {hasSpins ? `${item.count}x` : 'Due'}
                    </span>
                    {bets[betKey] && (
                      <span className="absolute -top-1.5 -right-1 bg-amber-400 text-black text-[8px] font-black px-1 rounded-full">
                        ${bets[betKey].amount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* French Wheel Sector Hit Rates (4 Cols) */}
          <div className="md:col-span-4 bg-zinc-900/85 border border-amber-500/30 rounded-xl p-2">
            <div className="flex items-center justify-between text-[10px] font-bold text-amber-300 mb-1.5">
              <span className="flex items-center gap-1">
                <Compass size={12} className="text-amber-400" />
                WHEEL SECTORS
              </span>
              <span className="text-[9px] text-zinc-500 font-mono">Hover Wheel</span>
            </div>
            <div className="grid grid-cols-2 gap-1">
              {[
                {
                  id: 'call-voisins',
                  type: 'voisins' as const,
                  label: 'Voisins',
                  pct: stats.voisinsPercentage,
                  base: '46%',
                  nums: [...VOISINS_DU_ZERO],
                  mult: PAYOUT_RATIOS.voisins,
                },
                {
                  id: 'call-tiers',
                  type: 'tiers' as const,
                  label: 'Tiers',
                  pct: stats.tiersPercentage,
                  base: '32%',
                  nums: [...TIERS_DU_CYLINDRE],
                  mult: PAYOUT_RATIOS.tiers,
                },
                {
                  id: 'call-orphelins',
                  type: 'orphelins' as const,
                  label: 'Orphelins',
                  pct: stats.orphelinsPercentage,
                  base: '22%',
                  nums: [...ORPHELINS],
                  mult: PAYOUT_RATIOS.orphelins,
                },
                {
                  id: 'call-jeuzero',
                  type: 'jeuzero' as const,
                  label: 'Jeu Zéro',
                  pct: stats.jeuzeroPercentage,
                  base: '19%',
                  nums: [...JEU_ZERO],
                  mult: PAYOUT_RATIOS.jeuzero,
                },
              ].map((sec) => (
                <button
                  key={sec.id}
                  type="button"
                  disabled={isBettingLocked}
                  onClick={() => onPlaceBet(sec.id, sec.type, sec.label, sec.nums, sec.mult)}
                  onMouseEnter={() => onHoverNumbers(sec.nums)}
                  onMouseLeave={() => onHoverNumbers(null)}
                  className="bg-zinc-950 hover:bg-amber-950/50 border border-amber-500/30 rounded px-1.5 py-1 flex items-center justify-between text-[10px] transition relative cursor-pointer"
                >
                  <span className="font-bold text-amber-200 truncate">{sec.label}</span>
                  <span className="font-mono font-black text-white ml-1">
                    {hasSpins ? `${sec.pct}%` : sec.base}
                  </span>
                  {bets[sec.id] && (
                    <span className="absolute -top-1.5 -right-1 bg-amber-400 text-black text-[8px] font-black px-1 rounded-full">
                      ${bets[sec.id].amount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Status Footer inside Reader Board */}
        <div className="bg-black/50 border border-amber-500/20 rounded-xl px-3 py-1.5 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 text-amber-200/90">
            <ShieldCheck size={13} className="text-amber-400 shrink-0" />
            <span className="truncate">
              {isBettingLocked
                ? 'Rien ne va plus — No more bets permitted for this spin.'
                : 'Click any Hot/Cold number, Dozen, or Sector above or on the felt below to wager.'}
            </span>
          </div>
          {stats.currentStreak && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 font-black text-[10px] shrink-0 ml-2">
              🔥 {stats.currentStreak.label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
