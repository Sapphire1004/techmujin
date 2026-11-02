import { useCallback, useRef, useState } from "react";
import {
  createEmptyStampCard,
  parseStampCard,
  scanStampCard,
  STAMP_RALLY_STORAGE_KEY,
  type StampCard,
} from "./rally";

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
    } catch {
      setWarning("saveFailed");
    }
  }, []);

  const join = useCallback(() => {
    if (current.current.joinedAt) return;
    save({ ...createEmptyStampCard(), joinedAt: new Date().toISOString() });
  }, [save]);

  const scan = useCallback(
    (payload: string) => {
      const result = scanStampCard(
        current.current,
        payload,
        new Date().toISOString(),
      );
      if (result.kind === "added") save(result.card);
      return result;
    },
    [save],
  );

  return { card, warning, join, scan };
}
