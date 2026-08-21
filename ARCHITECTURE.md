# Encher MVP architecture

## Product boundary

Listening and Speaking are separate product surfaces backed by one authenticated learner model. Every learning item keeps a path to the work conversation that produced it. The shell uses four stable destinations—Home, Listen, Speak, and Me—plus a global capture action, so navigation stays app-like on a phone.

## Runtime and folders

- `app/components/`: account gate and interactive product experiences.
- `app/lib/`: domain contracts, seeded learning evidence, provider-independent mock AI, cloud client, and 12-week plan content.
- `supabase/migrations/`: PostgreSQL tables, row-level access policies, grants, indexes, and account profile trigger.
- `db/schema.ts`: the scalable full domain model for future server implementation.
- `tests/`: product-boundary, privacy, learning-loop, and deployment checks.
- `docs/`: GitHub Pages production bundle.
- `public/`: PWA manifest, service worker, install icons, and social preview.

The MVP uses React, TypeScript, Vinext/Vite, Tailwind CSS, Supabase Auth, and PostgreSQL. Browser code receives only a publishable Supabase key. AI provider secrets must remain in server-side adapters.

## Main user flows

1. Sign in → load only the authenticated user’s vocabulary and history.
2. Home → see one prioritized next session, bring in today’s work, or enter Listen/Speak separately.
3. Global Quick Capture → save a term or route a transcript into Listening/Speaking in seconds.
4. Import → store a private conversation → generate candidates → test contextual understanding → add weak items.
5. Today’s Listening → mix context, meaning, blank, and new-context exercises → record performance → update mastery.
6. Speaking → show a real user turn → explain the communication problem → preserve intent → require a new attempt → evaluate and save it.
7. Future conversations verify whether learned vocabulary and corrected speaking patterns transferred back to work.

## PWA boundary

The GitHub Pages and private-site builds share the same application source. A standalone manifest, safe-area-aware bottom navigation, install icons, and scope-aware service worker make the public version installable. The service worker uses network-first caching so private, changing learner data is not treated as a static offline source of truth.

## Database model

The production migration currently persists `profiles`, `vocabulary_items`, `conversations`, and `practice_sessions`. The full normalized design in `db/schema.ts` covers User, Conversation, Transcript, TranscriptSegment, Speaker, VocabularyCandidate, VocabularyItem, VocabularyAttempt, VocabularyMastery, SpeakingIssue, ErrorPattern, SpeakingAttempt, PronunciationIssue, PracticeSession, ReviewSchedule, and WeeklyFocus.

## Privacy boundary

- Authentication is required before personal learning data loads.
- PostgreSQL row-level security scopes every query to `auth.uid()`.
- Anonymous access is revoked from personal tables.
- Raw conversations are stored separately from derived practice results.
- Conversation deletion is designed to remove its raw transcript and audio object while derived learning data can be separately retained or deleted.
- No service-role key or AI provider secret belongs in client code.

## Replaceable AI services

Server adapters should implement transcript analysis, vocabulary candidate detection, semantic answer evaluation, speaking analysis, audio transcription, pronunciation analysis, exercise generation, and spaced repetition scheduling. The current mock keeps the UI usable without pretending that text can measure pronunciation.
