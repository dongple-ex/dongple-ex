type EventDateLike = {
  title?: string | null;
  event_start_date?: string | null;
  event_end_date?: string | null;
  distance?: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfToday(now = new Date()) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return today.getTime();
}

function parseEventDate(value?: string | null, endOfDay = false) {
  if (!value) return null;

  const normalized = value.trim().replace(/\./g, "-").replace(/\//g, "-");
  const match = normalized.match(/^(\d{4})-?(\d{2})-?(\d{2})/);
  if (!match) return null;

  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  return date.getTime();
}

function getEventSortKey(event: EventDateLike, today: number) {
  const start = parseEventDate(event.event_start_date);
  const end = parseEventDate(event.event_end_date || event.event_start_date, true);

  if (start && end && today >= start && today <= end) {
    return {
      phaseRank: 0,
      dateDistance: Math.max(0, Math.floor((end - today) / DAY_MS)),
      dateValue: end,
    };
  }

  if (start && today < start) {
    return {
      phaseRank: 1,
      dateDistance: Math.floor((start - today) / DAY_MS),
      dateValue: start,
    };
  }

  if (!start && !end) {
    return {
      phaseRank: 2,
      dateDistance: Number.MAX_SAFE_INTEGER,
      dateValue: Number.MAX_SAFE_INTEGER,
    };
  }

  return {
    phaseRank: 3,
    dateDistance: end ? Math.floor((today - end) / DAY_MS) : Number.MAX_SAFE_INTEGER,
    dateValue: end ? -end : Number.MAX_SAFE_INTEGER,
  };
}

export function sortEventsByClosestDate<T extends EventDateLike>(events: T[], now = new Date()): T[] {
  const today = startOfToday(now);

  return [...events].sort((a, b) => {
    const aKey = getEventSortKey(a, today);
    const bKey = getEventSortKey(b, today);
    const distanceA = Number.isFinite(a.distance) ? Number(a.distance) : Number.MAX_SAFE_INTEGER;
    const distanceB = Number.isFinite(b.distance) ? Number(b.distance) : Number.MAX_SAFE_INTEGER;

    return (
      aKey.phaseRank - bKey.phaseRank ||
      aKey.dateDistance - bKey.dateDistance ||
      aKey.dateValue - bKey.dateValue ||
      distanceA - distanceB ||
      (a.title || "").localeCompare(b.title || "", "ko-KR")
    );
  });
}
