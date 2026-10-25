'use client';

import React from 'react';
import { clsx } from 'clsx';
import {
  PanelLeftClose,
  PanelRightClose,
  ArrowDownToLine,
  X,
} from 'lucide-react';

import type { DockPosition } from './TableTopBar';

export interface CasinoDockPanelTab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

export interface CasinoDockPanelProps {
  position: DockPosition;
  onPositionChange: (pos: DockPosition) => void;
  isStacked?: boolean;
  isTop?: boolean; // When stacked, true = top half, false = bottom half
  title: React.ReactNode;
  badge?: React.ReactNode;
  icon: React.ReactNode;
  tabs?: CasinoDockPanelTab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  floatingTrigger: {
    label: string;
    icon: React.ReactNode;
    position?: 'bottom-left' | 'bottom-right';
  };
  headerRightExtra?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export function CasinoDockPanel({
  position,
  onPositionChange,
  isStacked = false,
  isTop = true,
  title,
  badge,
  icon,
  tabs,
  activeTab,
  onTabChange,
  floatingTrigger,
  headerRightExtra,
  className,
  children,
}: CasinoDockPanelProps) {
  // If hidden, render the sleek floating trigger pill in the corner
  if (position === 'hidden') {
    const isLeft = floatingTrigger.position !== 'bottom-right';
    return (
      <button
        onClick={() => onPositionChange(isLeft ? 'left' : 'right')}
        className={clsx(
          'fixed bottom-20 z-40 bg-[#0b0e14]/90 hover:bg-zinc-800 border border-amber-500/30 text-amber-300 hover:text-white px-3 py-1.5 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.85)] flex items-center gap-1.5 text-xs font-bold transition-all hover:scale-105 cursor-pointer backdrop-blur-md select-none',
          isLeft ? 'left-4' : 'right-4'
        )}
        title={`Open ${floatingTrigger.label}`}
      >
        {floatingTrigger.icon}
        <span>{floatingTrigger.label}</span>
      </button>
    );
  }

  // If docked to bottom, render a centered bottom drawer
  if (position === 'bottom') {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none select-none">
        <aside className="w-full max-w-4xl h-64 sm:h-72 bg-[#0b0e14]/98 border-t border-x border-white/15 rounded-t-2xl shadow-[0_-15px_45px_rgba(0,0,0,0.9)] backdrop-blur-2xl flex flex-col pointer-events-auto text-slate-100 overflow-hidden font-sans">
          {/* Header */}
          <div className="h-10 bg-[#07090e] border-b border-white/10 px-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-amber-400">{icon}</span>
              <span className="text-xs font-black uppercase tracking-wider text-white">
                {title}
              </span>
              {badge && <span>{badge}</span>}
            </div>

            {/* Tabs if provided */}
            {tabs && tabs.length > 0 && (
              <div className="flex items-center gap-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange?.(tab.id)}
                    className={clsx(
                      'px-2.5 py-1 rounded text-[11px] font-bold transition cursor-pointer flex items-center gap-1',
                      activeTab === tab.id
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'text-zinc-400 hover:text-white'
                    )}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                    {tab.count !== undefined && (
                      <span className="text-[10px] opacity-70">({tab.count})</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Position Controls */}
            <div className="flex items-center gap-1">
              {headerRightExtra}
              <button
                onClick={() => onPositionChange('left')}
                className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
                title="Attach to Left Wall"
              >
                <PanelLeftClose size={13} />
              </button>
              <button
                onClick={() => onPositionChange('right')}
                className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
                title="Attach to Right Wall"
              >
                <PanelRightClose size={13} />
              </button>
              <button
                onClick={() => onPositionChange('hidden')}
                className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 transition cursor-pointer ml-1"
                title="Close Panel"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
            {children}
          </div>
        </aside>
      </div>
    );
  }

  // Left or Right Wall Docking
  const isLeft = position === 'left';

  // Compute vertical bounds when stacked on same wall
  const stackedClasses = isStacked
    ? isTop
      ? 'top-[53px] h-[calc(50vh-27px)] border-b'
      : 'top-[calc(50vh+26px)] bottom-0'
    : 'top-[53px] bottom-0';

  const containerClasses = clsx(
    'fixed z-40 w-80 sm:w-84 bg-[#0b0e14]/95 backdrop-blur-xl text-slate-100 flex flex-col select-none font-sans shadow-2xl transition-all duration-200 border-white/10',
    isLeft ? 'left-0 border-r' : 'right-0 border-l',
    stackedClasses,
    className
  );

  return (
    <aside className={containerClasses}>
      {/* Top Header */}
      <div className="h-10 bg-[#07090e] border-b border-white/10 px-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-amber-400 shrink-0">{icon}</span>
          <span className="text-xs font-black uppercase tracking-wider text-white truncate">
            {title}
          </span>
          {badge && <span className="shrink-0">{badge}</span>}
        </div>

        {/* Position Controls */}
        <div className="flex items-center gap-1 shrink-0 pl-1">
          {headerRightExtra}

          {!isLeft && (
            <button
              onClick={() => onPositionChange('left')}
              className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
              title="Attach to Left Wall"
            >
              <PanelLeftClose size={13} />
            </button>
          )}

          <button
            onClick={() => onPositionChange('bottom')}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
            title="Dock to Bottom"
          >
            <ArrowDownToLine size={13} />
          </button>

          {isLeft && (
            <button
              onClick={() => onPositionChange('right')}
              className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
              title="Attach to Right Wall"
            >
              <PanelRightClose size={13} />
            </button>
          )}

          <button
            onClick={() => onPositionChange('hidden')}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 transition cursor-pointer ml-1"
            title="Close Panel"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Optional Sub-Header Tabs */}
      {tabs && tabs.length > 0 && (
        <div className="bg-[#0e111a] border-b border-white/10 px-2 py-1.5 flex items-center justify-between gap-1 shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange?.(tab.id)}
              className={clsx(
                'flex-1 flex items-center justify-center gap-1 py-1 px-1.5 rounded text-[11px] font-bold transition cursor-pointer',
                activeTab === tab.id
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              )}
            >
              {tab.icon}
              <span className="truncate">{tab.label}</span>
              {tab.count !== undefined && (
                <span className="text-[10px] opacity-75">({tab.count})</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
        {children}
      </div>
    </aside>
  );
}
