export type LinkableSegment =
  | { type: "text"; value: string }
  | { type: "link"; value: string; href: string }
  | { type: "info"; value: string };

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function getLinkableSegments(text: string, infoTitles: string[]): LinkableSegment[] {
  if (!text) return [];

  const urlPattern = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
  const titlePattern = infoTitles.length
    ? new RegExp(`(${infoTitles.map((title) => escapeRegExp(title)).join("|")})`, "gi")
    : null;
  const combinedPattern = titlePattern ? new RegExp(`${urlPattern.source}|${titlePattern.source}`, "gi") : urlPattern;

  const segments: LinkableSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(combinedPattern)) {
    const matchIndex = match.index ?? 0;
    const matchText = match[0];

    if (matchIndex > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, matchIndex) });
    }

    const trimmedText = matchText.trim();
    const isTitleMatch = infoTitles.some((title) => title.toLowerCase() === trimmedText.toLowerCase());

    if (isTitleMatch) {
      segments.push({ type: "info", value: matchText });
    } else {
      const strippedUrl = trimmedText.replace(/[.,!?;:)}\]]+$/g, "");
      const isUrl = /^https?:\/\//i.test(strippedUrl) || /^www\./i.test(strippedUrl);

      if (isUrl) {
        const href = /^https?:\/\//i.test(strippedUrl) ? strippedUrl : `https://${strippedUrl}`;
        segments.push({ type: "link", value: strippedUrl, href });
      } else {
        segments.push({ type: "text", value: matchText });
      }
    }

    lastIndex = matchIndex + matchText.length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }

  return segments;
}
