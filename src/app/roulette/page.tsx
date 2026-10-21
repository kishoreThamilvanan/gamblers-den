'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
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
  settleRouletteBets,
  calculateRouletteStatistics,
  spinRoulette,
} from '@/lib/roulette/rouletteEngine';
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  Coins,
  Sparkles,
  BarChart3,
  RotateCcw,
  Flame,
  Snowflake,
  HelpCircle,
  X,
} from 'lucide-react';
import { clsx } from 'clsx';

const CHIP_DENOMINATIONS = [
  { value: 1, label: '$1', color: 'bg-blue-600 border-blue-400 text-white shadow-blue-500/30' },
  { value: 5, label: '$5', color: 'bg-red-600 border-red-400 text-white shadow-red-500/30' },
  { value: 25, label: '$25', color: 'bg-emerald-600 border-emerald-400 text-white shadow-emerald-500/30' },
  { value: 100, label: '$100', color: 'bg-zinc-950 border-amber-400 text-amber-300 shadow-amber-500/30' },
  { value: 500, label: '$500', color: 'bg-purple-800 border-purple-400 text-white shadow-purple-500/30' },
];

export default function RoulettePage() {
  const { userProfile, soundMuted, toggleMute } = usePokerStore();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);

  // Variant: European vs American
  const [variant, setVariant] = useState<RouletteVariant>('european');

  // Persistent Career Bankroll
  const [bankroll, setBankroll] = useState<number>(userProfile?.careerBankroll ?? 2000);

  // Chip selection
  const [selectedChip, setSelectedChip] = useState<number>(25);

  // Active Bets Placed on the Felt: Map of betId -> RouletteBet
  const [bets, setBets] = useState<Record<string, RouletteBet>>({});
  const [lastBets, setLastBets] = useState<Record<string, RouletteBet>>({});

  // Spin & Game Status
  const [isSpinning, setIsSpinning] = useState(false);
  const [lastWinningPocket, setLastWinningPocket] = useState<RoulettePocket | null>(null);
  const [lastSettlement, setLastSettlement] = useState<SpinSettlement | null>(null);
  const [history, setHistory] = useState<RoulettePocket[]>([]);

  // Canvas ref for 3D Roulette Wheel
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Wheel animation physics state
  const wheelStateRef = useRef({
    wheelAngle: 0,
    ballAngle: 0,
    ballRadius: 135,
    ballSpeed: 0,
    wheelSpeed: 0,
    isAnimating: false,
    targetPocketIndex: 0,
  });

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

  // Handle placing/incrementing a bet on a betting spot
  const handlePlaceBet = useCallback((
    id: string,
    type: RouletteBet['type'],
    label: string,
    numbers: PocketNumber[],
    multiplier: number
  ) => {
    if (isSpinning) return;
    if (bankroll < selectedChip) {
      return;
    }

    sound.playChipSound(1.05);

    // Deduct chip from bankroll
    updateVaultBankroll(bankroll - selectedChip);

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
  }, [isSpinning, bankroll, selectedChip, updateVaultBankroll]);

  // Clear all unspun bets and refund back to bankroll
  const handleClearBets = useCallback(() => {
    if (isSpinning || totalWagered === 0) return;
    sound.playChipSplash();
    updateVaultBankroll(bankroll + totalWagered);
    setBets({});
  }, [isSpinning, totalWagered, bankroll, updateVaultBankroll]);

  // Double all active bets if bankroll allows
  const handleDoubleBets = useCallback(() => {
    if (isSpinning || totalWagered === 0) return;
    if (bankroll < totalWagered) return;

    sound.playChipSplash();
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
  }, [isSpinning, totalWagered, bankroll, updateVaultBankroll]);

  // Repeat bets from the previous spin
  const handleRebet = useCallback(() => {
    if (isSpinning || Object.keys(lastBets).length === 0) return;
    const rebetTotal = Object.values(lastBets).reduce((s, b) => s + b.amount, 0);
    if (bankroll < rebetTotal) return;

    // First refund current bets if any
    const refund = totalWagered;
    sound.playChipSplash();
    updateVaultBankroll(bankroll + refund - rebetTotal);
    setBets({ ...lastBets });
  }, [isSpinning, lastBets, bankroll, totalWagered, updateVaultBankroll]);

  // Canvas Wheel Drawing Function
  const drawWheel = useCallback((
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    wheelAngle: number,
    ballAngle: number,
    ballRadius: number
  ) => {
    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    const outerRadius = Math.min(centerX, centerY) - 10;
    const pockets = wheelPockets;
    const pocketCount = pockets.length;
    const pocketArc = (2 * Math.PI) / pocketCount;

    // 1. Mahogany Outer Rim with Radial Shading
    const rimGrad = ctx.createRadialGradient(
      centerX - 10,
      centerY - 10,
      outerRadius * 0.7,
      centerX,
      centerY,
      outerRadius
    );
    rimGrad.addColorStop(0, '#3e1e12');
    rimGrad.addColorStop(0.5, '#2b130a');
    rimGrad.addColorStop(1, '#170904');

    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius, 0, 2 * Math.PI);
    ctx.fillStyle = rimGrad;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#d4af37'; // Gold bezel border
    ctx.stroke();

    // 2. Brass Ball Track
    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius - 16, 0, 2 * Math.PI);
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#221510';
    ctx.stroke();

    // 3. Numbered Pockets Ring
    const innerTrackRadius = outerRadius - 26;
    const pocketBaseRadius = innerTrackRadius - 48;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(wheelAngle);

    for (let i = 0; i < pocketCount; i++) {
      const pocketId = pockets[i];
      const startAngle = i * pocketArc - pocketArc / 2;
      const endAngle = startAngle + pocketArc;

      const isZero = pocketId === 0 || pocketId === '00';
      const isRed = typeof pocketId === 'number' && RED_NUMBERS.includes(pocketId);

      // Pocket background
      ctx.beginPath();
      ctx.arc(0, 0, innerTrackRadius, startAngle, endAngle);
      ctx.arc(0, 0, pocketBaseRadius, endAngle, startAngle, true);
      ctx.closePath();

      if (isZero) {
        ctx.fillStyle = '#15803d'; // Green
      } else if (isRed) {
        ctx.fillStyle = '#b91c1c'; // Red
      } else {
        ctx.fillStyle = '#18181b'; // Black
      }
      ctx.fill();

      // Metallic pocket fret dividing lines
      ctx.strokeStyle = '#a1a1aa';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Pocket Number text
      ctx.save();
      const midAngle = startAngle + pocketArc / 2;
      ctx.rotate(midAngle);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(String(pocketId), 0, -(pocketBaseRadius + 24));
      ctx.restore();
    }

    // 4. Inner Brass Cone & Turret Spindle
    const turretRadius = pocketBaseRadius;
    const coneGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, turretRadius);
    coneGrad.addColorStop(0, '#fef08a');
    coneGrad.addColorStop(0.3, '#ca8a04');
    coneGrad.addColorStop(0.7, '#854d0e');
    coneGrad.addColorStop(1, '#451a03');

    ctx.beginPath();
    ctx.arc(0, 0, turretRadius, 0, 2 * Math.PI);
    ctx.fillStyle = coneGrad;
    ctx.fill();
    ctx.strokeStyle = '#713f12';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Brass Turret Crossbars
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 3;
    for (let b = 0; b < 4; b++) {
      ctx.save();
      ctx.rotate((b * Math.PI) / 2);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, turretRadius - 8);
      ctx.stroke();
      ctx.restore();
    }

    // Center Spindle Cap
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, 2 * Math.PI);
    ctx.fillStyle = '#fef9c3';
    ctx.fill();
    ctx.strokeStyle = '#a16207';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore(); // Restore wheel rotation

    // 5. Ball Rendering
    if (ballRadius > 0) {
      const bx = centerX + Math.cos(ballAngle) * ballRadius;
      const by = centerY + Math.sin(ballAngle) * ballRadius;

      // Ball shadow
      ctx.beginPath();
      ctx.arc(bx + 2, by + 2, 6, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fill();

      // Ivory Ball
      const ballGrad = ctx.createRadialGradient(bx - 2, by - 2, 1, bx, by, 6);
      ballGrad.addColorStop(0, '#ffffff');
      ballGrad.addColorStop(0.7, '#f1f5f9');
      ballGrad.addColorStop(1, '#94a3b8');

      ctx.beginPath();
      ctx.arc(bx, by, 5.5, 0, 2 * Math.PI);
      ctx.fillStyle = ballGrad;
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.restore();
  }, [wheelPockets]);

  // Initial canvas render on mount / variant change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawWheel(
      ctx,
      canvas.width,
      canvas.height,
      wheelStateRef.current.wheelAngle,
      wheelStateRef.current.ballAngle,
      wheelStateRef.current.ballRadius
    );
  }, [drawWheel, variant]);

  // Spin Wheel Action
  const handleSpin = useCallback(() => {
    if (isSpinning || totalWagered === 0) return;

    setIsSpinning(true);
    setLastSettlement(null);
    setLastWinningPocket(null);

    // Save active bets for Rebet
    setLastBets({ ...bets });

    sound.playRouletteSpin();

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

    const outerRadius = canvas.width / 2 - 20;
    const trackRadius = outerRadius - 16;
    const pocketRadius = trackRadius - 38;

    let startTime: number | null = null;
    const totalDuration = 4800; // 4.8 seconds authentic casino spin
    const initialBallSpeed = 0.085;

    let hasClickedFret = false;
    let hasDropped = false;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(1, elapsed / totalDuration);

      // Deceleration curve (cubic ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);

      // Ball rotates clockwise fast, then slows down
      const ballAngle = elapsed * initialBallSpeed * (1 - easeOut * 0.92);
      // Wheel rotates slowly counter-clockwise
      const currentWheelAngle = targetWheelAngle + (1 - easeOut) * Math.PI * 4;

      // Ball radius transitions from outer track into pocket
      let currentBallRadius = trackRadius;
      if (progress > 0.65) {
        // Ball drops down the cone into pocket
        const dropProgress = (progress - 0.65) / 0.35;
        currentBallRadius = trackRadius - (trackRadius - pocketRadius) * Math.sin((dropProgress * Math.PI) / 2);

        // Sound cues
        if (!hasClickedFret && dropProgress > 0.3) {
          hasClickedFret = true;
          sound.playRouletteBallClick(100);
        }
        if (!hasDropped && dropProgress > 0.75) {
          hasDropped = true;
          sound.playRouletteDrop();
        }
      }

      drawWheel(ctx, canvas.width, canvas.height, currentWheelAngle, ballAngle, currentBallRadius);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Spin Complete
        setIsSpinning(false);
        setLastWinningPocket(winningPocket);
        setHistory((prev) => [winningPocket, ...prev.slice(0, 99)]);

        // Settle all placed bets
        const activeBetsArray = Object.values(bets);
        const settlement = settleRouletteBets(winningPocket, activeBetsArray);
        setLastSettlement(settlement);

        // Award total payout to player bankroll
        if (settlement.totalPayout > 0) {
          updateVaultBankroll(bankroll + settlement.totalPayout);
          sound.playWinPot();
        }

        // Clear active bets from table
        setBets({});
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
  ]);

  // Clean up animation frame on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  // Compute Roulette History Stats
  const stats = useMemo(() => {
    return calculateRouletteStatistics(history, variant);
  }, [history, variant]);

  // If user is not authenticated, render standard AuthGateView
  if (!userProfile) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col justify-center items-center p-4">
        <AuthGateView />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b0e] text-slate-100 flex flex-col select-none overflow-x-hidden font-sans">
      {/* 1. Header Navigation Bar */}
      <header className="h-14 border-b border-amber-900/40 bg-zinc-950/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between z-20 sticky top-0">
        <div className="flex items-center space-x-3 sm:space-x-4">
          <Link
            href="/"
            className="flex items-center space-x-1.5 text-xs sm:text-sm font-medium text-amber-400 hover:text-amber-300 transition-colors bg-amber-950/30 hover:bg-amber-900/40 px-2.5 py-1.5 rounded-lg border border-amber-800/40"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Casino Floor</span>
          </Link>
          <div className="h-4 w-px bg-zinc-800" />
          <div className="flex items-center space-x-2">
            <span className="text-sm sm:text-base font-bold tracking-wider text-amber-300 drop-shadow-[0_0_12px_rgba(245,158,11,0.35)]">
              ROULETTE VIP
            </span>
            <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-amber-950/70 border border-amber-700/50 text-amber-400">
              {variant === 'european' ? 'Single 0 • 2.7%' : '0 & 00 • 5.3%'}
            </span>
          </div>
        </div>

        {/* Center / Right controls: Variant selector, Stats, Sound, Bankroll */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* European / American Toggle */}
          <div className="flex items-center bg-zinc-900/90 rounded-lg p-0.5 border border-zinc-800 text-xs">
            <button
              onClick={() => {
                if (isSpinning) return;
                setVariant('european');
              }}
              className={clsx(
                'px-2.5 py-1 rounded font-medium transition-all',
                variant === 'european'
                  ? 'bg-amber-500 text-black shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              European
            </button>
            <button
              onClick={() => {
                if (isSpinning) return;
                setVariant('american');
              }}
              className={clsx(
                'px-2.5 py-1 rounded font-medium transition-all',
                variant === 'american'
                  ? 'bg-amber-500 text-black shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              American
            </button>
          </div>

          {/* Stats Button */}
          <button
            onClick={() => setIsStatsOpen(true)}
            className="p-1.5 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-amber-300 transition-colors"
            title="Roulette Statistics & Heatmap"
          >
            <BarChart3 className="w-4 h-4" />
          </button>

          {/* Rules / Help Button */}
          <button
            onClick={() => setIsRulesOpen(true)}
            className="p-1.5 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-amber-300 transition-colors"
            title="Roulette Rules & Payouts"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Mute Button */}
          <button
            onClick={toggleMute}
            className="p-1.5 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-amber-300 transition-colors"
            title={soundMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {soundMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
          </button>

          {/* Career Bankroll Vault Pill */}
          <button
            onClick={() => setIsProfileOpen(true)}
            className="flex items-center space-x-1.5 bg-gradient-to-r from-amber-950/60 to-zinc-900 border border-amber-600/40 hover:border-amber-500/80 px-2.5 py-1 rounded-full transition-all group shadow-inner"
          >
            <Coins className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-amber-200">
              ${bankroll.toLocaleString()}
            </span>
          </button>
        </div>
      </header>

      {/* 2. Main Game Arena */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 flex flex-col gap-4">
        {/* Recent Numbers Marquee */}
        <div className="flex items-center justify-between bg-zinc-950/70 border border-zinc-800/80 rounded-xl px-3 py-2 text-xs">
          <div className="flex items-center space-x-2 text-zinc-400 font-medium">
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>Recent Spins:</span>
          </div>
          <div className="flex items-center space-x-1.5 overflow-x-auto py-0.5">
            {history.length === 0 ? (
              <span className="text-zinc-600 italic">No spins yet — place bets and spin the wheel!</span>
            ) : (
              history.slice(0, 12).map((p, idx) => (
                <div
                  key={`${p.id}-${idx}`}
                  className={clsx(
                    'w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shadow-sm border',
                    p.color === 'green' && 'bg-emerald-600 border-emerald-400 text-white',
                    p.color === 'red' && 'bg-red-600 border-red-400 text-white',
                    p.color === 'black' && 'bg-zinc-900 border-zinc-700 text-zinc-100',
                    idx === 0 && 'ring-2 ring-amber-400 scale-105'
                  )}
                >
                  {p.label}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Wheel & Felt Grid Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Wheel Column (5 cols on lg) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 border border-amber-900/30 rounded-2xl p-4 shadow-2xl relative">
            {/* 3D Wheel Canvas */}
            <div className="relative w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] flex items-center justify-center">
              <canvas
                ref={canvasRef}
                width={320}
                height={320}
                className="w-full h-full drop-shadow-[0_12px_24px_rgba(0,0,0,0.8)]"
              />
            </div>

            {/* Winning Pocket Result Spotlight */}
            {lastWinningPocket && !isSpinning && (
              <div className="mt-3 flex flex-col items-center animate-bounce-subtle">
                <div className="text-[11px] font-semibold text-amber-400 tracking-wider uppercase flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Winning Number
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={clsx(
                      'text-2xl font-black px-4 py-1 rounded-xl shadow-lg border',
                      lastWinningPocket.color === 'green' && 'bg-emerald-600 border-emerald-400 text-white',
                      lastWinningPocket.color === 'red' && 'bg-red-600 border-red-400 text-white',
                      lastWinningPocket.color === 'black' && 'bg-zinc-900 border-zinc-600 text-white'
                    )}
                  >
                    {lastWinningPocket.label}
                  </span>
                  <div className="text-left text-xs font-semibold leading-tight text-zinc-300">
                    <div className="capitalize text-amber-300 font-bold">{lastWinningPocket.color}</div>
                    <div>
                      {lastWinningPocket.parity ? lastWinningPocket.parity.toUpperCase() : 'ZERO'} •{' '}
                      {lastWinningPocket.range ? lastWinningPocket.range.toUpperCase() : ''}
                    </div>
                  </div>
                </div>

                {/* Spin Settlement Pill */}
                {lastSettlement && (
                  <div
                    className={clsx(
                      'mt-2 px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5',
                      lastSettlement.netProfit > 0
                        ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-emerald-500/20 shadow-md'
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

          {/* Felt Board Column (7 cols on lg) */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            {/* The Green Casino Felt */}
            <div className="bg-[#0b2818] border-4 border-[#134e2a] rounded-2xl p-3 sm:p-4 shadow-[inset_0_4px_30px_rgba(0,0,0,0.8)] text-white">
              {/* Top Zeros Row */}
              <div className="grid grid-cols-12 gap-1 mb-1.5">
                {variant === 'european' ? (
                  <button
                    onClick={() => handlePlaceBet('straight-0', 'straight', '0', [0], PAYOUT_RATIOS.straight)}
                    className="col-span-12 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 border border-emerald-400 font-bold text-sm tracking-wider flex items-center justify-center transition-all relative group"
                  >
                    <span>0</span>
                    {bets['straight-0'] && (
                      <span className="absolute -top-2 -right-1 bg-amber-400 text-black text-[10px] font-black px-1.5 py-0.2 rounded-full border border-amber-200 shadow-md">
                        ${bets['straight-0'].amount}
                      </span>
                    )}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => handlePlaceBet('straight-0', 'straight', '0', [0], PAYOUT_RATIOS.straight)}
                      className="col-span-6 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 border border-emerald-400 font-bold text-sm tracking-wider flex items-center justify-center transition-all relative"
                    >
                      <span>0</span>
                      {bets['straight-0'] && (
                        <span className="absolute -top-2 -right-1 bg-amber-400 text-black text-[10px] font-black px-1.5 py-0.2 rounded-full border border-amber-200 shadow-md">
                          ${bets['straight-0'].amount}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => handlePlaceBet('straight-00', 'straight', '00', ['00'], PAYOUT_RATIOS.straight)}
                      className="col-span-6 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 border border-emerald-400 font-bold text-sm tracking-wider flex items-center justify-center transition-all relative"
                    >
                      <span>00</span>
                      {bets['straight-00'] && (
                        <span className="absolute -top-2 -right-1 bg-amber-400 text-black text-[10px] font-black px-1.5 py-0.2 rounded-full border border-amber-200 shadow-md">
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
                  return (
                    <button
                      key={num}
                      onClick={() => handlePlaceBet(betKey, 'straight', String(num), [num], PAYOUT_RATIOS.straight)}
                      className={clsx(
                        'h-10 sm:h-12 rounded flex items-center justify-center font-bold text-xs sm:text-sm border transition-all relative',
                        isRed
                          ? 'bg-red-700 hover:bg-red-600 border-red-500'
                          : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700'
                      )}
                    >
                      <span>{num}</span>
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
                  className="h-10 sm:h-12 rounded bg-[#07361a] hover:bg-[#0c4c26] border border-emerald-600/60 font-bold text-[10px] sm:text-xs flex items-center justify-center relative"
                >
                  <span>2:1</span>
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
                  return (
                    <button
                      key={num}
                      onClick={() => handlePlaceBet(betKey, 'straight', String(num), [num], PAYOUT_RATIOS.straight)}
                      className={clsx(
                        'h-10 sm:h-12 rounded flex items-center justify-center font-bold text-xs sm:text-sm border transition-all relative',
                        isRed
                          ? 'bg-red-700 hover:bg-red-600 border-red-500'
                          : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700'
                      )}
                    >
                      <span>{num}</span>
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
                  className="h-10 sm:h-12 rounded bg-[#07361a] hover:bg-[#0c4c26] border border-emerald-600/60 font-bold text-[10px] sm:text-xs flex items-center justify-center relative"
                >
                  <span>2:1</span>
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
                  return (
                    <button
                      key={num}
                      onClick={() => handlePlaceBet(betKey, 'straight', String(num), [num], PAYOUT_RATIOS.straight)}
                      className={clsx(
                        'h-10 sm:h-12 rounded flex items-center justify-center font-bold text-xs sm:text-sm border transition-all relative',
                        isRed
                          ? 'bg-red-700 hover:bg-red-600 border-red-500'
                          : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700'
                      )}
                    >
                      <span>{num}</span>
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
                  className="h-10 sm:h-12 rounded bg-[#07361a] hover:bg-[#0c4c26] border border-emerald-600/60 font-bold text-[10px] sm:text-xs flex items-center justify-center relative"
                >
                  <span>2:1</span>
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
                  className="py-2 rounded bg-[#07361a] hover:bg-[#0c4c26] border border-emerald-600/70 font-bold text-xs flex items-center justify-center transition-all relative"
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
                  className="py-2 rounded bg-[#07361a] hover:bg-[#0c4c26] border border-emerald-600/70 font-bold text-xs flex items-center justify-center transition-all relative"
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
                  className="py-2 rounded bg-[#07361a] hover:bg-[#0c4c26] border border-emerald-600/70 font-bold text-xs flex items-center justify-center transition-all relative"
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
                  className="py-2.5 rounded bg-[#07361a] hover:bg-[#0c4c26] border border-emerald-600/70 font-bold text-xs flex items-center justify-center relative"
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
                  className="py-2.5 rounded bg-[#07361a] hover:bg-[#0c4c26] border border-emerald-600/70 font-bold text-xs flex items-center justify-center relative"
                >
                  <span>EVEN</span>
                  {bets['even'] && (
                    <span className="absolute -top-1.5 -right-1 bg-amber-400 text-black text-[9px] font-black px-1.5 rounded-full shadow">
                      ${bets['even'].amount}
                    </span>
                  )}
                </button>

                {/* RED */}
                <button
                  onClick={() =>
                    handlePlaceBet(
                      'red',
                      'red',
                      'RED',
                      [...RED_NUMBERS],
                      PAYOUT_RATIOS.red
                    )
                  }
                  className="py-2.5 rounded bg-red-700 hover:bg-red-600 border border-red-400 font-black text-xs flex items-center justify-center relative shadow-inner"
                >
                  <span className="w-3.5 h-3.5 bg-red-500 rotate-45 mr-1 border border-white/40" />
                  <span>RED</span>
                  {bets['red'] && (
                    <span className="absolute -top-1.5 -right-1 bg-amber-400 text-black text-[9px] font-black px-1.5 rounded-full shadow">
                      ${bets['red'].amount}
                    </span>
                  )}
                </button>

                {/* BLACK */}
                <button
                  onClick={() =>
                    handlePlaceBet(
                      'black',
                      'black',
                      'BLACK',
                      [...BLACK_NUMBERS],
                      PAYOUT_RATIOS.black
                    )
                  }
                  className="py-2.5 rounded bg-zinc-950 hover:bg-zinc-900 border border-zinc-700 font-black text-xs flex items-center justify-center relative shadow-inner"
                >
                  <span className="w-3.5 h-3.5 bg-zinc-700 rotate-45 mr-1 border border-white/20" />
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
                  className="py-2.5 rounded bg-[#07361a] hover:bg-[#0c4c26] border border-emerald-600/70 font-bold text-xs flex items-center justify-center relative"
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
                  className="py-2.5 rounded bg-[#07361a] hover:bg-[#0c4c26] border border-emerald-600/70 font-bold text-xs flex items-center justify-center relative"
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

            {/* Quick Action Bar & Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-950/80 border border-zinc-800 rounded-xl p-3">
              {/* Chip Selection Palette */}
              <div className="flex items-center space-x-2">
                <span className="text-xs text-zinc-400 font-semibold mr-1">CHIP:</span>
                {CHIP_DENOMINATIONS.map((chip) => (
                  <button
                    key={chip.value}
                    onClick={() => {
                      setSelectedChip(chip.value);
                      sound.playChipSound(1.2);
                    }}
                    className={clsx(
                      'w-10 h-10 rounded-full flex items-center justify-center font-black text-xs border-2 shadow-md transition-all',
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

              {/* Action Buttons: Clear, Double, Repeat, SPIN */}
              <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                <button
                  onClick={handleClearBets}
                  disabled={isSpinning || totalWagered === 0}
                  className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 disabled:opacity-40 transition-all"
                >
                  Clear
                </button>
                <button
                  onClick={handleDoubleBets}
                  disabled={isSpinning || totalWagered === 0 || bankroll < totalWagered}
                  className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 disabled:opacity-40 transition-all"
                >
                  2x Double
                </button>
                <button
                  onClick={handleRebet}
                  disabled={isSpinning || Object.keys(lastBets).length === 0}
                  className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 disabled:opacity-40 transition-all"
                >
                  Repeat
                </button>
                <button
                  onClick={handleSpin}
                  disabled={isSpinning || totalWagered === 0}
                  className="flex-1 sm:flex-none px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-black font-black text-sm tracking-wide shadow-lg shadow-amber-500/25 hover:from-amber-400 hover:to-yellow-400 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isSpinning ? (
                    <span className="flex items-center gap-1.5">
                      <span className="animate-spin w-4 h-4 border-2 border-black border-t-transparent rounded-full" />
                      <span>SPINNING...</span>
                    </span>
                  ) : (
                    <span>SPIN (${totalWagered})</span>
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
          <div className="bg-zinc-900 border border-amber-900/40 rounded-2xl max-w-lg w-full p-5 shadow-2xl relative">
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
          <div className="bg-zinc-900 border border-amber-900/40 rounded-2xl max-w-lg w-full p-5 shadow-2xl relative max-h-[85vh] overflow-y-auto">
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
    </div>
  );
}
