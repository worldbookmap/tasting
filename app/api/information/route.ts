import { NextResponse } from "next/server.js";
import { promises as fs } from "node:fs";
import path from "node:path";

const repo = process.env.GITHUB_REPO ?? "worldbookmap/tasting";
const token = process.env.GITHUB_TOKEN ?? "";
const githubPath = "data/information.json";
const dataPath = path.join(process.cwd(), githubPath);
const githubApi = `https://api.github.com/repos/${repo}/contents/${githubPath}`;
const githubHeaders = {
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
};

type InformationRecord = {
  id: string;
  title: string;
  content: string;
  details: string;
  createdAt: string;
};

const normalize = (value: unknown): InformationRecord[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is InformationRecord => {
    if (!item || typeof item !== "object") return false;
    const record = item as Partial<InformationRecord>;
    return typeof record.id === "string" && typeof record.title === "string";
  }).map((item) => ({
    id: item.id,
    title: item.title.trim(),
    content: typeof item.content === "string" ? item.content : "",
    details: typeof item.details === "string" ? item.details : "",
    createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
  })).filter((item) => item.title);
};

async function readLocal() {
  try {
    const raw = await fs.readFile(dataPath, "utf8");
    return { records: normalize(JSON.parse(raw || "[]")), sha: undefined };
  } catch {
    await fs.mkdir(path.dirname(dataPath), { recursive: true });
    await fs.writeFile(dataPath, "[]\n", "utf8");
    return { records: [], sha: undefined };
  }
}

async function readGitHub() {
  const response = await fetch(githubApi, { headers: githubHeaders, cache: "no-store" });
  if (response.status === 404) return { records: [], sha: undefined };
  if (!response.ok) throw new Error(`GitHub에서 정보 문서를 불러오지 못했습니다. (${response.status})`);
  const fileData = await response.json();
  const raw = fileData.encoding === "base64"
    ? Buffer.from(fileData.content ?? "", "base64").toString("utf8")
    : await fetch(fileData.download_url, { headers: githubHeaders, cache: "no-store" }).then((result) => result.text());
  return { records: normalize(JSON.parse(raw || "[]")), sha: fileData.sha as string | undefined };
}

async function writeRecords(records: InformationRecord[], sha?: string) {
  const content = JSON.stringify(records, null, 2);
  if (!token) {
    await fs.mkdir(path.dirname(dataPath), { recursive: true });
    await fs.writeFile(dataPath, content, "utf8");
    return;
  }
  const response = await fetch(githubApi, {
    method: "PUT",
    headers: { ...githubHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "Update tasting information",
      content: Buffer.from(content, "utf8").toString("base64"),
      sha,
    }),
  });
  if (!response.ok) throw new Error(`GitHub에 정보 문서를 저장하지 못했습니다. (${response.status})`);
}

const readRecords = () => (token ? readGitHub() : readLocal());

export async function GET() {
  try {
    const { records } = await readRecords();
    return NextResponse.json(records);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const incoming = body?.record as Partial<InformationRecord> | undefined;
    const deleteId = typeof body?.deleteId === "string" ? body.deleteId : "";
    if (!incoming && !deleteId) return NextResponse.json({ ok: false, error: "저장할 정보가 없습니다." }, { status: 400 });

    const { records, sha } = await readRecords();
    const nextRecords = deleteId
      ? records.filter((record) => record.id !== deleteId)
      : (() => {
          const record: InformationRecord = {
            id: typeof incoming?.id === "string" ? incoming.id : crypto.randomUUID(),
            title: typeof incoming?.title === "string" ? incoming.title.trim() : "",
            content: typeof incoming?.content === "string" ? incoming.content : "",
            details: typeof incoming?.details === "string" ? incoming.details : "",
            createdAt: typeof incoming?.createdAt === "string" ? incoming.createdAt : new Date().toISOString(),
          };
          if (!record.title) throw new Error("정보 제목을 입력해주세요.");
          const index = records.findIndex((item) => item.id === record.id);
          return index >= 0 ? records.map((item) => item.id === record.id ? record : item) : [record, ...records];
        })();

    await writeRecords(nextRecords, sha);
    return NextResponse.json({ ok: true, records: nextRecords });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
