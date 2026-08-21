# Encher MVP architecture

## Product boundary

Comprehension and expression remain distinct learning interventions backed by one authenticated learner model. Every learning item keeps a path to the work conversation that produced it. The shell uses four action-based destinations—Home, Add, Practice, and Me. Add owns all capture; Practice organizes learning by outcome through Today, Vocabulary, Understand, and Express.

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
2. Home → see one prioritized next session or jump to Add/Practice.
3. Add → save a term or route meeting text into comprehension/expression diagnosis in seconds.
4. Import → store a private conversation → generate candidates → test contextual understanding → add weak items.
5. Vocabulary/Understand → mix context, meaning, blank, new-context, and speaker-intent exercises → record performance → update mastery.
6. Express → show a real user turn → explain the communication problem → preserve intent → require a new attempt → evaluate and save it. Grammar and, when audio exists, pronunciation appear inside the expression task instead of as disconnected subjects.
7. Future conversations verify whether learned vocabulary and corrected speaking patterns transferred back to work.

### Vocabulary feedback and memory loop

Every practice answer is evaluated as correct, partial, incorrect, or unknown. The result view always teaches the simple meaning, optional Chinese explanation, usage note, collocations, and a workplace example before continuing. Correct answers move from roughly 3 days to 7 days and then to an ease-adjusted interval; partial answers return the next day; incorrect or unknown answers repeat once later in the current session and return the next day. The answer, evaluation, interval, and next review time are stored inside the account-scoped vocabulary record.

Quick-added terms are enriched through a replaceable dictionary provider chain: Encher’s curated workplace-English knowledge base first, then the no-key Free Dictionary API for general single words. Existing pending items are enriched after sign-in. Only the isolated term is eligible for external dictionary lookup; raw transcripts remain separate and private.

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
