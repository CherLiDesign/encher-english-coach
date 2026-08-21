# Encher MVP architecture

Listening and Speaking are separate product surfaces backed by one learner model. Source conversations remain linked to derived vocabulary and speaking issues so every coaching item can answer “where did this come from?”

## Runtime shape

- `app/components/CoachApp.tsx`: interactive MVP.
- `app/lib/mock-ai.ts`: replaceable transcript-analysis and semantic-evaluation mock.
- `app/lib/types.ts`: product domain contracts.
- `db/schema.ts`: relational model for source data, learning data, attempts, mastery, scheduling, and weekly focus.
- D1 stores relational records; R2 stores future audio.

## Service boundaries

Transcript analysis, vocabulary detection, semantic evaluation, speaking analysis, transcription, pronunciation analysis, exercise generation, and spaced-review scheduling are provider-independent server interfaces. Secrets and raw workplace material never belong in client code.

## Main flows

1. Home → Listening or Speaking.
2. Quick Add → save the term immediately → enrich asynchronously.
3. Import → private Conversation and Transcript → candidates → contextual check → semantic evaluation → add weak items.
4. Today’s Listening → select due mastery dimensions → active exercise → update mastery → schedule review.
5. Speaking → isolate user turns → cluster recurring issues → select weekly top two → correction and reproduction loop.

## Privacy

Every persisted record is scoped to its authenticated owner. Raw transcripts and audio remain separate from derived learning records. Conversation deletion cascades raw segments and audio objects; derived items can be deleted or retained only after source links are severed and identifying context is removed.
