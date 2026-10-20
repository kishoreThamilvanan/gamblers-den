# FeltSense Product Backlog & Feature Specifications

> [!IMPORTANT]
> **Implementation Policy**: Items in the pending backlog are **specifications only**. Do **NOT** begin implementing any pending item from this backlog without the user's explicit approval, interactive design alignment (`/grill-me`), and step-by-step planning (`/plan`).

---

## Pending Backlog (Awaiting Design & Approval)

### 0. Authentication & Admin Console Hardening
- **Status**: `Completed ✅`
- **Sub-Features**:
  - **0.a. Fix & Wire Real Google Sign-In OAuth (`Completed ✅`)**: Wired `signInWithGoogle` in [`authService.ts`](file:///Users/kishorethamilvanan/Projects/gamblers-den/felt-sense/src/lib/auth/authService.ts) to launch the official Firebase Auth Google OAuth popup (`signInWithPopup` with `GoogleAuthProvider`) when `.env.local` keys are configured, with clear diagnostic feedback if keys are missing.
  - **0.b. Mandatory Email Verification to Play (`Completed ✅`)**: Removed anonymous Guest entry from [`AuthGateView.tsx`](file:///Users/kishorethamilvanan/Projects/gamblers-den/felt-sense/src/components/poker/AuthGateView.tsx) and [`page.tsx`](file:///Users/kishorethamilvanan/Projects/gamblers-den/felt-sense/src/app/page.tsx), added automatic Firebase `VERIFY_EMAIL` link dispatch (`sendOobCode`) on registration, and gated Lobby/Table access behind `emailVerified === true` with "I've Verified — Check Status" and "Resend Verification Email" controls.
  - **0.c. Protect & Harden the Pit Boss / Admin Console (`Completed ✅`)**: Enforced a Strict Owner-Only Lock across [`authService.ts`](file:///Users/kishorethamilvanan/Projects/gamblers-den/felt-sense/src/lib/auth/authService.ts), [`AdminConsoleView.tsx`](file:///Users/kishorethamilvanan/Projects/gamblers-den/felt-sense/src/components/poker/AdminConsoleView.tsx), and [`AdminShortcutListener.tsx`](file:///Users/kishorethamilvanan/Projects/gamblers-den/felt-sense/src/components/poker/AdminShortcutListener.tsx) requiring **both** a signed-in verified email in `NEXT_PUBLIC_ADMIN_EMAILS` **and** secondary unlock (Passkey or Passcode), with all dev sign-in buttons, exposed email lists, and passcode hints removed.

### 2. Multiplayer Mode
- **Status**: `Backlog (Phase 2 — Awaiting Design & Approval)`
- **Summary**: Real-time multiplayer poker tables where human players can join and play together.
- **Sub-Features**:
  - **2.a. User Authentication & Player Profiles (`Completed ✅`)**: Implemented in [`authService.ts`](file:///Users/kishorethamilvanan/Projects/gamblers-den/felt-sense/src/lib/auth/authService.ts), [`AuthGateView.tsx`](file:///Users/kishorethamilvanan/Projects/gamblers-den/felt-sense/src/components/poker/AuthGateView.tsx), and [`UserProfileModal.tsx`](file:///Users/kishorethamilvanan/Projects/gamblers-den/felt-sense/src/components/poker/UserProfileModal.tsx) with Google Cloud Identity Platform / Firebase Auth + Firestore sync and zero-cost Local Vault fallback.
  - **2.a-admin. Pit Boss Owner Admin Console (`Completed ✅`)**: Implemented at [`/admin`](file:///Users/kishorethamilvanan/Projects/gamblers-den/felt-sense/src/app/admin/page.tsx) via [`AdminConsoleView.tsx`](file:///Users/kishorethamilvanan/Projects/gamblers-den/felt-sense/src/components/poker/AdminConsoleView.tsx) with Dual-Layer Admin Access Gate (`NEXT_PUBLIC_ADMIN_EMAILS` + `NEXT_PUBLIC_ADMIN_PASSCODE`), global KPIs, ecosystem leak intelligence, player directory table, individual dossier inspector, bankroll/stat management controls, demo player seeder, and CSV/JSON export.
  - **2.b. Private Rooms & Invite Friends (`Pending`)**: Allow logged-in users to create a private table/room and invite friends via room code / invite link to play together in real time.
- **Remaining Multiplayer Scope**:
  - Real-time state synchronization & server-authoritative deck dealing so hole cards remain private on the server.
  - Private room creation, seat selection, and invite links.

---

## Completed Phase 1 Backlog Milestones

### 1. Player & AI Difficulty Levels
- **Status**: `Completed ✅`
- **Implementation**:
  - 3 selectable tiers in [`LobbyView.tsx`](file:///Users/kishorethamilvanan/Projects/gamblers-den/felt-sense/src/components/poker/LobbyView.tsx): `🐟 Friday Night Fish (Beginner)`, `🕶️ Casino Regulars (Intermediate)`, and `🦈 Vegas Sharks (Advanced)`.
  - Dynamic bot persona pool and heuristics in [`src/lib/poker/personas.ts`](file:///Users/kishorethamilvanan/Projects/gamblers-den/felt-sense/src/lib/poker/personas.ts) and [`src/lib/store.ts`](file:///Users/kishorethamilvanan/Projects/gamblers-den/felt-sense/src/lib/store.ts).
  - Spoiler-free AI Coach hint conceal/reveal mode in `Vegas Sharks` (`advanced`) difficulty inside [`AICoachPanel.tsx`](file:///Users/kishorethamilvanan/Projects/gamblers-den/felt-sense/src/components/poker/AICoachPanel.tsx).

### 3. Configurable Single-Player Table & Buy-In Settings
- **Status**: `Completed ✅`
- **Implementation**:
  - Configurable **Table Size** (`2-Max Heads-Up`, `6-Max Short-Handed`, `9-Max Full Ring`) with symmetrical elliptical seat mapping in [`src/app/page.tsx`](file:///Users/kishorethamilvanan/Projects/gamblers-den/felt-sense/src/app/page.tsx).
  - Configurable **Buy-In Stack** (`$100 / 50 BB`, `$200 / 100 BB`, `$300 / 150 BB`, `$400 / 200 BB`).
  - Configurable **Max Rebuys** (`0 / Freezeout`, `1 Rebuy`, `3 Rebuys`, `Unlimited`) with in-game rebuy/bust handling on the Showdown overlay.

### 4.A. 3D "Blind Peeking" Hole Card Mechanic
- **Status**: `Completed ✅`
- **Implementation**:
  - Default 3D Blind Peeking on Hero's hole cards (hover/touch to curl cards in 3D perspective with paper friction `playCardPeel()` and release snap `playCardSnap()`, or click to pin face-up for the current hand).
  - Top header bar toggle (`Cards: 3D Peek` / `Cards: Face-Up`) for volume drilling.

### 4.B. Pre-Action Checkbox Staging ("Auto-Fold / Check-Fold")
- **Status**: `Completed ✅`
- **Implementation**:
  - Low-profile `Check / Fold`, `Check`, and `Call Any` staging bar displayed above the main action buttons when action is not on Hero.
  - Instant execution when turn reaches Hero; automatic clearing of staged `Check` if an opponent bets or raises ahead of Hero.

### 4.C. Live Pot Odds & Breakeven Equity Visualizer
- **Status**: `Completed ✅`
- **Implementation**:
  - Dynamic `Requires X% Eq • Hero Y%` badge rendered in the betting console and on the `CALL $X` button whenever facing a bet, color-coded emerald when Hero's equity meets or exceeds required pot odds.

### 4.D. Multi-Density Chip Sound Escalation
- **Status**: `Completed ✅`
- **Implementation**:
  - `playBetByDensity(betAmount, potAmount)` in [`src/lib/sound/soundSystem.ts`](file:///Users/kishorethamilvanan/Projects/gamblers-den/felt-sense/src/lib/sound/soundSystem.ts) escalates Web Audio synthesis from a single-chip ceramic tick (`$1–$6`), to a multi-chip barrel slide (`$7–$45`), to a deep resonant sub-bass thud + scatter cascade (`$65+` or pot-sized shoves).

### 5.A. Live Poker Timing Tells & Behavioral Cues
- **Status**: `Completed ✅`
- **Implementation**:
  - Calling Station *Snap-Call* (`0.3s`), Nit *Hollywood Tank-Raise* (`3.5s`), and Aggro-Fish *Weakness Stab* (`0.35s`) surfaced in the Center-Felt Live Action Ticker, Dealer Log, and Hand Replayer (concealed in `Vegas Sharks` difficulty).

### 5.B. "Limper Punishment" Scenario Drill Mode
- **Status**: `Completed ✅`
- **Implementation**:
  - Dedicated `🎯 Limp-Punisher Drill` mode selectable from the Lobby.
  - Deals Hero on the Button with playable isolation hands facing 1–3 limpers ahead to drill the $4\text{BB} + 1\text{BB per limper}$ formula.

### 5.C. Interactive Opponent "Player Profiler" Dossiers
- **Status**: `Completed ✅`
- **Implementation**:
  - Clicking any opponent avatar on the felt opens [`OpponentDossierModal.tsx`](file:///Users/kishorethamilvanan/Projects/gamblers-den/felt-sense/src/components/poker/OpponentDossierModal.tsx) with `VPIP%`, `PFR%`, `Fold to C-Bet%`, known live exploits, and direct counter-strategy.

### 6.A. The End-of-Session "Blunder Ledger"
- **Status**: `Completed ✅`
- **Implementation**:
  - Upgraded [`SessionStatsModal.tsx`](file:///Users/kishorethamilvanan/Projects/gamblers-den/felt-sense/src/components/poker/SessionStatsModal.tsx) featuring Live Casino Readiness Grade (`A+` through `F`), Realized Profit vs. Leak-Free `$EV`, and the Top 3 Costliest Leaks sorted by EV loss.

### 6.B. Street-by-Street Hand Replayer
- **Status**: `Completed ✅`
- **Implementation**:
  - Created [`HandReplayerModal.tsx`](file:///Users/kishorethamilvanan/Projects/gamblers-den/felt-sense/src/components/poker/HandReplayerModal.tsx), accessible from both the Showdown Winner Banner (`↺ Replay Hand`) and the Session Review Modal, with street-by-street playback controls, community card progression, interactive Hero equity curve, and Coach/Tell notes.

---

## Core Foundation Milestones (Reference)
- [x] Constrained 16:9 casino table layout with 2/6/9-max symmetrical seat coordinates and Hero anchored at bottom-center.
- [x] Strict opponent hole card hiding (`{ hidden: true }`) until Showdown.
- [x] Physical 3D casino chip stacks (`$100` Black, `$25` Green, `$5` Red, `$1` Blue) for bankrolls, bets, and pot.
- [x] Game speed controls (`Relaxed`, `Normal`, `Fast`) and Showdown/Fold Winner announcements.
- [x] Proactive AI Coach with pre-action advice, equity/pot-odds HUD, and 1-click "Apply & Play".
- [x] Multi-position docking (`Left`, `Right`, `Bottom`, `Hidden`) for AI Coach & Dealer Log with automatic screen reorganization.
- [x] Per-player animated action badges (`RAISE`, `BET`, `CALL`, `CHECK`, `FOLDED`, `ALL-IN`), center-felt live action ticker, card mucking, and chip toss animations.
- [x] Comprehensive automated test suite (`54` unit & state-machine tests in `src/__tests__/`).
