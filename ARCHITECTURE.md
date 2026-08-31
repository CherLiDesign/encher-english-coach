# Encher MVP architecture

## Product boundary

Comprehension and expression remain distinct learning interventions backed by one authenticated learner model. Every learning item keeps a path to the work conversation that produced it. The shell uses three action-based destinations—Home, Practice, and Me. Home owns the highest-frequency capture behavior; Practice organizes learning by outcome through Today, Vocabulary, Understand, and Express.

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
2. Home → immediately save a term or route meeting text into comprehension/expression diagnosis in seconds.
3. Practice → enter the highest-priority review or choose Vocabulary, Understand, or Express.
4. Import → store a private conversation → generate candidates → test contextual understanding → add weak items.
5. Vocabulary/Understand → mix context, meaning, blank, new-context, and speaker-intent exercises → record performance → update mastery.
6. Express → show a real user turn → explain the communication problem → preserve intent → require a new attempt → evaluate and save it. Grammar and, when audio exists, pronunciation appear inside the expression task instead of as disconnected subjects.
7. Me → compare today with the previous baseline → inspect the numeric English skill profile → define a personal 12-week outcome and weekly commitment → track progress through foundation, real-time meetings, and workplace transfer milestones.
8. Future conversations verify whether learned vocabulary and corrected speaking patterns transferred back to work.

### Goal progress and persistence

The Me page is a learner-goal surface, not an app settings or installation screen. The user can edit the outcome statement, start date, weekly practice target, and whether the plan should weight understanding, expression, or both equally. Goal snapshots are stored as `learning_goal` events in the existing account-scoped `practice_sessions` activity store. PostgreSQL row-level security keeps them tied to the authenticated account, so the latest goal loads after sign-in on another device without using browser storage as the source of truth.

The percentage is evidence-based rather than a time-elapsed meter. It combines vocabulary recognition/context/recall, listening readiness, completed practice sessions, review attempts, and verified active use. The chosen priority changes the overall weighting while all three milestone bars remain visible. This event-backed MVP can later be normalized into a dedicated goal table without changing the UI or progress-calculation contract in `app/lib/goal-progress.ts`.

### English readiness profile

`app/lib/english-profile.ts` translates private learning evidence into an understandable ability profile. Workplace vocabulary, contextual understanding, listening recognition, meaning recall, and active use come from the vocabulary mastery dimensions. Clear expression, live-speech grammar, and natural workplace English begin with the current transcript diagnosis and move only when correction attempts add evidence. The displayed previous value reconstructs the state before today’s vocabulary reviews and excludes today’s speaking attempts, so the daily delta reflects actual new activity instead of elapsed time.

Readiness and plan completion are intentionally separate. Readiness estimates current workplace capability on a 0–100 product scale; it is not a TOEFL score. Plan completion measures progress through the 12-week evidence plan. Each ability has its own target, explanation, evidence description, and recommended next action. Pronunciation has a `null` value until audio is available because transcript text cannot support an honest pronunciation score.

### Vocabulary feedback and memory loop

Every practice answer is evaluated as correct, partial, incorrect, or unknown. The result view always teaches the simple meaning, optional Chinese explanation, usage note, collocations, and a workplace example before continuing. Correct answers move from roughly 3 days to 7 days and then to an ease-adjusted interval; partial answers return the next day; incorrect or unknown answers repeat once later in the current session and return the next day. The answer, evaluation, interval, and next review time are stored inside the account-scoped vocabulary record.

Quick-added terms are enriched through a replaceable dictionary provider chain: Encher’s curated workplace-English knowledge base first, then the no-key Free Dictionary API for general single words. Existing pending items are enriched after sign-in. Only the isolated term is eligible for external dictionary lookup; raw transcripts remain separate and private.

Quick Add treats PostgreSQL as the source of truth instead of optimistic in-memory state. The Add input stays unavailable until the authenticated vocabulary snapshot has loaded, eliminating the startup race that could replace a newly added word with an older snapshot. A new word remains in the input until Encher completes two separate operations: write the row, then read the same user-owned row back by ID and verify its term. Failure produces an explicit retry state; success produces a read-back receipt and an entry in Recently Saved. Dictionary enrichment happens only after that durable first write, so an enrichment failure can delay the meaning but cannot remove the original word.

Personal vocabulary always starts empty in memory and is populated only from the authenticated database query. The old three-word launch-readiness sample is excluded from personal vocabulary and is never used as a fallback when a query fails. Home exposes the signed-in email, the actual cloud-read word count, the latest verification time, and a manual verification action. A failed query preserves the error state instead of fabricating a usable vocabulary snapshot.

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
