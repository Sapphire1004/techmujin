import assert from "node:assert/strict";
import { test } from "node:test";
import { createTimetableLayout } from "../src/timetable/layout.ts";
import { createCalendarFile } from "../src/calendar/ics.ts";
import { event, makeSession } from "./fixtures/sessions.mjs";

const emptyGaps = (sessions, timing = event) => createTimetableLayout(timing, sessions).ranges.filter(r => r.isEmptyGap);

test("未割当の空き時間を圧縮し、次の10:22開始を維持する", () => {
  const sessions = [makeSession("a", "10:00", "10:20"), makeSession("b", "10:22", "11:00")];
  const layout = createTimetableLayout(event, sessions);
  assert.deepEqual(layout.ranges, [
    { startTime: "10:00", endTime: "10:20", isEmptyGap: false },
    { startTime: "10:20", endTime: "10:22", isEmptyGap: true },
    { startTime: "10:22", endTime: "11:00", isEmptyGap: false },
  ]);
  assert.equal(layout.boundaryIndexes.get("10:22"), 2);
});

test("1分の空き時間も圧縮する", () => {
  assert.equal(emptyGaps([makeSession("a", "10:00", "10:20"), makeSession("b", "10:21", "11:00")]).length, 1);
});

test("3分の空き時間も圧縮する", () => {
  assert.equal(emptyGaps([makeSession("a", "10:00", "10:20"), makeSession("b", "10:23", "11:00")]).length, 1);
});

test("15:12〜15:15と16:25〜16:30の空白を圧縮し、15:15開始の休憩を保つ", () => {
  const layout = createTimetableLayout({ startTime: "15:07", endTime: "16:45" }, [
    makeSession("lt", "15:07", "15:12"),
    makeSession("rest", "15:15", "15:40", "break"),
    makeSession("talk", "15:40", "16:25"),
    makeSession("closing", "16:30", "16:45"),
  ]);
  assert.deepEqual(layout.ranges.filter(r => r.isEmptyGap).map(r => [r.startTime, r.endTime]), [
    ["15:12", "15:15"], ["16:25", "16:30"],
  ]);
  assert.equal(layout.ranges.find(r => r.startTime === "15:15").isEmptyGap, false);
});

test("空白の圧縮は分数の上限ではなくセッションの有無で判定する", () => {
  assert.equal(emptyGaps([makeSession("a", "10:00", "10:10"), makeSession("b", "10:40", "11:00")]).length, 1);
});

for (const format of ["talk", "break", "networking"]) {
  test(`2分の${format}が明示されていれば圧縮しない`, () => {
    assert.equal(emptyGaps([
      makeSession("a", "10:00", "10:20"),
      makeSession("short", "10:20", "10:22", format),
      makeSession("b", "10:22", "11:00"),
    ]).length, 0);
  });
}

test("ほかのセッションが進行中なら空き時間と判定しない", () => {
  assert.equal(emptyGaps([
    makeSession("a", "10:00", "10:20"),
    makeSession("overlapping", "10:19", "10:25"),
    makeSession("b", "10:22", "11:00"),
  ]).length, 0);
});

test("重複した境界や入力順に影響されず、ゼロ分の行を作らない", () => {
  const layout = createTimetableLayout(event, [
    makeSession("b", "10:20", "11:00"), makeSession("a", "10:00", "10:20"),
  ]);
  assert.deepEqual(layout.ranges.map(r => [r.startTime, r.endTime]), [["10:00", "10:20"], ["10:20", "11:00"]]);
});

test("イベント先頭・末尾の短い空き時間もセッション日時を変えずに扱う", () => {
  const sessions = [makeSession("a", "10:00", "11:00")];
  assert.equal(emptyGaps(sessions, { startTime: "09:58", endTime: "11:02" }).length, 2);
  assert.equal(sessions[0].startTime, "10:00");
});

test("レイアウト計算は元データとICSの内容を変更しない", () => {
  const sessions = Object.freeze([
    Object.freeze(makeSession("a", "10:00", "10:20")),
    Object.freeze(makeSession("b", "10:22", "11:00")),
  ]);
  const generatedAt = new Date("2026-11-12T00:00:00Z");
  const before = createCalendarFile({ event, sessions, generatedAt });
  const snapshot = JSON.stringify(sessions);
  createTimetableLayout(Object.freeze(event), sessions);
  assert.equal(JSON.stringify(sessions), snapshot);
  assert.deepEqual(createCalendarFile({ event, sessions, generatedAt }), before);
});
