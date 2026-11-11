import type { EventSchedule, Session } from "../types";

export function toMinutes(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

export function createTimetableLayout(
  event: Pick<EventSchedule, "startTime" | "endTime">,
  sessions: readonly Pick<Session, "startTime" | "endTime">[],
) {
  const boundaries = [...new Set([
    event.startTime,
    event.endTime,
    ...sessions.flatMap(({ startTime, endTime }) => [startTime, endTime]),
  ])].sort((a, b) => toMinutes(a) - toMinutes(b));
  const occupied = sessions.map((session) => ({
    start: toMinutes(session.startTime),
    end: toMinutes(session.endTime),
  }));

  const ranges = boundaries.slice(0, -1).map((startTime, index) => {
    const endTime = boundaries[index + 1];
    const start = toMinutes(startTime);
    const end = toMinutes(endTime);
    return {
      startTime,
      endTime,
      // 発表や明示された休憩を短縮せず、未割当の空き時間だけ圧縮します。
      isEmptyGap: !occupied.some((session) =>
        session.start < end && session.end > start),
    };
  });

  return {
    ranges,
    boundaryIndexes: new Map(boundaries.map((time, index) => [time, index])),
  };
}
