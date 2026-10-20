'use client';

import React from 'react';
import { Player } from '@/types/poker';
import { getPersonaById } from '@/lib/poker/personas';
import { X, Crosshair, Eye } from 'lucide-react';
import { clsx } from 'clsx';

interface OpponentDossierModalProps {
  player: Player | null;
  onClose: () => void;
}

export function OpponentDossierModal({ player, onClose }: OpponentDossierModalProps) {
  if (!player) return null;

  const persona = player.personaId ? getPersonaById(player.personaId) : undefined;

  const archetypeBadgeColor =
    player.archetype === 'CallingStation'
      ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
      : player.archetype === 'Nit'
      ? 'bg-zinc-700/60 text-zinc-200 border-zinc-500/40'
      : player.archetype === 'AggroFish'
      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div
        className="bg-[#11151e] border border-amber-500/40 rounded-2xl p-5 max-w-md w-full shadow-[0_25px_70px_rgba(0,0,0,0.9)] text-slate-100 flex flex-col gap-4 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-start justify-between border-b border-zinc-800 pb-3.5">
          <div className="flex items-center gap-3">
            {player.avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={player.avatarUrl}
                alt={player.name}
                style={{ width: '52px', height: '52px', borderRadius: '9999px', objectFit: 'cover' }}
                className="w-13 h-13 rounded-full border-2 border-amber-400/70 shadow-lg"
              />
            ) : (
              <div className="w-13 h-13 rounded-full bg-zinc-800 border-2 border-amber-400/70 flex items-center justify-center font-black text-base text-white">
                {player.name.slice(0, 2)}
              </div>
            )}

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">{player.name}</h3>
                <span className="text-[10px] font-mono bg-zinc-800 text-amber-300 px-1.5 py-0.5 rounded border border-zinc-700 font-bold">
                  {player.position}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={clsx('text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border', archetypeBadgeColor)}>
                  {persona?.nickname || player.archetype}
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  Stack: ${player.stack.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Bio / Archetype Description */}
        <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-3 italic">
          &ldquo;{persona?.description || 'Live low-stakes cash game player.'}&rdquo;
        </p>

        {/* Observed HUD Stats Grid */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-2.5 text-center">
            <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider block">VPIP %</span>
            <span className="text-lg font-black text-amber-300">{persona?.vpip ?? 28}%</span>
            <span className="text-[9px] text-zinc-500 block">
              {(persona?.vpip ?? 28) >= 45 ? 'Loose' : (persona?.vpip ?? 28) <= 16 ? 'Ultra-Tight' : 'Balanced'}
            </span>
          </div>

          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-2.5 text-center">
            <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider block">PFR %</span>
            <span className="text-lg font-black text-sky-400">{persona?.pfr ?? 15}%</span>
            <span className="text-[9px] text-zinc-500 block">
              {(persona?.pfr ?? 15) >= 30 ? 'Hyper-Aggro' : (persona?.pfr ?? 15) <= 10 ? 'Passive' : 'Selective'}
            </span>
          </div>

          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-2.5 text-center">
            <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider block">Fold to C-Bet</span>
            <span className="text-lg font-black text-purple-300">{persona?.foldToCbet ?? 50}%</span>
            <span className="text-[9px] text-zinc-500 block">
              {(persona?.foldToCbet ?? 50) >= 70 ? 'Fit-or-Fold' : (persona?.foldToCbet ?? 50) <= 35 ? 'Sticky' : 'Standard'}
            </span>
          </div>
        </div>

        {/* Known Live Exploits & Tells */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-400">
            <Eye size={13} />
            <span>Cataloged Live Habits & Tells</span>
          </div>
          <ul className="space-y-1.5 text-xs text-zinc-300">
            {(persona?.exploits || [
              'Plays straightforwardly postflop based on hand strength.',
              'Watch bet sizing relative to pot on turn and river.'
            ]).map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 leading-relaxed">
                <span className="text-amber-400 font-bold mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Direct Tactical Counter-Strategy */}
        <div className="bg-emerald-950/35 border border-emerald-500/40 rounded-xl p-3.5">
          <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 mb-1">
            <Crosshair size={13} />
            <span>Recommended Counter-Strategy</span>
          </div>
          <p className="text-xs text-emerald-100 leading-relaxed font-medium">
            {persona?.counterStrategy || 'Play solid TAG poker in position and value-bet strong made hands.'}
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer"
        >
          Close Dossier
        </button>
      </div>
    </div>
  );
}
