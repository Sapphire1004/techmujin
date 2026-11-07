import assert from "node:assert/strict";
import { after, afterEach, beforeEach, test } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { act, createElement, StrictMode } from "react";
import { Window } from "happy-dom";
import { createServer } from "vite";
import { STAMP_RALLY_STORAGE_KEY } from "../src/stamp-rally/rally.ts";

// 実端末のカメラではなく、URLを開いた後のReact・保存・画面遷移を検証します。
const appUrl = "http://localhost:5176/";
const dom = new Window({ url: appUrl });
for (const key of ["window", "document", "navigator", "HTMLElement", "Element", "Node", "MutationObserver", "ResizeObserver"]) {
  Object.defineProperty(globalThis, key, { configurable: true, value: key === "window" ? dom : dom[key] });
}
globalThis.getComputedStyle = dom.getComputedStyle.bind(dom);
globalThis.requestAnimationFrame = dom.requestAnimationFrame.bind(dom);
globalThis.cancelAnimationFrame = dom.cancelAnimationFrame.bind(dom);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = await import("react-dom/client");
// 開発サーバーの最適化済みモジュールをテストで上書きしないよう分離します。
const cacheDir = await mkdtemp(join(tmpdir(), "techmujin-rally-ui-vite-"));
const vite = await createServer({
  cacheDir,
  server: { middlewareMode: true, hmr: false, watch: null, ws: false },
  ssr: { noExternal: [/^@seed-design\//] },
  optimizeDeps: { noDiscovery: true, include: [] },
  appType: "custom",
});
const { StampRallyApp } = await vite.ssrLoadModule("/src/stamp-rally/StampRallyApp.tsx");
let root;
let container;
const originalSetItem = dom.localStorage.setItem;
function setStorageWriter(value) {
  Object.defineProperty(dom.localStorage, "setItem", { configurable: true, writable: true, value });
}
const savedCard = () => JSON.parse(dom.localStorage.getItem(STAMP_RALLY_STORAGE_KEY));
const collectedCount = () => container.querySelectorAll('[data-collected="true"]').length;

async function render(url) {
  dom.history.replaceState(null, "", url);
  await act(async () => {
    root.render(createElement(StrictMode, null,
      createElement(StampRallyApp, {
        renderTimetable: (view) => createElement("main", { "data-view": view }, view),
      }),
    ));
  });
  // 初回の遅延読み込みが完了するまで、上限を設けて待ちます。
  for (let i = 0; i < 100 && !container.querySelector("#stamp-rally-panel"); i++) {
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); });
  }
}

async function navigate(url, event = "popstate") {
  await act(async () => {
    dom.history.pushState(null, "", url);
    dom.dispatchEvent(new dom.Event(event));
  });
}

beforeEach(() => {
  dom.localStorage.clear();
  dom.document.body.innerHTML = '<div id="test-root"></div>';
  container = dom.document.getElementById("test-root");
  root = createRoot(container);
});

afterEach(async () => {
  setStorageWriter(originalSetItem);
  await act(async () => root.unmount());
});

after(async () => {
  await vite.close();
  await dom.happyDOM.abort();
  await rm(cacheDir, { recursive: true, force: true });
});

test("初回URLで自動参加・保存し、StrictModeでも成功表示と取得数を保つ", async () => {
  await render(`${appUrl}?stamp=spot-1&ref=qr`);
  assert.ok(container.querySelector("#stamp-rally-panel"));
  assert.equal(collectedCount(), 1);
  assert.ok(savedCard().joinedAt);
  assert.ok(savedCard().visits["spot-1"]);
  assert.match(container.querySelector('.rally-link-feedback[role="status"]').textContent, /スタンプを獲得しました/);
  assert.equal(dom.location.search, "?ref=qr");
  assert.equal(dom.location.hash, "#stamp-rally");

  const first = savedCard();
  await navigate(`${appUrl}?stamp=spot-1#access`);
  assert.equal(collectedCount(), 1);
  assert.deepEqual(savedCard(), first);
  assert.match(container.querySelector(".rally-link-feedback").textContent, /獲得済み/);
});

test("再読み込みで復元し、2個目の取得が既存記録やタイムテーブル保存を変更しない", async () => {
  const existing = { version: 1, joinedAt: "2026-11-01T01:00:00Z", visits: { "spot-1": "2026-11-01T01:01:00Z" } };
  dom.localStorage.setItem(STAMP_RALLY_STORAGE_KEY, JSON.stringify(existing));
  dom.localStorage.setItem("techmujin:timetable:v3", '["session-1"]');
  // 保存済みの別タブを開く場合と同じ、新規マウントから復元します。
  await render(`${appUrl}#stamp-rally`);
  assert.equal(collectedCount(), 1);
  assert.deepEqual(savedCard(), existing);
  await navigate(`${appUrl}?stamp=spot-2#stamp-rally`);
  assert.equal(collectedCount(), 2);
  assert.equal(savedCard().visits["spot-1"], existing.visits["spot-1"]);
  assert.equal(savedCard().joinedAt, existing.joinedAt);
  assert.equal(dom.localStorage.getItem("techmujin:timetable:v3"), '["session-1"]');
});

test("不正なURLはエラーを表示し、カード作成や保存をしない", async () => {
  await render(`${appUrl}?stamp=spot-1&stamp=spot-2`);
  assert.equal(collectedCount(), 0);
  assert.equal(dom.localStorage.getItem(STAMP_RALLY_STORAGE_KEY), null);
  assert.match(container.querySelector('.rally-link-feedback[role="alert"]').textContent, /URLが正しくありません/);
  assert.equal(dom.location.search, "");
});

