import React from 'react';

export interface ChipDenom {
  value: number;
  color: string;
  edgeColor: string;
  textColor: string;
  label: string;
  stripeColor: string;
}

export const DENOMINATIONS: ChipDenom[] = [
  { value: 100, color: '#18181b', edgeColor: '#09090b', textColor: '#facc15', label: '100', stripeColor: '#ffffff' }, // Black / Gold
  { value: 25, color: '#15803d', edgeColor: '#166534', textColor: '#ffffff', label: '25', stripeColor: '#fca5a5' },   // Green / Coral
  { value: 5, color: '#dc2626', edgeColor: '#991b1b', textColor: '#ffffff', label: '5', stripeColor: '#ffffff' },     // Red / White
  { value: 1, color: '#2563eb', edgeColor: '#1d4ed8', textColor: '#ffffff', label: '1', stripeColor: '#ffffff' },     // Blue / White
];

/**
 * Calculates a realistic cash game stack breakdown for a player's bankroll.
 * Real $1/$2 NLHE players have columns of $100s, $25s, $5s, and $1s.
 */
export function calculateBankrollChips(totalAmount: number): { denom: ChipDenom; count: number }[] {
  let rem = Math.max(0, Math.floor(totalAmount));
  if (rem <= 0) return [];

  // Tiny stacks (< $10)
  if (rem < 10) {
    const reds = Math.floor(rem / 5);
    const ones = rem % 5;
    const res: { denom: ChipDenom; count: number }[] = [];
    if (reds > 0) res.push({ denom: DENOMINATIONS[2], count: reds });
    if (ones > 0) res.push({ denom: DENOMINATIONS[3], count: ones });
    return res;
  }

  const result: { denom: ChipDenom; count: number }[] = [];

  // 1. Black ($100): used when stacks are deep ($200+)
  const blacks = Math.floor(rem / 100);
  // In a $200 stack, usually 1 black chip ($100) or none (mostly $25s and $5s)
  const blackCount = Math.min(blacks, 4);
  rem -= blackCount * 100;

  // 2. Green ($25): up to 4-6 chips
  const greens = Math.floor(rem / 25);
  const greenCount = Math.min(greens, 5);
  rem -= greenCount * 25;

  // 3. Red ($5): the workhorse chip in $1/$2 live games
  const reds = Math.floor(rem / 5);
  const redCount = Math.min(reds, 8);
  rem -= redCount * 5;

  // 4. Blue/White ($1): change and limps
  const oneCount = Math.min(rem, 6);

  if (blackCount > 0) result.push({ denom: DENOMINATIONS[0], count: blackCount });
  if (greenCount > 0) result.push({ denom: DENOMINATIONS[1], count: greenCount });
  if (redCount > 0) result.push({ denom: DENOMINATIONS[2], count: redCount });
  if (oneCount > 0) result.push({ denom: DENOMINATIONS[3], count: oneCount });

  // Fallback for edge cases
  if (result.length === 0) {
    result.push({ denom: DENOMINATIONS[3], count: 1 });
  }

  return result;
}

/**
 * Calculates exact chips for a bet or pot.
 */
export function calculateBetChips(totalAmount: number): { denom: ChipDenom; count: number }[] {
  let rem = Math.max(0, Math.floor(totalAmount));
  if (rem <= 0) return [];

  const result: { denom: ChipDenom; count: number }[] = [];

  for (const denom of DENOMINATIONS) {
    if (rem >= denom.value) {
      const count = Math.floor(rem / denom.value);
      result.push({ denom, count: Math.min(count, 5) });
      rem %= denom.value;
    }
  }

  if (result.length === 0 && totalAmount > 0) {
    result.push({ denom: DENOMINATIONS[DENOMINATIONS.length - 1], count: 1 });
  }

  return result;
}

interface ChipStackProps {
  amount: number;
  className?: string;
  showAmountLabel?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  mode?: 'bankroll' | 'bet';
}

export function ChipStack({
  amount,
  className = '',
  showAmountLabel = true,
  size = 'md',
  mode = 'bet',
}: ChipStackProps) {
  if (amount <= 0) return null;

  const chipBreakdown = mode === 'bankroll' 
    ? calculateBankrollChips(amount) 
    : calculateBetChips(amount);

  const sizeMetrics = {
    xs: { diameter: 16, thickness: 2.2, spacing: -5.5, fontSize: 'text-[6px]' },
    sm: { diameter: 20, thickness: 2.8, spacing: -6.5, fontSize: 'text-[7px]' },
    md: { diameter: 24, thickness: 3.2, spacing: -7.5, fontSize: 'text-[8px]' },
    lg: { diameter: 28, thickness: 3.8, spacing: -8.5, fontSize: 'text-[9px]' },
  }[size];

  return (
    <div className={`relative flex flex-col items-center select-none pointer-events-none ${className}`}>
      {/* 3D Chip Stack columns side-by-side */}
      <div className="flex items-end justify-center -space-x-1 filter drop-shadow-[0_4px_5px_rgba(0,0,0,0.85)]">
        {chipBreakdown.map((stack, stackIdx) => (
          <div key={`${stack.denom.value}-${stackIdx}`} className="relative flex flex-col items-center">
            <div
              className="flex flex-col-reverse items-center"
              style={{ marginBottom: `${stack.count * 1.2}px` }}
            >
              {Array.from({ length: stack.count }).map((_, chipIdx) => {
                const isTopChip = chipIdx === stack.count - 1;
                return (
                  <div
                    key={chipIdx}
                    className="relative rounded-full transition-transform"
                    style={{
                      width: `${sizeMetrics.diameter}px`,
                      height: `${sizeMetrics.diameter * 0.7}px`,
                      backgroundColor: stack.denom.color,
                      border: `1.5px solid ${stack.denom.edgeColor}`,
                      boxShadow: `0 ${sizeMetrics.thickness}px 0 ${stack.denom.edgeColor}, 0 ${sizeMetrics.thickness + 1}px 2px rgba(0,0,0,0.6)`,
                      marginTop: chipIdx === 0 ? 0 : `${sizeMetrics.spacing}px`,
                      zIndex: chipIdx + 1,
                    }}
                  >
                    {/* Casino edge inserts / striped rims */}
                    <div
                      className="absolute inset-0 rounded-full overflow-hidden opacity-90 pointer-events-none"
                      style={{
                        background: `repeating-conic-gradient(from 0deg, ${stack.denom.color} 0deg 25deg, ${stack.denom.stripeColor} 25deg 35deg, ${stack.denom.color} 35deg 70deg)`,
                      }}
                    />

                    {/* Inner Inlay */}
                    <div
                      className="absolute inset-[2.5px] rounded-full flex items-center justify-center border border-black/40"
                      style={{
                        backgroundColor: stack.denom.color,
                        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.4), inset 0 -1px 1px rgba(0,0,0,0.6)',
                      }}
                    >
                      {isTopChip && (
                        <span
                          className={`font-black ${sizeMetrics.fontSize} tracking-tighter leading-none`}
                          style={{ color: stack.denom.textColor }}
                        >
                          {stack.denom.label}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Numeric amount pill */}
      {showAmountLabel && (
        <div className="mt-0.5 bg-black/90 backdrop-blur-sm text-amber-300 font-extrabold text-[10px] px-1.5 py-0.5 rounded-full border border-amber-500/40 shadow-lg whitespace-nowrap z-20 flex items-center gap-0.5">
          <span className="text-amber-400/70 text-[8px]">$</span>
          <span>{amount % 1 === 0 ? amount : amount.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}
