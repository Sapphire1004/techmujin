import assert from "node:assert/strict";
import { test } from "node:test";
import {
  STAMP_SPOTS,
  STAMP_RALLY_STORAGE_KEY,
  createEmptyStampCard,
  parseStampCard,
  scanStampCard,
} from "../src/stamp-rally/rally.ts";

const joinedAt = "2026-10-28T01:00:00.000Z";
const visitedAt = "2026-10-28T01:10:00.000Z";
const later = "2026-10-28T02:00:00.000Z";
const joinedCard = () => ({ ...createEmptyStampCard(), joinedAt });

test("five placeholder checkpoints have unique IDs and QR payloads", () => {
  assert.equal(STAMP_SPOTS.length, 5);
  assert.equal(new Set(STAMP_SPOTS.map(({ id }) => id)).size, 5);
  assert.equal(new Set(STAMP_SPOTS.map(({ payload }) => payload)).size, 5);
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
  assert.equal(Object.keys(card.visits).length, 5);
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
  { version: 1, joinedAt, visits: { "spot-6": visitedAt } },
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
