# FeltSense: Core Design Principles & Engineering Constitution

Whenever designing, modifying, or implementing new features in **FeltSense** (`felt-sense/`), you MUST strictly abide by the following architectural, visual, and gameplay principles.

---

## 1. Constrained 16:9 Table Geometry & Bounded Pods (Strict Layout)
- **Aspect-Ratio Locked Stage**: The poker table MUST sit inside a centered container with a locked `16:9` aspect ratio (`aspect-[16/9] max-h-[82vh]`) and layered casino borders (Outer Wood/Leather Rail → Inner Brass Rim → Radial Casino Felt).
- **Fixed 9-Max Elliptical Coordinates**: All 9 player seats MUST be positioned using fixed percentage coordinates (`SEAT_POSITIONS`) around the perimeter of the felt. Never let player pods float unconstrained.
- **Hero Anchored at Bottom-Center (Visual Seat 0)**: The user (`Hero`) MUST always be rendered at the bottom-center seat (`SEAT_POSITIONS[0]`, `top: 86%, left: 50%`). All other seats rotate relative to Hero (`visualSeatIndex = (idx - effectiveHeroIdx + 9) % 9`) while the Dealer Button (`D`) and positional labels (`BTN`, `SB`, `BB`, `UTG`, etc.) rotate each hand.
- **Strict Avatar & Pod Sizing**: Player avatars MUST remain strictly bounded (`42px` / `w-10 h-10 sm:w-11 sm:h-11 rounded-full` with explicit inline `width`/`height` fallbacks) inside a compact `w-24 sm:w-28` pod badge. Never allow oversized images or unconstrained SVGs to break the table layout.

---

## 2. Information Hiding & Physical Casino Realism
- **Opponent Hole Card Privacy**: Opponents' hole cards MUST remain face-down (`{ hidden: true }`) during all active betting streets (`PREFLOP`, `FLOP`, `TURN`, `RIVER`). Opponent cards may ONLY be revealed during `SHOWDOWN` for players who have not folded (`!player.hasFolded`), unless a dedicated training debug toggle is explicitly active.
- **3D Physical Chip Stacks (`ChipStack.tsx`)**: Money on the table must look like real casino chips, not just plain text numbers:
  - Render each player's **Bankroll Chip Stack** (`mode="bankroll"`) beside their pod, dynamically reflecting their current stack in live `$1/$2` denominations (`$100` Black, `$25` Green, `$5` Red, `$1` Blue).
  - Render each player's **Active Street Bet Stack** (`mode="bet"`) in front of their pod toward the center of the felt.
  - Render the **Central Pot Chip Stack** above the total pot badge.

---

## 3. Multi-Position Docking & Automatic Screen Reorganization
- **Pin Anywhere**: Auxiliary HUD panels (**Proactive AI Coach** and **Dealer Log**) must support docking to `left`, `right`, `bottom`, or `hidden` via both top-header quick-toggles and panel header buttons.
- **Zero-Overlap Stage Reflow**: When any panel is docked to the `left` or `right` wall, the main poker table stage and bottom betting console MUST dynamically adjust their horizontal padding (`lg:pl-80` / `lg:pr-80`) so the table scales and centers in the available space without overlapping seats or controls.
- **Automatic Vertical Split (`isStacked`)**: When both the AI Coach and Dealer Log are pinned to the **same wall** (both `left` or both `right`), they MUST automatically split the wall vertically (`top-12 bottom-[48%]` for Coach and `top-[52%] bottom-0` for Dealer Log) so neither panel covers the other.

---

## 4. Visual Action Callouts, Pacing & Winner Clarity
- **Animated Per-Player Action Callouts**: Every player action (`RAISE $X`, `BET $X`, `CALL $X`, `CHECK`, `FOLDED`, `ALL-IN $X`, `SB $1`, `BB $2`) must display a color-coded, spring-animated pill badge (`animate-action-pop`) above that player's avatar and trigger an avatar ring ripple (`animate-action-ripple`).
- **Live Turn & Bot "Thinking..." Indicator**: When a bot is deciding, display an animated `💭 THINKING...` badge and pulsing gold ring on their seat (`⚡ YOUR TURN` for Hero) so the user can visually track action moving clockwise seat-by-seat.
- **Center-Felt Live Action Ticker**: Display the most recent table action (`[Player] ([Pos]) • [Action]`) in a smooth slide-in banner (`animate-ticker-slide`) above the central pot.
- **Card Mucking & Chip Toss Animations**: Folded hole cards must animate into a tilted, dimmed muck state (`animate-card-muck`) rather than vanishing abruptly, and bet/pot chips must animate onto the felt (`animate-chip-toss`).
- **Human-Readable Pacing**: Default to `Relaxed` game speed (`gameSpeed: 'relaxed'`) with natural bot decision delays and pauses between street transitions (`getStreetTransitionDelay`) so the user can absorb every action before the next card is dealt.
- **Unmistakable Winner Announcements**: When a hand ends (at Showdown or when all opponents fold), display the central Winner Banner (`YOU WON THE POT!` / `[Player] Won!`, exact dollar payout, winning hand rank, and winning hole cards) along with a `🏆 WINNER` crown badge on the winning seat.

---

## 5. Proactive Exploitative Coaching (`$1/$2` Live NLHE Strategy)
- **Proactive Pre-Action Advice (`getProactiveAdvice`)**: Before the user acts on any street, the AI Coach must display the optimal recommended action, exact dollar sizing, estimated win equity %, pot odds %, a concise 2-sentence exploitative rationale, and a common leak warning.
- **1-Click "Apply & Play" Automation**: Provide a 1-click button inside the AI Coach panel that syncs the betting slider to the recommended amount and executes the move immediately.
- **Post-Action Leak Tracking (`evaluateAction`)**: Evaluate every Hero action (`Optimal`, `Acceptable`, `Leak`, `Blunder`) with EV impact tracking in `sessionStats`.

---

## 6. Code Quality, Security & Testing Gate
- **100% Privacy & Zero Secrets**: Never commit `.env*` files, API keys, tokens, credentials, personal machine paths (`/Users/...`), or OS metadata files (`.DS_Store`).
- **Mandatory Verification Gate**: Any code or UI change MUST pass all three checks before completion:
  1. `npm test` (All unit & state machine tests in `src/__tests__/*.test.ts` must pass, and new features must include corresponding tests)
  2. `npm run build` (Zero TypeScript or Next.js build errors)
  3. `npm run lint` (Zero ESLint errors or warnings)
