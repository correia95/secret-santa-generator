# Secret Santa Generator

Generate Secret Santa pairings from a list of names, with optional
exclusion pairs for people who shouldn't draw each other (like
couples), revealed one person at a time.

- Random derangement (no self-matches) via a seeded shuffle, retried
  automatically until any exclusion pairs are respected
- Deterministic per seed, so an organizer link reloads the exact same
  draw later
- Reveal-one-at-a-time flow: pick your name, see your match, hide it
  before passing the device to the next person
- Nothing is emailed or messaged automatically — the organizer tells
  each person their match however they choose
- Organizer link is a real state-restoring snapshot (it's the
  organizer's own private reference, not something to share with
  participants — the UI says so explicitly)

## Develop

```
npm install
npm run dev
npm run build      # tsc --noEmit && vite build
node --experimental-strip-types --test src/santa.test.mjs
```

The engine (`generateAssignment`, `isValidAssignment`) is in
`src/santa.ts`. 14 Node tests in `src/santa.test.mjs`, including
property-based checks across 30 seeds (no self-matches, exclusions
respected) and two infeasible-constraint edge cases.

## Deploy

Static assets on Cloudflare Workers (`wrangler.jsonc`). Live at
<https://secret-santa-generator.correia95.workers.dev/>.
