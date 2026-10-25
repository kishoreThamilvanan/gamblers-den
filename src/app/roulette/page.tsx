'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { usePokerStore } from '@/lib/store';
import { AuthGateView } from '@/components/poker/AuthGateView';
import { UserProfileModal } from '@/components/poker/UserProfileModal';
import { sound } from '@/lib/sound/soundSystem';
import { persistActiveUserProfile } from '@/lib/auth/authService';
import {
  RouletteVariant,
  PocketNumber,
  RoulettePocket,
  RouletteBet,
  SpinSettlement,
  EUROPEAN_WHEEL_ORDER,
  AMERICAN_WHEEL_ORDER,
  RED_NUMBERS,
  BLACK_NUMBERS,
  PAYOUT_RATIOS,
  VOISINS_DU_ZERO,
  TIERS_DU_CYLINDRE,
  ORPHELINS,
  JEU_ZERO,
  settleRouletteBets,
  calculateRouletteStatistics,
  generateSampleSpins,
  spinRoulette,
} from '@/lib/roulette/rouletteEngine';
import {
  RouletteDealerLog,
  RouletteLogMessage,
} from '@/components/roulette/RouletteDealerLog';
import { RouletteAICoach } from '@/components/roulette/RouletteAICoach';
import { RouletteReaderBoard } from '@/components/roulette/RouletteReaderBoard';
import { LogPosition } from '@/components/blackjack/BlackjackDealerLog';
import { TableTopBar } from '@/components/casino';
import { RouletteLobbyView } from '@/components/roulette/RouletteLobbyView';
import { getSavedSessions, saveSession, deleteSession } from '@/lib/sessions/sessionManager';
import { RouletteSession, RouletteTableConfig } from '@/lib/sessions/types';
import {
  Sparkles,
  BarChart3,
  RotateCcw,
  Flame,
  Snowflake,
  HelpCircle,
  X,
  Clock,
} from 'lucide-react';
import { clsx } from 'clsx';

const CHIP_DENOMINATIONS = [
  { value: 1, label: '$1', color: 'bg-blue-600 border-blue-300 text-white shadow-blue-500/40' },
  { value: 5, label: '$5', color: 'bg-red-600 border-red-300 text-white shadow-red-500/40' },
  { value: 25, label: '$25', color: 'bg-emerald-600 border-emerald-300 text-white shadow-emerald-500/40' },
  { value: 100, label: '$100', color: 'bg-zinc-950 border-amber-400 text-amber-300 shadow-amber-500/40' },
  { value: 500, label: '$500', color: 'bg-purple-800 border-purple-300 text-white shadow-purple-500/40' },
];

