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

  if (originalToken === undefined) {
    delete process.env.GITHUB_TOKEN;
  } else {
    process.env.GITHUB_TOKEN = originalToken;
  }
});

test("POST saves a note through the GitHub Contents API", async () => {
  process.chdir(mkdtempSync(path.join(tmpdir(), "tasting-notes-")));
  process.env.GITHUB_TOKEN = "test-token";

  let savedPayload: { content?: string; sha?: string } | undefined;
  globalThis.fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === "PUT") {
      savedPayload = JSON.parse(String(init.body));
      return new Response(JSON.stringify({ content: { sha: "next-sha" } }), { status: 200 });
    }

    return new Response(
      JSON.stringify({ content: Buffer.from("[]", "utf8").toString("base64"), encoding: "base64", sha: "current-sha" }),
      { status: 200 },
    );
  };

  const routeUrl = pathToFileURL(path.join(originalCwd, "app/api/notes/route.ts")).href + `?test=${Date.now()}`;
  const { POST } = await import(routeUrl);
  const note = { id: "test-123", category: "whisky", name: "테스트 위스키" };
  const response = await POST(
    new Request("http://localhost/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    }),
  );

  assert.equal(response.status, 200);
  assert.equal(savedPayload?.sha, "current-sha");
  assert.deepEqual(
    JSON.parse(Buffer.from(savedPayload?.content ?? "", "base64").toString("utf8")),
    [note],
  );
});

test("POST preserves notes when the GitHub file is too large for inline content", async () => {
  process.chdir(mkdtempSync(path.join(tmpdir(), "tasting-notes-large-")));
  process.env.GITHUB_TOKEN = "test-token";

  const existingNote = { id: "existing", category: "wine", name: "기존 기록" };
  let savedPayload: { content?: string; sha?: string } | undefined;
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === "PUT") {
      savedPayload = JSON.parse(String(init.body));
      return new Response(JSON.stringify({ content: { sha: "next-sha" } }), { status: 200 });
    }

    if (String(input) === "https://example.com/tasting-notes.json") {
      return new Response(JSON.stringify([existingNote]), { status: 200 });
    }

    return new Response(
      JSON.stringify({ content: "", encoding: "none", download_url: "https://example.com/tasting-notes.json", sha: "large-file-sha" }),
      { status: 200 },
    );
  };

  const routeUrl = pathToFileURL(path.join(originalCwd, "app/api/notes/route.ts")).href + `?large=${Date.now()}`;
  const { POST } = await import(routeUrl);
  const newNote = { id: "new", category: "tea", name: "새 기록" };
  const response = await POST(
    new Request("http://localhost/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: newNote }),
    }),
  );

  assert.equal(response.status, 200);
  assert.equal(savedPayload?.sha, "large-file-sha");
  assert.deepEqual(
    JSON.parse(Buffer.from(savedPayload?.content ?? "", "base64").toString("utf8")),
    [newNote, existingNote],
  );
});