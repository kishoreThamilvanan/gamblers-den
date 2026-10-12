import { BotPersona } from './types';

export const BOT_PERSONAS: BotPersona[] = [
  {
    id: 'big-mike',
    name: 'Big Mike',
    nickname: 'Calling Station',
    archetype: 'CallingStation',
    avatarSeed: 'mike',
    avatarBg: '#1e3a8a',
    avatarAccent: '#3b82f6',
    description: 'Casual local recreation player. Hates folding pairs and gutshots. Limps 60%+.',
    vpip: 62,
    pfr: 6,
    thinkingDelayMin: 350,
    thinkingDelayMax: 650 // Snap-calls
  },
  {
    id: 'vegas-vic',
    name: 'Vegas Vic',
    nickname: 'The Rock',
    archetype: 'Nit',
    avatarSeed: 'vic',
    avatarBg: '#374151',
    avatarAccent: '#9ca3af',
    description: 'Old-school retiree in tinted glasses. Folds 85% of hands preflop, bets only two-pair+.',
    vpip: 14,
    pfr: 10,
    thinkingDelayMin: 1200,
    thinkingDelayMax: 2200 // Deliberate pauses before folding
  },
  {
    id: 'mad-dog-danny',
    name: 'Danny "Mad Dog"',
    nickname: 'Aggro-Fish',
    archetype: 'AggroFish',
    avatarSeed: 'danny',
    avatarBg: '#7f1d1d',
    avatarAccent: '#ef4444',
    description: 'Action junkie chasing rushes. Over-bets draws and barrels any scare card.',
    vpip: 56,
    pfr: 38,
    thinkingDelayMin: 500,
    thinkingDelayMax: 1100
  },
  {
    id: 'sophia-chen',
    name: 'Sophia Chen',
    nickname: 'The Grinder',
    archetype: 'TAG',
    avatarSeed: 'sophia',
    avatarBg: '#064e3b',
    avatarAccent: '#10b981',
    description: 'Disciplined TAG student. Punishes limpers, c-bets dry textures with range advantage.',
    vpip: 22,
    pfr: 18,
    thinkingDelayMin: 700,
    thinkingDelayMax: 1400
  },
  {
    id: 'lucky-larry',
    name: 'Lucky Larry',
    nickname: 'The Tourist',
    archetype: 'CallingStation',
    avatarSeed: 'larry',
    avatarBg: '#78350f',
    avatarAccent: '#f59e0b',
    description: 'Friendly weekend visitor enjoying free drinks. Always sees the river if priced in.',
    vpip: 58,
    pfr: 8,
    thinkingDelayMin: 400,
    thinkingDelayMax: 800
  },
  {
    id: 'ice-cold-igor',
    name: 'Igor "Ice Cold"',
    nickname: 'The Nit',
    archetype: 'Nit',
    avatarSeed: 'igor',
    avatarBg: '#1e293b',
    avatarAccent: '#64748b',
    description: 'Hoodie and headphones. Never puts money in without the absolute goods.',
    vpip: 12,
    pfr: 9,
    thinkingDelayMin: 1400,
    thinkingDelayMax: 2400
  },
  {
    id: 'tony-two-times',
    name: 'Tony "Two-Times"',
    nickname: 'Aggro-Fish',
    archetype: 'AggroFish',
    avatarSeed: 'tony',
    avatarBg: '#4c1d95',
    avatarAccent: '#8b5cf6',
    description: 'Cocky spew artist who hates being pushed around. Will 3-bet light out of spite.',
    vpip: 52,
    pfr: 34,
    thinkingDelayMin: 600,
    thinkingDelayMax: 1200
  },
  {
    id: 'sarah-the-shark',
    name: 'Sarah "Shark"',
    nickname: 'Solid Pro',
    archetype: 'TAG',
    avatarSeed: 'sarah',
    avatarBg: '#0f766e',
    avatarAccent: '#14b8a6',
    description: 'Former online pro transitioning to live casino. Ruthless value betting on the river.',
    vpip: 24,
    pfr: 20,
    thinkingDelayMin: 800,
    thinkingDelayMax: 1600
  }
];

export function getPersonaById(id: string): BotPersona | undefined {
  return BOT_PERSONAS.find((p) => p.id === id);
}
