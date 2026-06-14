export function stripHtml(value: string | null | undefined) {
  return (value || "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function compactText(value: string | null | undefined, maxLength: number) {
  const text = stripHtml(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).replace(/\s+\S*$/, "")}...`;
}

export function getSafeInternalPath(value: string | null | undefined, fallback = "/") {
  const raw = (value || "").trim();
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || /[\u0000-\u001f\u007f]/.test(raw)) {
    return fallback;
  }

  try {
    const url = new URL(raw, "https://dongple.local");
    if (url.origin !== "https://dongple.local") return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
