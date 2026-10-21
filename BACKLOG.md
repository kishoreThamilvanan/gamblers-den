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
  - **Required for Pit Boss Owner Admin Access (`/admin` & `⌘⇧A`)**:
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
- **Status**: `Backlog (Phase 3 — Awaiting Design & Approval)`
- **Summary**: Full-featured casino Blackjack table supporting standard casino rules, 3D chip betting, and real-time basic strategy training.
- **Specification**:
  - **Game Rules**:
    - 6-Deck continuous shoe with automated burn card.
    - Dealer stands on soft 17 (or configurable hits soft 17).
    - Blackjack pays 3:2.
    - Standard player actions: **Hit**, **Stand**, **Double Down**, **Split** (up to 3 hands), **Insurance** (pays 2:1 against dealer Ace), and **Late Surrender**.
  - **Table Layout & UI**:
    - Authentic semicircular casino Blackjack felt layout fitting within Gambler's Den 16:9 responsive frame.
    - Multi-hand betting spots (play 1 to 3 hands simultaneously against the dealer).
    - Physical 3D casino chip placement on betting circles with authentic chip sound synthesis.
  - **Card Shoe & Hand Animation**:
    - Animated card slide from shoe to player/dealer boxes.
    - Dealer hole card peek mechanic when showing Ace or 10.
  - **AI Strategy Advisor & Counting Drills**:
    - Real-time Basic Strategy Coach overlay (recommending Hit/Stand/Double/Split based on mathematical expectation).
    - Running count & True count card counting trainer mode (Hi-Lo system).

---

### 4. Casino Game Expansion: European & American Roulette
- **Status**: `Backlog (Phase 3 — Awaiting Design & Approval)`
- **Summary**: Authentic casino Roulette simulation featuring spinning 3D wheel physics, felt betting board, and realistic payout engine.
- **Specification**:
  - **Game Variants**:
    - **European Roulette**: Single zero (`0`), 2.70% house edge (Recommended).
    - **American Roulette**: Double zero (`0` and `00`), 5.26% house edge.
  - **Interactive Felt Board Betting**:
    - **Inside Bets**: Straight Up (35:1), Split (17:1), Street (11:1), Corner (8:1), Six Line (5:1), Trio / First Four.
    - **Outside Bets**: Red/Black (1:1), Even/Odd (1:1), Low (1–18) / High (19–36) (1:1), Dozens (2:1), Columns (2:1).
    - Intuitive drag-and-drop or click-to-place chip staging with multi-denomination stacks ($1, $5, $25, $100).
    - "Repeat Last Bet", "Double Bets", and "Clear Board" quick controls.
  - **Animated Wheel & Ball Physics**:
    - Smooth Canvas/CSS 3D wheel spin animation with realistic ball deceleration and pocket bouncing.
    - Multi-density Web Audio sound effects: wheel friction spin, ball bouncing against frets, and pocket drop clatter.
  - **Statistics & Hot/Cold Number Tracking**:
    - Recent spin history marquee with red/black/green highlights.
    - Hot and Cold number frequencies, dozen heatmaps, and wheel sector charts.

---

### 5. Multi-Game Casino Hub & Unified Bankroll
- **Status**: `Backlog (Phase 3 — Awaiting Design & Approval)`
- **Summary**: Top-level casino navigation hub allowing players to seamlessly switch between **Texas Hold'em Poker**, **Blackjack**, and **Roulette** while sharing a single persistent career bankroll and player profile.

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
