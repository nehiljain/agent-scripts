import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

// These tests run vtd.js against real YouTube videos, so they need network access.
const vtd = fileURLToPath(new URL("./vtd.js", import.meta.url));

// English captions only. Its first entries are "[music]" at 1.309s and
// "&gt;&gt; Yes, so hi everyone. My name is Philip." at 12.56s.
const englishOnly = "https://www.youtube.com/watch?v=0vphxNt4wyk";
// Caption tracks in order: bn, en, fr-FR, de-DE, ... (no plain "fr").
const multiLanguage = "https://www.youtube.com/watch?v=kwSVtQ7dziU";

function transcript(...args) {
  const r = spawnSync(process.execPath, [vtd, "transcript", ...args], {
    encoding: "utf8",
    timeout: 90_000,
  });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout;
}

test("--timestamps reads caption offsets as seconds", () => {
  const lines = transcript("--url", englishOnly, "--timestamps").split("\n");
  assert.ok(lines.includes("[0:12] >> Yes, so hi everyone. My name is Philip."), lines.slice(0, 3).join("\n"));
  assert.ok(lines.includes("[15:01] we can run our skill against the evals"));
});

test("transcript fetches the requested language, not the first caption track", () => {
  const text = transcript("--url", multiLanguage);
  assert.ok(text.startsWith("Code's not even the right verb anymore,"), text.slice(0, 80));
});

test("--lang with a base language code matches a regional caption track", () => {
  const text = transcript("--url", multiLanguage, "--lang", "fr");
  assert.ok(text.startsWith("Coder n'est même plus le bon verbe,"), text.slice(0, 80));
});

test("--timestamps drops bracketed cues unless --keep-brackets", () => {
  const stripped = transcript("--url", englishOnly, "--timestamps").split("\n");
  assert.equal(stripped[0], "[0:12] >> Yes, so hi everyone. My name is Philip.");
  assert.ok(!stripped.some((l) => /\[music\]/i.test(l)));

  const kept = transcript("--url", englishOnly, "--timestamps", "--keep-brackets").split("\n");
  assert.equal(kept[0], "[0:01] [music]");
});
