<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Gambler's Den: Core Design Principles & Engineering Constitution

Whenever designing, modifying, or implementing new features in **Gambler's Den**, you MUST strictly abide by the following principles (also documented in [`DESIGN_PRINCIPLES.md`](./DESIGN_PRINCIPLES.md)):

1. **Constrained 16:9 Table Geometry & Bounded Pods**:
   - Keep the poker table inside a centered `aspect-[16/9] max-h-[82vh]` container with fixed 9-seat elliptical percentage coordinates (`SEAT_POSITIONS`).
   - **Hero is Always Seat 0 (Bottom-Center)**: Rotate visual seats around Hero (`visualSeatIndex = (idx - effectiveHeroIdx + 9) % 9`) so the user is permanently anchored at bottom-center (`top: 86%, left: 50%`).
   - Keep player avatars strictly bounded (`42px` / `w-10 h-10 sm:w-11 sm:h-11 rounded-full`) inside `w-24 sm:w-28` pod badges.

2. **Information Hiding & 3D Physical Casino Chips**:
   - **Opponent Card Privacy**: Opponents' hole cards MUST stay face-down (`{ hidden: true }`) during `PREFLOP`, `FLOP`, `TURN`, and `RIVER`, revealing only at `SHOWDOWN` if `!player.hasFolded`.
   - **Physical 3D Chip Stacks (`ChipStack.tsx`)**: Render bankroll chip stacks (`mode="bankroll"`), active street bets (`mode="bet"`), and central pot stacks using authentic `$100` Black, `$25` Green, `$5` Red, and `$1` Blue casino chips.

3. **Multi-Position Docking & Automatic Screen Reorganization**:
   - Both **AI Coach** (`AICoachPanel.tsx`) and **Dealer Log** (`DealerLogBox.tsx`) must support `left`, `right`, `bottom`, and `hidden` docking.
   - Dynamically pad the main table stage and bottom footer (`lg:pl-80` / `lg:pr-80`) when panels are docked to a side wall so the table never overlaps with side panels.
   - Automatically split the wall vertically (`isStacked`) when both panels are docked to the same wall.

4. **Visual Action Callouts, Pacing & Winner Clarity**:
   - Show color-coded, animated action badges (`animate-action-pop`: `RAISE $X`, `BET $X`, `CALL $X`, `CHECK`, `FOLDED`, `ALL-IN $X`, `SB $1`, `BB $2`), active bot thinking indicators (`💭 THINKING...`), a center-felt live action ticker (`animate-ticker-slide`), card mucking (`animate-card-muck`), and chip toss (`animate-chip-toss`) animations.
   - Default to `Relaxed` game speed (`gameSpeed: 'relaxed'`) with natural street-transition pauses and clear Showdown/Fold Winner overlays (`lastHandResult` + `🏆 WINNER` seat crown).

5. **Proactive Exploitative Coaching**:
   - Provide pre-action guidance (`getProactiveAdvice`) with exact dollar sizing, equity %, pot odds %, 2-sentence rationale, leak warnings, and a 1-click **"Apply & Play"** button, plus post-action evaluation (`evaluateAction`).

6. **Security & Verification Gate**:
   - Never commit `.env*` files, secrets, personal paths, or `.DS_Store`.
   - Every change MUST pass `npm test`, `npm run build`, and `npm run lint` (`0 errors, 0 warnings`).

7. **Product Backlog Protocol ([`BACKLOG.md`](./BACKLOG.md))**:
   - All pending feature ideas are tracked in [`BACKLOG.md`](./BACKLOG.md).
   - **NEVER** start implementing any item from `BACKLOG.md` without the user's explicit approval, design alignment, and planning sign-off.

8. **Explicit User-Authorized Commit & Pre-Commit Code Sweep Protocol**:
   - **User Authorization Only**: NEVER execute `git commit` or `git push` autonomously. Only commit or push when the user explicitly requests and approves it.
   - **Mandatory Pre-Commit Security & SonarQube Sweep**: Before any requested commit, perform a full sweep of the codebase verifying:
     1. **Security Vulnerabilities**: Zero OWASP / CWE vulnerabilities (no leaked secrets in client bundles, timing-safe checks, no injection vectors).
     2. **SonarQube Quality Standards**: Clean static analysis (`npm run lint` with 0 errors/0 warnings), 100% passing tests (`npm test`), and successful production build (`npm run build`).
     3. **PII & Secret Protection**: Zero hardcoded Personally Identifiable Information (real personal emails, phone numbers, real credentials, or unredacted user data). Never stage or commit `.env*` files or sensitive credentials.

9. **Strict Owner Access & Admin Confidentiality**:
   - Owner access, admin console existence, triggers, shortcuts, instructions, and credentials belong EXCLUSIVELY to the cardroom owner.
   - **NEVER** display, describe, document, or instruct anyone on how to access, trigger, or unlock the owner admin console in public UI, public footers, client bundles, public documentation, or conversation outputs.
   - All admin access mechanisms must remain strictly stealth, gated behind verified owner email whitelist, and completely invisible to regular players.

10. **SonarQube & OWASP Top 10 Security Architecture Standards**:
   - **Zero Hardcoded Secrets & PII (S2068 / CWE-798 / CWE-359)**: NEVER define fallback passcodes, API keys, credentials, or personal developer emails in code. Secrets must reside exclusively in server-side environment variables and fail closed if unconfigured.
   - **Cryptographic Session Integrity (S3330 / CWE-384)**: Never issue static session cookie values (e.g. `'authenticated'`). All admin session tokens must be HMAC-SHA256 signed with expiration timestamps and validated using `crypto.timingSafeEqual`.
   - **Cryptographically Secure Gaming PRNG (S2245 / CWE-330)**: All card deck shuffling (Poker, Blackjack) and wheel spins (Roulette) must use `secureRandom()` (`crypto.getRandomValues`). Never use `Math.random()` for authentication challenges or game fairness.
   - **No Dynamic Code Injection (S2631 / CWE-94)**: Prohibit `eval()`, `new Function()`, and dynamic string script execution. For external browser ESM modules, use standard dynamic imports with `/* webpackIgnore: true */`.
   - **Safe Storage Access**: Always guard `localStorage` with `if (typeof window === 'undefined' || typeof localStorage === 'undefined') return ...` to prevent runtime `ReferenceError` during SSR and test runner execution.


