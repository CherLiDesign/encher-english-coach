# Encher — Personal AI English Coach

Encher turns real workplace conversations into personalized comprehension and expression practice. This repository contains an installable, responsive PWA with account-based cloud memory, a functional vocabulary/understanding vertical slice, and an active expression correction loop.

## Included in the MVP

- App-like Home / Add / Practice / Me navigation
- One dedicated Add destination for quick words and meeting text
- Installable PWA for iPhone and desktop
- Practice tabs organized by outcome: Today / Vocabulary / Understand / Express
- Quick Add Word with cloud persistence
- Automatic dictionary enrichment with simple meaning, usage, collocations, and examples
- Transcript import and candidate detection
- Contextual vocabulary checks
- Dimension-level vocabulary mastery
- Today’s Listening spaced-review flow
- Explicit correct/partial/incorrect feedback and an account-backed adaptive review calendar
- Account/password sign-in with per-user cloud memory
- Functional speaking correction and active reproduction
- Clear text-versus-audio capability boundary; recording is intentionally V2
- A 12-week improvement roadmap and weekly focus system
- Responsive mobile and desktop UI

## Run locally

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Then open `http://localhost:3000`.

Add your Supabase project URL and publishable key to `.env.local`. Apply the SQL migration in `supabase/migrations/` before signing in.

See `ARCHITECTURE.md` for the architecture, data model, privacy boundary, provider abstractions, and main user flows. `PRODUCT_ITERATIONS.md` records the 20 product-design iterations behind this release.
