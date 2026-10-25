# FeltSense: Core Design Principles & Architecture Guide

This document defines the non-negotiable UI/UX, gameplay, and engineering principles for **FeltSense ($1/$2 Live NLHE Casino Trainer)**. Every new feature, component, or refactor must adhere to these standards.

---

## 1. Constrained 16:9 Table Geometry & Bounded Pods
- **Locked Aspect Ratio**: The poker table stage must remain inside a centered `aspect-[16/9]` container (`max-w-6xl max-h-[82vh]`) with three distinct visual layers:
  1. **Outer Wood/Leather Rail** (`rounded-[140px] sm:rounded-[200px] md:rounded-[240px]`)
  2. **Inner Brass Accent Rim**
  3. **Radial Casino Felt Surface** (supporting Bellagio Green, Macau Navy, and Wynn Charcoal themes)
- **Strict 9-Max Elliptical Coordinates (`SEAT_POSITIONS`)**: All 9 seats use fixed percentage `(top, left)` coordinates around the felt ellipse.
- **Hero Always at Bottom-Center (Visual Seat 0)**:
  - The user (`Hero`) is permanently anchored at `SEAT_POSITIONS[0]` (`top: 86%, left: 50%`).
  - All seats rotate visually relative to Hero (`visualSeatIndex = (idx - effectiveHeroIdx + 9) % 9`), while the Dealer Puck (`D`) and table positions (`BTN`, `SB`, `BB`, `UTG`, `UTG+1`, `MP`, `LJ`, `HJ`, `CO`) rotate around the table each hand.
- **Bounded Player Pods**:
  - Avatars are strictly constrained to `42px × 42px` (`w-10 h-10 sm:w-11 sm:h-11 rounded-full`) with explicit inline sizing safeguards.
  - Player name and stack badges are fixed-width (`w-24 sm:w-28`) with truncated names so long bot names never stretch pods or overlap neighbors.

---

## 2. Information Hiding & Authentic Casino Realism
- **Strict Opponent Hole Card Privacy**:
  - Opponents' hole cards must always render face-down (`{ hidden: true }`) during `PREFLOP`, `FLOP`, `TURN`, and `RIVER`.
  - Opponent hole cards are revealed **only** at `SHOWDOWN` for players who have not folded (`!player.hasFolded`).
- **Physical 3D Casino Chip Stacks (`src/components/poker/ChipStack.tsx`)**:
  - **Bankroll Stacks (`mode="bankroll"`)**: Rendered beside each active player pod, dynamically decomposed into authentic `$1/$2` live casino denominations (`$100` Black/Gold, `$25` Green, `$5` Red, `$1` Blue).
  - **Bet Stacks (`mode="bet"`)**: Rendered in front of each player toward the center of the felt whenever `currentBet > 0`.
  - **Pot Stack**: Rendered above the central `TOTAL POT` badge.

---

## 3. Dockable HUD Panels & Dynamic Stage Reorganization
- **Multi-Position Docking (`left` | `right` | `bottom` | `hidden`)**:
  - Both the **Proactive AI Coach** (`AICoachPanel.tsx`) and **Dealer Log** (`DealerLogBox.tsx`) can be independently pinned to the Left Wall, Right Wall, Bottom Dock, or Hidden.
- **Automatic Stage Reflow**:
  - When a panel is pinned to the `left` or `right` wall, the main table container and bottom betting footer automatically add matching side padding (`lg:pl-80` / `lg:pr-80`) so the table centers cleanly in the remaining viewport without any overlap.
- **Same-Wall Vertical Split (`isStacked`)**:
  - When both AI Coach and Dealer Log are pinned to the same side wall, they automatically split the wall vertically (AI Coach on top half, Dealer Log on bottom half).

---

## 4. Visual Action Feedback, Pacing & Winner Clarity
- **Per-Player Action Callout Badges (`player.lastAction`)**:
  - Every player action triggers a color-coded, spring-animated badge (`animate-action-pop`) above their avatar and a ring ripple (`animate-action-ripple`):
    - `▲ RAISE $X` (Amber/Orange gradient)
    - `● BET $X` (Emerald)
    - `✓ CALL $X` (Sky Blue)
    - `✊ CHECK` (Teal)
    - `✕ FOLDED` (Crimson/Rose — persists across streets until hand end)
    - `🔥 ALL-IN $X` (Pulsing Red/Gold gradient — persists across streets)
    - `SB $1` / `BB $2` (Blind post indicators on hand start)
- **Active Turn & Bot Thinking Indicator**:
  - Active bots show a bouncing `💭 THINKING...` badge and pulsing gold ring; Hero shows `⚡ YOUR TURN`.
- **Center-Felt Live Action Ticker (`lastActionEvent`)**:
  - Displays the most recent action (`[Player Name] ([Position]) • [ACTION]`) in the center of the table (`animate-ticker-slide`).
- **Card Mucking & Chip Toss Animations**:
  - Folded cards tilt, slide inward, and dim (`animate-card-muck`); bets and pots animate with a chip-toss spring (`animate-chip-toss`).
- **Configurable Pacing**:
  - Supports `🐢 Relaxed` (default), `⚡ Normal`, and `🚀 Fast` speeds in the top header, controlling both bot thinking time and street-to-street transition delays.
- **Showdown & Fold Winner Announcements**:
  - Displays a prominent Winner Overlay Banner (`YOU WON THE POT!` or `[Player] Won!`, amount won, hand rank name, winning hole cards) and a `🏆 WINNER` crown on the winning seat.

---

## 5. Proactive Live `$1/$2` Coaching Engine (`src/lib/poker/coach.ts`)
- **Pre-Action Proactive Advice (`getProactiveAdvice`)**:
  - Always displays the optimal move, exact dollar sizing, estimated win equity %, pot odds %, 2-sentence exploitative rationale, and leak warning *before* the player acts.
  - Includes a **1-Click "Apply & Play"** button that sets the raise slider and executes the recommended action immediately.
- **Post-Action Evaluation (`evaluateAction`)**:
  - Evaluates Hero moves as `Optimal`, `Acceptable`, `Leak`, or `Blunder` with EV dollar impact and tracks session accuracy in `SessionStats`.

---

## 6. Security, Privacy & Verification Checklist
- **No Secrets or OS Artifacts**: Never commit `.env*` files, API keys, credentials, local filesystem paths (`/Users/...`), or `.DS_Store` files.
- **SonarQube & OWASP Top 10 Security Architecture Standards**:
  - **Zero Hardcoded Secrets & PII (S2068 / CWE-798 / CWE-359)**: Never hardcode fallback passwords or personal emails.
  - **Cryptographic Session Integrity (S3330 / CWE-384)**: All admin cookies must use HMAC-SHA256 signed session tokens with expiration and `crypto.timingSafeEqual` checks.
  - **CSPRNG Casino Gaming Fairness (S2245 / CWE-330)**: Card shuffling (Poker, Blackjack) and wheel spins (Roulette) must use `secureRandom()` (`crypto.getRandomValues`).
  - **No Dynamic Code Injection (S2631 / CWE-94)**: Prohibit `eval()` and `new Function()`.
- **Automated Verification Gate**: Before committing any feature or bugfix, run:
  ```bash
  npm test
  npm run build
  npm run lint
  ```
  All unit/integration tests (`src/__tests__/*.test.ts`), TypeScript compilation, and ESLint checks must pass with zero errors and zero warnings.
