# Encher — Personal AI English Coach

Encher turns real workplace conversations into personalized listening and speaking practice. This repository contains an installable, responsive PWA with account-based cloud memory, a functional Listening vertical slice, and an active Speaking correction loop.

## Included in the MVP

- App-like Home / Listen / Speak / Me navigation
- Global Quick Capture plus capture-first Listen and Speak pages
- Installable PWA for iPhone and desktop
- Separate Listening and Speaking learning experiences
- Quick Add Word with cloud persistence
- Transcript import and candidate detection
- Contextual vocabulary checks
- Dimension-level vocabulary mastery
- Today’s Listening spaced-review flow
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
