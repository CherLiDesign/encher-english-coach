import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("opens on a capture-first home with three primary tabs", async () => {
  const app = await read("app/components/CoachApp.tsx");
  for (const tab of ["Home", "Practice", "Me"]) assert.match(app, new RegExp(`label: "${tab}"`));
  assert.doesNotMatch(app, /label: "Add"/);
  assert.doesNotMatch(app, /label: "Listen"/);
  assert.doesNotMatch(app, /label: "Speak"/);
  assert.match(app, /useState<View>\("home"\)/);
  assert.match(app, /view === "home" && <HomePage/);
  assert.match(app, /function HomePage/);
  assert.match(app, /Add a word\./);
  assert.match(app, /QUICK WORD OR PHRASE/);
  assert.match(app, /function PracticeHub/);
  assert.match(app, /view === "today"/);
  assert.match(app, /TodayListening/);
  assert.match(app, /SpeakingPractice/);
});

test("organizes practice around communication outcomes", async () => {
  const app = await read("app/components/CoachApp.tsx");
  for (const lane of ["Today", "Vocabulary", "Understand", "Express"]) assert.match(app, new RegExp(`label: "${lane}"`));
  assert.match(app, /Choose an outcome, not a school subject/);
  assert.match(app, /Pronunciation joins Express when audio arrives in V2/);
  assert.doesNotMatch(app, /label: "Grammar"/);
  assert.doesNotMatch(app, /label: "Pronunciation"/);
});

test("implements the real-conversation listening loop", async () => {
  const [app, mockAi] = await Promise.all([
    read("app/components/CoachApp.tsx"),
    read("app/lib/mock-ai.ts"),
  ]);
  assert.match(app, /Add it before you forget it/);
  assert.match(app, /Meeting transcript/);
  assert.match(app, /Vocabulary check/);
  assert.match(app, /Context recall/);
  assert.match(app, /Meaning recall/);
  assert.match(app, /Fill in the blank/);
  assert.match(app, /New workplace context/);
  assert.match(mockAi, /Launch Readiness Sync/);
});

test("gives explicit answer feedback, meaning, usage, and an adaptive next review", async () => {
  const [app, scheduler, dictionary, types] = await Promise.all([
    read("app/components/CoachApp.tsx"),
    read("app/lib/spaced-repetition.ts"),
    read("app/lib/dictionary.ts"),
    read("app/lib/types.ts"),
  ]);
  for (const verdict of ["Correct", "Partly correct", "Not quite", "Not known yet"]) assert.match(app, new RegExp(verdict));
  assert.match(app, /CLEAR MEANING/);
  assert.match(app, /How to use it/);
  assert.match(app, /WORKPLACE EXAMPLE/);
  assert.match(app, /NEXT REVIEW/);
  assert.match(scheduler, /Again in this session/);
  assert.match(scheduler, /repetitions === 0 \? 3 : repetitions === 1 \? 7/);
  assert.match(scheduler, /history: \[attempt, \.\.\.current\.history\]/);
  assert.match(types, /nextReviewAt: string/);
  assert.match(dictionary, /bespoke/);
  assert.doesNotMatch(app, /How well did you understand it/);
});

test("enriches quick-added words and preserves work-source provenance", async () => {
  const [app, dictionary] = await Promise.all([
    read("app/components/CoachApp.tsx"),
    read("app/lib/dictionary.ts"),
  ]);
  assert.match(app, /Saved · adding meaning/);
  assert.match(app, /enrichVocabularyItem\(newItem\)/);
  assert.match(dictionary, /Free Dictionary API/);
  assert.match(dictionary, /api\.dictionaryapi\.dev\/api\/v2\/entries\/en/);
  assert.match(dictionary, /From work/);
  assert.match(dictionary, /Example supplied/);
  assert.doesNotMatch(app, /definition: "Pending enrichment"/);
});

