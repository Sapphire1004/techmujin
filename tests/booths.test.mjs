import assert from "node:assert/strict";
import { test } from "node:test";
import { BOOTHS_API_URL, boothListSchema, createStampSpots, fetchBooths, getBoothTitle } from "../src/data/booths.ts";
import { makeBoothList } from "./fixtures/booths.mjs";

test("ブースAPIの順序と番号を保ち、件数に上限を設けない", () => {
  for (const numbers of [[], ["1", "2", "3", "4"], ["A-1", "0", "8", "3", "4", "5", "6", "7"]]) {
    const data = boothListSchema.parse(makeBoothList(numbers));
    assert.deepEqual(data.booths.map(({ number }) => number), numbers);
    const spots = createStampSpots(data.booths);
    assert.deepEqual(spots.map(({ id }) => id), numbers.map((number) => `spot-${number}`));
  }
});

test("共同出展・コミュニティなし・未設定のタイトルやURLを扱う", () => {
  const data = makeBoothList(["A-1", "0", "3"]);
  data.booths[0].communities.push({ ...data.booths[0].communities[0], id: "another", name: "別のコミュニティ", url: null });
  data.booths[1].communities = [];
  data.booths[1].title = "運営受付";
  data.booths[2].communities = [];
  const parsed = boothListSchema.parse(data);
  assert.equal(getBoothTitle(parsed.booths[0]), "SORACOM UG 山梨 / 別のコミュニティ");
  assert.equal(getBoothTitle(parsed.booths[1]), "運営受付");
  assert.equal(getBoothTitle(parsed.booths[2]), "ブース 3");
});

test("重複番号・非対応スキーマ・異なるイベント・危険なURLは受け付けない", () => {
  for (const change of [
    (data) => { data.booths[1].number = data.booths[0].number; },
    (data) => { data.booths[0].number = ""; },
    (data) => { data.schemaVersion = 2; },
    (data) => { data.event.id = "another-event"; },
    (data) => { data.booths[0].communities[0].url = "javascript:alert(1)"; },
    (data) => { data.updatedAt = "invalid"; },
  ]) {
    const data = makeBoothList();
    change(data);
    assert.equal(boothListSchema.safeParse(data).success, false);
  }
});

test("APIレスポンスをZod検証して返し、AbortSignalを渡す", async (t) => {
  const data = makeBoothList();
  const controller = new AbortController();
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, BOOTHS_API_URL);
    assert.equal(options.signal, controller.signal);
    assert.equal(options.headers.Accept, "application/json");
    return new Response(JSON.stringify(data));
  });
  assert.deepEqual(await fetchBooths(controller.signal), data);
});

test("HTTPエラーや不正なJSONでは仮のブースに置き換えずエラーにする", async (t) => {
  const mock = t.mock.method(globalThis, "fetch", async () => new Response("unavailable", { status: 503 }));
  await assert.rejects(fetchBooths(), /503/);
  mock.mock.mockImplementation(async () => new Response(JSON.stringify({ booths: [] })));
  await assert.rejects(fetchBooths());
});
