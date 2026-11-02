import assert from "node:assert/strict";
import { test } from "node:test";
import { APP_VIEWS, getAppHash, getAppView } from "../src/navigation.ts";
import { rallyTranslations } from "../src/stamp-rally/translations.ts";

const routes = {
  program: "#timetable",
  access: "#access",
  venue: "#venue",
  "stamp-rally": "#stamp-rally",
};

test("4画面を共通ナビゲーションで扱う", () => {
  assert.deepEqual(APP_VIEWS, Object.keys(routes));
});

for (const [view, hash] of Object.entries(routes)) {
  test(`${hash}で${view}へ直接移動できる`, () => {
    assert.equal(getAppView(hash), view);
  });

  test(`${view}の遷移先を復元できる`, () => {
    assert.equal(getAppHash(view), hash);
    assert.equal(getAppView(getAppHash(view)), view);
  });
}

test("空または未対応のハッシュはプログラムへ戻す", () => {
  for (const hash of ["", "#", "#unknown", "#program", "#stamp-rally/unknown"]) {
    assert.equal(getAppView(hash), "program");
  }
});

for (const language of ["ja", "en", "ko"]) {
  test(`${language}のラリー翻訳が共通ナビゲーションを上書きしない`, () => {
    const resource = rallyTranslations[language];
    assert.deepEqual(Object.keys(resource), ["rally"]);
    assert.ok(resource.rally.title);
    assert.ok(resource.rally.prototype);
    assert.ok(resource.rally.prototypeDescription);
  });
}
