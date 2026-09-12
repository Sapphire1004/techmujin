import { useCallback, useEffect, useState } from "react";
import { fetchSchedule } from "../data/sessions";
import type { ScheduleData } from "../types";

type TimetableState =
  | { status: "loading"; data: null }
  | { status: "success"; data: ScheduleData }
  | { status: "error"; data: null };

export function useTimetable() {
  const [requestKey, setRequestKey] = useState(0);
  const [state, setState] = useState<TimetableState>({
    status: "loading",
    data: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading", data: null });

    void fetchSchedule(controller.signal)
      .then((data) => setState({ status: "success", data }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("Failed to load the timetable", error);
        setState({ status: "error", data: null });
      });

    return () => controller.abort();
  }, [requestKey]);

  const retry = useCallback(() => setRequestKey((key) => key + 1), []);

  return { ...state, retry };
}
