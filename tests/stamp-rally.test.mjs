import assert from "node:assert/strict";
import { test } from "node:test";
import {
  STAMP_RALLY_STORAGE_KEY,
  createEmptyStampCard,
  parseStampCard,
  scanStampCard as scanCard,
  claimStampLink as claimLink,
  createStampLink,
  getStampLinkSpot as findLinkSpot,
  mergeStampCards,
  countCollectedStamps,
} from "../src/stamp-rally/rally.ts";
import { createStampSpots } from "../src/data/booths.ts";
import { makeBoothList } from "./fixtures/booths.mjs";

const STAMP_SPOTS = createStampSpots(makeBoothList().booths);
const scanStampCard = (card, payload, at, url) => scanCard(card, payload, at, STAMP_SPOTS, url);
const claimStampLink = (card, url, at) => claimLink(card, url, at, STAMP_SPOTS);
const getStampLinkSpot = (url) => findLinkSpot(url, STAMP_SPOTS);

const joinedAt = "2026-10-28T01:00:00.000Z";
const visitedAt = "2026-10-28T01:10:00.000Z";
const later = "2026-10-28T02:00:00.000Z";
const joinedCard = () => ({ ...createEmptyStampCard(), joinedAt });

test("APIの各ブースを重複のないチェックポイントにする", () => {
  assert.equal(STAMP_SPOTS.length, 4);
  assert.equal(new Set(STAMP_SPOTS.map(({ id }) => id)).size, 4);
  assert.equal(new Set(STAMP_SPOTS.map(({ payload }) => payload)).size, 4);
  assert.equal(STAMP_RALLY_STORAGE_KEY, "techmujin:stamp-rally:v1");
});

test("a fresh card is empty and each card owns its visits object", () => {
  const first = createEmptyStampCard();
  const second = createEmptyStampCard();
  assert.deepEqual(first, { version: 1, joinedAt: null, visits: {} });
  assert.notEqual(first.visits, second.visits);
});

test("scanning before joining cannot add a stamp", () => {
  const card = createEmptyStampCard();
  const result = scanStampCard(card, STAMP_SPOTS[0].payload, visitedAt);
  assert.equal(result.kind, "not-joined");
  assert.equal(result.card, card);
});

test("a valid QR adds its stamp without mutating the previous card", () => {
  const card = joinedCard();
  const result = scanStampCard(card, STAMP_SPOTS[0].payload, visitedAt);
  assert.equal(result.kind, "added");
  assert.equal(result.spot.id, "spot-1");
  assert.equal(result.card.visits["spot-1"], visitedAt);
  assert.deepEqual(card.visits, {});
  assert.equal(result.card.joinedAt, joinedAt);
});

test("duplicate scans preserve the first visit timestamp", () => {
  const first = scanStampCard(joinedCard(), STAMP_SPOTS[0].payload, visitedAt);
  const duplicate = scanStampCard(first.card, STAMP_SPOTS[0].payload, later);
  assert.equal(duplicate.kind, "duplicate");
  assert.equal(duplicate.card, first.card);
  assert.equal(duplicate.card.visits["spot-1"], visitedAt);
});

for (const payload of ["", "stamprally:v1:spot-6", "stamprally:v2:spot-1", "https://example.com", "spot-1"]) {
  test(`unrelated QR data is rejected: ${JSON.stringify(payload)}`, () => {
    const card = joinedCard();
    const result = scanStampCard(card, payload, visitedAt);
    assert.equal(result.kind, "invalid");
    assert.equal(result.card, card);
  });
}

test("all checkpoints can be collected in any order and restored from JSON", () => {
  let card = joinedCard();
  for (const spot of [...STAMP_SPOTS].reverse()) {
    const result = scanStampCard(card, spot.payload, visitedAt);
    assert.equal(result.kind, "added");
    card = result.card;
  }
  assert.equal(Object.keys(card.visits).length, STAMP_SPOTS.length);
  assert.deepEqual(parseStampCard(JSON.stringify(card)), card);
});

test("both fresh and joined cards round-trip through storage", () => {
  for (const card of [createEmptyStampCard(), joinedCard()]) {
    assert.deepEqual(parseStampCard(JSON.stringify(card)), card);
  }
});

for (const value of [
  null,
  [],
  {},
  { version: 2, joinedAt, visits: {} },
  { version: 1, joinedAt: "not a date", visits: {} },
  { version: 1, joinedAt, visits: [] },
  { version: 1, joinedAt, visits: { "unknown": visitedAt } },
  { version: 1, joinedAt, visits: { "spot-": visitedAt } },
  { version: 1, joinedAt, visits: { "spot-1": "invalid" } },
  { version: 1, joinedAt: null, visits: { "spot-1": visitedAt } },
]) {
  test(`invalid saved data is rejected: ${JSON.stringify(value)}`, () => {
    assert.equal(parseStampCard(JSON.stringify(value)), null);
  });
}

test("malformed JSON never crashes card loading", () => {
  assert.equal(parseStampCard("{broken"), null);
});

const appUrl = "https://event.example/";

test("QR用URLは配置先のパスを保ち、古いクエリーを含めない", () => {
  assert.equal(
    createStampLink("spot-1", "https://event.example/app/?stamp=spot-2&other=1#access"),
    "https://event.example/app/?stamp=spot-1#stamp-rally",
  );
});

