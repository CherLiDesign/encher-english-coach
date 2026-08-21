import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("uses the action-based four-tab app architecture", async () => {
  const app = await read("app/components/CoachApp.tsx");
  for (const tab of ["Home", "Add", "Practice", "Me"]) assert.match(app, new RegExp(`label: "${tab}"`));
  assert.doesNotMatch(app, /label: "Listen"/);
  assert.doesNotMatch(app, /label: "Speak"/);
  assert.match(app, /function AddPage/);
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
  assert.match(app, /adding meaning and examples/);
  assert.match(app, /enrichVocabularyItem\(newItem\)/);
  assert.match(dictionary, /Free Dictionary API/);
  assert.match(dictionary, /api\.dictionaryapi\.dev\/api\/v2\/entries\/en/);
  assert.match(dictionary, /From work/);
  assert.match(dictionary, /Example supplied/);
  assert.doesNotMatch(app, /definition: "Pending enrichment"/);
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
  assert.match(serviceWorker, /encher-shell-v2/);
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
