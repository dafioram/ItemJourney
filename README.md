# Manifest — a chain-of-custody ledger for tracking items through handoffs

A static, single-page app for reconstructing "what happened to all these items" after the
fact: items get packed, split across boxes, handed to different people, merged, unpacked,
and eventually all need to be accounted for. Manifest lets you enter that whole history
in any order, and continuously checks that nothing has gone missing along the way.

No backend. Your data lives in the browser (autosaved) and in JSON files you explicitly
save/load yourself — the JSON file *is* the save file, the same way a desktop app works
with its own document format.

## Core model

- **Items** are the things being tracked. Created via the Items screen or a one-time CSV
  import at the start of a project. Never created inline elsewhere, since the item list is
  the anchor every count check is measured against.
- **Owners** are the people who can hold items. Can be added from a dedicated screen or
  inline while editing an event.
- **Containers** ("boxes") are where items sit. Three reserved, protected values double as
  an item's status and can never be used as a real box name:
  - **None** — active, just not boxed ("unboxed")
  - **Pending** — not introduced yet (planned, but hasn't shown up)
  - **Removed** — permanently exited (given away, lost, disposed of); no reactivation
- **Events** are points in time (a name + a required timestamp, no duration) that record a
  *subset* of items changing owner and/or container. Only items that actually change appear
  in an event — everything else is resolved automatically by carrying forward its most
  recent state, all the way back to its initial seed if it's never been touched.

Events don't have to be authored in chronological order — you can fill in the ending first
and the messy middle later. Everything is resolved by actual timestamp, not entry order.

## Features

- **Items** — manual add, or bulk **CSV import** (`name, quantity, box` columns; quantity
  expands into individually numbered items; import is a one-time initial seed only).
- **Owners** — roster with usage counts; inline creation from any event.
- **Events** — bulk "add item change" picker grouped by current box/status, bulk apply
  (set an owner or box for many selected rows at once), per-row individual edits, duplicate
  an existing event as a starting point for a new one, live running tally while editing.
- **Views** — Boxes, People, Item timeline, a full Item × Event matrix, and a swimlane Flow
  diagram (see below).
- **Issues & reconciliation** — every validation rule *flags*, never blocks: a missing
  owner at activation/removal, an item moving backward in status, two different owners
  resolved into the same box at once, two events at an identical timestamp touching the
  same item, and so on. The reconciliation panel always reports total/active/pending/
  removed counts so "is everything accounted for" has a direct answer.
- **Save/load** — autosave to `localStorage`, plus explicit **Save project (.json)** /
  **Import project...** for a portable file you manage yourself.

### The flow diagram, briefly

Each lane is a bucket (a box, or Pending/Unboxed/Removed); each column is a point in time
(simultaneous events share a column). Circles show how many items sit in a lane at that
point; lines show *bundled* moves between lanes with a count badge you can click to expand
into individual item threads. Items that never change lane never draw a line at all — this
is intentional (it's how a fully static project ends up looking empty in this view) rather
than a bug.

## Getting started

Requires Node 22.22.2+ (or 24.15.0+ / 26+) — pinned in `.nvmrc` and `package.json`'s
`engines` field. This is a real requirement, not a suggestion: `jsdom` and `undici` at the
versions this project pins won't run correctly on Node 20 (jsdom's `CacheStorage`/`undici`
internals throw `webidl.util.markAsUncloneable is not a function` on unsupported Node
versions rather than failing gracefully). If you use `nvm`, run `nvm use` before installing.

```bash
npm install
npm run dev       # local dev server
```

## Testing

```bash
npm test                   # unit tests (engine + reducer), vitest
npm run test:e2e           # e2e, real non-headless Chromium window (via Xvfb)
npm run test:e2e:headless  # same suite, fast headless smoke pass
npm run test:e2e:all       # both e2e projects
```

The e2e suite drives a real Chromium binary in a genuinely rendered (non-headless) window
rather than the `--headless` flag, specifically so CSS bugs that only show up with real
layout/paint/compositing (clipped dropdowns, `display:none` vs actually-invisible,
overlapping elements) get caught. See `playwright.config.ts` for why it's wired up this way
in a network-restricted environment, and the note about `@sparticuz/chromium`'s default
launch args if you're reusing this setup elsewhere — its Lambda-oriented defaults
(`--single-process`, a hardcoded `--headless=shell`) silently break both multi-test
reliability and true headed mode unless stripped.

## Building & deploying to GitHub Pages

```bash
npm run build      # outputs to dist/
npm run preview    # sanity-check the production build locally
```

A workflow is included at `.github/workflows/deploy.yml` that builds and deploys `dist/`
to GitHub Pages automatically on every push to `main`. To enable it: **Settings → Pages →
Source → GitHub Actions** on your repo. No further config needed — the Vite base path is
set to a relative `./`, so it works whether the repo is served at the root or a sub-path.

## Project structure

```
src/engine/       pure, tested domain logic (types, forward-fill resolution, validation,
                  CSV import, JSON save/load, flow-diagram layout) - no React here
src/state/        the reducer + React context wiring the engine to the UI, autosave
src/components/   screens and views, grouped by area (items/owners/events/views/issues)
tests/e2e/        Playwright specs
```

## Intentional simplifications

- Ties between two events at the identical timestamp are broken by insertion order -
  deliberately arbitrary but stable, per how this was scoped.
- A box is a persistent identity across events, the same way a person is - it doesn't get
  "re-versioned" when its contents change.
- Validation issues are always flags, never hard blocks, including backward status moves
  (e.g. Removed → Active) - the app trusts you to fix real mistakes rather than refusing
  to save.
