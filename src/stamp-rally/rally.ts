export const STAMP_RALLY_STORAGE_KEY = "techmujin:stamp-rally:v1";

export const STAMP_SPOTS = [
  {
    id: "spot-1",
    number: "01",
    title: "チェックポイント 1",
    description: "会場内のスタンプスポット",
    payload: "stamprally:v1:spot-1",
  },
  {
    id: "spot-2",
    number: "02",
    title: "チェックポイント 2",
    description: "会場内のスタンプスポット",
    payload: "stamprally:v1:spot-2",
  },
  {
    id: "spot-3",
    number: "03",
    title: "チェックポイント 3",
    description: "会場内のスタンプスポット",
    payload: "stamprally:v1:spot-3",
  },
  {
    id: "spot-4",
    number: "04",
    title: "チェックポイント 4",
    description: "会場内のスタンプスポット",
    payload: "stamprally:v1:spot-4",
  },
  {
    id: "spot-5",
    number: "05",
    title: "チェックポイント 5",
    description: "会場内のスタンプスポット",
    payload: "stamprally:v1:spot-5",
  },
] as const;

export type StampSpot = (typeof STAMP_SPOTS)[number];
export type StampSpotId = StampSpot["id"];

export type StampCard = {
  version: 1;
  joinedAt: string | null;
  visits: Partial<Record<StampSpotId, string>>;
};

export type StampScanResult = {
  kind: "added" | "duplicate" | "invalid" | "not-joined";
  card: StampCard;
  spot?: StampSpot;
};

export function createEmptyStampCard(): StampCard {
  return { version: 1, joinedAt: null, visits: {} };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

export function parseStampCard(raw: string): StampCard | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (
      !isRecord(value) ||
      value.version !== 1 ||
      !(value.joinedAt === null || isDate(value.joinedAt)) ||
      !isRecord(value.visits)
    ) {
      return null;
    }

    const visits: StampCard["visits"] = {};
    for (const [id, visitedAt] of Object.entries(value.visits)) {
      const spot = STAMP_SPOTS.find((candidate) => candidate.id === id);
      if (!spot || !isDate(visitedAt) || value.joinedAt === null) return null;
      visits[spot.id] = visitedAt;
    }

    return { version: 1, joinedAt: value.joinedAt, visits };
  } catch {
    return null;
  }
}

export function scanStampCard(
  card: StampCard,
  payload: string,
  visitedAt: string,
): StampScanResult {
  if (!card.joinedAt) return { kind: "not-joined", card };

  const spot = STAMP_SPOTS.find((candidate) => candidate.payload === payload);
  if (!spot) return { kind: "invalid", card };
  if (card.visits[spot.id]) return { kind: "duplicate", card, spot };

  return {
    kind: "added",
    card: {
      ...card,
      visits: { ...card.visits, [spot.id]: visitedAt },
    },
    spot,
  };
}
