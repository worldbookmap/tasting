import { NextResponse } from "next/server.js";
import { promises as fs } from "node:fs";
import path from "node:path";

const repo = process.env.GITHUB_REPO ?? "worldbookmap/tasting";
const token = process.env.GITHUB_TOKEN ?? "";
const dataPath = path.join(process.cwd(), "data", "tasting-notes.json");
const githubPath = "data/tasting-notes.json";

type NoteRecord = {
  id?: string;
  [key: string]: unknown;
};

type NotesSnapshot = {
  notes: NoteRecord[];
  sha?: string;
};

async function readLocalNotes(): Promise<NotesSnapshot> {
  try {
    const raw = await fs.readFile(dataPath, "utf8");
    const parsed = JSON.parse(raw || "[]");
    return { notes: Array.isArray(parsed) ? parsed : [] };
  } catch {
    await fs.mkdir(path.dirname(dataPath), { recursive: true });
    await fs.writeFile(dataPath, "[]", "utf8");
    return { notes: [] };
  }
}

async function writeLocalNotes(nextNotes: NoteRecord[]) {
  await fs.mkdir(path.dirname(dataPath), { recursive: true });
  await fs.writeFile(dataPath, JSON.stringify(nextNotes, null, 2), "utf8");
}

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
  const raw = Buffer.from(fileData.content ?? "", "base64").toString("utf8");
  const parsed = JSON.parse(raw || "[]");
  return { notes: Array.isArray(parsed) ? parsed : [], sha: fileData.sha };
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

const readNotes = () => (token ? readGitHubNotes() : readLocalNotes());

async function writeNotes(nextNotes: NoteRecord[], sha?: string) {
  if (token) {
    await writeGitHubNotes(nextNotes, sha);
    return;
  }

  await writeLocalNotes(nextNotes);
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
