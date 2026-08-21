import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("uses the four-tab app architecture while keeping Listen and Speak separate", async () => {
  const app = await read("app/components/CoachApp.tsx");
  for (const tab of ["Home", "Listen", "Speak", "Me"]) assert.match(app, new RegExp(`label: "${tab}"`));
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
  assert.match(app, /Add it before you forget it/);
  assert.match(app, /Paste meeting transcript/);
  assert.match(app, /Vocabulary check/);
  assert.match(app, /Context recall/);
  assert.match(app, /Meaning recall/);
  assert.match(app, /Fill in the blank/);
  assert.match(app, /New workplace context/);
  assert.match(mockAi, /Launch Readiness Sync/);
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

test("produces a deployable GitHub Pages bundle", async () => {
  await access(new URL("docs/index.html", root));
  const html = await read("docs/index.html");
  assert.match(html, /<div id="root"><\/div>/);
  assert.match(html, /encher-english-coach\/assets\//);
});
