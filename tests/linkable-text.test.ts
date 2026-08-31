import assert from "node:assert/strict";
import { test } from "node:test";

import { getLinkableSegments } from "../app/linkableText.ts";

test("detects plain URLs in text and keeps surrounding text intact", () => {
  const segments = getLinkableSegments("여기 링크: https://example.com/notes 입니다.", []);

  assert.deepEqual(segments, [
    { type: "text", value: "여기 링크: " },
    { type: "link", value: "https://example.com/notes", href: "https://example.com/notes" },
    { type: "text", value: " 입니다." },
  ]);
});

test("detects matching information titles and URLs together", () => {
  const segments = getLinkableSegments("맛 정보: 와인과 https://example.com 와인 참고", ["와인"]);

  assert.deepEqual(segments, [
    { type: "text", value: "맛 정보: " },
    { type: "info", value: "와인" },
    { type: "text", value: "과 " },
    { type: "link", value: "https://example.com", href: "https://example.com" },
    { type: "text", value: " " },
    { type: "info", value: "와인" },
    { type: "text", value: " 참고" },
  ]);
});
