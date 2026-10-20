import { Card, Position, Phase, CoachingFeedback } from '@/types/poker';
import { evaluateHand, HandRank } from './evaluator';

const rankValue = (r: string) => '23456789TJQKA'.indexOf(r);

export function calculatePotOdds(toCall: number, currentPot: number): number {
  if (toCall <= 0) return 0;
  return Math.round((toCall / (currentPot + toCall)) * 100);
}

export function calculateMDF(betAmount: number, currentPot: number): number {
  if (betAmount <= 0) return 100;
  return Math.round((currentPot / (currentPot + betAmount)) * 100);
}

export function evaluateAction(
  holeCards: Card[],
  communityCards: Card[],
  phase: Phase,
  position: Position,
  action: 'fold' | 'check' | 'call' | 'bet' | 'raise',
  amount: number,
  pot: number,
  limpers: number,
  currentBet: number,
  heroBet: number
): CoachingFeedback {
  const toCall = currentBet - heroBet;
  const potOdds = calculatePotOdds(toCall, pot);

  if (!holeCards || holeCards.length < 2) {
    return {
      rating: 'Optimal',
      explanation: 'Action registered.',
      evLossEstimate: 0,
      action,
      potOddsPercent: potOdds
    };
  }

  const c1 = holeCards[0];
  const c2 = holeCards[1];
  const r1 = Math.max(rankValue(c1.rank), rankValue(c2.rank));
  const r2 = Math.min(rankValue(c1.rank), rankValue(c2.rank));
  const suited = c1.suit === c2.suit;
  const isPair = r1 === r2;
  const handDesc = isPair
    ? `${c1.rank}${c2.rank}`
    : `${c1.rank > c2.rank ? c1.rank : c2.rank}${c1.rank > c2.rank ? c2.rank : c1.rank}${suited ? 's' : 'o'}`;

  const handEval = communityCards.length >= 3 ? evaluateHand([...holeCards, ...communityCards]) : null;

  // --- PREFLOP EVALUATION ---
  if (phase === 'PREFLOP') {
    // 1. OPEN LIMPING / OVER LIMPING
    if (action === 'call' && currentBet === 2) {
      if (limpers > 0) {
        return {
          rating: 'Blunder',
          explanation: 'Never open-limp or over-limp playable hands on the Button. Isolate to build pot position.',
          evLossEstimate: -2.5,
          action: 'Over-Limp',
          handName: handDesc,
          potOddsPercent: potOdds
        };
      }
      return {
        rating: 'Leak',
        explanation: 'Open-limping is a high-cost leak. In live $1/$2, limps forfeit initiative and invite multiway pots. Open for $8-$10 or fold.',
        evLossEstimate: -2.0,
        action: 'Open Limp',
        handName: handDesc,
        potOddsPercent: potOdds
      };
    }

    // 2. FOLDING PREFLOP
    if (action === 'fold') {
      if (isPair && r1 >= 8) {
        return {
          rating: 'Blunder',
          explanation: `Folding ${handDesc} preflop is a critical blunder. This premium hand must be raised or 3-bet for value.`,
          evLossEstimate: -12.5,
          action: 'Fold',
          handName: handDesc,
          potOddsPercent: potOdds
        };
      }
      if (r1 === 12 && r2 >= 9) {
        return {
          rating: 'Blunder',
          explanation: `Folding ${handDesc} forfeits massive raw equity against typical wide live ranges. Value-raise or call in position.`,
          evLossEstimate: -8.0,
          action: 'Fold',
          handName: handDesc,
          potOddsPercent: potOdds
        };
      }
      return {
        rating: 'Optimal',
        explanation: `Disciplined fold with ${handDesc}. Preserves stack depth for superior spots with positional advantage.`,
        evLossEstimate: 0,
        action: 'Fold',
        handName: handDesc,
        potOddsPercent: potOdds
      };
    }

    // 3. RAISING PREFLOP
    if (action === 'raise' || action === 'bet') {
      // Rule 1: Pre-Flop Live $1/$2 Sizing Rule (Under-sizing open: standard open is $8-$10)
      if (amount <= 5) {
        return {
          rating: 'Leak',
          explanation: 'Under-sizing open. In live $1/$2 games, 2x opens cause 5-way family pots. Standard open is $8-$10.',
          evLossEstimate: -3.5,
          action: 'Min-Raise',
          handName: handDesc,
          potOddsPercent: potOdds
        };
      }

      // Rule 2: Isolation Over Limpers Rule: Target = 4BB + 1BB per limper ($8 + $2 * limpers)
      if (limpers > 0) {
        const targetIso = 8 + limpers * 2;
        if (amount < targetIso - 2) {
          return {
            rating: 'Acceptable',
            explanation: `Raising over ${limpers} limper(s), but sizing ($${amount}) is light. Standard live isolation target is $${targetIso} (4BB + 1BB/limper).`,
            evLossEstimate: -1.5,
            action: 'Isolation Raise',
            handName: handDesc,
            potOddsPercent: potOdds
          };
        }
      }

      return {
        rating: 'Optimal',
        explanation: `Strong aggressive raise with ${handDesc}. Takes initiative and charges opponents to see a flop.`,
        evLossEstimate: 3.5,
        action: 'Raise',
        handName: handDesc,
        potOddsPercent: potOdds
      };
    }

    // 4. CALLING A RAISE PREFLOP
    if (action === 'call' && currentBet > 2) {
      if (!suited && !isPair && r1 < 10 && r2 < 8) {
        return {
          rating: 'Blunder',
          explanation: `Cold calling $${toCall} with dominated offsuit hand (${handDesc}) bleeds EV. Either 3-bet as a bluff or muck.`,
          evLossEstimate: -4.5,
          action: 'Cold Call',
          handName: handDesc,
          potOddsPercent: potOdds
        };
      }
      return {
        rating: 'Acceptable',
        explanation: `Defending with ${handDesc}. Exercise pot control postflop on marginal pair textures.`,
        evLossEstimate: 0,
        action: 'Call',
        handName: handDesc,
        potOddsPercent: potOdds
      };
    }
  }

  // --- POSTFLOP EVALUATION ---
  if (handEval) {
    const isOnePairOrLess = handEval.rank <= HandRank.Pair;

    // Rule 3: Folding to River Aggression (Facing River Check-Raise or heavy aggression with one pair)
    if (phase === 'RIVER' && action === 'call' && toCall >= 16) {
      if (isOnePairOrLess) {
        return {
          rating: 'Leak',
          explanation: 'Live $1/$2 recreational players under-bluff river raises by >70%. One pair is a standard fold here.',
          evLossEstimate: -toCall * 0.75,
          action: 'River Call',
          handName: handEval.name,
          potOddsPercent: potOdds
        };
      }
    }

    // Folding One Pair to heavy River bet
    if (phase === 'RIVER' && action === 'fold' && isOnePairOrLess && toCall >= 16) {
      return {
        rating: 'Optimal',
        explanation: 'Live $1/$2 recreational players under-bluff river raises by >70%. One pair is a standard fold here.',
        evLossEstimate: 0,
        action: 'Disciplined Fold',
        handName: handEval.name,
        potOddsPercent: potOdds
      };
    }

    // Checking back river nuts / monsters
    if (action === 'check' && toCall === 0 && handEval.rank >= HandRank.Flush && phase === 'RIVER') {
      return {
        rating: 'Leak',
        explanation: `Checking back ${handEval.name} forfeits crucial river value. Live calling stations will call 50%-75% pot with second-best pairs.`,
        evLossEstimate: -Math.min(pot * 0.5, 30),
        action: 'Check Back',
        handName: handEval.name,
        potOddsPercent: potOdds
      };
    }

    // Value Bet
    if ((action === 'bet' || action === 'raise') && handEval.rank >= HandRank.TwoPair) {
      return {
        rating: 'Optimal',
        explanation: `Solid value bet with ${handEval.name}. Punishes opponents who hate folding pairs and draws.`,
        evLossEstimate: amount * 0.4,
        action: 'Value Bet',
        handName: handEval.name,
        potOddsPercent: potOdds
      };
    }
  }

  return {
    rating: 'Acceptable',
    explanation: 'Standard play for this board texture and position.',
    evLossEstimate: 0,
    action,
    potOddsPercent: potOdds
  };
}

