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

test("POST saves custom tags by category and field through GitHub", async () => {
  process.chdir(mkdtempSync(path.join(tmpdir(), "tasting-tags-")));
  process.env.GITHUB_TOKEN = "test-token";

  let savedPayload: { content?: string; sha?: string } | undefined;
  globalThis.fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === "PUT") {
      savedPayload = JSON.parse(String(init.body));
      return new Response(JSON.stringify({ content: { sha: "next-sha" } }), { status: 200 });
    }

    return new Response("Not Found", { status: 404 });
  };

  const routeUrl = pathToFileURL(path.join(originalCwd, "app/api/tags/route.ts")).href + `?test=${Date.now()}`;
  const { POST } = await import(routeUrl);
  const response = await POST(
    new Request("http://localhost/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: "whisky", field: "aroma", tags: ["솔잎", "해풍", "솔잎"] }),
    }),
  );

  assert.equal(response.status, 200);
  assert.equal(savedPayload?.sha, undefined);
  const saved = JSON.parse(Buffer.from(savedPayload?.content ?? "", "base64").toString("utf8"));
  assert.deepEqual(saved.whisky.aroma, ["솔잎", "해풍"]);
  assert.deepEqual(saved.whisky.taste, []);
});