export const STAMP_RALLY_STORAGE_KEY = "techmujin:stamp-rally:v1";
export const STAMP_LINK_PARAMETER = "stamp";

export type StampSpotId = `spot-${string}`;
export type StampSpot = {
  id: StampSpotId;
  number: string;
  title: string;
  iconUrl: string | null;
  payload: string;
};

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

export function getStampLinkSpot(url: URL, spots: readonly StampSpot[]): StampSpot | undefined {
  const values = url.searchParams.getAll(STAMP_LINK_PARAMETER);
  if (values.length !== 1) return undefined;
  return spots.find((spot) => spot.id === values[0]);
}

export function countCollectedStamps(card: StampCard, spots: readonly StampSpot[]): number {
  return spots.filter(({ id }) => Boolean(card.visits[id])).length;
}

export function createStampLink(spotId: StampSpotId, appUrl: string): string {
  const url = new URL(appUrl);
  url.search = "";
  url.searchParams.set(STAMP_LINK_PARAMETER, spotId);
  url.hash = "stamp-rally";
  return url.href;
}

export function mergeStampCards(first: StampCard, second: StampCard): StampCard {
  const joinedAt = [first.joinedAt, second.joinedAt]
    .filter((value): value is string => value !== null)
    .sort((a, b) => Date.parse(a) - Date.parse(b))[0] ?? null;
  const visits: StampCard["visits"] = { ...first.visits };
  for (const id of Object.keys(second.visits) as StampSpotId[]) {
    const previous = visits[id];
    const incoming = second.visits[id];
    if (incoming && (!previous || Date.parse(incoming) < Date.parse(previous))) {
      visits[id] = incoming;
    }
  }
  return { version: 1, joinedAt, visits };
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
      // API取得前やブース削除後も、過去の有効な記録は保存形式のまま保持します。
      if (!id.startsWith("spot-") || id.length <= 5 || !isDate(visitedAt) || value.joinedAt === null) return null;
      visits[id as StampSpotId] = visitedAt;
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
  spots: readonly StampSpot[],
  appUrl?: string,
): StampScanResult {
  if (!card.joinedAt) return { kind: "not-joined", card };

  let spot = spots.find((candidate) => candidate.payload === payload);
  if (!spot && appUrl) {
    try {
      const url = new URL(payload);
      const app = new URL(appUrl);
      if (url.origin === app.origin && url.pathname === app.pathname) {
        spot = getStampLinkSpot(url, spots);
      }
    } catch {
      // URLではないQRデータは無効として扱います。
    }
  }
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

export function claimStampLink(
  card: StampCard,
  url: URL,
  visitedAt: string,
  spots: readonly StampSpot[],
): StampScanResult | null {
  if (!url.searchParams.has(STAMP_LINK_PARAMETER)) return null;
  const spot = getStampLinkSpot(url, spots);
  if (!spot) return { kind: "invalid", card };

  // QRのURLを開く操作を参加として扱い、最初の1個もその場で記録します。
  const joinedCard = card.joinedAt ? card : { ...card, joinedAt: visitedAt };
  return scanStampCard(joinedCard, spot.payload, visitedAt, spots);
}
