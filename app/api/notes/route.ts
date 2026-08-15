import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

const repo = process.env.GITHUB_REPO ?? "worldbookmap/tasting";
const token = process.env.GITHUB_TOKEN ?? "";
const dataPath = path.join(process.cwd(), "data", "tasting-notes.json");

async function readNotes() {
  try {
    const raw = await fs.readFile(dataPath, "utf8");
    return JSON.parse(raw || "[]");
  } catch {
    await fs.mkdir(path.dirname(dataPath), { recursive: true });
    await fs.writeFile(dataPath, "[]", "utf8");
    return [];
  }
}

async function writeNotes(nextNotes: unknown[]) {
  await fs.mkdir(path.dirname(dataPath), { recursive: true });
  await fs.writeFile(dataPath, JSON.stringify(nextNotes, null, 2), "utf8");
}

async function syncToGitHub(nextNotes: unknown[]) {
  if (!token) return;

  try {
    const githubPath = "data/tasting-notes.json";
    const githubApi = `https://api.github.com/repos/${repo}/contents/${githubPath}`;
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };

    const current = await fetch(githubApi, { headers });
    let sha: string | undefined;

    if (current.ok) {
      const fileData = await current.json();
      sha = fileData.sha;
    }

    const content = Buffer.from(JSON.stringify(nextNotes, null, 2), "utf8").toString("base64");

    const response = await fetch(githubApi, {
      method: "PUT",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Update tasting notes",
        content,
        sha,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.warn("GitHub sync failed; local save was kept.", errorText || response.statusText);
    }
  } catch (error) {
    console.warn("GitHub sync failed; local save was kept.", error);
  }
}

export async function GET() {
  const notes = await readNotes();
  return NextResponse.json(notes);
}

type NoteRecord = {
  id?: string;
  [key: string]: unknown;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const currentNotes = await readNotes();
    let nextNotes: NoteRecord[] = [...(Array.isArray(currentNotes) ? currentNotes : [])];

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

    await writeNotes(nextNotes);
    await syncToGitHub(nextNotes);

    return NextResponse.json({ ok: true, count: nextNotes.length });
  } catch (error) {
    console.error("Failed to save tasting note.", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
