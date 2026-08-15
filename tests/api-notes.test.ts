import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, test } from "node:test";
import { pathToFileURL } from "node:url";

const originalCwd = process.cwd();
const originalFetch = globalThis.fetch;
const originalToken = process.env.GITHUB_TOKEN;

afterEach(() => {
  process.chdir(originalCwd);
  process.env.GITHUB_TOKEN = originalToken;
  globalThis.fetch = originalFetch;
});

test("POST keeps local save working when GitHub sync fails", async () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), "tasting-notes-"));
  process.chdir(tempDir);
  process.env.GITHUB_TOKEN = "invalid-token";

  globalThis.fetch = async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("api.github.com")) {
      throw new Error("GitHub sync unavailable");
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };

  const routeUrl = pathToFileURL(path.join(originalCwd, "app/api/notes/route.ts")).href + `?test=${Date.now()}`;
  const { POST } = await import(routeUrl);

  const note = {
    id: "test-123",
    category: "whisky",
    date: "2026-08-15",
    place: "테스트 장소",
    people: "진욱",
    type: "싱글몰트",
    name: "테스트 위스키",
    photo: "",
    photoUrl: "",
    labelPhoto: "",
    labelPhotoUrl: "",
    selectedDistillery: null,
    distilleryName: "테스트 증류소",
    regionName: "스코틀랜드",
    teaVariety: "",
    teaLeafPhoto: "",
    teaLeafUrl: "",
    aroma: "오크",
    taste: "달콤함",
    finish: "긴 여운",
    body: 3,
    acidity: 3,
    tannin: 3,
    alcohol: 3,
    sweetness: 3,
    complexity: 3,
    balance: 3,
    notes: "테스트 메모",
    createdAt: "2026-08-15T00:00:00.000Z",
  };

  const response = await POST(
    new Request("http://localhost/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    }),
  );

  assert.equal(response.status, 200);

  const saved = JSON.parse(readFileSync(path.join(tempDir, "data", "tasting-notes.json"), "utf8"));
  assert.equal(Array.isArray(saved), true);
  assert.equal(saved[0].id, "test-123");
  assert.equal(saved[0].name, "테스트 위스키");
});
