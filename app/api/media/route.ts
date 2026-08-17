import { NextResponse } from "next/server.js";

const repo = process.env.GITHUB_REPO ?? "worldbookmap/tasting";
const branch = process.env.GITHUB_BRANCH ?? "main";
const token = process.env.GITHUB_TOKEN ?? "";
const githubHeaders = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  Authorization: `Bearer ${token}`,
};
const maxImageBytes = 450 * 1024;
const mediaFields = ["photo", "labelPhoto", "teaLeafPhoto"] as const;
type MediaField = (typeof mediaFields)[number];

const toSafeSegment = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80) || "note";

const getImagePayload = (dataUrl: string) => {
  const match = /^data:(image\/[a-z0-9.+-]+);base64,([a-zA-Z0-9+/=]+)$/i.exec(dataUrl);
  if (!match) throw new Error("이미지 형식이 올바르지 않습니다.");

  const mimeType = match[1].toLowerCase();
  const extension = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  const content = match[2];
  const byteLength = Math.floor((content.length * 3) / 4) - (content.endsWith("==") ? 2 : content.endsWith("=") ? 1 : 0);
  if (byteLength > maxImageBytes) throw new Error("사진 용량이 너무 큽니다. 다시 업로드해 주세요.");

  return { content, extension };
};

export async function POST(request: Request) {
  try {
    if (!token) {
      return NextResponse.json({ ok: false, error: "GitHub 이미지 저장을 위해 GITHUB_TOKEN 환경 변수가 필요합니다." }, { status: 503 });
    }

    const body = await request.json();
    const noteId = typeof body?.noteId === "string" ? body.noteId : "";
    const field = body?.field as MediaField;
    const dataUrl = typeof body?.dataUrl === "string" ? body.dataUrl : "";
    if (!noteId || !mediaFields.includes(field) || !dataUrl) {
      return NextResponse.json({ ok: false, error: "업로드할 이미지 정보가 올바르지 않습니다." }, { status: 400 });
    }

    const { content, extension } = getImagePayload(dataUrl);
    const path = `data/images/${toSafeSegment(noteId)}/${field}-${crypto.randomUUID()}.${extension}`;
    const response = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      method: "PUT",
      headers: { ...githubHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `Add ${field} image for tasting note ${noteId}`,
        content,
        branch,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`GitHub에 이미지를 저장하지 못했습니다. (${response.status}) ${detail}`.trim());
    }

    return NextResponse.json({ ok: true, path, url: `https://raw.githubusercontent.com/${repo}/${branch}/${path}` });
  } catch (error) {
    console.error("Failed to save tasting media.", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
