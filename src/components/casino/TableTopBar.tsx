'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  BarChart3,
  HelpCircle,
  Settings,
  Coins,
  X,
} from 'lucide-react';
import { clsx } from 'clsx';
import { UserProfile } from '@/types/poker';

export type DockPosition = 'left' | 'bottom' | 'right' | 'hidden';

export interface ThemeOption {
  id: string;
  label: string;
  active: boolean;
  onClick: () => void;
}

export interface TableTopBarProps {
  mode?: 'game' | 'lobby';

  // Brand & Identity
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  icon?: React.ReactNode;

  // Navigation
  floorHref?: string;
  onExitToFloor?: () => void;
  onExitToLobby?: () => void;
  lobbyLabel?: string;

  // Center Telemetry
  centerStatus?: React.ReactNode;

  // Player & Vault
  bankroll?: number;
  userProfile?: UserProfile | null;
  onProfileClick?: () => void;

  // Actions
  soundMuted?: boolean;
  onToggleMute?: () => void;
  onOpenStats?: () => void;
  statsTitle?: string;
  onOpenRules?: () => void;
  rulesTitle?: string;

  // Settings: Speed & Pacing
  speed?: 'relaxed' | 'normal' | 'fast';
  onSpeedChange?: (speed: 'relaxed' | 'normal' | 'fast') => void;

  // Settings: Themes
  themes?: ThemeOption[];
  themeTitle?: string;

  // Settings: Docking
  coachPosition?: DockPosition;
  onCoachPositionChange?: (pos: DockPosition) => void;
  coachLabel?: string;
  logPosition?: DockPosition;
  onLogPositionChange?: (pos: DockPosition) => void;
  logLabel?: string;

  // Settings: Custom Game Options
  customSettings?: React.ReactNode;
  customSettingsTitle?: string;

  className?: string;
}

