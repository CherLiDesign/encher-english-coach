# Encher PWA — 20 product iterations

Each round removed friction or strengthened the real-conversation learning loop.

1. Fixed the iPhone authentication layout, overflow, and Safari input zoom.
2. Added the installable PWA shell, manifest, icons, safe areas, and service worker.
3. Reorganized the product into Home, Listen, Speak, and Me.
4. Replaced website navigation with a persistent mobile bottom bar.
5. Reduced Home to one high-impact next step instead of a dashboard.
6. Added a global Quick Capture sheet for words and both transcript types.
7. Made Listen capture-first with a one-line word save and meeting paste.
8. Put a personalized six-minute listening session directly after capture.
9. Preserved multi-dimensional vocabulary mastery instead of known/unknown.
10. Added whole-sentence intention practice for workplace expressions.
11. Made Speak capture-first and isolated the learner's own turns.
12. Prioritized recurring patterns in an English Error Map.
13. Made weekly focus explain impact, frequency, and foundational value.
14. Added the intention-loss comparison: meant, sounded like, clearer version.
15. Required active rewriting, evaluation, and a scheduled three-day retest.
16. Added Me for account, cloud state, progress, plan, installation, and privacy.
17. Added a first-week learner-model onboarding loop for new accounts.
18. Improved mobile tap targets, focus states, input labels, and reduced motion.
19. Exercised the full account, capture, listening, speaking, and persistence flows.
20. Built and verified both production targets, then prepared public deployment.

Audio recording remains visibly planned but disabled in V1. This avoids pretending that text can diagnose pronunciation and keeps the first release focused on reliable learning outcomes.

## Information architecture follow-up

The bottom navigation is now Home / Add / Practice / Me. Capture has one predictable home instead of a floating action plus duplicated mode pages. Practice uses Today / Vocabulary / Understand / Express: this reflects what the learner wants to accomplish, while grammar and pronunciation appear contextually inside expression coaching. Listening and speaking evidence still remain distinct in the learner model.

## Vocabulary learning-loop correction

Vocabulary practice now produces an objective result instead of asking the learner to self-grade. Every answer receives a clear verdict, meaning, Chinese support when available, usage guidance, collocations, and a workplace example. Correct answers expand through 3-day, 7-day, and adaptive intervals; partial answers return tomorrow; missed words repeat later in the same session and return tomorrow. Quick-added terms, including existing pending entries such as “bespoke,” are enriched from the workplace lexicon or a replaceable dictionary provider and tagged when they came from work.

## Typography accessibility pass

The follow-up type pass maps Encher to Material 3 display, headline, title, body, and label roles. Interface labels and supporting text use a 12px minimum, normal body copy uses 14–16px with 20–24px line height, and learning sentences use 18–20px with generous leading. Sizes use `rem` so browser and operating-system text scaling remain effective.

## Me page goal-motivation pass

Me is now a personal 12-week outcome center instead of a mixture of learner progress and app-installation settings. The user can adjust the outcome, plan start, weekly time commitment, and whether understanding or expression should receive more weight. The main percentage and three phase bars respond to learning evidence—review answers, mastery dimensions, completed practice, and verified active use—while the account quietly syncs the goal across devices. Installation and app-development language were removed from the page so its first job is motivation and direction.

## English composition and comparison pass

Me now works like a professional capability report: it shows current workplace readiness, the 12-week target, and a “since yesterday” comparison before exposing deeper detail. A six-part skill map makes the learner’s strongest and weakest language “muscles” visible, while expandable composition rows explain every value, its evidence, its target, and the next action that can move it. Vocabulary changes are reconstructed from today’s account-backed review history and speaking changes come from today’s active correction attempts. Readiness remains distinct from plan completion, and pronunciation is deliberately marked “Not measured” until audio creates defensible evidence.

## Account-memory reliability pass

Quick Add no longer says “saved” based on temporary page state. It waits for the account database to return the written row, preserves the typed word when saving fails, and exposes a clear Retry action. Adding is briefly locked while the account vocabulary loads, preventing the initial cloud snapshot from overwriting a newly entered word. Recently Saved provides a visible receipt, duplicate terms are recognized, and dictionary enrichment begins only after the original word is durably stored.

## Verifiable memory pass

The three launch-readiness demo words are no longer initialized, auto-written, or displayed as personal vocabulary. An account starts with only the records actually read from its private database; a failed read shows a blocking error instead of sample data. Every vocabulary write is followed by a separate account-scoped read-back, and the Add screen now shows the signed-in email, verified personal-word count, verification time, and a manual Verify now action. The empty vocabulary page explicitly distinguishes real personal memory from examples.