test("confirms quick-word persistence before claiming a save", async () => {
  const app = await read("app/components/CoachApp.tsx");
  assert.match(app, /error: writeError[\s\S]*?\.upsert\(/);
  assert.match(app, /data: readBack[\s\S]*?\.select\("item_data"\)[\s\S]*?\.eq\("user_id", user\.id\)[\s\S]*?\.eq\("id", item\.id\)[\s\S]*?\.single\(\)/);
  assert.match(app, /const confirmedItem = await saveVocabulary\(newItem, true\)/);
  assert.match(app, /if \(!confirmedItem\)[\s\S]*?setQuickSaveState\("error"\)/);
  assert.match(app, /Your text is still here—tap Retry/);
  assert.match(app, /disabled=\{saving \|\| !memoryReady\}/);
  assert.match(app, /Your Word Library/);
  assert.match(app, /Saved and read back/);
  assert.match(app, /Verify now/);
  assert.match(app, /personal.*words.*verified/);
  assert.match(app, /already in your account/);
  assert.doesNotMatch(app, /Saved here; cloud sync needs attention/);
});

test("turns every quick add into an immediate study card and keeps practice answers hidden", async () => {
  const [app, dictionary] = await Promise.all([
    read("app/components/CoachApp.tsx"),
    read("app/lib/dictionary.ts"),
  ]);
  assert.match(app, /function QuickLearnCard/);
  for (const label of ["JUST ADDED · STUDY MODE", "MEANING", "HOW TO USE IT", "WORKPLACE EXAMPLE", "Open full entry"]) assert.match(app, new RegExp(label));
  assert.match(app, /Study mode · answers visible/);
  assert.match(app, /PRACTICE MODE · ANSWERS HIDDEN/);
  assert.match(app, /Search your words and phrases/);
  assert.match(app, /lastSavedItem/);
  assert.match(app, /showing its meaning/);
  assert.match(app, /speechSynthesis/);
  assert.match(app, /\{!revealed \? /);
  assert.match(app, /item\.enrichmentStatus === "unavailable"/);
  for (const term of ["cordoned off", "criteria", "occasional"]) assert.match(dictionary, new RegExp(term));
});

test("never presents system samples as personal account memory", async () => {
  const app = await read("app/components/CoachApp.tsx");
  assert.match(app, /useState<VocabularyItem\[\]>\(\[\]\)/);
  assert.match(app, /filter\(\(item\) => !isLegacyDemoItem\(item\)\)/);
  assert.match(app, /Your personal words are not replaced with samples/);
  assert.match(app, /Example words are never shown as your memory/);
  assert.doesNotMatch(app, /setVocabulary\(seeded\)/);
  assert.doesNotMatch(app, /const seeded = seedVocabulary/);
});

test("deduplicates vocabulary by normalized term without discarding learning evidence", async () => {
  const app = await read("app/components/CoachApp.tsx");
  assert.match(app, /function vocabularyTermKey/);
  assert.match(app, /replace\(\/\\s\+\/g, " "\)\.toLocaleLowerCase\("en-US"\)/);
  assert.match(app, /function mergeVocabularyItems/);
  assert.match(app, /function dedupeVocabularyItems/);
  assert.match(app, /const loaded = dedupeVocabularyItems/);
  assert.match(app, /const uniqueItems = useMemo\(\(\) => dedupeVocabularyItems\(items\), \[items\]\)/);
  assert.match(app, /sameVocabularyTerm\(item\.term, term\)/);
  assert.match(app, /id: `quick-\$\{encodeURIComponent\(vocabularyTermKey\(normalizedTerm\)\)\}`/);
  assert.match(app, /review: \{ \.\.\.preferredReview, history: reviewHistory \}/);
  assert.doesNotMatch(app, /\$\{Date\.now\(\)\}/);
});

test("implements the professional speaking diagnosis and active correction loop", async () => {
  const app = await read("app/components/CoachApp.tsx");
  assert.match(app, /My English Error Map/);
  assert.match(app, /WHAT YOU MEANT/);
  assert.match(app, /WHAT YOUR ENGLISH SOUNDED LIKE/);
  assert.match(app, /Evaluate my new version/);
  assert.match(app, /Scheduled to retest this skill in 3 days/);
  assert.match(app, /Pronunciation requires audio and is reserved for V2/);
});

test("requires an account and scopes cloud memory to its owner", async () => {
  const [auth, app, migration] = await Promise.all([
    read("app/components/AuthGate.tsx"),
    read("app/components/CoachApp.tsx"),
    read("supabase/migrations/20260821070000_user_memory.sql"),
  ]);
  assert.match(auth, /signInWithPassword/);
  assert.match(auth, /signUp/);
  assert.match(app, /user_id: user\.id/);
  assert.match(migration, /enable row level security/g);
  assert.match(migration, /auth\.uid\(\)/);
  assert.match(migration, /revoke all .* from anon/i);
});

test("turns Me into an editable account-backed 12-week goal tracker", async () => {
  const [app, progress, types] = await Promise.all([
    read("app/components/CoachApp.tsx"),
    read("app/lib/goal-progress.ts"),
    read("app/lib/types.ts"),
  ]);
  assert.match(app, /YOUR 12-WEEK GOAL/);
  assert.match(app, /Adjust goal/);
  assert.match(app, /Weekly practice target/);
  assert.match(app, /Main priority/);
  assert.match(app, /Your 3 milestones/);
  assert.match(app, /kind: "learning_goal"/);
  assert.match(app, /saved to your account/);
  assert.doesNotMatch(app, /Installed on this device/);
  assert.doesNotMatch(app, /Install Encher on your phone/);
  assert.match(progress, /dimensionAverage/);
  assert.match(progress, /workTransfers/);
  assert.match(progress, /progressWeights/);
  assert.match(progress, /completedSessions/);
  assert.match(types, /export type LearningGoal/);
});

test("visualizes an evidence-based English ability profile and daily change", async () => {
  const [app, profile] = await Promise.all([
    read("app/components/CoachApp.tsx"),
    read("app/lib/english-profile.ts"),
  ]);
  for (const label of ["CURRENT ENGLISH READINESS", "SINCE YESTERDAY", "YOUR ENGLISH SKILL MAP", "ENGLISH COMPOSITION"]) assert.match(app, new RegExp(label));
  for (const ability of ["Workplace Vocabulary", "Context Understanding", "Listening Recognition", "Meaning Recall", "Active Use", "Clear Expression", "Grammar in Live Speech", "Natural Workplace English", "Pronunciation"]) assert.match(profile, new RegExp(ability));
  assert.match(app, /Not measured/);
  assert.match(app, /Audio required in V2/);
  assert.match(app, /This is not a TOEFL score/);
  assert.match(profile, /wordsStrengthenedToday/);
  assert.match(profile, /previousDimension/);
  assert.match(profile, /practiceEvidence/);
  assert.match(profile, /value,\n\s+previous/);
  assert.match(profile, /"pronunciation",\n\s+"Pronunciation",\n\s+"Pronunciation",\n\s+null,\n\s+null/);
});

test("is installable as a standalone PWA", async () => {
  const [manifestText, serviceWorker, entry] = await Promise.all([
    read("public/manifest.webmanifest"),
    read("public/sw.js"),
    read("index.html"),
  ]);
  const manifest = JSON.parse(manifestText);
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.short_name, "Encher");
  assert.ok(manifest.icons.some((icon) => icon.sizes === "192x192"));
  assert.ok(manifest.icons.some((icon) => icon.sizes === "512x512"));
  assert.match(serviceWorker, /encher-shell-v6/);
  assert.match(entry, /apple-mobile-web-app-capable/);
  await access(new URL("public/icon-192.png", root));
  await access(new URL("public/icon-512.png", root));
});

test("uses a Material 3-inspired readable type scale", async () => {
  const css = await read("app/globals.css");
  assert.match(css, /--type-body-large:\s*1rem/);
  assert.match(css, /--type-body-medium:\s*\.875rem/);
  assert.match(css, /--type-body-small:\s*\.75rem/);
  assert.match(css, /--type-label-large:\s*\.875rem/);
  assert.match(css, /Learning content never drops below 12px/);
  assert.match(css, /\.app-v2 p \{ font-size:var\(--type-body-medium\); line-height:1\.25rem; \}/);
  assert.match(css, /\.app-v2 \.practice-card \.quote/);
});

test("produces a deployable GitHub Pages bundle", async () => {
  await access(new URL("docs/index.html", root));
  const html = await read("docs/index.html");
  assert.match(html, /<div id="root"><\/div>/);
  assert.match(html, /encher-english-coach\/assets\//);
});
