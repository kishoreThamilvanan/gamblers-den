# Gambler's Den Product Backlog & Feature Specifications

> [!IMPORTANT]
> **Implementation Policy**: Items in the pending backlog are **specifications only**. Do **NOT** begin implementing any pending item from this backlog without the user's explicit approval, interactive design alignment (`/grill-me`), and step-by-step planning (`/plan`).

---

## Pending Backlog (Awaiting Design & Approval)

### 1. Vercel Deployment & Environment Configuration Checklist
- **Status**: `Pending (Ready for Deployment Verification)`
- **Summary**: Comprehensive verification and documentation of all required and optional environment variables for hosting Gambler's Den on Vercel.
- **Specification**:
  - **Required for Live Google OAuth & Email Verification**:
    - `NEXT_PUBLIC_FIREBASE_API_KEY`: Web API key from Firebase project settings.
    - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`: Firebase auth domain (e.g. `your-app.firebaseapp.com`).
    - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`: Firebase project ID.
  - **Required for Pit Boss Owner Admin Access**:
    - `ADMIN_EMAILS`: Server-side comma-separated owner email whitelist (e.g. `owner@example.com`).
    - `ADMIN_PASSCODE`: Server-side secret passcode for `/api/admin/verify` (never exposed in client JS bundles).
    - `NEXT_PUBLIC_ADMIN_EMAILS`: Client fallback whitelist (e.g. `owner@example.com`).
    - `NEXT_PUBLIC_ADMIN_PASSCODE`: Client fallback passcode (optional, fallback to `PITBOSS-777`).
  - **Post-Deploy Steps**:
    - Add assigned Vercel URL (e.g. `https://gamblers-den.vercel.app`) to Firebase Console $\rightarrow$ Authentication $\rightarrow$ Settings $\rightarrow$ Authorized Domains.

---

