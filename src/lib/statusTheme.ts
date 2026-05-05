export type StatusLabel = "여유" | "보통" | "혼잡" | "요청";

type StatusTheme = {
  tone: string;
  text: string;
  border: string;
  hover: string;
  ring: string;
  badgeText: string;
  indicator: string;
  card: string;
};

export const STATUS_THEME: Record<StatusLabel, StatusTheme> = {
  여유: {
    tone: "bg-emerald-100 text-emerald-700",
    text: "text-emerald-700",
    border: "border-emerald-200",
    hover: "hover:bg-emerald-200",
    ring: "ring-emerald-300",
    badgeText: "text-emerald-500",
    indicator: "bg-emerald-500",
    card: "bg-emerald-50/80 border-emerald-100 shadow-emerald-900/5",
  },
  보통: {
    tone: "bg-amber-100 text-amber-700",
    text: "text-amber-700",
    border: "border-amber-200",
    hover: "hover:bg-amber-200",
    ring: "ring-amber-300",
    badgeText: "text-amber-500",
    indicator: "bg-amber-500",
    card: "bg-amber-50/80 border-amber-100 shadow-amber-900/5",
  },
  혼잡: {
    tone: "bg-rose-100 text-rose-700",
    text: "text-rose-700",
    border: "border-rose-200",
    hover: "hover:bg-rose-200",
    ring: "ring-rose-300",
    badgeText: "text-rose-500",
    indicator: "bg-rose-500",
    card: "bg-rose-50/80 border-rose-100 shadow-rose-900/5",
  },
  요청: {
    tone: "bg-sky-100 text-sky-700",
    text: "text-sky-700",
    border: "border-sky-200",
    hover: "hover:bg-sky-200",
    ring: "ring-sky-300",
    badgeText: "text-sky-500",
    indicator: "bg-sky-500",
    card: "bg-sky-50/80 border-sky-100 shadow-sky-900/5",
  },
};

export const SHAREABLE_STATUS_OPTIONS = (["여유", "보통", "혼잡"] as const).map((label) => ({
  label,
  ...STATUS_THEME[label],
}));

export function normalizeStatus(status: string) {
  const normalized: Record<string, StatusLabel> = {
    여유: "여유",
    한산: "여유",
    "?쒖궛": "여유",
    "?ъ쑀": "여유",
    보통: "보통",
    "蹂댄넻": "보통",
    혼잡: "혼잡",
    붐빔: "혼잡",
    "遺먮퉼": "혼잡",
    "?쇱옟": "혼잡",
    요청: "요청",
    "?붿껌": "요청",
  };

  return normalized[status] || "보통";
}

export function getStatusTheme(status: string, isRequest = false): StatusTheme {
  if (isRequest) return STATUS_THEME["요청"];
  return STATUS_THEME[normalizeStatus(status)];
}