test("未参加でも最初のQR URLから参加と取得が完了する", () => {
  const card = createEmptyStampCard();
  const result = claimStampLink(card, new URL(createStampLink("spot-1", appUrl)), visitedAt);
  assert.equal(result.kind, "added");
  assert.equal(result.card.joinedAt, visitedAt);
  assert.deepEqual(result.card.visits, { "spot-1": visitedAt });
  assert.deepEqual(card, createEmptyStampCard());
});

test("ハッシュなしのURLでも取得でき、再訪時は最初の時刻を維持する", () => {
  const url = new URL(`${appUrl}?stamp=spot-2`);
  const first = claimStampLink(joinedCard(), url, visitedAt);
  const restored = parseStampCard(JSON.stringify(first.card));
  const second = claimStampLink(restored, url, later);
  assert.equal(second.kind, "duplicate");
  assert.equal(second.card.visits["spot-2"], visitedAt);
  assert.equal(second.card.joinedAt, joinedAt);
});

test("通常のページURLは参加・取得操作として扱わない", () => {
  assert.equal(claimStampLink(createEmptyStampCard(), new URL(appUrl), visitedAt), null);
});

for (const query of ["stamp=", "stamp=spot-6", "stamp=spot-1&stamp=spot-2", "stamp=spot-1&stamp=spot-1", "stamp=SPOT-1", "stamp=%20spot-1", "stamp=__proto__"]) {
  test(`不正なURLは参加前でも記録を変更しない: ${query}`, () => {
    const card = createEmptyStampCard();
    const url = new URL(`${appUrl}?${query}`);
    assert.equal(getStampLinkSpot(url), undefined);
    const result = claimStampLink(card, url, visitedAt);
    assert.equal(result.kind, "invalid");
    assert.equal(result.card, card);
  });
}

test("全チェックポイントをQR URLで集め、既存の保存形式に復元できる", () => {
  let card = createEmptyStampCard();
  for (const spot of STAMP_SPOTS) {
    card = claimStampLink(card, new URL(createStampLink(spot.id, appUrl)), visitedAt).card;
  }
  assert.equal(Object.keys(card.visits).length, STAMP_SPOTS.length);
  assert.deepEqual(parseStampCard(JSON.stringify(card)), card);
});

test("補助スキャナーは同じサイトのQR URLと従来のQRに対応する", () => {
  for (const payload of [STAMP_SPOTS[0].payload, createStampLink("spot-1", appUrl)]) {
    assert.equal(scanStampCard(joinedCard(), payload, visitedAt, appUrl).kind, "added");
  }
});

for (const payload of ["https://other.example/?stamp=spot-1", "https://event.example/other/?stamp=spot-1", "https://event.example/?stamp=spot-1&stamp=spot-2", "javascript:alert(1)"]) {
  test(`補助スキャナーは別サイトや不正なURLを受け付けない: ${payload}`, () => {
    assert.equal(scanStampCard(joinedCard(), payload, visitedAt, appUrl).kind, "invalid");
  });
}

test("別タブのカードを統合しても既存のスタンプと最初の時刻を失わない", () => {
  const first = { version: 1, joinedAt, visits: { "spot-1": visitedAt, "spot-2": later } };
  const second = { version: 1, joinedAt: visitedAt, visits: { "spot-2": visitedAt, "spot-3": later } };
  const merged = mergeStampCards(first, second);
  assert.deepEqual(merged, {
    version: 1,
    joinedAt,
    visits: { "spot-1": visitedAt, "spot-2": visitedAt, "spot-3": later },
  });
  assert.deepEqual(mergeStampCards(second, first), merged);
  assert.deepEqual(mergeStampCards(createEmptyStampCard(), first), first);
  assert.equal(first.visits["spot-2"], later);
});

test("ブースが8件に増えても任意の順序で取得し、番号とQRの対応を維持する", () => {
  const spots = createStampSpots(makeBoothList(["A-1", "0", "6", "2", "3", "4", "7", "8"]).booths);
  let card = joinedCard();
  for (const spot of [...spots].reverse()) {
    const result = scanCard(card, createStampLink(spot.id, appUrl), visitedAt, spots, appUrl);
    assert.equal(result.kind, "added");
    card = result.card;
  }
  assert.equal(countCollectedStamps(card, spots), 8);
  assert.equal(findLinkSpot(new URL(`${appUrl}?stamp=spot-A-1`), [...spots].reverse()).number, "A-1");
  assert.equal(scanCard(card, spots[0].payload, later, spots).kind, "duplicate");
  assert.deepEqual(parseStampCard(JSON.stringify(card)), card);
});

test("非表示になったブースの記録を保持し、現在の件数には含めない", () => {
  const stored = { version: 1, joinedAt, visits: { "spot-1": visitedAt, "spot-6": visitedAt } };
  const restored = parseStampCard(JSON.stringify(stored));
  assert.deepEqual(restored, stored);
  assert.equal(countCollectedStamps(restored, STAMP_SPOTS), 1);
  assert.equal(countCollectedStamps(restored, []), 0);
  const expanded = createStampSpots(makeBoothList(["1", "6"]).booths);
  assert.equal(countCollectedStamps(restored, expanded), 2);
  assert.deepEqual(mergeStampCards(joinedCard(), restored), stored);
  assert.equal(scanCard(restored, "stamprally:v1:spot-6", later, STAMP_SPOTS).kind, "invalid");
});