### 2. Real-Time Multiplayer Poker
- **Status**: `Backlog (Phase 2 — Awaiting Design & Approval)`
- **Summary**: Live multiplayer tables allowing friends to join private rooms and play together at the exact same table in real time.
- **Sub-Features**:
  - **2.a. User Authentication & Player Profiles (`Completed ✅`)**: Implemented in [`src/lib/auth/authService.ts`](file:///Users/kishorethamilvanan/Projects/gamblers-den/src/lib/auth/authService.ts), [`src/components/poker/AuthGateView.tsx`](file:///Users/kishorethamilvanan/Projects/gamblers-den/src/components/poker/AuthGateView.tsx), and [`src/components/poker/UserProfileModal.tsx`](file:///Users/kishorethamilvanan/Projects/gamblers-den/src/components/poker/UserProfileModal.tsx) with Google OAuth + Email verification and local vault fallback.
  - **2.a-admin. Pit Boss Owner Admin Console (`Completed ✅`)**: Implemented at [`/admin`](file:///Users/kishorethamilvanan/Projects/gamblers-den/src/app/admin/page.tsx) via [`src/components/poker/AdminConsoleView.tsx`](file:///Users/kishorethamilvanan/Projects/gamblers-den/src/components/poker/AdminConsoleView.tsx) with server-side timing-safe verification, rate limiting, player telemetry, and CSV/JSON export.
  - **2.b. Private Rooms & Invite Friends (`Pending`)**:
    - Create private rooms with custom table sizes (2-Max, 6-Max, 9-Max) and custom buy-in limits.
    - 6-character room codes and 1-click shareable invite links (`/table/[roomId]?invite=xyz`).
  - **2.c. Server-Authoritative Dealing & Anti-Cheat Engine (`Pending`)**:
    - Migrate deck dealing to a backend server engine (WebSockets / PartyKit / Supabase Realtime).
    - Opponent hole cards remain on the server and are NEVER sent over the wire until Showdown (preventing browser DevTools card scraping).
  - **2.d. Live Action Synchronization & Turn Clocks (`Pending`)**:
    - Real-time turn timer countdown (15s–30s) with auto-check/fold on timeout.
    - Synchronized chip toss animations, pot distributions, and chat/emoji reactions.

---

### 3. Casino Game Expansion: Blackjack (21)
- **Status**: `Completed ✅`
- **Summary**: Full-featured casino Blackjack table supporting standard casino rules, 3D chip betting, and real-time basic strategy training.
- **Specification**:
  - **Game Rules**:
    - 6-Deck continuous shoe with automated burn card & cut card.
    - Dealer stands on soft 17 (Vegas S17 rules).
    - Blackjack pays 3:2.
    - Standard player actions: **Hit**, **Stand**, **Double Down**, **Split**, and **Late Surrender**.
  - **Table Layout & UI**:
    - Authentic semicircular casino Blackjack felt layout fitting within Gambler's Den 16:9 responsive frame at `/blackjack`.
    - Multi-hand betting spots (play up to 5 hands simultaneously against the dealer with customizable bot presets).
    - Physical 3D casino chip placement on betting circles with authentic chip sound synthesis.
    - **Physical Card Dealing Engine (`Completed ✅`)**: Shared 2D physical card slide physics with authentic clockwise distribution from dealing shoe, felt friction audio (`whoosh`), dynamic elevation shadows, tactile landing snaps, relaxed casino pacing intervals, and Spacebar/click fast-forward.
  - **AI Strategy Advisor & Counting Drills**:
    - Real-time Basic Strategy Coach overlay (recommending Hit/Stand/Double/Split based on mathematical expectation).
    - Running count & True count card counting trainer mode (Hi-Lo system).

---

### 4. Casino Game Expansion: European & American Roulette
- **Status**: `Completed ✅`
- **Summary**: Authentic casino Roulette simulation featuring spinning 3D wheel physics, felt betting board, and realistic payout engine.
- **Specification**:
  - **Game Variants**:
    - **European Roulette**: Single zero (`0`), 2.70% house edge.
    - **American Roulette**: Double zero (`0` and `00`), 5.26% house edge.
  - **Interactive Felt Board Betting**:
    - **Inside Bets**: Straight Up (35:1), Split (17:1), Street (11:1), Corner (8:1), Six Line (5:1).
    - **Outside Bets**: Red/Black (1:1), Even/Odd (1:1), Low (1–18) / High (19–36) (1:1), Dozens (2:1), Columns (2:1).
    - Multi-denomination chip betting ($1, $5, $25, $100, $500).
    - "Repeat Last Bet", "Double Bets", and "Clear Board" controls.
  - **Animated Wheel & Ball Physics**:
    - Smooth 2D Canvas radial wheel spin with realistic ball deceleration, fret deflection, and pocket drop physics.
    - Web Audio sound effects: wheel friction spin, ball bouncing against frets, and pocket drop clatter.
  - **Statistics & Hot/Cold Number Tracking**:
    - Recent spin history marquee with red/black/green highlights.
    - Hot and Cold number frequencies, dozen/column tracking, and color/parity distributions.

---

### 5. Multi-Game Casino Hub & Unified Bankroll
- **Status**: `Completed ✅`
- **Summary**: Top-level casino navigation hub allowing players to seamlessly switch between **Texas Hold'em Poker** (`/poker`), **Blackjack** (`/blackjack`), and **Roulette** (`/roulette`) while sharing a single persistent career bankroll and player profile in `playerProfileStorage`.

---

### 6. Shared Physical Card Dealing Engine Across Table Games
- **Status**: `Completed ✅`
- **Summary**: Modular, hardware-accelerated physical card sliding engine implemented in [`src/components/casino/`](file:///Users/kishorethamilvanan/Projects/gamblers-den/src/components/casino/) and integrated across both **Texas Hold'em Poker** (`/poker`) and **Blackjack** (`/blackjack`).
- **Features**:
  - Authentic clockwise multi-pass card distribution (starting left of dealer button in Poker, Spot 1 to Spot 5 in Blackjack).
  - Street-by-street community card slides for Poker (Flop, Turn, River).
  - Deliberate, unhurried casino pacing (~640ms–680ms per card interval in relaxed mode) with deceleration physics (`cubic-bezier(0.16, 1, 0.3, 1)`).
  - Synthesized bandpass-filtered felt friction whoosh sound (`playCardSlide`) + tactile landing snap (`playCardSnap`).
  - Spacebar and felt-click instant fast-forward without state race conditions.

---

### 7. Multi-Game Interactive Lobbies & 5-Session Persistence Engine
- **Status**: `Completed ✅`
- **Summary**: Unified session persistence and interactive pre-game lobbies across all casino table games (**Poker**, **Blackjack**, and **Roulette**).
- **Features**:
  - Generic storage engine in [`src/lib/sessions/sessionManager.ts`](file:///Users/kishorethamilvanan/Projects/gamblers-den/src/lib/sessions/sessionManager.ts) enforcing a strict 5-session cap (`MAX_SAVED_SESSIONS = 5`) per game with least-recently-played eviction.
  - Interactive **Blackjack Lobby** (`BlackjackLobbyView.tsx`): 5-part configuration deck (Casual/Regular/VIP stakes, 1–5 spots, bot fill toggle, 6-deck vs 2-deck shoe, standard vs card counting drill) and saved session cards.
  - Interactive **Roulette Lobby** (`RouletteLobbyView.tsx`): 4-part configuration deck (European vs American wheel, limits, 10s/15s/30s/Manual clock, session buy-in stack) and saved session cards with colored winning numbers pills.
  - Live career bankroll synchronization: Table stacks track real-time wins/losses and update the player's profile vault.
  - Standardized `[← Lobby]` return button in `TableTopBar` across all games.

---

## Completed Phase 1 Backlog Milestones (Reference)

### 0. Authentication & Admin Console Hardening (`Completed ✅`)
- Real Google Sign-In OAuth popup via Firebase with diagnostic fallback.
- Mandatory email verification to play (guest bypass eliminated).
- Hardened Owner-Only Pit Boss Admin Console with server-side timing-safe passcode validation, brute-force rate-limiting, and Touch ID / Face ID passkeys.

### 1. Player & AI Difficulty Levels (`Completed ✅`)
- 3 tiers: `🐟 Friday Night Fish`, `🕶️ Casino Regulars`, `🦈 Vegas Sharks`.
- Distinct persona pools with custom aggression, sizing, and timing tells.

### 2. Configurable Single-Player Table & Buy-In Settings (`Completed ✅`)
- Configurable Table Size (`2-Max`, `6-Max`, `9-Max`).
- Configurable Buy-In Stack (`$100`, `$200`, `$300`, `$400`).
- Configurable Max Rebuys (`Freezeout`, `1 Rebuy`, `3 Rebuys`, `Unlimited`).

### 3. Visual & Audio Realism (`Completed ✅`)
- 3D Blind Peeking hole cards with perspective curling and paper friction audio.
- Physical 3D casino chip stacks for bets, bankrolls, and central pots.
- Multi-density chip sound escalation synthesized via Web Audio.

### 4. Advanced Poker Training Tools (`Completed ✅`)
- Proactive AI Coach with pre-action pot odds, MDF, and 1-click "Apply & Play".
- Pre-action checkbox staging (`Check/Fold`, `Check`, `Call Any`).
- Limper Punishment scenario drill mode.
- Interactive Opponent Dossier modals.
- End-of-session Blunder Ledger and Casino Readiness grade (`A+` to `F`).
- Street-by-street Hand Replayer with interactive equity curve.
