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
        tone: "bg-green-100 text-green-700",
        text: "text-green-700",
        border: "border-green-200",
        hover: "hover:bg-green-200",
        ring: "ring-green-300",
        badgeText: "text-green-500",
        indicator: "bg-green-500",
        card: "bg-green-50/50 border-green-100 shadow-green-900/5",
    },
    보통: {
        tone: "bg-blue-100 text-blue-700",
        text: "text-blue-700",
        border: "border-blue-200",
        hover: "hover:bg-blue-200",
        ring: "ring-blue-300",
        badgeText: "text-blue-500",
        indicator: "bg-blue-500",
        card: "bg-blue-50/50 border-blue-100 shadow-blue-900/5",
    },
    혼잡: {
        tone: "bg-red-100 text-red-700",
        text: "text-red-700",
        border: "border-red-200",
        hover: "hover:bg-red-200",
        ring: "ring-red-300",
        badgeText: "text-red-500",
        indicator: "bg-red-500",
        card: "bg-red-50/50 border-red-100 shadow-red-900/5",
    },
    요청: {
        tone: "bg-orange-100 text-orange-700",
        text: "text-orange-700",
        border: "border-orange-200",
        hover: "hover:bg-orange-200",
        ring: "ring-orange-300",
        badgeText: "text-orange-500",
        indicator: "bg-orange-500",
        card: "bg-orange-50/50 border-orange-100 shadow-orange-900/5",
    },
};

export const SHAREABLE_STATUS_OPTIONS = (["여유", "보통", "혼잡"] as const).map((label) => ({
    label,
    ...STATUS_THEME[label],
}));

export function getStatusTheme(status: string, isRequest = false): StatusTheme {
    if (isRequest) {
        return STATUS_THEME["요청"];
    }

    return STATUS_THEME[(status as StatusLabel) || "보통"] ?? STATUS_THEME["보통"];
}