export default function RoulettePage() {
  const { userProfile, soundMuted, toggleMute } = usePokerStore();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);

  // Felt color theme: Monte Carlo Burgundy (matching photo) vs Classic Green
  const [feltTheme, setFeltTheme] = useState<'burgundy' | 'green'>('burgundy');

  // Variant: European vs American
  const [variant, setVariant] = useState<RouletteVariant>('european');

  // Persistent Career Bankroll
  const [bankroll, setBankroll] = useState<number>(userProfile?.careerBankroll ?? 2000);

  // Lobby / Game View Mode & Session Persistence States
  const [viewMode, setViewMode] = useState<'LOBBY' | 'GAME'>('LOBBY');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [spinsPlayed, setSpinsPlayed] = useState<number>(0);
  const [savedSessions, setSavedSessions] = useState<RouletteSession[]>(() =>
    getSavedSessions<RouletteSession>('roulette')
  );
  const [currentConfig, setCurrentConfig] = useState<RouletteTableConfig>({
    variant: 'european',
    stakesTier: 'regular',
    minBet: 5,
    maxBet: 500,
    betTimerSeconds: 15,
    buyInAmount: 1000,
  });

  // Chip selection
  const [selectedChip, setSelectedChip] = useState<number>(25);

  // Active Bets Placed on the Felt: Map of betId -> RouletteBet
  const [bets, setBets] = useState<Record<string, RouletteBet>>({});
  const [lastBets, setLastBets] = useState<Record<string, RouletteBet>>({});

  // Docking positions for AI Coach & Croupier Log (Coach open on left, Croupier Log accessible via corner trigger)
  const [coachPosition, setCoachPosition] = useState<LogPosition>('left');
  const [dealerLogPosition, setDealerLogPosition] = useState<LogPosition>('hidden');

  // Configurable Betting Timer: 15s, 30s, or 0 (Manual)
  const [timerDuration, setTimerDuration] = useState<15 | 30 | 0>(15);
  const [countdown, setCountdown] = useState<number | null>(15);
  const [isBettingLocked, setIsBettingLocked] = useState<boolean>(false);

  // Spin & Game Status
  const [isSpinning, setIsSpinning] = useState(false);
  const [lastWinningPocket, setLastWinningPocket] = useState<RoulettePocket | null>(null);
  const [lastSettlement, setLastSettlement] = useState<SpinSettlement | null>(null);
  const [history, setHistory] = useState<RoulettePocket[]>([]);

  // Canvas ref for 3D Roulette Wheel
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Live Croupier Speech & Bet Log
  const [logs, setLogs] = useState<RouletteLogMessage[]>([
    {
      id: 'init-1',
      timestamp: '00:00:00',
      type: 'system',
      text: "Welcome to Gambler's Den Roulette VIP Lounge. Monte Carlo Burgundy felt and European single zero (2.7% edge) active.",
    },
  ]);

  const addLog = useCallback((type: RouletteLogMessage['type'], text: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        timestamp,
        type,
        text,
      },
    ]);
  }, []);

  // Sync bankroll back to user profile
  const updateVaultBankroll = useCallback((newBankroll: number) => {
    setBankroll(newBankroll);
    if (userProfile) {
      persistActiveUserProfile({
        ...userProfile,
        careerBankroll: newBankroll,
      });
    }
  }, [userProfile]);

  const wheelPockets = useMemo(() => {
    return variant === 'european' ? EUROPEAN_WHEEL_ORDER : AMERICAN_WHEEL_ORDER;
  }, [variant]);

  const totalWagered = useMemo(() => {
    return Object.values(bets).reduce((sum, b) => sum + b.amount, 0);
  }, [bets]);

  // Screen reorganization docking calculations
  const isStacked = coachPosition === dealerLogPosition && coachPosition !== 'hidden' && coachPosition !== 'bottom';

  // Handle placing/incrementing a bet on a betting spot
  const handlePlaceBet = useCallback((
    id: string,
    type: RouletteBet['type'],
    label: string,
    numbers: PocketNumber[],
    multiplier: number
  ) => {
    if (isSpinning || isBettingLocked) return;
    if (bankroll < selectedChip) {
      return;
    }

    sound.playChipSound(1.05);

    // Deduct chip from bankroll
    updateVaultBankroll(bankroll - selectedChip);
    addLog('bet', `Placed $${selectedChip} on ${label} (Pays ${multiplier}:1)`);

    setBets((prev) => {
      const existing = prev[id];
      const newAmount = (existing?.amount ?? 0) + selectedChip;
      return {
        ...prev,
        [id]: {
          id,
          type,
          label,
          numbers,
          amount: newAmount,
          payoutMultiplier: multiplier,
        },
      };
    });
  }, [isSpinning, isBettingLocked, bankroll, selectedChip, updateVaultBankroll, addLog]);

  // Clear all unspun bets and refund back to bankroll
  const handleClearBets = useCallback(() => {
    if (isSpinning || isBettingLocked || totalWagered === 0) return;
    sound.playChipSplash();
    addLog('bet', `Cleared all bets ($${totalWagered} returned).`);
    updateVaultBankroll(bankroll + totalWagered);
    setBets({});
  }, [isSpinning, isBettingLocked, totalWagered, bankroll, updateVaultBankroll, addLog]);

  // Double all active bets if bankroll allows
  const handleDoubleBets = useCallback(() => {
    if (isSpinning || isBettingLocked || totalWagered === 0) return;
    if (bankroll < totalWagered) return;

    sound.playChipSplash();
    addLog('bet', `Doubled placed wagers (New table total: $${totalWagered * 2}).`);
    updateVaultBankroll(bankroll - totalWagered);

    setBets((prev) => {
      const next: Record<string, RouletteBet> = {};
      Object.entries(prev).forEach(([key, bet]) => {
        next[key] = {
          ...bet,
          amount: bet.amount * 2,
        };
      });
      return next;
    });
  }, [isSpinning, isBettingLocked, totalWagered, bankroll, updateVaultBankroll, addLog]);

  // Repeat bets from the previous spin
  const handleRebet = useCallback(() => {
    if (isSpinning || isBettingLocked || Object.keys(lastBets).length === 0) return;
    const rebetTotal = Object.values(lastBets).reduce((s, b) => s + b.amount, 0);
    if (bankroll < rebetTotal) return;

    const refund = totalWagered;
    sound.playChipSplash();
    addLog('bet', `Repeated previous spin bets ($${rebetTotal} total).`);
    updateVaultBankroll(bankroll + refund - rebetTotal);
    setBets({ ...lastBets });
  }, [isSpinning, isBettingLocked, lastBets, bankroll, totalWagered, updateVaultBankroll, addLog]);

  // Hovered numbers for wheel sector/bet illumination
  const [hoveredNumbers, setHoveredNumbers] = useState<PocketNumber[] | null>(null);

  // Track resting wheel & ball angles so hover/bet changes redraw smoothly without resetting wheel orientation
  const wheelStateRef = useRef<{ wheelAngle: number; ballAngle: number; ballRadius: number }>({
    wheelAngle: 0,
    ballAngle: (3 * Math.PI) / 2,
    ballRadius: 149,
  });

  // Quick-seed 25 authentic casino spins for live reader board telemetry
  const handleSeedSpins = useCallback(() => {
    if (isSpinning) return;
    const sample = generateSampleSpins(25, variant);
    setHistory((prev) => [...sample, ...prev].slice(0, 100));
    setLastWinningPocket(sample[0]);
    sound.playChipSplash();
    addLog('system', `Seeded 25 authentic ${variant === 'european' ? 'European' : 'American'} spins into Reader Board telemetry.`);
  }, [isSpinning, variant, addLog]);

  // Sets of pockets covered by active bets or current hover
  const activeBetPocketSet = useMemo(() => {
    const set = new Set<PocketNumber>();
    Object.values(bets).forEach((b) => {
      b.numbers.forEach((n) => set.add(n));
    });
    return set;
  }, [bets]);

  const hoveredPocketSet = useMemo(() => {
    return new Set<PocketNumber>(hoveredNumbers ?? []);
  }, [hoveredNumbers]);

  // Cammegh-Style 3D Luxury Roulette Wheel Renderer
  const drawWheel = useCallback((
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    wheelAngle: number,
    ballAngle: number,
    ballRadius: number,
    isBallFast: boolean = false
  ) => {
    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    const outerRadius = Math.min(centerX, centerY) - 6;
    const trackOuterRadius = outerRadius - 13;
    const numberRingOuterRadius = outerRadius - 31;
    const pocketOuterRadius = numberRingOuterRadius - 25;
    const turretRadius = pocketOuterRadius - 26;

    const pockets = wheelPockets;
    const pocketCount = pockets.length;
    const pocketArc = (2 * Math.PI) / pocketCount;

    ctx.save();

    // =========================================================================
    // 1. MULTI-TIERED ROSEWOOD / MAHOGANY OUTER BOWL & GOLD BEZEL
    // =========================================================================
    const bowlGrad = ctx.createRadialGradient(
      centerX - 25,
      centerY - 25,
      outerRadius * 0.55,
      centerX,
      centerY,
      outerRadius
    );
    bowlGrad.addColorStop(0, '#6e2612');
    bowlGrad.addColorStop(0.45, '#421407');
    bowlGrad.addColorStop(0.85, '#240a03');
    bowlGrad.addColorStop(1, '#120401');

    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius, 0, 2 * Math.PI);
    ctx.fillStyle = bowlGrad;
    ctx.fill();

    // Outer Polished Brass Bezel
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#d4af37';
    ctx.stroke();

    // Subtle Wood-Grain Concentric Highlight on Rosewood Lip
    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius - 6, 0, 2 * Math.PI);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.22)';
    ctx.stroke();

    // =========================================================================
    // 2. SLOPED BALL TRACK & 8 BRASS DIAMOND DEFLECTORS (CANOES)
    // =========================================================================
    const trackGrad = ctx.createRadialGradient(
      centerX,
      centerY,
      numberRingOuterRadius,
      centerX,
      centerY,
      trackOuterRadius
    );
    trackGrad.addColorStop(0, '#140804');
    trackGrad.addColorStop(0.5, '#2b1309');
    trackGrad.addColorStop(1, '#110602');

    ctx.beginPath();
    ctx.arc(centerX, centerY, trackOuterRadius, 0, 2 * Math.PI);
    ctx.arc(centerX, centerY, numberRingOuterRadius, 0, 2 * Math.PI, true);
    ctx.fillStyle = trackGrad;
    ctx.fill();

    // Brass Rim Lip between Outer Bowl and Sloped Track
    ctx.beginPath();
    ctx.arc(centerX, centerY, trackOuterRadius, 0, 2 * Math.PI);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#b48327';
    ctx.stroke();

    // 8 Brass Diamond Ball Deflectors (Canoes) on the Sloped Track
    const canoeRadius = (trackOuterRadius + numberRingOuterRadius) / 2;
    for (let c = 0; c < 8; c++) {
      const cAngle = (c * Math.PI) / 4;
      const isRadial = c % 2 === 1;
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(cAngle);
      ctx.translate(0, -canoeRadius);

      const dLong = isRadial ? 4.5 : 8.5;
      const dShort = isRadial ? 7.5 : 3.8;

      // Drop shadow
      ctx.beginPath();
      ctx.moveTo(0, -dShort + 1);
      ctx.lineTo(dLong + 1, 1);
      ctx.lineTo(0, dShort + 1);
      ctx.lineTo(-dLong + 1, 1);
      ctx.closePath();
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fill();

      // 3D Brass Diamond Canoe
      const canoeGrad = ctx.createLinearGradient(-dLong, -dShort, dLong, dShort);
      canoeGrad.addColorStop(0, '#fef08a');
      canoeGrad.addColorStop(0.5, '#eab308');
      canoeGrad.addColorStop(1, '#713f12');

      ctx.beginPath();
      ctx.moveTo(0, -dShort);
      ctx.lineTo(dLong, 0);
      ctx.lineTo(0, dShort);
      ctx.lineTo(-dLong, 0);
      ctx.closePath();
      ctx.fillStyle = canoeGrad;
      ctx.fill();
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = '#fef9c3';
      ctx.stroke();

      ctx.restore();
    }

    // =========================================================================
    // 3. ROTATING ROTOR: OUTER NUMBER RING & INNER 3D RECESSED POCKETS
    // =========================================================================
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(wheelAngle);

    for (let i = 0; i < pocketCount; i++) {
      const pocketId = pockets[i];
      const startAngle = i * pocketArc - pocketArc / 2;
      const endAngle = startAngle + pocketArc;

      const isZero = pocketId === 0 || pocketId === '00';
      const isRed = typeof pocketId === 'number' && RED_NUMBERS.includes(pocketId);
      const isHovered = hoveredPocketSet.has(pocketId);
      const isBetActive = activeBetPocketSet.has(pocketId);
      const isWinning = !isSpinning && lastWinningPocket?.id === pocketId;

      // 3A. Outer Number Ring Plate
      ctx.beginPath();
      ctx.arc(0, 0, numberRingOuterRadius, startAngle, endAngle);
      ctx.arc(0, 0, pocketOuterRadius, endAngle, startAngle, true);
      ctx.closePath();

      if (isZero) {
        ctx.fillStyle = isHovered || isWinning ? '#16a34a' : '#15803d';
      } else if (isRed) {
        ctx.fillStyle = isHovered || isWinning ? '#dc2626' : '#b91c1c';
      } else {
        ctx.fillStyle = isHovered || isWinning ? '#27272a' : '#141417';
      }
      ctx.fill();

      // Golden Illumination Overlay for Hovered Sector / Active Bets / Winning Pocket
      if (isHovered || isBetActive || isWinning) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, numberRingOuterRadius - 1, startAngle, endAngle);
        ctx.arc(0, 0, pocketOuterRadius, endAngle, startAngle, true);
        ctx.closePath();
        ctx.fillStyle = isWinning
          ? 'rgba(250, 204, 21, 0.34)'
          : isHovered
          ? 'rgba(250, 204, 21, 0.28)'
          : 'rgba(245, 158, 11, 0.16)';
        ctx.fill();

        // Outer golden arc indicator
        ctx.beginPath();
        ctx.arc(0, 0, numberRingOuterRadius - 1.5, startAngle, endAngle);
        ctx.lineWidth = isWinning || isHovered ? 3.2 : 2;
        ctx.strokeStyle = isWinning ? '#fef08a' : '#fbbf24';
        ctx.stroke();
        ctx.restore();
      }

      // Number Ring Divider Lines
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.55)';
      ctx.lineWidth = 0.9;
      ctx.stroke();

      // 3B. Inner 3D Recessed Ball Pocket Well
      ctx.beginPath();
      ctx.arc(0, 0, pocketOuterRadius, startAngle, endAngle);
      ctx.arc(0, 0, turretRadius, endAngle, startAngle, true);
      ctx.closePath();

      if (isZero) {
        ctx.fillStyle = '#064e3b';
      } else if (isRed) {
        ctx.fillStyle = '#7f1d1d';
      } else {
        ctx.fillStyle = '#09090b';
      }
      ctx.fill();

      // Raised Metallic Pocket Frets (Separators)
      ctx.beginPath();
      ctx.moveTo(Math.cos(startAngle) * turretRadius, Math.sin(startAngle) * turretRadius);
      ctx.lineTo(Math.cos(startAngle) * pocketOuterRadius, Math.sin(startAngle) * pocketOuterRadius);
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // 3C. Crisp Outward-Facing Pocket Number Typography
      ctx.save();
      const midAngle = startAngle + pocketArc / 2;
      ctx.rotate(midAngle + Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isWinning || isHovered ? '#fef08a' : '#f8fafc';
      ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
      const textRadius = (numberRingOuterRadius + pocketOuterRadius) / 2;
      ctx.fillText(String(pocketId), 0, -textRadius);
      ctx.restore();
    }

    // Metallic Separator Rings on Rotor
    ctx.beginPath();
    ctx.arc(0, 0, numberRingOuterRadius, 0, 2 * Math.PI);
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = '#d4af37';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, pocketOuterRadius, 0, 2 * Math.PI);
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = '#cbd5e1';
    ctx.stroke();

    // =========================================================================
    // 4. SCULPTED 3D GOLD/BRASS & POLISHED MAHOGANY CENTER TURRET
    // =========================================================================
    const coneGrad = ctx.createRadialGradient(-10, -10, 4, 0, 0, turretRadius);
    coneGrad.addColorStop(0, '#92400e');
    coneGrad.addColorStop(0.35, '#5c1f0e');
    coneGrad.addColorStop(0.75, '#2d0e05');
    coneGrad.addColorStop(1, '#140502');

    ctx.beginPath();
    ctx.arc(0, 0, turretRadius, 0, 2 * Math.PI);
    ctx.fillStyle = coneGrad;
    ctx.fill();

    // Outer Turret Brass Collar
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#d4af37';
    ctx.stroke();

    // Inner Decorative Gold Ring on Cone
    ctx.beginPath();
    ctx.arc(0, 0, turretRadius * 0.68, 0, 2 * Math.PI);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.35)';
    ctx.stroke();

    // 4 Secondary Diagonal Gold Bevel Ribs
    for (let r = 0; r < 4; r++) {
      ctx.save();
      ctx.rotate((r * Math.PI) / 2 + Math.PI / 4);
      ctx.beginPath();
      ctx.moveTo(0, 18);
      ctx.lineTo(0, turretRadius - 6);
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.45)';
      ctx.stroke();
      ctx.restore();
    }

    // 4 Primary Sculpted 3D Brass Turret Arms with Spherical Knop Finials
    for (let b = 0; b < 4; b++) {
      ctx.save();
      ctx.rotate((b * Math.PI) / 2);

      const armLength = turretRadius - 12;

      // Tapered 3D Brass Spindle Shaft
      const armGrad = ctx.createLinearGradient(-4, 0, 4, 0);
      armGrad.addColorStop(0, '#854d0e');
      armGrad.addColorStop(0.5, '#fef08a');
      armGrad.addColorStop(1, '#a16207');

      ctx.beginPath();
      ctx.moveTo(-3.2, 16);
      ctx.lineTo(-1.6, armLength);
      ctx.lineTo(1.6, armLength);
      ctx.lineTo(3.2, 16);
      ctx.closePath();
      ctx.fillStyle = armGrad;
      ctx.fill();

      // 3D Spherical Brass Knop Finial at Arm Tip
      const knopGrad = ctx.createRadialGradient(-1.5, armLength - 1.5, 0.5, 0, armLength, 5.2);
      knopGrad.addColorStop(0, '#ffffff');
      knopGrad.addColorStop(0.35, '#fef08a');
      knopGrad.addColorStop(0.8, '#ca8a04');
      knopGrad.addColorStop(1, '#713f12');

      ctx.beginPath();
      ctx.arc(0, armLength, 4.8, 0, 2 * Math.PI);
      ctx.fillStyle = knopGrad;
      ctx.fill();
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = '#713f12';
      ctx.stroke();

      ctx.restore();
    }

    // Tiered Central Brass & Chrome Crown Cap
    const baseCapGrad = ctx.createRadialGradient(-4, -4, 2, 0, 0, 21);
    baseCapGrad.addColorStop(0, '#fef08a');
    baseCapGrad.addColorStop(0.55, '#ca8a04');
    baseCapGrad.addColorStop(1, '#713f12');

    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, 2 * Math.PI);
    ctx.fillStyle = baseCapGrad;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#fef9c3';
    ctx.stroke();

    // Inner Crown Dome
    const domeGrad = ctx.createRadialGradient(-3, -3, 1, 0, 0, 12);
    domeGrad.addColorStop(0, '#ffffff');
    domeGrad.addColorStop(0.5, '#fde047');
    domeGrad.addColorStop(1, '#a16207');

    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, 2 * Math.PI);
    ctx.fillStyle = domeGrad;
    ctx.fill();

    ctx.restore(); // Restore rotor rotation

    // =========================================================================
    // 5. TOP 12-O'CLOCK BRASS POINTER & IVORY BALL WITH MOTION TRAIL
    // =========================================================================
    // Stationary 12-O'Clock Golden Pointer Indicator on Outer Lip
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - numberRingOuterRadius + 3);
    ctx.lineTo(centerX - 6, centerY - numberRingOuterRadius - 8);
    ctx.lineTo(centerX + 6, centerY - numberRingOuterRadius - 8);
    ctx.closePath();
    ctx.fillStyle = '#fbbf24';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#78350f';
    ctx.stroke();
    ctx.restore();

    if (ballRadius > 0) {
      // Subtle Motion Trail when ball is orbiting fast
      if (isBallFast) {
        for (let t = 1; t <= 4; t++) {
          const trailAngle = ballAngle - t * 0.085;
          const tx = centerX + Math.cos(trailAngle) * ballRadius;
          const ty = centerY + Math.sin(trailAngle) * ballRadius;
          ctx.beginPath();
          ctx.arc(tx, ty, Math.max(2, 5.5 - t * 0.9), 0, 2 * Math.PI);
          ctx.fillStyle = `rgba(255, 255, 255, ${0.22 - t * 0.045})`;
          ctx.fill();
        }
      }

      const bx = centerX + Math.cos(ballAngle) * ballRadius;
      const by = centerY + Math.sin(ballAngle) * ballRadius;

      // Ball drop shadow
      ctx.beginPath();
      ctx.arc(bx + 2.2, by + 2.5, 5.8, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fill();

      // Polished Ivory Ball with 3D Specular Highlight
      const ballGrad = ctx.createRadialGradient(bx - 2, by - 2, 0.8, bx, by, 5.8);
      ballGrad.addColorStop(0, '#ffffff');
      ballGrad.addColorStop(0.6, '#f8fafc');
      ballGrad.addColorStop(0.88, '#cbd5e1');
      ballGrad.addColorStop(1, '#64748b');

      ctx.beginPath();
      ctx.arc(bx, by, 5.5, 0, 2 * Math.PI);
      ctx.fillStyle = ballGrad;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    ctx.restore();
  }, [wheelPockets, hoveredPocketSet, activeBetPocketSet, isSpinning, lastWinningPocket]);

  // Redraw wheel whenever variant, hover state, or active bets change while not mid-spin
  useEffect(() => {
    if (isSpinning) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { wheelAngle, ballAngle, ballRadius } = wheelStateRef.current;
    drawWheel(ctx, canvas.width, canvas.height, wheelAngle, ballAngle, ballRadius, false);
  }, [drawWheel, variant, isSpinning]);

  // Spin Wheel Physics Execution
  const executeSpin = useCallback(() => {
    if (isSpinning) return;

    setIsSpinning(true);
    setIsBettingLocked(true);
    setLastSettlement(null);
    setLastWinningPocket(null);

    // Save active bets for Rebet
    setLastBets({ ...bets });

    sound.playRouletteSpin();
    addLog('spin', `Croupier calls: No more bets! Wheel is spinning with $${totalWagered} on the table.`);

    // Determine winning pocket via true RNG
    const winningPocket = spinRoulette(variant);
    const pockets = wheelPockets;
    const targetIdx = pockets.indexOf(winningPocket.id);

    // Setup animation parameters
    const pocketArc = (2 * Math.PI) / pockets.length;
    // Calculate final wheel angle so target pocket lands at top (3 * PI / 2)
    const targetWheelAngle = -(targetIdx * pocketArc) + (3 * Math.PI) / 2;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const outerRadius = canvas.width / 2 - 6;
    const trackRadius = outerRadius - 22;
    const numberRingOuterRadius = outerRadius - 31;
    const pocketOuterRadius = numberRingOuterRadius - 25;
    const turretRadius = pocketOuterRadius - 26;
    const pocketSettleRadius = (pocketOuterRadius + turretRadius) / 2;

    let startTime: number | null = null;
    const totalDuration = 4800; // 4.8 seconds authentic casino spin

    let hasClickedFret = false;
    let hasDropped = false;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(1, elapsed / totalDuration);

      // Deceleration curve (cubic ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);

      // Wheel rotates smoothly counter-clockwise
      const currentWheelAngle = targetWheelAngle + (1 - easeOut) * Math.PI * 4;

      // Ball rotates clockwise fast on the sloped track, then drops and settles at 12 o'clock (3*PI/2)
      let ballAngle: number;
      let currentBallRadius = trackRadius;

      if (progress <= 0.65) {
        const orbitProgress = progress / 0.65;
        const orbitEase = 1 - Math.pow(1 - orbitProgress, 2.2);
        ballAngle = (3 * Math.PI) / 2 + orbitEase * Math.PI * 14;
      } else {
        const dropProgress = (progress - 0.65) / 0.35;
        const dropEase = 1 - Math.pow(1 - dropProgress, 2.5);
        ballAngle = (3 * Math.PI) / 2 + (1 - dropEase) * Math.PI * 2.5;

        // Subtle physical deflection bounce off diamond canoes & pocket frets
        const canoeBounce =
          dropProgress < 0.78
            ? Math.sin(dropProgress * Math.PI * 9) * (1 - dropProgress) * 5.5
            : 0;
        currentBallRadius =
          trackRadius -
          (trackRadius - pocketSettleRadius) * Math.sin((dropProgress * Math.PI) / 2) +
          canoeBounce;

        // Sound cues
        if (!hasClickedFret && dropProgress > 0.25) {
          hasClickedFret = true;
          sound.playRouletteBallClick(120);
        }
        if (!hasDropped && dropProgress > 0.72) {
          hasDropped = true;
          sound.playRouletteDrop();
        }
      }

      wheelStateRef.current = {
        wheelAngle: currentWheelAngle,
        ballAngle,
        ballRadius: currentBallRadius,
      };

      drawWheel(
        ctx,
        canvas.width,
        canvas.height,
        currentWheelAngle,
        ballAngle,
        currentBallRadius,
        progress < 0.55
      );

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Spin Complete
        setIsSpinning(false);
        setIsBettingLocked(false);
        setLastWinningPocket(winningPocket);
        setHistory((prev) => [winningPocket, ...prev.slice(0, 99)]);

        addLog(
          'result',
          `Ball dropped into Pocket ${winningPocket.label} ${winningPocket.color.toUpperCase()} (${winningPocket.parity ? winningPocket.parity.toUpperCase() : 'ZERO'} • ${winningPocket.range ? winningPocket.range.toUpperCase() : ''})`
        );

        // Settle all placed bets
        const activeBetsArray = Object.values(bets);
        const settlement = settleRouletteBets(winningPocket, activeBetsArray);
        setLastSettlement(settlement);

        // Award total payout to player bankroll
        const finalBankroll = settlement.totalPayout > 0 ? bankroll + settlement.totalPayout : bankroll;
        if (settlement.totalPayout > 0) {
          updateVaultBankroll(finalBankroll);
          sound.playWinPot();
          addLog('payout', `Round Won! Payout: $${settlement.totalPayout.toLocaleString()} (Net profit +$${settlement.netProfit.toLocaleString()})`);
        } else if (activeBetsArray.length > 0) {
          addLog('payout', `No winning bets. Net loss -$${settlement.totalWagered.toLocaleString()}`);
        }

        // Auto-save session
        const nextSpins = spinsPlayed + 1;
        setSpinsPlayed(nextSpins);

        const sessionToSave: RouletteSession = {
          id: activeSessionId || `rl-${Date.now()}`,
          gameType: 'roulette',
          createdAt: Date.now(),
          lastPlayedAt: Date.now(),
          handsPlayed: nextSpins,
          tableBankroll: finalBankroll,
          bankroll: finalBankroll,
          totalWagered: settlement.totalWagered,
          totalWon: settlement.totalPayout,
          config: currentConfig,
          recentNumbers: [
            {
              pocket: winningPocket.label,
              color: winningPocket.color,
              timestamp: Date.now(),
            },
          ],
        };
        const updated = saveSession<RouletteSession>('roulette', sessionToSave);
        setSavedSessions(updated);

        // Clear active bets from table
        setBets({});

        // Reset timer countdown if active
        if (timerDuration > 0) {
          setCountdown(timerDuration);
        }
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  }, [
    isSpinning,
    totalWagered,
    bets,
    variant,
    wheelPockets,
    drawWheel,
    bankroll,
    updateVaultBankroll,
    addLog,
    timerDuration,
    spinsPlayed,
    activeSessionId,
    currentConfig,
  ]);

  // Clean up animation frame on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  // Configurable Countdown Timer Effect
  useEffect(() => {
    if (timerDuration === 0 || isSpinning) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null) return timerDuration;
        if (prev <= 1) {
          // Timer reached 0: execute spin!
          executeSpin();
          return 0;
        }
        if (prev === 5) {
          // 4s warning: Lock bets and call No More Bets
          setIsBettingLocked(true);
          addLog('alert', 'Croupier calls: RIEN NE VA PLUS — NO MORE BETS!');
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerDuration, isSpinning, executeSpin, addLog]);

  // Reset countdown when user changes timer setting
  const handleTimerChange = (newDuration: 15 | 30 | 0) => {
    if (isSpinning) return;
    setTimerDuration(newDuration);
    setCountdown(newDuration > 0 ? newDuration : null);
    setIsBettingLocked(false);
  };

  // Compute Roulette History Stats
  const stats = useMemo(() => {
    return calculateRouletteStatistics(history, variant);
  }, [history, variant]);

  // Session Persistence Handlers
  const handleStartNewTable = useCallback(
    (customConfig?: RouletteTableConfig) => {
      const cfg = customConfig ?? currentConfig;
      setCurrentConfig(cfg);
      setVariant(cfg.variant);
      const timerSec = cfg.betTimerSeconds ?? 0;
      setTimerDuration(timerSec as 15 | 30 | 0);
      setCountdown(cfg.betTimerSeconds ?? null);
      setActiveSessionId(`rl-${Date.now()}`);
      setSpinsPlayed(0);
      setBets({});
      setViewMode('GAME');
    },
    [currentConfig]
  );

  const handleResumeSession = useCallback((session: RouletteSession) => {
    setActiveSessionId(session.id);
    setCurrentConfig(session.config);
    setVariant(session.config.variant);
    const timerSec = session.config.betTimerSeconds ?? 0;
    setTimerDuration(timerSec as 15 | 30 | 0);
    setCountdown(session.config.betTimerSeconds ?? null);
    setBankroll(session.bankroll);
    setSpinsPlayed(session.handsPlayed);
    setBets({});
    setViewMode('GAME');
  }, []);

  const handleDeleteSession = useCallback((sessionId: string) => {
    const updated = deleteSession<RouletteSession>('roulette', sessionId);
    setSavedSessions(updated);
  }, []);

  // If user is not authenticated, render standard AuthGateView
  if (!userProfile) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col justify-center items-center p-4">
        <AuthGateView />
      </div>
    );
  }

  if (viewMode === 'LOBBY') {
    return (
      <>
        <UserProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
        <RouletteLobbyView
          savedSessions={savedSessions}
          currentConfig={currentConfig}
          onConfigChange={(cfg) => {
            setCurrentConfig((prev) => {
              const updated = { ...prev, ...cfg };
              if (cfg.variant) setVariant(cfg.variant);
              if (cfg.betTimerSeconds !== undefined) {
                setTimerDuration((cfg.betTimerSeconds ?? 0) as 15 | 30 | 0);
                setCountdown(cfg.betTimerSeconds ?? null);
              }
              return updated;
            });
          }}
          onStartNewTable={handleStartNewTable}
          onResumeSession={handleResumeSession}
          onDeleteSession={handleDeleteSession}
          userProfile={userProfile}
          onOpenProfile={() => setIsProfileOpen(true)}
        />
      </>
    );
  }

  return (
    <div
      className={clsx(
        'min-h-screen text-slate-100 flex flex-col select-none overflow-x-hidden font-sans',
        feltTheme === 'burgundy' ? 'bg-[#180a0c]' : 'bg-[#06120b]'
      )}
    >
      {/* Standardized Casino Top Navigation Bar */}
      <TableTopBar
        mode="game"
        title="Monte Carlo Roulette"
        subtitle={variant === 'european' ? 'European Single 0 • 2.7%' : 'American 0 & 00 • 5.3%'}
        icon={
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-white font-black text-sm shadow-md">
            🎡
          </div>
        }
        floorHref="/"
        onExitToLobby={() => setViewMode('LOBBY')}
        lobbyLabel="Lobby"
        centerStatus={
          countdown !== null && !isSpinning ? (
            <div className="flex items-center gap-2 bg-zinc-900 border border-amber-500/40 px-3 py-1 rounded-full text-xs shadow-sm">
              <Clock size={12} className="text-amber-400 animate-spin" />
              <span className="text-zinc-400 font-mono">Bets Close:</span>
              <span className={clsx('font-black font-mono', countdown <= 5 ? 'text-rose-400 animate-pulse' : 'text-amber-300')}>
                {countdown}s
              </span>
            </div>
          ) : isSpinning ? (
            <div className="flex items-center gap-2 bg-amber-950/60 border border-amber-500/50 px-3 py-1 rounded-full text-xs shadow-sm">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span className="font-black text-amber-300 tracking-wider">RIEN NE VA PLUS</span>
            </div>
          ) : undefined
        }
        bankroll={bankroll}
        userProfile={userProfile}
        onProfileClick={() => setIsProfileOpen(true)}
        soundMuted={soundMuted}
        onToggleMute={toggleMute}
        onOpenRules={() => setIsRulesOpen(true)}
        rulesTitle="Roulette Rules & Payouts"
        onOpenStats={() => setIsStatsOpen(true)}
        statsTitle="Roulette Statistics & Heatmap"
        themes={[
          {
            id: 'burgundy',
            label: 'Monte Carlo Burgundy',
            active: feltTheme === 'burgundy',
            onClick: () => setFeltTheme('burgundy'),
          },
          {
            id: 'green',
            label: 'Emerald Green',
            active: feltTheme === 'green',
            onClick: () => setFeltTheme('green'),
          },
        ]}
        coachPosition={coachPosition}
        onCoachPositionChange={setCoachPosition}
        logPosition={dealerLogPosition}
        onLogPositionChange={setDealerLogPosition}
        logLabel="Croupier Log"
        customSettingsTitle="Wheel & Betting Timer"
        customSettings={
          <div className="space-y-2">
            <div>
              <div className="text-[10px] text-zinc-400 font-semibold mb-1">Wheel Variant:</div>
              <div className="grid grid-cols-2 gap-1 bg-zinc-950/80 p-0.5 rounded-lg border border-zinc-800">
                <button
                  onClick={() => {
                    if (isSpinning) return;
                    setVariant('european');
                    addLog('system', 'Switched wheel to European Single Zero (2.70% house edge).');
                  }}
                  className={clsx(
                    'py-1 rounded text-[11px] font-semibold transition text-center cursor-pointer',
                    variant === 'european'
                      ? 'bg-amber-500 text-black font-bold shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  )}
                >
                  European (0)
                </button>
                <button
                  onClick={() => {
                    if (isSpinning) return;
                    setVariant('american');
                    addLog('system', 'Switched wheel to American Double Zero (5.26% house edge).');
                  }}
                  className={clsx(
                    'py-1 rounded text-[11px] font-semibold transition text-center cursor-pointer',
                    variant === 'american'
                      ? 'bg-amber-500 text-black font-bold shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  )}
                >
                  American (00)
                </button>
              </div>
            </div>

            <div>
              <div className="text-[10px] text-zinc-400 font-semibold mb-1">Betting Countdown Timer:</div>
              <div className="grid grid-cols-3 gap-1 bg-zinc-950/80 p-0.5 rounded-lg border border-zinc-800">
                {([15, 30, 0] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => handleTimerChange(t)}
                    className={clsx(
                      'py-1 rounded text-[11px] font-semibold transition text-center cursor-pointer',
                      timerDuration === t
                        ? 'bg-amber-500 text-black font-bold shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    )}
                  >
                    {t === 0 ? 'Manual' : `${t}s`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        }
      />

      {/* 2. Main Game Arena (Rock-Solid Centered Layout without Layout Shifts) */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 flex flex-col gap-4">
        {/* Top Casino LED Totem History Strip ("Numbers Drawn") */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-950/90 border border-amber-500/35 rounded-2xl px-3.5 py-2 text-xs shadow-lg">
          {/* Left: Jumbo Latest Winning Number Callout & 20-Spin Staggered Bead Road */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-amber-300 font-bold shrink-0">
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span className="uppercase tracking-wider text-[11px]">Numbers Drawn:</span>
            </div>

            {history.length === 0 ? (
              <div className="flex items-center gap-2.5">
                <span className="text-zinc-500 italic">No spins recorded yet — spin wheel or seed history</span>
                <button
                  type="button"
                  onClick={handleSeedSpins}
                  disabled={isSpinning}
                  className="px-2 py-0.5 rounded-md bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-amber-300 font-bold text-[10px] transition cursor-pointer"
                >
                  + Seed 25 Spins
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 overflow-x-auto py-1.5 px-1">
                {/* Jumbo Latest Number Badge */}
                <button
                  type="button"
                  disabled={isBettingLocked}
                  onClick={() =>
                    handlePlaceBet(
                      `straight-${history[0].id}`,
                      'straight',
                      history[0].label,
                      [history[0].id],
                      PAYOUT_RATIOS.straight
                    )
                  }
                  onMouseEnter={() => setHoveredNumbers([history[0].id])}
                  onMouseLeave={() => setHoveredNumbers(null)}
                  className={clsx(
                    'px-2.5 py-1 rounded-xl font-black text-sm shadow-md border-2 flex items-center gap-1.5 shrink-0 ring-2 ring-amber-400/80 cursor-pointer transition hover:scale-105',
                    history[0].color === 'green' && 'bg-emerald-600 border-emerald-300 text-white',
                    history[0].color === 'red' && 'bg-red-600 border-red-300 text-white',
                    history[0].color === 'black' && 'bg-zinc-900 border-zinc-500 text-white'
                  )}
                  title={`Latest Winning Number: ${history[0].label} (Click to bet)`}
                >
                  <span>{history[0].label}</span>
                  <span className="text-[9px] font-mono uppercase opacity-90 hidden sm:inline">
                    {history[0].parity ?? 'ZERO'}
                  </span>
                </button>

                <span className="h-5 w-px bg-zinc-800 shrink-0" />

                {/* 3-Lane Staggered Casino Bead Trail (Red Top, Zero Mid, Black Bottom) */}
                <div className="flex items-center gap-1.5 py-1">
                  {history.slice(1, 20).map((p, idx) => (
                    <button
                      key={`${p.id}-${idx}`}
                      type="button"
                      disabled={isBettingLocked}
                      onClick={() =>
                        handlePlaceBet(`straight-${p.id}`, 'straight', p.label, [p.id], PAYOUT_RATIOS.straight)
                      }
                      onMouseEnter={() => setHoveredNumbers([p.id])}
                      onMouseLeave={() => setHoveredNumbers(null)}
                      className={clsx(
                        'w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[11px] shadow-sm border transition hover:scale-110 shrink-0 cursor-pointer',
                        p.color === 'green' && 'bg-emerald-700 border-emerald-400 text-white translate-y-0',
                        p.color === 'red' && 'bg-red-700 border-red-400 text-white -translate-y-1',
                        p.color === 'black' && 'bg-zinc-900 border-zinc-600 text-zinc-100 translate-y-1'
                      )}
                      title={`Spin #${history.length - 1 - idx}: ${p.label} ${p.color.toUpperCase()} (Click to bet)`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Active Streak Callout & Live Croupier Timer / Status Pill */}
          <div className="flex items-center gap-2 shrink-0">
            {stats.currentStreak && (
              <div className="hidden md:flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 font-black text-[11px]">
                <Flame size={12} className="text-amber-400" />
                <span>{stats.currentStreak.label}</span>
              </div>
            )}

            {timerDuration > 0 && countdown !== null && !isSpinning && (
              <div
                className={clsx(
                  'flex items-center gap-1 px-2.5 py-0.5 rounded-full font-mono text-xs font-bold border transition-all',
                  countdown <= 4
                    ? 'bg-rose-950/80 border-rose-500 text-rose-300 animate-pulse'
                    : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                )}
              >
                <Clock size={12} />
                <span>
                  {countdown <= 4 ? 'NO MORE BETS' : `Bets Close: ${countdown}s`}
                </span>
              </div>
            )}
            {isSpinning && (
              <span className="text-amber-400 font-bold text-xs flex items-center gap-1.5 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                BALL IN MOTION
              </span>
            )}
          </div>
        </div>

        {/* The Realistic Casino Table: Padded Leather Rail + Mahogany Border + Felt */}
        <div className="relative rounded-[2.5rem] p-3 sm:p-5 bg-gradient-to-b from-[#3a2215] to-[#201108] border-8 border-[#2d180d] shadow-[0_25px_60px_rgba(0,0,0,0.8)]">
          {/* Tan/Brown Leather Padded Armrest Bumper Highlight */}
          <div className="absolute inset-0 rounded-[2.2rem] border-4 border-[#7a482b]/60 pointer-events-none" />

          {/* The Rich Casino Felt Surface (Monte Carlo Burgundy or Emerald Green) */}
          <div
            className={clsx(
              'rounded-[2rem] p-4 sm:p-6 transition-colors duration-500 shadow-[inset_0_4px_40px_rgba(0,0,0,0.85)] border border-amber-600/30',
              feltTheme === 'burgundy'
                ? 'bg-gradient-to-br from-[#6b141d] via-[#520f16] to-[#3a080d]'
                : 'bg-gradient-to-br from-[#0c3820] via-[#092c19] to-[#051a0e]'
            )}
          >
            {/* Upper Table Section: Cammegh 3D Luxury Wheel (Left) + Live Casino Reader Board (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center mb-6">
              {/* Left Head: Cammegh-Style 3D Luxury Roulette Wheel */}
              <div className="lg:col-span-5 flex flex-col items-center justify-center relative">
                <div className="relative w-[285px] h-[285px] sm:w-[330px] sm:h-[330px] flex items-center justify-center">
                  <canvas
                    ref={canvasRef}
                    width={340}
                    height={340}
                    className="w-full h-full drop-shadow-[0_18px_36px_rgba(0,0,0,0.92)]"
                  />
                </div>

                {/* Winning Number Spotlight / Dolly Callout */}
                {lastWinningPocket && !isSpinning && (
                  <div className="mt-2 flex flex-col items-center animate-bounce-subtle">
                    <div className="text-[10px] font-bold text-amber-400 tracking-wider uppercase flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      Winning Number
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className={clsx(
                          'text-xl font-black px-3.5 py-0.5 rounded-lg shadow-lg border',
                          lastWinningPocket.color === 'green' && 'bg-emerald-600 border-emerald-400 text-white',
                          lastWinningPocket.color === 'red' && 'bg-red-600 border-red-400 text-white',
                          lastWinningPocket.color === 'black' && 'bg-zinc-900 border-zinc-600 text-white'
                        )}
                      >
                        {lastWinningPocket.label}
                      </span>
                      <div className="text-left text-xs font-semibold leading-tight text-zinc-300">
                        <div className="capitalize text-amber-300 font-bold">{lastWinningPocket.color}</div>
                        <div className="text-[10px]">
                          {lastWinningPocket.parity ? lastWinningPocket.parity.toUpperCase() : 'ZERO'} •{' '}
                          {lastWinningPocket.range ? lastWinningPocket.range.toUpperCase() : ''}
                        </div>
                      </div>
                    </div>

                    {/* Settlement Result Pill */}
                    {lastSettlement && (
                      <div
                        className={clsx(
                          'mt-1.5 px-3 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1.5',
                          lastSettlement.netProfit > 0
                            ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-md'
                            : lastSettlement.netProfit < 0
                            ? 'bg-rose-950/80 border-rose-500 text-rose-300'
                            : 'bg-zinc-900 border-zinc-700 text-zinc-300'
                        )}
                      >
                        {lastSettlement.netProfit > 0 && <Sparkles className="w-3.5 h-3.5 text-amber-300" />}
                        <span>
                          {lastSettlement.netProfit > 0
                            ? `WON +$${lastSettlement.netProfit.toLocaleString()} (Payout: $${lastSettlement.totalPayout.toLocaleString()})`
                            : lastSettlement.netProfit < 0
                            ? `LOST -$${Math.abs(lastSettlement.netProfit).toLocaleString()}`
                            : 'PUSH'}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Head: Monte Carlo Live Telemetry & Reader Board + Compact Croupier Chip Float */}
              <div className="lg:col-span-7 flex flex-col justify-center">
                <RouletteReaderBoard
                  stats={stats}
                  bets={bets}
                  totalWagered={totalWagered}
                  isBettingLocked={isBettingLocked}
                  isSpinning={isSpinning}
                  onPlaceBet={handlePlaceBet}
                  onSeedSpins={handleSeedSpins}
                  onHoverNumbers={setHoveredNumbers}
                />
              </div>
            </div>

            {/* Lower Table Section: Main Betting Grid & French Racetrack */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
              {/* Left/Center: Main 3x12 Grid + Outside Bets (8 cols on xl) */}
              <div className="xl:col-span-8 flex flex-col gap-1.5">
                {/* 0 and 00 Top Header */}
                <div className="grid grid-cols-12 gap-1 mb-1">
                  {variant === 'european' ? (
                    <button
                      onClick={() => handlePlaceBet('straight-0', 'straight', '0', [0], PAYOUT_RATIOS.straight)}
                      disabled={isBettingLocked}
                      className={clsx(
                        'col-span-12 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-700 border-2 border-amber-400 font-black text-sm tracking-widest flex items-center justify-center transition-all relative group',
                        isBettingLocked && 'opacity-70 cursor-not-allowed'
                      )}
                    >
                      <span>0</span>
                      {bets['straight-0'] && (
                        <span className="absolute -top-2 -right-1 bg-amber-400 text-black text-[10px] font-black px-1.5 py-0.2 rounded-full border border-amber-200 shadow-lg">
                          ${bets['straight-0'].amount}
                        </span>
                      )}
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => handlePlaceBet('straight-0', 'straight', '0', [0], PAYOUT_RATIOS.straight)}
                        disabled={isBettingLocked}
                        className="col-span-6 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-700 border-2 border-amber-400 font-black text-sm tracking-widest flex items-center justify-center transition-all relative"
                      >
                        <span>0</span>
                        {bets['straight-0'] && (
                          <span className="absolute -top-2 -right-1 bg-amber-400 text-black text-[10px] font-black px-1.5 py-0.2 rounded-full border border-amber-200 shadow-lg">
                            ${bets['straight-0'].amount}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => handlePlaceBet('straight-00', 'straight', '00', ['00'], PAYOUT_RATIOS.straight)}
                        disabled={isBettingLocked}
                        className="col-span-6 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-700 border-2 border-amber-400 font-black text-sm tracking-widest flex items-center justify-center transition-all relative"
                      >
                        <span>00</span>
                        {bets['straight-00'] && (
                          <span className="absolute -top-2 -right-1 bg-amber-400 text-black text-[10px] font-black px-1.5 py-0.2 rounded-full border border-amber-200 shadow-lg">
                            ${bets['straight-00'].amount}
                          </span>
                        )}
                      </button>
                    </>
                  )}
                </div>

                {/* 3x12 Numbers Grid with 2:1 Column Bets at the right */}
                {/* Row 3: 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36 */}
                <div className="grid grid-cols-13 gap-1 mb-1">
                  {[3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36].map((num) => {
                    const isRed = RED_NUMBERS.includes(num);
                    const betKey = `straight-${num}`;
                    const isWinningDolly = lastWinningPocket?.id === num && !isSpinning;
                    return (
                      <button
                        key={num}
                        onClick={() => handlePlaceBet(betKey, 'straight', String(num), [num], PAYOUT_RATIOS.straight)}
                        disabled={isBettingLocked}
                        className={clsx(
                          'h-10 sm:h-12 rounded flex items-center justify-center font-bold text-xs sm:text-sm border-2 transition-all relative',
                          isRed
                            ? 'bg-red-800 hover:bg-red-700 border-amber-400/80 text-white'
                            : 'bg-zinc-950 hover:bg-zinc-900 border-amber-400/80 text-white',
                          isWinningDolly && 'ring-4 ring-amber-300 scale-105 z-10 shadow-2xl animate-pulse'
                        )}
                      >
                        <span>{num}</span>
                        {isWinningDolly && (
                          <span className="absolute -bottom-1 text-[9px] bg-amber-300 text-black px-1 rounded font-black shadow">
                            WIN
                          </span>
                        )}
                        {bets[betKey] && (
                          <span className="absolute -top-1.5 -right-1 bg-amber-400 text-black text-[9px] font-black px-1 rounded-full shadow">
                            ${bets[betKey].amount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                  {/* Column 3 Bet (2:1) */}
                  <button
                    onClick={() =>
                      handlePlaceBet(
                        'col-3',
                        'column',
                        'Col 3',
                        [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
                        PAYOUT_RATIOS.column
                      )
                    }
                    disabled={isBettingLocked}
                    className="h-10 sm:h-12 rounded bg-amber-950/40 hover:bg-amber-900/40 border-2 border-amber-400 text-amber-200 font-black text-[10px] sm:text-xs flex items-center justify-center relative"
                  >
                    <span>2 to 1</span>
                    {bets['col-3'] && (
                      <span className="absolute -top-1.5 -right-1 bg-amber-400 text-black text-[9px] font-black px-1 rounded-full shadow">
                        ${bets['col-3'].amount}
                      </span>
                    )}
                  </button>
                </div>

                {/* Row 2: 2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35 */}
                <div className="grid grid-cols-13 gap-1 mb-1">
                  {[2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35].map((num) => {
                    const isRed = RED_NUMBERS.includes(num);
                    const betKey = `straight-${num}`;
                    const isWinningDolly = lastWinningPocket?.id === num && !isSpinning;
                    return (
                      <button
                        key={num}
                        onClick={() => handlePlaceBet(betKey, 'straight', String(num), [num], PAYOUT_RATIOS.straight)}
                        disabled={isBettingLocked}
                        className={clsx(
                          'h-10 sm:h-12 rounded flex items-center justify-center font-bold text-xs sm:text-sm border-2 transition-all relative',
                          isRed
                            ? 'bg-red-800 hover:bg-red-700 border-amber-400/80 text-white'
                            : 'bg-zinc-950 hover:bg-zinc-900 border-amber-400/80 text-white',
                          isWinningDolly && 'ring-4 ring-amber-300 scale-105 z-10 shadow-2xl animate-pulse'
                        )}
                      >
                        <span>{num}</span>
                        {isWinningDolly && (
                          <span className="absolute -bottom-1 text-[9px] bg-amber-300 text-black px-1 rounded font-black shadow">
                            WIN
                          </span>
                        )}
                        {bets[betKey] && (
                          <span className="absolute -top-1.5 -right-1 bg-amber-400 text-black text-[9px] font-black px-1 rounded-full shadow">
                            ${bets[betKey].amount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                  {/* Column 2 Bet (2:1) */}
                  <button
                    onClick={() =>
                      handlePlaceBet(
                        'col-2',
                        'column',
                        'Col 2',
                        [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
                        PAYOUT_RATIOS.column
                      )
                    }
                    disabled={isBettingLocked}
                    className="h-10 sm:h-12 rounded bg-amber-950/40 hover:bg-amber-900/40 border-2 border-amber-400 text-amber-200 font-black text-[10px] sm:text-xs flex items-center justify-center relative"
                  >
                    <span>2 to 1</span>
                    {bets['col-2'] && (
                      <span className="absolute -top-1.5 -right-1 bg-amber-400 text-black text-[9px] font-black px-1 rounded-full shadow">
                        ${bets['col-2'].amount}
                      </span>
                    )}
                  </button>
                </div>

                {/* Row 1: 1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34 */}
                <div className="grid grid-cols-13 gap-1 mb-2">
                  {[1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34].map((num) => {
                    const isRed = RED_NUMBERS.includes(num);
                    const betKey = `straight-${num}`;
                    const isWinningDolly = lastWinningPocket?.id === num && !isSpinning;
                    return (
                      <button
                        key={num}
                        onClick={() => handlePlaceBet(betKey, 'straight', String(num), [num], PAYOUT_RATIOS.straight)}
                        disabled={isBettingLocked}
                        className={clsx(
                          'h-10 sm:h-12 rounded flex items-center justify-center font-bold text-xs sm:text-sm border-2 transition-all relative',
                          isRed
                            ? 'bg-red-800 hover:bg-red-700 border-amber-400/80 text-white'
                            : 'bg-zinc-950 hover:bg-zinc-900 border-amber-400/80 text-white',
                          isWinningDolly && 'ring-4 ring-amber-300 scale-105 z-10 shadow-2xl animate-pulse'
                        )}
                      >
                        <span>{num}</span>
                        {isWinningDolly && (
                          <span className="absolute -bottom-1 text-[9px] bg-amber-300 text-black px-1 rounded font-black shadow">
                            WIN
                          </span>
                        )}
                        {bets[betKey] && (
                          <span className="absolute -top-1.5 -right-1 bg-amber-400 text-black text-[9px] font-black px-1 rounded-full shadow">
                            ${bets[betKey].amount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                  {/* Column 1 Bet (2:1) */}
                  <button
                    onClick={() =>
                      handlePlaceBet(
                        'col-1',
                        'column',
                        'Col 1',
                        [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
                        PAYOUT_RATIOS.column
                      )
                    }
                    disabled={isBettingLocked}
                    className="h-10 sm:h-12 rounded bg-amber-950/40 hover:bg-amber-900/40 border-2 border-amber-400 text-amber-200 font-black text-[10px] sm:text-xs flex items-center justify-center relative"
                  >
                    <span>2 to 1</span>
                    {bets['col-1'] && (
                      <span className="absolute -top-1.5 -right-1 bg-amber-400 text-black text-[9px] font-black px-1 rounded-full shadow">
                        ${bets['col-1'].amount}
                      </span>
                    )}
                  </button>
                </div>

                {/* Dozens Row (2:1 Payout) */}
                <div className="grid grid-cols-3 gap-1.5 mb-1.5">
                  <button
                    onClick={() =>
                      handlePlaceBet(
                        'dozen-1',
                        'dozen',
                        '1st 12',
                        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
                        PAYOUT_RATIOS.dozen
                      )
                    }
                    disabled={isBettingLocked}
                    className="py-2.5 rounded bg-black/40 hover:bg-black/60 border-2 border-amber-400 font-black text-xs text-amber-200 flex items-center justify-center transition-all relative"
                  >
                    <span>1st 12</span>
                    {bets['dozen-1'] && (
                      <span className="absolute -top-1.5 -right-1 bg-amber-400 text-black text-[9px] font-black px-1.5 rounded-full shadow">
                        ${bets['dozen-1'].amount}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() =>
                      handlePlaceBet(
                        'dozen-2',
                        'dozen',
                        '2nd 12',
                        [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
                        PAYOUT_RATIOS.dozen
                      )
                    }
                    disabled={isBettingLocked}
                    className="py-2.5 rounded bg-black/40 hover:bg-black/60 border-2 border-amber-400 font-black text-xs text-amber-200 flex items-center justify-center transition-all relative"
                  >
                    <span>2nd 12</span>
                    {bets['dozen-2'] && (
                      <span className="absolute -top-1.5 -right-1 bg-amber-400 text-black text-[9px] font-black px-1.5 rounded-full shadow">
                        ${bets['dozen-2'].amount}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() =>
                      handlePlaceBet(
                        'dozen-3',
                        'dozen',
                        '3rd 12',
                        [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36],
                        PAYOUT_RATIOS.dozen
                      )
                    }
                    disabled={isBettingLocked}
                    className="py-2.5 rounded bg-black/40 hover:bg-black/60 border-2 border-amber-400 font-black text-xs text-amber-200 flex items-center justify-center transition-all relative"
                  >
                    <span>3rd 12</span>
                    {bets['dozen-3'] && (
                      <span className="absolute -top-1.5 -right-1 bg-amber-400 text-black text-[9px] font-black px-1.5 rounded-full shadow">
                        ${bets['dozen-3'].amount}
                      </span>
                    )}
                  </button>
                </div>

                {/* Even Money Outside Bets (1:1 Payout) */}
                <div className="grid grid-cols-6 gap-1.5">
                  {/* 1 to 18 (Low) */}
                  <button
                    onClick={() =>
                      handlePlaceBet(
                        'low',
                        'low',
                        '1-18',
                        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
                        PAYOUT_RATIOS.low
                      )
                    }
                    disabled={isBettingLocked}
                    className="py-3 rounded bg-black/40 hover:bg-black/60 border-2 border-amber-400 font-black text-xs text-amber-200 flex items-center justify-center relative"
                  >
                    <span>1 to 18</span>
                    {bets['low'] && (
                      <span className="absolute -top-1.5 -right-1 bg-amber-400 text-black text-[9px] font-black px-1.5 rounded-full shadow">
                        ${bets['low'].amount}
                      </span>
                    )}
                  </button>

                  {/* EVEN */}
                  <button
                    onClick={() =>
                      handlePlaceBet(
                        'even',
                        'even',
                        'EVEN',
                        [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36],
                        PAYOUT_RATIOS.even
                      )
                    }
                    disabled={isBettingLocked}
                    className="py-3 rounded bg-black/40 hover:bg-black/60 border-2 border-amber-400 font-black text-xs text-amber-200 flex items-center justify-center relative"
                  >
                    <span>EVEN</span>
                    {bets['even'] && (
                      <span className="absolute -top-1.5 -right-1 bg-amber-400 text-black text-[9px] font-black px-1.5 rounded-full shadow">
                        ${bets['even'].amount}
                      </span>
                    )}
                  </button>

                  {/* RED (Diamond) */}
                  <button
                    onClick={() =>
                      handlePlaceBet('red', 'red', 'RED', [...RED_NUMBERS], PAYOUT_RATIOS.red)
                    }
                    disabled={isBettingLocked}
                    className="py-3 rounded bg-red-800 hover:bg-red-700 border-2 border-amber-400 font-black text-xs text-white flex items-center justify-center relative shadow-inner"
                  >
                    <span className="w-3.5 h-3.5 bg-red-500 rotate-45 mr-1.5 border border-white/50" />
                    <span>RED</span>
                    {bets['red'] && (
                      <span className="absolute -top-1.5 -right-1 bg-amber-400 text-black text-[9px] font-black px-1.5 rounded-full shadow">
                        ${bets['red'].amount}
                      </span>
                    )}
                  </button>

                  {/* BLACK (Diamond) */}
                  <button
                    onClick={() =>
                      handlePlaceBet('black', 'black', 'BLACK', [...BLACK_NUMBERS], PAYOUT_RATIOS.black)
                    }
                    disabled={isBettingLocked}
                    className="py-3 rounded bg-zinc-950 hover:bg-zinc-900 border-2 border-amber-400 font-black text-xs text-white flex items-center justify-center relative shadow-inner"
                  >
                    <span className="w-3.5 h-3.5 bg-zinc-700 rotate-45 mr-1.5 border border-white/30" />
                    <span>BLACK</span>
                    {bets['black'] && (
                      <span className="absolute -top-1.5 -right-1 bg-amber-400 text-black text-[9px] font-black px-1.5 rounded-full shadow">
                        ${bets['black'].amount}
                      </span>
                    )}
                  </button>

                  {/* ODD */}
                  <button
                    onClick={() =>
                      handlePlaceBet(
                        'odd',
                        'odd',
                        'ODD',
                        [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35],
                        PAYOUT_RATIOS.odd
                      )
                    }
                    disabled={isBettingLocked}
                    className="py-3 rounded bg-black/40 hover:bg-black/60 border-2 border-amber-400 font-black text-xs text-amber-200 flex items-center justify-center relative"
                  >
                    <span>ODD</span>
                    {bets['odd'] && (
                      <span className="absolute -top-1.5 -right-1 bg-amber-400 text-black text-[9px] font-black px-1.5 rounded-full shadow">
                        ${bets['odd'].amount}
                      </span>
                    )}
                  </button>

                  {/* 19 to 36 (High) */}
                  <button
                    onClick={() =>
                      handlePlaceBet(
                        'high',
                        'high',
                        '19-36',
                        [19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36],
                        PAYOUT_RATIOS.high
                      )
                    }
                    disabled={isBettingLocked}
                    className="py-3 rounded bg-black/40 hover:bg-black/60 border-2 border-amber-400 font-black text-xs text-amber-200 flex items-center justify-center relative"
                  >
                    <span>19 to 36</span>
                    {bets['high'] && (
                      <span className="absolute -top-1.5 -right-1 bg-amber-400 text-black text-[9px] font-black px-1.5 rounded-full shadow">
                        ${bets['high'].amount}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Right: French Oval Racetrack (Call Bets matching reference photo) */}
              <div className="xl:col-span-4 flex flex-col items-center bg-black/30 border-2 border-amber-400/80 rounded-2xl p-3 shadow-inner">
                <div className="text-[10px] font-black text-amber-300 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Flame size={12} className="text-amber-400" />
                  <span>French Oval Racetrack (Call Bets)</span>
                </div>

                {/* Oval Sectors */}
                <div className="w-full space-y-2">
                  {/* Voisins du Zéro (Neighbors of Zero - 17 numbers) */}
                  <button
                    onClick={() =>
                      handlePlaceBet(
                        'call-voisins',
                        'voisins',
                        'Voisins du Zéro',
                        [...VOISINS_DU_ZERO],
                        PAYOUT_RATIOS.voisins
                      )
                    }
                    onMouseEnter={() => setHoveredNumbers([...VOISINS_DU_ZERO])}
                    onMouseLeave={() => setHoveredNumbers(null)}
                    disabled={isBettingLocked}
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-950/60 to-zinc-900 border border-amber-400/70 hover:border-amber-300 text-left flex items-center justify-between transition-all group relative cursor-pointer"
                  >
                    <div>
                      <div className="text-xs font-black text-amber-300 uppercase tracking-wide">
                        Voisins du Zéro
                      </div>
                      <span className="text-[10px] text-zinc-400">17 numbers around 0 (45.9% wheel)</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-400">2:1</span>
                    {bets['call-voisins'] && (
                      <span className="absolute -top-2 -right-1 bg-amber-400 text-black text-[9px] font-black px-2 py-0.2 rounded-full shadow">
                        ${bets['call-voisins'].amount}
                      </span>
                    )}
                  </button>

                  {/* Tiers du Cylindre (Third of the Wheel - 12 numbers) */}
                  <button
                    onClick={() =>
                      handlePlaceBet(
                        'call-tiers',
                        'tiers',
                        'Tiers du Cylindre',
                        [...TIERS_DU_CYLINDRE],
                        PAYOUT_RATIOS.tiers
                      )
                    }
                    onMouseEnter={() => setHoveredNumbers([...TIERS_DU_CYLINDRE])}
                    onMouseLeave={() => setHoveredNumbers(null)}
                    disabled={isBettingLocked}
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-950/60 to-zinc-900 border border-amber-400/70 hover:border-amber-300 text-left flex items-center justify-between transition-all group relative cursor-pointer"
                  >
                    <div>
                      <div className="text-xs font-black text-amber-300 uppercase tracking-wide">
                        Tiers du Cylindre
                      </div>
                      <span className="text-[10px] text-zinc-400">12 numbers opposite zero (32.4% wheel)</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-400">2:1</span>
                    {bets['call-tiers'] && (
                      <span className="absolute -top-2 -right-1 bg-amber-400 text-black text-[9px] font-black px-2 py-0.2 rounded-full shadow">
                        ${bets['call-tiers'].amount}
                      </span>
                    )}
                  </button>

                  {/* Orphelins (Orphans - 8 numbers) */}
                  <button
                    onClick={() =>
                      handlePlaceBet(
                        'call-orphelins',
                        'orphelins',
                        'Orphelins',
                        [...ORPHELINS],
                        PAYOUT_RATIOS.orphelins
                      )
                    }
                    onMouseEnter={() => setHoveredNumbers([...ORPHELINS])}
                    onMouseLeave={() => setHoveredNumbers(null)}
                    disabled={isBettingLocked}
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-950/60 to-zinc-900 border border-amber-400/70 hover:border-amber-300 text-left flex items-center justify-between transition-all group relative cursor-pointer"
                  >
                    <div>
                      <div className="text-xs font-black text-amber-300 uppercase tracking-wide">
                        Orphelins
                      </div>
                      <span className="text-[10px] text-zinc-400">8 flanking numbers (21.6% wheel)</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-400">4:1</span>
                    {bets['call-orphelins'] && (
                      <span className="absolute -top-2 -right-1 bg-amber-400 text-black text-[9px] font-black px-2 py-0.2 rounded-full shadow">
                        ${bets['call-orphelins'].amount}
                      </span>
                    )}
                  </button>

                  {/* Jeu Zéro (Zero Game - 7 numbers) */}
                  <button
                    onClick={() =>
                      handlePlaceBet(
                        'call-jeuzero',
                        'jeuzero',
                        'Jeu Zéro',
                        [...JEU_ZERO],
                        PAYOUT_RATIOS.jeuzero
                      )
                    }
                    onMouseEnter={() => setHoveredNumbers([...JEU_ZERO])}
                    onMouseLeave={() => setHoveredNumbers(null)}
                    disabled={isBettingLocked}
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-950/60 to-zinc-900 border border-amber-400/70 hover:border-amber-300 text-left flex items-center justify-between transition-all group relative cursor-pointer"
                  >
                    <div>
                      <div className="text-xs font-black text-amber-300 uppercase tracking-wide">
                        Jeu Zéro
                      </div>
                      <span className="text-[10px] text-zinc-400">7 numbers closest to zero (18.9% wheel)</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-400">4:1</span>
                    {bets['call-jeuzero'] && (
                      <span className="absolute -top-2 -right-1 bg-amber-400 text-black text-[9px] font-black px-2 py-0.2 rounded-full shadow">
                        ${bets['call-jeuzero'].amount}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Action Bar: Chips & Wagering Shortcuts */}
            <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-950/80 border border-amber-600/40 rounded-2xl p-3 shadow-xl">
              {/* Chip Selection Palette */}
              <div className="flex items-center space-x-2">
                <span className="text-xs text-amber-300 font-bold mr-1">CHIP:</span>
                {CHIP_DENOMINATIONS.map((chip) => (
                  <button
                    key={chip.value}
                    onClick={() => {
                      setSelectedChip(chip.value);
                      sound.playChipSound(1.2);
                    }}
                    className={clsx(
                      'w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center font-black text-xs border-2 shadow-lg transition-all',
                      chip.color,
                      selectedChip === chip.value
                        ? 'ring-4 ring-amber-400 scale-110 -translate-y-1'
                        : 'opacity-70 hover:opacity-100 hover:scale-105'
                    )}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Action Buttons: Clear, 2x Double, Repeat, SPIN */}
              <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                <button
                  onClick={handleClearBets}
                  disabled={isSpinning || isBettingLocked || totalWagered === 0}
                  className="px-3 py-2 text-xs font-bold rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 disabled:opacity-40 transition-all cursor-pointer"
                >
                  Clear
                </button>
                <button
                  onClick={handleDoubleBets}
                  disabled={isSpinning || isBettingLocked || totalWagered === 0 || bankroll < totalWagered}
                  className="px-3 py-2 text-xs font-bold rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 disabled:opacity-40 transition-all cursor-pointer"
                >
                  2x Double
                </button>
                <button
                  onClick={handleRebet}
                  disabled={isSpinning || isBettingLocked || Object.keys(lastBets).length === 0}
                  className="px-3 py-2 text-xs font-bold rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 disabled:opacity-40 transition-all cursor-pointer"
                >
                  Repeat
                </button>
                <button
                  onClick={executeSpin}
                  disabled={isSpinning || totalWagered === 0}
                  className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-black font-black text-sm tracking-wide shadow-lg shadow-amber-500/30 hover:from-amber-400 hover:to-yellow-400 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center space-x-2 cursor-pointer"
                >
                  {isSpinning ? (
                    <span className="flex items-center gap-1.5">
                      <span className="animate-spin w-4 h-4 border-2 border-black border-t-transparent rounded-full" />
                      <span>SPINNING...</span>
                    </span>
                  ) : (
                    <span>SPIN NOW (${totalWagered})</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 3. Statistics & Hot/Cold Modal */}
      {isStatsOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-amber-900/40 rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto custom-scrollbar p-5 shadow-2xl relative">
            <button
              onClick={() => setIsStatsOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-2 mb-4">
              <BarChart3 className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold text-amber-300">Roulette Spin Statistics</h2>
            </div>

            <div className="space-y-4 text-xs">
              {/* Total Spins */}
              <div className="flex justify-between items-center bg-zinc-950 px-3 py-2 rounded-lg border border-zinc-800">
                <span className="text-zinc-400">Total Recorded Spins:</span>
                <span className="font-bold text-white text-sm">{stats.totalSpins}</span>
              </div>

              {/* Red vs Black vs Green Bar */}
              <div>
                <div className="flex justify-between text-zinc-400 mb-1">
                  <span>Color Distribution:</span>
                  <span>
                    Red: {stats.redPercentage}% • Black: {stats.blackPercentage}% • Green: {stats.greenPercentage}%
                  </span>
                </div>
                <div className="h-3 w-full rounded-full overflow-hidden flex bg-zinc-800">
                  <div style={{ width: `${stats.redPercentage}%` }} className="bg-red-600" />
                  <div style={{ width: `${stats.blackPercentage}%` }} className="bg-zinc-950" />
                  <div style={{ width: `${stats.greenPercentage}%` }} className="bg-emerald-600" />
                </div>
              </div>

              {/* Even vs Odd Bar */}
              <div>
                <div className="flex justify-between text-zinc-400 mb-1">
                  <span>Even vs Odd:</span>
                  <span>Even: {stats.evenPercentage}% • Odd: {stats.oddPercentage}%</span>
                </div>
                <div className="h-3 w-full rounded-full overflow-hidden flex bg-zinc-800">
                  <div style={{ width: `${stats.evenPercentage}%` }} className="bg-blue-600" />
                  <div style={{ width: `${stats.oddPercentage}%` }} className="bg-amber-600" />
                </div>
              </div>

              {/* Hot and Cold Numbers */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-zinc-950 p-3 rounded-xl border border-rose-900/30">
                  <div className="flex items-center gap-1.5 text-rose-400 font-bold mb-2">
                    <Flame className="w-4 h-4" />
                    <span>Hot Numbers</span>
                  </div>
                  {stats.hotNumbers.length === 0 ? (
                    <span className="text-zinc-600 italic">No spins yet</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {stats.hotNumbers.map((h) => (
                        <span
                          key={String(h.pocket)}
                          className="px-2 py-0.5 rounded bg-rose-950 border border-rose-700 text-rose-200 font-bold"
                        >
                          {h.pocket} ({h.count}x)
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-zinc-950 p-3 rounded-xl border border-sky-900/30">
                  <div className="flex items-center gap-1.5 text-sky-400 font-bold mb-2">
                    <Snowflake className="w-4 h-4" />
                    <span>Cold Numbers</span>
                  </div>
                  {stats.coldNumbers.length === 0 ? (
                    <span className="text-zinc-600 italic">No spins yet</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {stats.coldNumbers.map((c) => (
                        <span
                          key={String(c.pocket)}
                          className="px-2 py-0.5 rounded bg-sky-950 border border-sky-700 text-sky-200 font-bold"
                        >
                          {c.pocket} ({c.count}x)
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Rules & Payouts Modal */}
      {isRulesOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-amber-900/40 rounded-2xl max-w-lg w-full p-5 shadow-2xl relative max-h-[85vh] overflow-y-auto custom-scrollbar">
            <button
              onClick={() => setIsRulesOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-2 mb-4">
              <HelpCircle className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold text-amber-300">Roulette Payout Reference</h2>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                <h3 className="font-bold text-amber-400 mb-1.5">Inside Bets</h3>
                <div className="grid grid-cols-2 gap-2 text-zinc-300">
                  <div>Straight Up (Single #): <span className="font-bold text-emerald-400">35:1</span></div>
                  <div>Split (2 Numbers): <span className="font-bold text-emerald-400">17:1</span></div>
                  <div>Street (3 Numbers): <span className="font-bold text-emerald-400">11:1</span></div>
                  <div>Corner (4 Numbers): <span className="font-bold text-emerald-400">8:1</span></div>
                  <div>Six Line (6 Numbers): <span className="font-bold text-emerald-400">5:1</span></div>
                </div>
              </div>

              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                <h3 className="font-bold text-amber-400 mb-1.5">Outside Bets</h3>
                <div className="grid grid-cols-2 gap-2 text-zinc-300">
                  <div>Column (12 Numbers): <span className="font-bold text-emerald-400">2:1</span></div>
                  <div>Dozen (12 Numbers): <span className="font-bold text-emerald-400">2:1</span></div>
                  <div>Red / Black: <span className="font-bold text-emerald-400">1:1</span></div>
                  <div>Even / Odd: <span className="font-bold text-emerald-400">1:1</span></div>
                  <div>1 to 18 (Low) / 19 to 36 (High): <span className="font-bold text-emerald-400">1:1</span></div>
                </div>
              </div>

              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                <h3 className="font-bold text-amber-400 mb-1.5">French Racetrack Call Bets</h3>
                <div className="grid grid-cols-2 gap-2 text-zinc-300">
                  <div>Voisins du Zéro (17 #s): <span className="font-bold text-emerald-400">2:1</span></div>
                  <div>Tiers du Cylindre (12 #s): <span className="font-bold text-emerald-400">2:1</span></div>
                  <div>Orphelins (8 #s): <span className="font-bold text-emerald-400">4:1</span></div>
                  <div>Jeu Zéro (7 #s): <span className="font-bold text-emerald-400">4:1</span></div>
                </div>
              </div>

              <div className="bg-amber-950/40 p-3 rounded-xl border border-amber-800/40 text-amber-200">
                <span className="font-bold">House Edge:</span>
                <p className="mt-1 text-zinc-300">
                  European Roulette has a single zero (<code className="text-emerald-400">0</code>) and a 2.70% house edge.
                  American Roulette adds a double zero (<code className="text-emerald-400">00</code>), increasing the house edge to 5.26%.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. User Profile Modal */}
      {isProfileOpen && (
        <UserProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
        />
      )}

      {/* Dockable AI Probability Coach */}
      <RouletteAICoach
        variant={variant}
        bets={bets}
        history={history}
        bankroll={bankroll}
        position={coachPosition}
        onPositionChange={setCoachPosition}
        isStacked={isStacked}
      />

      {/* Dockable Croupier Speech Log */}
      <RouletteDealerLog
        logs={logs}
        onClearLogs={() => setLogs([])}
        position={dealerLogPosition}
        onPositionChange={setDealerLogPosition}
        isStacked={isStacked}
      />
    </div>
  );
}
