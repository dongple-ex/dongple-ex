export type EventPeriodPhase = "upcoming" | "active" | "ended" | "unknown";

function parseEventDate(value?: string | null, endOfDay = false) {
    if (!value) return null;

    const normalized = value
        .trim()
        .replace(/\./g, "-")
        .replace(/\//g, "-");
    const match = normalized.match(/^(\d{4})-?(\d{2})-?(\d{2})/);
    if (!match) return null;

    const [, year, month, day] = match;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    if (Number.isNaN(date.getTime())) return null;
    if (endOfDay) date.setHours(23, 59, 59, 999);
    else date.setHours(0, 0, 0, 0);
    return date;
}

export function getEventPeriodPhase(startDate?: string | null, endDate?: string | null): EventPeriodPhase {
    const start = parseEventDate(startDate);
    const end = parseEventDate(endDate || startDate, true);
    if (!start || !end) return "unknown";

    const now = new Date();
    if (now < start) return "upcoming";
    if (now > end) return "ended";
    return "active";
}

export function isEventActive(startDate?: string | null, endDate?: string | null) {
    return getEventPeriodPhase(startDate, endDate) === "active";
}

export function getEventPeriodLabel(startDate?: string | null, endDate?: string | null) {
    const phase = getEventPeriodPhase(startDate, endDate);
    if (phase === "upcoming") return "행사 전";
    if (phase === "active") return "지금 행사";
    if (phase === "ended") return "행사 종료";
    return "일정 확인";
}

export function getEventStatusBlock(
    startDate: string | undefined,
    endDate: string | undefined,
    activeStatusText: string,
) {
    const phase = getEventPeriodPhase(startDate, endDate);

    if (phase === "upcoming") {
        return "[지금 상태]\n행사 전입니다.\n행사 시작 후 현장 공유가 열립니다.";
    }

    if (phase === "ended") {
        return "[지금 상태]\n종료된 행사입니다.\n현장 공유는 행사 기간에만 남길 수 있습니다.";
    }

    return activeStatusText;
}
