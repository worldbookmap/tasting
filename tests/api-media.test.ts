import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, test } from "node:test";
import { pathToFileURL } from "node:url";

const originalCwd = process.cwd();
const originalFetch = globalThis.fetch;
const originalToken = process.env.GITHUB_TOKEN;

afterEach(() => {
  process.chdir(originalCwd);
  globalThis.fetch = originalFetch;

  if (originalToken === undefined) delete process.env.GITHUB_TOKEN;
  else process.env.GITHUB_TOKEN = originalToken;
});

test("POST uploads an image to the GitHub media folder and returns a raw URL", async () => {
  process.chdir(mkdtempSync(path.join(tmpdir(), "tasting-media-")));
  process.env.GITHUB_TOKEN = "test-token";

  let savedPayload: { path?: string; content?: string; branch?: string } | undefined;
  globalThis.fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
    savedPayload = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ content: { path: savedPayload?.path } }), { status: 201 });
  };

  const routeUrl = pathToFileURL(path.join(originalCwd, "app/api/media/route.ts")).href + `?test=${Date.now()}`;
  const { POST } = await import(routeUrl);
  const response = await POST(
    new Request("http://localhost/api/media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteId: "note-123", field: "photo", dataUrl: "data:image/jpeg;base64,aGVsbG8=" }),
    }),
  );

  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(savedPayload?.branch, "main");
  assert.equal(Buffer.from(savedPayload?.content ?? "", "base64").toString("utf8"), "hello");
  assert.equal(result.ok, true);
  assert.match(result.url, /^https:\/\/raw\.githubusercontent\.com\/worldbookmap\/tasting\/main\/data\/images\/note-123\/photo-/);
});

test("POST rejects media uploads without a GitHub token", async () => {
  process.chdir(mkdtempSync(path.join(tmpdir(), "tasting-media-no-token-")));
  delete process.env.GITHUB_TOKEN;

  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    return new Response("unexpected", { status: 500 });
  };

  const routeUrl = pathToFileURL(path.join(originalCwd, "app/api/media/route.ts")).href + `?no-token=${Date.now()}`;
  const { POST } = await import(routeUrl);
  const response = await POST(
    new Request("http://localhost/api/media", {
      method: "POST",
      body: JSON.stringify({ noteId: "note-123", field: "photo", dataUrl: "data:image/jpeg;base64,aGVsbG8=" }),
    }),
  );

  assert.equal(response.status, 503);
  assert.equal(fetchCalled, false);
});
