'use client';

import React from 'react';

interface BlackjackFeltRulesProps {
  className?: string;
}

export function BlackjackFeltRules({ className = '' }: BlackjackFeltRulesProps) {
  return (
    <div
      className={`relative w-full max-w-4xl mx-auto flex items-center justify-center select-none pointer-events-none ${className}`}
    >
      <svg
        viewBox="0 0 1000 320"
        className="w-full h-auto overflow-visible drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
      >
        <defs>
          {/* Outer Arc: Blackjack Pays 3 to 2 */}
          <path
            id="ruleArcOuter"
            d="M 120 220 A 720 380 0 0 1 880 220"
            fill="none"
          />
          {/* Middle Arc: Dealer Stands on All 17s */}
          <path
            id="ruleArcMiddle"
            d="M 180 260 A 620 320 0 0 1 820 260"
            fill="none"
          />
          {/* Inner Arc: Insurance Pays 2 to 1 */}
          <path
            id="ruleArcInner"
            d="M 240 300 A 520 260 0 0 1 760 300"
            fill="none"
          />

          {/* Metallic Gold Gradient */}
          <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="25%" stopColor="#facc15" />
            <stop offset="50%" stopColor="#fef08a" />
            <stop offset="75%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#ca8a04" />
          </linearGradient>

          {/* Subtle Golden Glow Filter */}
          <filter id="goldGlow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.8" />
          </filter>
        </defs>

        {/* Outer Arc Text */}
        <text
          fill="url(#goldGradient)"
          fontSize="24"
          fontFamily="ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif"
          fontWeight="900"
          letterSpacing="7"
          filter="url(#goldGlow)"
        >
          <textPath href="#ruleArcOuter" startOffset="50%" textAnchor="middle">
            BLACKJACK PAYS 3 TO 2
          </textPath>
        </text>

        {/* Middle Arc Text */}
        <text
          fill="#fde047"
          opacity="0.85"
          fontSize="17"
          fontFamily="ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif"
          fontWeight="700"
          letterSpacing="4"
          filter="url(#goldGlow)"
        >
          <textPath href="#ruleArcMiddle" startOffset="50%" textAnchor="middle">
            DEALER STANDS ON ALL 17s
          </textPath>
        </text>

        {/* Inner Arc Text */}
        <text
          fill="#fef08a"
          opacity="0.75"
          fontSize="14"
          fontFamily="ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif"
          fontWeight="600"
          letterSpacing="3"
          filter="url(#goldGlow)"
        >
          <textPath href="#ruleArcInner" startOffset="50%" textAnchor="middle">
            INSURANCE PAYS 2 TO 1
          </textPath>
        </text>
      </svg>
    </div>
  );
}
