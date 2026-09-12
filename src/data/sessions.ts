import { parseSchedule } from "./parseSchedule";

export const TIMETABLE_ENDPOINT =
  "https://timetable.t-funabiki08.workers.dev/v1/events/techmujin-2026/timetable";

export async function fetchSchedule(signal?: AbortSignal) {
  const response = await fetch(TIMETABLE_ENDPOINT, {
    headers: { Accept: "application/json" },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Timetable request failed: ${response.status}`);
  }

  return parseSchedule(await response.json());
}
