import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("keeps listening and speaking as separate primary experiences", async () => {
  const app = await read("app/components/CoachApp.tsx");
  assert.match(app, /Practice Listening/);
  assert.match(app, /Practice Speaking/);
  assert.match(app, /view === "today"/);
  assert.match(app, /view === "speaking"/);
  assert.match(app, /TodayListening/);
  assert.match(app, /SpeakingPractice/);
});

test("implements the real-conversation listening loop", async () => {
  const [app, mockAi] = await Promise.all([
    read("app/components/CoachApp.tsx"),
    read("app/lib/mock-ai.ts"),
  ]);
  assert.match(app, /Quick Add Word/);
  assert.match(app, /Import a conversation/);
  assert.match(app, /Vocabulary check/);
  assert.match(app, /Context recall/);
  assert.match(app, /Meaning recall/);
  assert.match(app, /Fill in the blank/);
  assert.match(app, /New workplace context/);
  assert.match(mockAi, /Launch Readiness Sync/);
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

test("produces a deployable GitHub Pages bundle", async () => {
  await access(new URL("docs/index.html", root));
  const html = await read("docs/index.html");
  assert.match(html, /<div id="root"><\/div>/);
  assert.match(html, /encher-english-coach\/assets\//);
});
