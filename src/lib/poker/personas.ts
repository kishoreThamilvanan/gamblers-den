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
    description: 'Casual local recreational player. Hates folding pairs and gutshots. Limps 60%+.',
    vpip: 62,
    pfr: 6,
    foldToCbet: 24,
    thinkingDelayMin: 350,
    thinkingDelayMax: 650, // Snap-calls
    exploits: [
      'Will call three streets with any top pair or middle pair.',
      'Snap-calls (0.3s) with draws and marginal pairs; rarely traps.',
      'Almost never bluffs rivers — if he raises the river, he has Two Pair+.'
    ],
    counterStrategy: 'Never bluff him. Size up your value bets to 75%-85% pot with Top Pair Good Kicker or better.'
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
    foldToCbet: 78,
    thinkingDelayMin: 1200,
    thinkingDelayMax: 2200, // Deliberate pauses before folding
    exploits: [
      'Folds to 78% of flop continuation bets when he misses his set or overpair.',
      'Hollywood tanks (3-4s pause) before raising turn/river strictly with nutted hands.',
      'Preflop 3-bet range is exclusively QQ+, AK.'
    ],
    counterStrategy: 'Steal his blinds relentlessly and c-bet small (33% pot) on dry boards. Fold one-pair immediately if he raises.'
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
    foldToCbet: 38,
    thinkingDelayMin: 500,
    thinkingDelayMax: 1100,
    exploits: [
      'Automatically stabs at the pot whenever checked to on the Flop or Turn.',
      'Over-bluffs missed flush and straight draws on the River.',
      'Calls 3-bets too wide out of ego with dominated broadways (KJo, QTo).'
    ],
    counterStrategy: 'Isolate him preflop with strong broadways and pairs. Check-call with strong Top Pair+ to let him bluff off his stack.'
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
    foldToCbet: 54,
    thinkingDelayMin: 700,
    thinkingDelayMax: 1400,
    exploits: [
      'C-bets high-card boards at high frequency but shuts down on wet turn cards.',
      'Respects tight early-position opens and polarized river check-raises.',
      'Folds medium pocket pairs (77-99) to multiple barrels on overcard boards.'
    ],
    counterStrategy: 'Play straightforwardly in position. Avoid spewing into her uncapped preflop 3-bet ranges.'
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
    foldToCbet: 28,
    thinkingDelayMin: 400,
    thinkingDelayMax: 800,
    exploits: [
      'Limps in from every position with any suited card or connected trash.',
      'Snap-calls flop and turn bets with bottom pair or 4-card draws.',
      'Plays fit-or-fold on the river when all draws brick.'
    ],
    counterStrategy: 'Isolate his limps to $10-$12 preflop and value-bet relentlessly on Flop and Turn.'
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
    foldToCbet: 82,
    thinkingDelayMin: 1400,
    thinkingDelayMax: 2400,
    exploits: [
      'Folds 82% of flops unless he hits top pair top kicker or a set.',
      'Never bluffs rivers — a river bet or raise is 90%+ Two Pair or better.',
      'Over-folds his Big Blind to late-position steals.'
    ],
    counterStrategy: 'Attack his blinds every orbit. If he wakes up with turn or river aggression, fold one pair immediately.'
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
    foldToCbet: 42,
    thinkingDelayMin: 600,
    thinkingDelayMax: 1200,
    exploits: [
      'Views checking as weakness and immediately fires pot-sized stabs.',
      'Frequently barrels off with weak top pair or air on scare cards.',
      'Hates folding to min-raises; responds with emotional re-raises.'
    ],
    counterStrategy: 'Trap him by checking strong made hands (Two Pair+) in position and letting him hang himself.'
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
    foldToCbet: 50,
    thinkingDelayMin: 800,
    thinkingDelayMax: 1600,
    exploits: [
      'Isolates limpers aggressively from the Cutoff and Button.',
      'Capable of thin river value bets when checked to twice.',
      'Will fold one-pair hands to large, polarized turn/river raises.'
    ],
    counterStrategy: 'Target the softer recreational seats at the table rather than battling her out of position.'
  }
];

export function getPersonaById(id: string): BotPersona | undefined {
  return BOT_PERSONAS.find((p) => p.id === id);
}
