import { useCallback, useEffect, useState } from "react";
import type { BoothList } from "techmujin-api";
import { fetchBooths } from "../data/booths";

type BoothRequestState =
  | { status: "loading"; data: null }
  | { status: "success"; data: BoothList }
  | { status: "error"; data: null };

export type BoothsState = BoothRequestState & { retry: () => void };

export function useBooths(): BoothsState {
  const [requestKey, setRequestKey] = useState(0);
  const [state, setState] = useState<BoothRequestState>({ status: "loading", data: null });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading", data: null });
    void fetchBooths(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setState({ status: "success", data });
      },
      () => {
        if (!controller.signal.aborted) setState({ status: "error", data: null });
      },
    );
    return () => controller.abort();
  }, [requestKey]);

  const retry = useCallback(() => setRequestKey((key) => key + 1), []);
  return { ...state, retry };
}
