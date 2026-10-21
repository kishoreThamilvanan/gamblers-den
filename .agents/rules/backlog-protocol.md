# Gambler's Den Product Backlog & Commit Protocol

The running product backlog for **Gambler's Den** is maintained in [`BACKLOG.md`](../../BACKLOG.md).

## Mandatory Rules for Backlog & Commit Management
1. **No Unapproved Implementation**: NEVER start implementing any item listed in `BACKLOG.md` unless the user explicitly asks to start working on that specific item.
2. **Design & Planning Gate**: When the user selects a backlog item to work on, first align on requirements, edge cases, and architecture (e.g., via interactive design questions / `/grill-me` and a step-by-step implementation plan) and receive explicit user approval before writing production code.
3. **Keep Backlog Updated**: When the user shares new feature ideas to save for later, append them cleanly to `BACKLOG.md` with status `Backlog (Not Started — Awaiting Design & Approval)`. When a backlog item is officially completed and verified, move it to the `Completed Milestones` section of `BACKLOG.md`.
4. **Explicit User-Authorized Commit & Pre-Commit Code Sweep Protocol**:
   - NEVER execute `git commit` or `git push` autonomously. Only commit or push when the user explicitly requests and approves it.
   - Before executing any requested commit, perform a full sweep of the codebase verifying zero security vulnerabilities, SonarQube quality gate standards (lint, tests, build), and zero exposed PII or secrets.