test("保存失敗ではURLと再試行を残し、再試行の成功後にだけURLを整える", async () => {
  setStorageWriter(() => { throw new Error("storage blocked"); });
  await render(`${appUrl}?stamp=spot-3`);
  assert.equal(dom.localStorage.getItem(STAMP_RALLY_STORAGE_KEY), null);
  assert.equal(dom.location.search, "?stamp=spot-3");
  const feedback = container.querySelector(".rally-link-feedback");
  assert.equal(feedback.getAttribute("role"), "alert");
  assert.match(feedback.textContent, /保存できませんでした/);
  assert.equal(container.querySelector('.rally-link-feedback[role="status"]'), null);

  setStorageWriter(originalSetItem);
  await act(async () => feedback.querySelector("button").click());
  assert.ok(savedCard().visits["spot-3"]);
  assert.equal(Object.keys(savedCard().visits).length, 1);
  assert.equal(dom.location.search, "");
  assert.equal(container.querySelector(".storage-warning"), null);
  assert.ok(container.querySelector('.rally-link-feedback[role="status"]'));
});

test("別タブのstorage通知でカードを更新し、次のURL取得でも記録を維持する", async () => {
  await render(`${appUrl}?stamp=spot-1`);
  const otherTab = { ...savedCard(), visits: { ...savedCard().visits, "spot-2": "2026-11-01T02:00:00Z" } };
  dom.localStorage.setItem(STAMP_RALLY_STORAGE_KEY, JSON.stringify(otherTab));
  await act(async () => dom.dispatchEvent(new dom.StorageEvent("storage", { key: STAMP_RALLY_STORAGE_KEY })));
  assert.equal(collectedCount(), 2);
  await navigate(`${appUrl}?stamp=spot-3`);
  assert.equal(collectedCount(), 3);
  assert.equal(savedCard().visits["spot-2"], otherTab.visits["spot-2"]);
});

test("共通ヘッダーの画面切り替えと履歴移動が取得後も動作する", async () => {
  await render(`${appUrl}?stamp=spot-1`);
  await act(async () => container.querySelector('.site-header__nav button[aria-controls="access-panel"]').click());
  assert.equal(container.querySelector("[data-view]").getAttribute("data-view"), "access");
  assert.equal(dom.location.hash, "#access");
  await navigate(`${appUrl}?stamp=spot-2#timetable`);
  assert.equal(collectedCount(), 2);
  await navigate(`${appUrl}#timetable`, "hashchange");
  assert.equal(container.querySelector("[data-view]").getAttribute("data-view"), "program");
});

test("QR読み取りボタンでスキャン画面を開き、閉じて再度開ける", async () => {
  await render(`${appUrl}?stamp=spot-1`);
  const scanButton = container.querySelector(".rally-primary-action");
  assert.match(scanButton.textContent, /この画面でQRを読む/);
  await act(async () => scanButton.click());
  for (let i = 0; i < 100 && !container.querySelector(".rally-dialog[open]"); i++) {
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); });
  }
  const dialog = container.querySelector(".rally-dialog[open]");
  assert.ok(dialog);
  assert.match(dialog.querySelector(".rally-dialog__action").textContent, /カメラをオン/);
  await act(async () => dialog.querySelector(".rally-dialog__close").click());
  assert.equal(container.querySelector(".rally-dialog"), null);
  await act(async () => scanButton.click());
  assert.ok(container.querySelector(".rally-dialog[open]"));
});

test("参加ボタン1回でカード作成とカメラ要求へ進み、再度開く場合も自動起動する", async (t) => {
  const secureContext = Object.getOwnPropertyDescriptor(dom, "isSecureContext");
  const mediaDevices = Object.getOwnPropertyDescriptor(dom.navigator, "mediaDevices");
  let requests = 0;
  Object.defineProperty(dom, "isSecureContext", { configurable: true, value: true });
  Object.defineProperty(dom.navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: async () => {
      requests++;
      throw Object.assign(new Error("permission denied"), { name: "NotAllowedError" });
    } },
  });
  t.after(() => {
    if (secureContext) Object.defineProperty(dom, "isSecureContext", secureContext);
    else delete dom.isSecureContext;
    if (mediaDevices) Object.defineProperty(dom.navigator, "mediaDevices", mediaDevices);
    else delete dom.navigator.mediaDevices;
  });

  await render(`${appUrl}#stamp-rally`);
  const joinButton = container.querySelector(".rally-primary-action");
  assert.equal(joinButton.textContent, "参加する");
  assert.equal(requests, 0);
  await act(async () => joinButton.click());
  for (let i = 0; i < 100 && requests === 0; i++) {
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); });
  }
  assert.ok(savedCard().joinedAt);
  assert.deepEqual(savedCard().visits, {});
  assert.equal(requests, 1);
  const dialog = container.querySelector(".rally-dialog[open]");
  assert.ok(dialog);
  assert.match(dialog.querySelector('[role="alert"]').textContent, /カメラへのアクセスが許可されていません/);

  await act(async () => dialog.querySelector(".rally-dialog__close").click());
  const scanButton = container.querySelector(".rally-primary-action");
  assert.match(scanButton.textContent, /この画面でQRを読む/);
  await act(async () => scanButton.click());
  assert.equal(requests, 2);
  assert.ok(container.querySelector(".rally-dialog[open]"));
});
