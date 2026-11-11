export const event = {
  id: "test-event",
  title: "テストイベント",
  dateLabel: "2026-11-22",
  startTime: "10:00",
  endTime: "11:00",
  timezone: "Asia/Tokyo",
  venue: "テスト会場",
  url: "https://example.com/event",
};

export function makeSession(id, startTime, endTime, format = "talk") {
  return {
    id,
    title: `セッション ${id}`,
    startsAt: `2026-11-22T${startTime}:00+09:00`,
    endsAt: `2026-11-22T${endTime}:00+09:00`,
    startTime,
    endTime,
    speaker: `登壇者 ${id}`,
    speakerImage: "",
    tags: ["LTセッション"],
    trackId: null,
    format,
  };
}
