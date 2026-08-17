import { NextResponse } from "next/server.js";

const repo = process.env.GITHUB_REPO ?? "worldbookmap/tasting";
const token = process.env.GITHUB_TOKEN ?? "";
const githubPath = "data/tasting-notes.json";

type NoteRecord = {
  id?: string;
  [key: string]: unknown;
};

type NotesSnapshot = {
  notes: NoteRecord[];
  sha?: string;
};

const githubApi = `https://api.github.com/repos/${repo}/contents/${githubPath}`;
const githubHeaders = {
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
};

async function readGitHubNotes(): Promise<NotesSnapshot> {
  const response = await fetch(githubApi, { headers: githubHeaders, cache: "no-store" });

  if (!response.ok) {
    throw new Error(`GitHub에서 기록을 불러오지 못했습니다. (${response.status})`);
  }

  const fileData = await response.json();
  let raw: string;

  if (fileData.encoding === "base64" && fileData.content) {
    raw = Buffer.from(fileData.content, "base64").toString("utf8");
  } else if (fileData.download_url) {
    const rawResponse = await fetch(fileData.download_url, { headers: githubHeaders, cache: "no-store" });
    if (!rawResponse.ok) {
      throw new Error(`GitHub 기록 원문을 불러오지 못했습니다. (${rawResponse.status})`);
    }
    raw = await rawResponse.text();
  } else {
    throw new Error("GitHub 기록 파일의 내용을 확인할 수 없습니다.");
  }

  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("GitHub 기록 파일 형식이 올바르지 않습니다.");
  return { notes: parsed, sha: fileData.sha };
}

async function writeGitHubNotes(nextNotes: NoteRecord[], sha?: string) {
  const response = await fetch(githubApi, {
    method: "PUT",
    headers: {
      ...githubHeaders,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: "Update tasting notes",
      content: Buffer.from(JSON.stringify(nextNotes, null, 2), "utf8").toString("base64"),
      sha,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`GitHub에 기록을 저장하지 못했습니다. (${response.status}) ${detail}`.trim());
  }
}

const readNotes = () => {
  if (!token) throw new Error("GitHub 저장을 위해 GITHUB_TOKEN 환경 변수가 필요합니다.");
  return readGitHubNotes();
};

async function writeNotes(nextNotes: NoteRecord[], sha?: string) {
  if (!token) throw new Error("GitHub 저장을 위해 GITHUB_TOKEN 환경 변수가 필요합니다.");
  await writeGitHubNotes(nextNotes, sha);
}

export async function GET() {
  try {
    const { notes } = await readNotes();
    return NextResponse.json(notes);
  } catch (error) {
    console.error("Failed to load tasting notes.", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body?.deleteId && !body?.note) {
      return NextResponse.json({ ok: false, error: "저장할 기록 정보가 없습니다." }, { status: 400 });
    }

    const { notes: currentNotes, sha } = await readNotes();
    let nextNotes: NoteRecord[] = [...currentNotes];

    if (body?.deleteId) {
      nextNotes = nextNotes.filter((note) => note.id !== body.deleteId);
    } else if (body?.note) {
      const incoming = body.note as NoteRecord;
      const targetId = incoming.id;

      if (targetId) {
        const existingIndex = nextNotes.findIndex((note) => note.id === targetId);
        if (existingIndex >= 0) {
          nextNotes = nextNotes.map((note) => (note.id === targetId ? { ...note, ...incoming } : note));
        } else {
          nextNotes = [incoming, ...nextNotes];
        }
      } else {
        nextNotes = [incoming, ...nextNotes];
      }
    }

    await writeNotes(nextNotes, sha);

    return NextResponse.json({ ok: true, count: nextNotes.length });
  } catch (error) {
    console.error("Failed to save tasting note.", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
