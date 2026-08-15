import { NextResponse } from "next/server.js";
import { promises as fs } from "node:fs";
import path from "node:path";

const repo = process.env.GITHUB_REPO ?? "worldbookmap/tasting";
const token = process.env.GITHUB_TOKEN ?? "";
const githubPath = "data/custom-tags.json";
const dataPath = path.join(process.cwd(), githubPath);
const githubApi = `https://api.github.com/repos/${repo}/contents/${githubPath}`;
const githubHeaders = {
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
};

const categories = ["whisky", "wine", "tea"] as const;
const fields = ["aroma", "taste", "finish"] as const;
type Category = (typeof categories)[number];
type TagField = (typeof fields)[number];
type CustomTags = Record<Category, Record<TagField, string[]>>;

const createEmptyTags = (): CustomTags => ({
  whisky: { aroma: [], taste: [], finish: [] },
  wine: { aroma: [], taste: [], finish: [] },
  tea: { aroma: [], taste: [], finish: [] },
});

const normalizeTags = (value: unknown): CustomTags => {
  const normalized = createEmptyTags();
  if (!value || typeof value !== "object") return normalized;

  for (const category of categories) {
    for (const field of fields) {
      const tags = (value as Partial<CustomTags>)[category]?.[field];
      if (Array.isArray(tags)) {
        normalized[category][field] = Array.from(new Set(tags.filter((tag): tag is string => typeof tag === "string" && Boolean(tag.trim())).map((tag) => tag.trim())));
      }
    }
  }

  return normalized;
};

async function readLocalTags() {
  try {
    const raw = await fs.readFile(dataPath, "utf8");
    return { tags: normalizeTags(JSON.parse(raw || "{}")), sha: undefined };
  } catch {
    const tags = createEmptyTags();
    await fs.mkdir(path.dirname(dataPath), { recursive: true });
    await fs.writeFile(dataPath, JSON.stringify(tags, null, 2), "utf8");
    return { tags, sha: undefined };
  }
}

async function readGitHubTags() {
  const response = await fetch(githubApi, { headers: githubHeaders, cache: "no-store" });
  if (response.status === 404) return { tags: createEmptyTags(), sha: undefined };
  if (!response.ok) throw new Error(`GitHub에서 사용자 태그를 불러오지 못했습니다. (${response.status})`);

  const fileData = await response.json();
  const raw = Buffer.from(fileData.content ?? "", "base64").toString("utf8");
  return { tags: normalizeTags(JSON.parse(raw || "{}")), sha: fileData.sha as string | undefined };
}

async function writeTags(tags: CustomTags, sha?: string) {
  const content = JSON.stringify(tags, null, 2);

  if (!token) {
    await fs.mkdir(path.dirname(dataPath), { recursive: true });
    await fs.writeFile(dataPath, content, "utf8");
    return;
  }

  const response = await fetch(githubApi, {
    method: "PUT",
    headers: { ...githubHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "Update custom tasting tags",
      content: Buffer.from(content, "utf8").toString("base64"),
      sha,
    }),
  });

  if (!response.ok) throw new Error(`GitHub에 사용자 태그를 저장하지 못했습니다. (${response.status})`);
}

const readTags = () => (token ? readGitHubTags() : readLocalTags());

export async function GET() {
  try {
    const { tags } = await readTags();
    return NextResponse.json(tags);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const category = body?.category as Category;
    const field = body?.field as TagField;
    const incoming: unknown[] = Array.isArray(body?.tags) ? body.tags : [];

    if (!categories.includes(category) || !fields.includes(field) || !incoming.length) {
      return NextResponse.json({ ok: false, error: "추가할 태그 정보가 올바르지 않습니다." }, { status: 400 });
    }

    const { tags, sha } = await readTags();
    const parsed = incoming.filter((tag): tag is string => typeof tag === "string" && Boolean(tag.trim())).map((tag) => tag.trim());
    tags[category][field] = Array.from(new Set([...tags[category][field], ...parsed]));
    await writeTags(tags, sha);

    return NextResponse.json({ ok: true, tags: tags[category][field], all: tags });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}