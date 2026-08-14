import { NextRequest, NextResponse } from "next/server";

const repo = process.env.GITHUB_REPO ?? "worldbookmap/tasting";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const note = body?.note;
    const token = process.env.GITHUB_TOKEN;

    if (!token || !repo) {
      return NextResponse.json({
        ok: true,
        mode: "demo",
        message: "GitHub token is not configured. Using local demo mode.",
        saved: note,
      });
    }

    const path = "data/tasting-notes.json";
    const githubApi = `https://api.github.com/repos/${repo}/contents/${path}`;
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };

    let existing = { content: "[]", sha: undefined as string | undefined };
    const getResponse = await fetch(githubApi, { headers });

    if (getResponse.ok) {
      const fileData = await getResponse.json();
      existing = {
        content: Buffer.from(fileData.content ?? "", "base64").toString("utf-8") || "[]",
        sha: fileData.sha,
      };
    }

    const parsed = JSON.parse(existing.content || "[]");
    const nextNotes = Array.isArray(parsed) ? [...parsed, note] : [note];
    const payload = {
      message: `Add tasting note for ${note.name || note.category}`,
      content: Buffer.from(JSON.stringify(nextNotes, null, 2), "utf-8").toString("base64"),
      sha: existing.sha,
    };

    const putResponse = await fetch(githubApi, {
      method: "PUT",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!putResponse.ok) {
      const errorText = await putResponse.text();
      return NextResponse.json(
        { ok: false, error: errorText },
        { status: putResponse.status }
      );
    }

    return NextResponse.json({ ok: true, mode: "github", saved: note });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