export function TableTopBar({
  mode,
  title,
  subtitle,
  badge,
  icon,
  floorHref = '/',
  onExitToFloor,
  onExitToLobby,
  lobbyLabel = 'Lobby',
  centerStatus,
  bankroll,
  userProfile,
  onProfileClick,
  soundMuted,
  onToggleMute,
  onOpenStats,
  statsTitle = 'Game Analytics & Stats',
  onOpenRules,
  rulesTitle = 'Rules & Payouts',
  speed,
  onSpeedChange,
  themes,
  themeTitle = 'Table Felt Theme',
  coachPosition,
  onCoachPositionChange,
  coachLabel = 'AI Coach',
  logPosition,
  onLogPositionChange,
  logLabel = 'Dealer Log',
  customSettings,
  customSettingsTitle = 'Game Display Options',
  className = '',
}: TableTopBarProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setIsSettingsOpen(false);
      }
    };
    if (isSettingsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSettingsOpen]);

  // Close popover on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSettingsOpen) {
        setIsSettingsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSettingsOpen]);

  const isLobbyMode =
    mode === 'lobby' ||
    (mode !== 'game' &&
      !onExitToLobby &&
      speed === undefined &&
      coachPosition === undefined &&
      logPosition === undefined &&
      (!themes || themes.length === 0));

  const hasSettings =
    !isLobbyMode &&
    (speed !== undefined ||
      (themes && themes.length > 0) ||
      coachPosition !== undefined ||
      logPosition !== undefined ||
      customSettings !== undefined);

  return (
    <header
      className={clsx(
        'h-12 sm:h-13 bg-[#0a0e14]/95 border-b border-zinc-800/80 px-2.5 sm:px-4 flex items-center justify-between shrink-0 z-40 select-none backdrop-blur-md sticky top-0',
        className
      )}
    >
      {/* ==================================================================== */}
      {/* ZONE 1: Left Navigation & Game Brand                                  */}
      {/* ==================================================================== */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Far-Left Navigation Button (Mutually Exclusive: Lobby in Game, Casino Floor in Lobby) */}
        <div className="flex items-center shrink-0">
          {!isLobbyMode && onExitToLobby ? (
            <button
              onClick={onExitToLobby}
              className="flex items-center justify-center gap-1.5 min-w-[96px] sm:min-w-[115px] h-8 px-2.5 rounded-lg bg-zinc-800/90 hover:bg-zinc-700 border border-zinc-700/80 text-zinc-200 hover:text-white transition font-semibold text-xs cursor-pointer shadow-sm shrink-0"
              title="Return to Game Lobby & Table Selector"
            >
              <ArrowLeft size={13} className="shrink-0" />
              <span>{lobbyLabel}</span>
            </button>
          ) : onExitToFloor ? (
            <button
              onClick={onExitToFloor}
              className="flex items-center justify-center gap-1.5 min-w-[96px] sm:min-w-[115px] h-8 px-2.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 hover:text-white transition font-semibold text-xs cursor-pointer shadow-sm shrink-0"
              title="Return to Grand Casino Floor"
            >
              <ArrowLeft size={13} className="shrink-0" />
              <span className="truncate">Casino Floor</span>
            </button>
          ) : (
            <Link
              href={floorHref}
              className="flex items-center justify-center gap-1.5 min-w-[96px] sm:min-w-[115px] h-8 px-2.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 hover:text-white transition font-semibold text-xs cursor-pointer shadow-sm shrink-0"
              title="Return to Grand Casino Floor"
            >
              <ArrowLeft size={13} className="shrink-0" />
              <span className="truncate">Casino Floor</span>
            </Link>
          )}
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-white/10 shrink-0 hidden sm:block" />

        {/* Game Brand & Title */}
        <div className="flex items-center gap-2 min-w-0">
          {icon && <div className="shrink-0">{icon}</div>}
          <div className="flex flex-col min-w-0 leading-tight">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-extrabold tracking-tight text-white text-xs sm:text-sm uppercase truncate">
                {title}
              </span>
              {badge && <div className="shrink-0">{badge}</div>}
            </div>
            {subtitle && (
              <span className="text-[9px] sm:text-[10px] text-zinc-400 font-medium tracking-wide truncate">
                {subtitle}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* ZONE 2: Center Telemetry / Status                                    */}
      {/* ==================================================================== */}
      {centerStatus ? (
        <div className="hidden md:flex items-center justify-center shrink-0 mx-2">
          {centerStatus}
        </div>
      ) : isLobbyMode ? (
        <div className="hidden md:flex items-center justify-center shrink-0 mx-2">
          <div className="flex items-center gap-2 bg-zinc-900/80 border border-zinc-800/80 px-3 py-1 rounded-full text-zinc-400 text-xs shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="font-semibold text-zinc-300">Session Selector &bull; 5 Saves Max</span>
          </div>
        </div>
      ) : null}

      {/* ==================================================================== */}
      {/* ZONE 3: Right Player Tools & Consolidated Settings                    */}
      {/* ==================================================================== */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Career Bankroll Vault Pill */}
        {bankroll !== undefined && (
          <button
            onClick={onProfileClick}
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-amber-500/30 text-zinc-200 transition cursor-pointer shadow-sm group"
            title="Player Career Bankroll & Table Identity"
          >
            {userProfile?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={userProfile.avatarUrl}
                alt={userProfile.nickname || 'Profile'}
                style={{ width: '18px', height: '18px', borderRadius: '9999px', objectFit: 'cover' }}
                className="w-4.5 h-4.5 rounded-full object-cover border border-amber-400 shrink-0"
              />
            ) : (
              <Coins size={13} className="text-amber-400 shrink-0" />
            )}
            <span className="font-mono font-bold text-xs text-emerald-300">
              {`$${bankroll.toLocaleString()}`}
            </span>
            {userProfile?.nickname && (
              <span className="hidden xl:inline text-[11px] font-bold text-amber-300 max-w-[80px] truncate">
                {userProfile.nickname}
              </span>
            )}
          </button>
        )}

        {/* Audio Mute Button */}
        {onToggleMute && (
          <button
            onClick={onToggleMute}
            className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 transition cursor-pointer"
            title={soundMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {soundMuted ? (
              <VolumeX size={15} className="text-rose-400" />
            ) : (
              <Volume2 size={15} className="text-emerald-400" />
            )}
          </button>
        )}

        {/* Rules / Payout Modal Trigger (Roulette) */}
        {onOpenRules && (
          <button
            onClick={onOpenRules}
            className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-amber-300 transition cursor-pointer"
            title={rulesTitle}
          >
            <HelpCircle size={15} />
          </button>
        )}

        {/* Stats / Analytics Modal Trigger */}
        {!isLobbyMode && onOpenStats && (
          <button
            onClick={onOpenStats}
            className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-amber-300 transition cursor-pointer"
            title={statsTitle}
          >
            <BarChart3 size={15} />
          </button>
        )}

        {/* Consolidated Table Settings Popover */}
        {hasSettings && (
          <div className="relative" ref={settingsRef}>
            <button
              onClick={() => setIsSettingsOpen((prev) => !prev)}
              className={clsx(
                'flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer shadow-sm',
                isSettingsOpen
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-amber-500/20'
                  : 'bg-zinc-800/90 hover:bg-zinc-700 border-zinc-700 text-zinc-300 hover:text-white'
              )}
              title="Table & Display Settings"
            >
              <Settings size={14} className={isSettingsOpen ? 'animate-spin' : ''} />
              <span className="hidden sm:inline font-semibold">Settings</span>
            </button>

            {/* Floating Dropdown Panel */}
            {isSettingsOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-[#0c1017]/95 border border-zinc-700/80 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] backdrop-blur-xl p-3.5 z-50 animate-action-pop">
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider">
                    <Settings size={13} className="text-amber-400" />
                    <span>Table Settings</span>
                  </div>
                  <button
                    onClick={() => setIsSettingsOpen(false)}
                    className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                  >
                    <X size={13} />
                  </button>
                </div>

                <div className="space-y-3.5 text-xs">
                  {/* Section 1: Dealing Pacing / Speed */}
                  {speed !== undefined && onSpeedChange && (
                    <div>
                      <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 font-semibold mb-1.5">
                        Dealing Pacing & Speed
                      </div>
                      <div className="grid grid-cols-3 gap-1 bg-zinc-900/90 p-1 rounded-lg border border-zinc-800">
                        {(
                          [
                            { id: 'relaxed', label: '🐢 Relaxed' },
                            { id: 'normal', label: '⚡ Normal' },
                            { id: 'fast', label: '🚀 Fast' },
                          ] as const
                        ).map((s) => (
                          <button
                            key={s.id}
                            onClick={() => onSpeedChange(s.id)}
                            className={clsx(
                              'py-1 rounded text-[11px] font-semibold transition cursor-pointer text-center',
                              speed === s.id
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                                : 'text-zinc-400 hover:text-white'
                            )}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Section 2: Table Felt Themes */}
                  {themes && themes.length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 font-semibold mb-1.5">
                        {themeTitle}
                      </div>
                      <div
                        className={clsx(
                          'grid gap-1 bg-zinc-900/90 p-1 rounded-lg border border-zinc-800',
                          themes.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
                        )}
                      >
                        {themes.map((t) => (
                          <button
                            key={t.id}
                            onClick={t.onClick}
                            className={clsx(
                              'py-1 px-1.5 rounded text-[10px] sm:text-[11px] font-semibold transition cursor-pointer truncate text-center',
                              t.active
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40 shadow-sm'
                                : 'text-zinc-400 hover:text-white'
                            )}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Section 3: Docking Positions (AI Coach & Dealer Log) */}
                  {(coachPosition !== undefined || logPosition !== undefined) && (
                    <div>
                      <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 font-semibold mb-1.5">
                        Assistant & Log Docking
                      </div>
                      <div className="space-y-2 bg-zinc-900/90 p-2 rounded-lg border border-zinc-800">
                        {coachPosition !== undefined && onCoachPositionChange && (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] text-emerald-400 font-bold shrink-0">
                              {coachLabel}:
                            </span>
                            <div className="flex items-center gap-1">
                              {(['hidden', 'left', 'bottom', 'right'] as const).map((pos) => (
                                <button
                                  key={pos}
                                  onClick={() => onCoachPositionChange(pos)}
                                  className={clsx(
                                    'px-1.5 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer capitalize',
                                    coachPosition === pos
                                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                                      : 'text-zinc-400 hover:text-white'
                                  )}
                                >
                                  {pos === 'hidden' ? 'Off' : pos}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {logPosition !== undefined && onLogPositionChange && (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] text-amber-400 font-bold shrink-0">
                              {logLabel}:
                            </span>
                            <div className="flex items-center gap-1">
                              {(['hidden', 'left', 'bottom', 'right'] as const).map((pos) => (
                                <button
                                  key={pos}
                                  onClick={() => onLogPositionChange(pos)}
                                  className={clsx(
                                    'px-1.5 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer capitalize',
                                    logPosition === pos
                                      ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                                      : 'text-zinc-400 hover:text-white'
                                  )}
                                >
                                  {pos === 'hidden' ? 'Off' : pos}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Section 4: Game-Specific Custom Settings */}
                  {customSettings && (
                    <div>
                      <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 font-semibold mb-1.5">
                        {customSettingsTitle}
                      </div>
                      <div className="bg-zinc-900/90 p-2 rounded-lg border border-zinc-800">
                        {customSettings}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