export interface ProactiveAdvice {
  action: 'fold' | 'check' | 'call' | 'bet' | 'raise';
  recommendedAmount: number;
  label: string; // e.g. "RAISE TO $8.00"
  badge: 'Value Bet' | 'Isolate' | 'Check / Fold' | 'Pot Control' | 'Semi-Bluff' | 'Pure Value';
  badgeColor: string;
  equityPercent: number;
  potOddsPercent: number;
  handDescription: string;
  rationale: string;
  leakWarning?: string;
  targetOpenSizing?: string;
}

export function getProactiveAdvice(
  holeCards: Card[],
  communityCards: Card[],
  phase: Phase,
  position: Position,
  currentBet: number,
  heroCurrentBet: number,
  pot: number,
  limpersCount: number,
  heroStack: number
): ProactiveAdvice | null {
  if (!holeCards || holeCards.length < 2) return null;

  const toCall = Math.max(0, currentBet - heroCurrentBet);
  const potOdds = calculatePotOdds(toCall, pot);

  const c1 = holeCards[0];
  const c2 = holeCards[1];
  const r1 = Math.max(rankValue(c1.rank), rankValue(c2.rank));
  const r2 = Math.min(rankValue(c1.rank), rankValue(c2.rank));
  const suited = c1.suit === c2.suit;
  const isPair = r1 === r2;
  const handDesc = isPair
    ? `${c1.rank}${c2.rank} Pocket Pair`
    : `${c1.rank > c2.rank ? c1.rank : c2.rank}${c1.rank > c2.rank ? c2.rank : c1.rank}${suited ? 's (Suited)' : 'o (Offsuit)'}`;

  const isMonsterPair = isPair && r1 >= 10; // JJ+
  const isMidPair = isPair && r1 >= 5 && r1 < 10; // 77-TT
  const isSmallPair = isPair && r1 < 5; // 22-66
  const isBigBroadway = (r1 === 12 && r2 >= 9) || (r1 === 11 && r2 >= 10); // AK, AQ, AJ, KQ
  const isSuitedConnector = suited && Math.abs(r1 - r2) === 1 && r1 >= 4;

  // --- PREFLOP PROACTIVE ADVICE ---
  if (phase === 'PREFLOP') {
    // 1. Facing a Raise / 3-Bet
    if (currentBet > 2) {
      if (isMonsterPair || (r1 === 12 && r2 === 11)) { // JJ+, AK
        const raiseSize = Math.min(heroStack + heroCurrentBet, Math.max(currentBet * 3, 20));
        return {
          action: 'raise',
          recommendedAmount: raiseSize,
          label: `3-BET TO $${raiseSize}`,
          badge: 'Pure Value',
          badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          equityPercent: 82,
          potOddsPercent: potOdds,
          handDescription: handDesc,
          rationale: `Premium monster hand. Re-raise aggressively to build a large pot preflop and capitalize on raw card strength against live calling ranges.`,
          leakWarning: 'Never flat-call monsters out of position; raise for value.',
          targetOpenSizing: '3x the previous raise'
        };
      }
      if (isMidPair || (suited && isBigBroadway)) {
        return {
          action: 'call',
          recommendedAmount: currentBet,
          label: `CALL $${toCall}`,
          badge: 'Pot Control',
          badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
          equityPercent: 54,
          potOddsPercent: potOdds,
          handDescription: handDesc,
          rationale: `Profitable implied odds to set-mine or hit top pair in position. Call the raise and evaluate on the flop.`,
          leakWarning: 'Fold if the raise is excessive (>15BB) without set-mining odds.'
        };
      }
      if (toCall === 0) {
        return {
          action: 'check',
          recommendedAmount: 0,
          label: 'CHECK',
          badge: 'Pot Control',
          badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
          equityPercent: 35,
          potOddsPercent: potOdds,
          handDescription: handDesc,
          rationale: `Free option to see the flop. Check and keep the pot small.`,
        };
      }
      return {
        action: 'fold',
        recommendedAmount: 0,
        label: 'FOLD',
        badge: 'Check / Fold',
        badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        equityPercent: 24,
        potOddsPercent: potOdds,
        handDescription: handDesc,
        rationale: `Holding is dominated by open-raising ranges. Fold disciplined and save your stack for profitable spots.`,
        leakWarning: 'Calling raises with weak unsuited holdings is a major low-stakes leak.'
      };
    }

    // 2. Unopened or Limped Pot (Current bet = $2 BB)
    if (isMonsterPair || isBigBroadway) {
      const openSize = 8 + (limpersCount * 2);
      const targetSize = Math.min(heroStack, openSize);
      return {
        action: 'raise',
        recommendedAmount: targetSize,
        label: `RAISE TO $${targetSize}`,
        badge: 'Value Bet',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        equityPercent: 74,
        potOddsPercent: potOdds,
        handDescription: handDesc,
        rationale: limpersCount > 0
          ? `Isolate the ${limpersCount} limper(s) with standard live sizing ($8 + $2/limper). Punish weak limping ranges with range advantage.`
          : `Standard live open of 4BB ($8). Build the pot with premium equity and seize preflop initiative.`,
        leakWarning: 'Never open-limp or flat with premium broadways; always raise.',
        targetOpenSizing: `$8 - $${8 + (limpersCount * 2)}`
      };
    }

    if (isMidPair || isSmallPair || isSuitedConnector) {
      if (limpersCount >= 2) {
        return {
          action: 'call',
          recommendedAmount: 2,
          label: `OVER-LIMP / CALL $${toCall}`,
          badge: 'Pot Control',
          badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
          equityPercent: 48,
          potOddsPercent: potOdds,
          handDescription: handDesc,
          rationale: `Speculative multiway hand. Cheap price ($2) offers massive implied odds if you flop a set or flush draw.`,
          leakWarning: 'Fold promptly on the flop if you miss your set or strong draw.'
        };
      }
      const openSize = 8 + (limpersCount * 2);
      return {
        action: 'raise',
        recommendedAmount: openSize,
        label: `OPEN TO $${openSize}`,
        badge: 'Isolate',
        badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        equityPercent: 55,
        potOddsPercent: potOdds,
        handDescription: handDesc,
        rationale: `Raise in position to steal dead money and play heads-up or with position postflop.`,
        targetOpenSizing: `$8`
      };
    }

    // Weak / Trash preflop
    if (toCall === 0) {
      return {
        action: 'check',
        recommendedAmount: 0,
        label: 'CHECK',
        badge: 'Pot Control',
        badgeColor: 'bg-zinc-700/50 text-zinc-300 border-zinc-600/40',
        equityPercent: 32,
        potOddsPercent: potOdds,
        handDescription: handDesc,
        rationale: `You are in the Big Blind and can see the flop for free. Check and re-evaluate on the flop.`,
      };
    }

    return {
      action: 'fold',
      recommendedAmount: 0,
      label: 'FOLD',
      badge: 'Check / Fold',
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      equityPercent: 18,
      potOddsPercent: potOdds,
      handDescription: handDesc,
      rationale: `Unprofitable hand to enter the pot with. Fold disciplined and protect your win rate.`,
      leakWarning: 'Avoid open-limping or defending marginal offsuit cards.'
    };
  }

  // --- POSTFLOP PROACTIVE ADVICE (Flop, Turn, River) ---
  const evalResult = evaluateHand([...holeCards, ...communityCards]);
  const handRankName = evalResult.name;

  // Monster (Full House, Flush, Straight, Three of a Kind)
  if (evalResult.rank >= HandRank.ThreeOfAKind) {
    const betSize = Math.max(4, Math.round(pot * 0.65));
    const finalBet = Math.min(heroStack + heroCurrentBet, Math.max(currentBet * 2, betSize));
    return {
      action: currentBet > heroCurrentBet ? 'raise' : 'bet',
      recommendedAmount: finalBet,
      label: `${currentBet > heroCurrentBet ? 'RAISE' : 'BET'} $${finalBet}`,
      badge: 'Pure Value',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      equityPercent: 88,
      potOddsPercent: potOdds,
      handDescription: handRankName,
      rationale: `Monster hand! Live recreational players love calling with top pair and gutshots. Bet 60%-70% pot to maximize value.`,
      leakWarning: 'Do not slow-play or check back; bet for value while boards are coordinated.'
    };
  }

  // Two Pair or Top Pair with strong kicker
  if (evalResult.rank >= HandRank.TwoPair || (evalResult.rank === HandRank.Pair && r1 >= 10)) {
    if (toCall > pot * 0.75 && phase === 'RIVER') {
      return {
        action: 'fold',
        recommendedAmount: 0,
        label: 'FOLD TO RIVER HEAVY BET',
        badge: 'Check / Fold',
        badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        equityPercent: 28,
        potOddsPercent: potOdds,
        handDescription: handRankName,
        rationale: `Live players rarely bluff big on rivers. Even top pair is an easy fold against large river aggression.`,
        leakWarning: 'Calling big river bets with one pair is the #1 leak in low stakes live poker.'
      };
    }
    const betSize = Math.max(4, Math.round(pot * 0.5));
    if (toCall === 0) {
      return {
        action: 'bet',
        recommendedAmount: betSize,
        label: `VALUE BET $${betSize}`,
        badge: 'Value Bet',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        equityPercent: 72,
        potOddsPercent: potOdds,
        handDescription: handRankName,
        rationale: `Strong showdown value. Bet 50% pot to target second pairs and gutshot draws that won't fold.`,
      };
    }
    return {
      action: 'call',
      recommendedAmount: currentBet,
      label: `CALL $${toCall}`,
      badge: 'Pot Control',
      badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
      equityPercent: 62,
      potOddsPercent: potOdds,
      handDescription: handRankName,
      rationale: `Solid holding with good pot odds (${potOdds}%). Call and re-evaluate on the next street.`,
    };
  }

  // Draws or Weak Pairs
  if (toCall === 0) {
    return {
      action: 'check',
      recommendedAmount: 0,
      label: 'CHECK (POT CONTROL)',
      badge: 'Pot Control',
      badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
      equityPercent: 38,
      potOddsPercent: potOdds,
      handDescription: handRankName,
      rationale: `Marginal holding. Check to keep the pot small and realize equity for free.`,
    };
  }

  // Facing bet with marginal / weak hand
  if (potOdds < 20 && toCall <= 8) {
    return {
      action: 'call',
      recommendedAmount: currentBet,
      label: `CALL $${toCall} (POT ODDS)`,
      badge: 'Semi-Bluff',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      equityPercent: 32,
      potOddsPercent: potOdds,
      handDescription: handRankName,
      rationale: `Great pot odds (${potOdds}%) to peel a card and attempt to hit an out.`,
    };
  }

  return {
    action: 'fold',
    recommendedAmount: 0,
    label: 'FOLD',
    badge: 'Check / Fold',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    equityPercent: 12,
    potOddsPercent: potOdds,
    handDescription: handRankName,
    rationale: `Weak hand with poor equity and unfavorable pot odds. Disciplined fold to preserve chips.`,
    leakWarning: 'Never chase weak draws when the price to call is high.'
  };
}
