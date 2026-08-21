# Encher MVP architecture

## Product boundary

Listening and Speaking are separate product surfaces backed by one learner model. Source conversations remain linked to derived vocabulary and speaking issues so every coaching item can answer “where did this come from?”

## Runtime shape

- `app/components/CoachApp.tsx`: current interactive MVP and client-side demo state.
- `app/lib/mock-ai.ts`: replaceable mock implementation for transcript analysis and semantic evaluation.
- `app/lib/types.ts`: product-facing domain contracts.
- `db/schema.ts`: normalized relational model for persistent accounts, source data, derived learning data, attempts, mastery, scheduling, and weekly focus.
- D1 (`DB`): relational data and ownership-scoped records.
- R2 (`AUDIO`): future meeting and practice audio; D1 stores ownership and object metadata.
- Server routes/services (next iteration): authentication and authorization boundary, AI orchestration, deletion workflows, and persistence.

## Planned service interfaces

```ts
interface TranscriptAnalyzer { analyze(conversationId: string): Promise<TranscriptAnalysis> }
interface VocabularyDetector { detect(segments: TranscriptSegment[], learner: LearnerModel): Promise<Candidate[]> }
interface SemanticEvaluator { evaluate(prompt: ContextPrompt, answer: Answer): Promise<SemanticResult> }
interface SpeakingAnalyzer { analyze(userTurns: TranscriptSegment[], context: TranscriptSegment[]): Promise<SpeakingIssue[]> }
interface AudioTranscriber { transcribe(objectKey: string): Promise<Transcript> }
interface PronunciationAnalyzer { analyze(audioKey: string, expectedText: string): Promise<PronunciationIssue[]> }
interface ExerciseGenerator { generate(input: LearningNeed[], constraints: SessionPlan): Promise<Exercise[]> }
interface ReviewScheduler { schedule(performance: Performance, history: ReviewHistory): Promise<ReviewSchedule> }
```

Provider adapters implement these interfaces; product code never calls an AI vendor from the browser. Secrets remain server-only.

## Main flows

1. Home → Listening or Speaking. The modes never collapse into one generic practice route.
2. Quick Add → save only the unfamiliar term immediately → enrich asynchronously when context becomes available.
3. Import → create private Conversation and Transcript → segment speakers → generate personalized candidates → contextual knowledge check → semantic evaluation → add weak items to Vocabulary.
4. Today’s Listening → scheduler selects due dimensions → varied active exercise → record attempt → update dimension-level mastery → schedule next review.
5. Vocabulary → inspect meaning, origin, reason, mastery dimensions, and review history.
6. Speaking (Phase 2) → identify user speaker → analyze only user turns while retaining coworker context → cluster issues into Error Patterns → select weekly top two → correction and reproduction loop.

## Privacy and deletion

All tables carry ownership directly or through an owned parent. Every server query must include the authenticated user ID. Raw transcripts/audio are separate from derived learning records. Conversation deletion cascades raw transcript segments and removes the R2 audio object; derived items may either be deleted or retained after explicitly severing/redacting the source link according to the user’s choice. No provider key or raw transcript belongs in client code or logs.

## MVP status

The present build intentionally uses realistic in-memory seeded data so the full Listening interaction can be tried without credentials. The schema and provider boundaries are ready for server persistence. Production auth and live AI calls are the next infrastructure step; the UI does not claim that mock analysis is a live model.
