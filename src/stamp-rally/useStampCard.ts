import { useCallback, useEffect, useRef, useState } from "react";
import {
  claimStampLink,
  createEmptyStampCard,
  mergeStampCards,
  parseStampCard,
  scanStampCard,
  STAMP_RALLY_STORAGE_KEY,
  type StampCard,
  type StampScanResult,
} from "./rally";

export type StampSaveResult = StampScanResult & { persisted: boolean };
export type StampLinkResult = StampSaveResult;

export type StampStorageWarning =
  | "corrupt"
  | "unavailable"
  | "saveFailed"
  | null;

function loadStampCard(): {
  card: StampCard;
  warning: StampStorageWarning;
} {
  try {
    const raw = window.localStorage.getItem(STAMP_RALLY_STORAGE_KEY);
    if (!raw) return { card: createEmptyStampCard(), warning: null };

    const card = parseStampCard(raw);
    return card
      ? { card, warning: null }
      : { card: createEmptyStampCard(), warning: "corrupt" };
  } catch {
    return { card: createEmptyStampCard(), warning: "unavailable" };
  }
}

export function useStampCard() {
  const [initial] = useState(loadStampCard);
  const [card, setCard] = useState(initial.card);
  const [warning, setWarning] = useState<StampStorageWarning>(initial.warning);
  const current = useRef(card);

  const save = useCallback((nextCard: StampCard) => {
    current.current = nextCard;
    setCard(nextCard);

    try {
      window.localStorage.setItem(
        STAMP_RALLY_STORAGE_KEY,
        JSON.stringify(nextCard),
      );
      setWarning(null);
      return true;
    } catch {
      setWarning("saveFailed");
      return false;
    }
  }, []);

  const latestCard = useCallback(() => {
    // QRを別タブで開いた場合も、保存済みのスタンプを上書きしないよう統合します。
    return mergeStampCards(current.current, loadStampCard().card);
  }, []);

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== null && event.key !== STAMP_RALLY_STORAGE_KEY) return;
      const next = loadStampCard();
      current.current = next.card;
      setCard(next.card);
      setWarning(next.warning);
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const join = useCallback(() => {
    const latest = latestCard();
    save({ ...latest, joinedAt: latest.joinedAt ?? new Date().toISOString() });
  }, [latestCard, save]);

  const scan = useCallback(
    (payload: string) => {
      const result = scanStampCard(
        latestCard(),
        payload,
        new Date().toISOString(),
        window.location.href,
      );
      const valid = result.kind === "added" || result.kind === "duplicate";
      return { ...result, persisted: valid && save(result.card) };
    },
    [latestCard, save],
  );

  const visitLink = useCallback((url: URL): StampLinkResult | null => {
    const result = claimStampLink(latestCard(), url, new Date().toISOString());
    if (!result) return null;
    const valid = result.kind === "added" || result.kind === "duplicate";
    return { ...result, persisted: valid && save(result.card) };
  }, [latestCard, save]);

  return { card, warning, join, scan, visitLink };
}
