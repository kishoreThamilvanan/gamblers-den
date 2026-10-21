'use client';

import React from 'react';

interface DealerChipFloatProps {
  className?: string;
}

const CHANNELS = [
  { denom: '$1K', count: 22, color: 'bg-amber-500 border-amber-300', edge: 'bg-gradient-to-r from-amber-600 via-amber-400 to-amber-700', stripe: '#fef08a' },
  { denom: '$500', count: 24, color: 'bg-purple-700 border-purple-400', edge: 'bg-gradient-to-r from-purple-800 via-purple-500 to-purple-900', stripe: '#f3e8ff' },
  { denom: '$100', count: 28, color: 'bg-zinc-900 border-zinc-600', edge: 'bg-gradient-to-r from-zinc-950 via-zinc-800 to-zinc-950', stripe: '#fcd34d' },
  { denom: '$25', count: 28, color: 'bg-emerald-600 border-emerald-400', edge: 'bg-gradient-to-r from-emerald-800 via-emerald-600 to-emerald-900', stripe: '#ffffff' },
  { denom: '$5', count: 30, color: 'bg-red-600 border-red-400', edge: 'bg-gradient-to-r from-red-800 via-red-500 to-red-900', stripe: '#ffffff' },
  { denom: '$1', count: 32, color: 'bg-blue-600 border-blue-400', edge: 'bg-gradient-to-r from-blue-800 via-blue-500 to-blue-900', stripe: '#ffffff' },
];

export function DealerChipFloat({ className = '' }: DealerChipFloatProps) {
  return (
    <div
      className={`relative flex flex-col items-center select-none pointer-events-none ${className}`}
      title="Casino Dealer Chip Float"
    >
      {/* Metallic Outer Chassis */}
      <div className="relative rounded-xl bg-gradient-to-b from-zinc-600 via-zinc-800 to-zinc-950 p-2 sm:p-2.5 border-2 border-zinc-400/80 shadow-[0_12px_30px_rgba(0,0,0,0.9),inset_0_2px_4px_rgba(255,255,255,0.4)]">
        {/* Brass/Steel Corner Rivets */}
        <div className="absolute top-1 left-1.5 w-1.5 h-1.5 rounded-full bg-zinc-300 shadow-sm border border-zinc-600" />
        <div className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full bg-zinc-300 shadow-sm border border-zinc-600" />
        <div className="absolute bottom-1 left-1.5 w-1.5 h-1.5 rounded-full bg-zinc-300 shadow-sm border border-zinc-600" />
        <div className="absolute bottom-1 right-1.5 w-1.5 h-1.5 rounded-full bg-zinc-300 shadow-sm border border-zinc-600" />

        {/* Float Channel Rows */}
        <div className="flex items-center gap-1.5 sm:gap-2 bg-zinc-950/90 rounded-lg p-1.5 border border-zinc-700/60 shadow-inner">
          {CHANNELS.map((ch, idx) => (
            <div
              key={idx}
              className="flex flex-col items-center bg-black/60 rounded border border-zinc-800 px-1 py-1 shadow-inner"
            >
              {/* Channel Denomination Label */}
              <span className="text-[8px] sm:text-[9px] font-mono font-black text-zinc-400 mb-1 tracking-tight">
                {ch.denom}
              </span>

              {/* Stacked On-Edge Chips Tube */}
              <div className="w-5 sm:w-6.5 h-14 sm:h-18 rounded bg-zinc-900/90 border border-zinc-800 flex flex-col-reverse justify-start overflow-hidden relative shadow-inner p-0.5">
                {Array.from({ length: ch.count }).map((_, cIdx) => (
                  <div
                    key={cIdx}
                    className={`w-full h-[2px] sm:h-[2.4px] my-[0.5px] rounded-[1px] ${ch.edge} relative shadow-sm`}
                  >
                    {/* Ribbed Stripe on Chip Edge */}
                    <div
                      className="absolute left-1/2 -translate-x-1/2 w-1.5 h-full opacity-70"
                      style={{ backgroundColor: ch.stripe }}
                    />
                  </div>
                ))}
                {/* Shiny Specular Sheen Over Channel Glass */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
              </div>
            </div>
          ))}
        </div>

        {/* Dealer Tray Bevel Bar */}
        <div className="mt-1 flex items-center justify-between px-2 text-[8px] uppercase tracking-widest font-mono text-zinc-400/80">
          <span>GD VIP SALON</span>
          <span>HOUSE FLOAT</span>
        </div>
      </div>
    </div>
  );
}
