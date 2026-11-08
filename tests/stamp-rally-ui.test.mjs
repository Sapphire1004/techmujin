import assert from "node:assert/strict";
import { after, afterEach, beforeEach, test } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { act, createElement, StrictMode } from "react";
import { Window } from "happy-dom";
import { createServer } from "vite";
import { BrowserQRCodeReader } from "@zxing/browser";
import { STAMP_RALLY_STORAGE_KEY } from "../src/stamp-rally/rally.ts";
import { makeBoothList } from "./fixtures/booths.mjs";

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
const { VenueGuide } = await vite.ssrLoadModule("/src/components/VenueGuide.tsx");
const originalFetch = globalThis.fetch;
let root;
let container;
const originalSetItem = dom.localStorage.setItem;
function setStorageWriter(value) {
  Object.defineProperty(dom.localStorage, "setItem", { configurable: true, writable: true, value });
}
const savedCard = () => JSON.parse(dom.localStorage.getItem(STAMP_RALLY_STORAGE_KEY));
const collectedCount = () => container.querySelectorAll('[data-collected="true"]').length;

function mockQrCamera(t) {
  const secureContext = Object.getOwnPropertyDescriptor(dom, "isSecureContext");
  const mediaDevices = Object.getOwnPropertyDescriptor(dom.navigator, "mediaDevices");
  let decode;
  let stopped = 0;
  const stream = new dom.MediaStream();
  Object.defineProperty(stream, "getTracks", { value: () => [{ stop: () => stopped++ }] });
  Object.defineProperty(dom, "isSecureContext", { configurable: true, value: true });
  Object.defineProperty(dom.navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: async () => stream },
  });
  t.mock.method(dom.HTMLMediaElement.prototype, "play", async () => {});
  t.mock.method(BrowserQRCodeReader.prototype, "decodeFromStream", async (_stream, _video, callback) => {
    decode = callback;
    return { stop: () => stopped++ };
  });
  t.after(() => {
    if (secureContext) Object.defineProperty(dom, "isSecureContext", secureContext);
    else delete dom.isSecureContext;
    if (mediaDevices) Object.defineProperty(dom.navigator, "mediaDevices", mediaDevices);
    else delete dom.navigator.mediaDevices;
  });
  return {
    async read(payload) {
      assert.equal(typeof decode, "function", "カメラ読み取りが開始されている");
      await act(async () => decode({ getText: () => payload }));
    },
    get stopped() { return stopped; },
  };
}

async function openScanner() {
  await act(async () => container.querySelector(".rally-primary-action").click());
  for (let i = 0; i < 100 && !container.querySelector('.rally-viewfinder__status')?.textContent.includes("探しています"); i++) {
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
  }
  return container.querySelector(".rally-dialog[open]");
}

async function render(url, { waitForCard = true } = {}) {
  dom.history.replaceState(null, "", url);
  await act(async () => {
    root.render(createElement(StrictMode, null,
      createElement(StampRallyApp, {
        renderTimetable: (view, booths) => createElement("main", { "data-view": view },
          view === "venue" ? createElement(VenueGuide, { view: "interior", booths }) : view),
      }),
    ));
  });
  // 初回の遅延読み込みが完了するまで、上限を設けて待ちます。
  for (let i = 0; waitForCard && i < 100 && !container.querySelector("#stamp-rally-panel"); i++) {
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
  globalThis.fetch = async () => new Response(JSON.stringify(makeBoothList()));
  dom.localStorage.clear();
  dom.document.body.style.overflow = "";
  dom.document.body.innerHTML = '<div id="test-root"></div>';
  container = dom.document.getElementById("test-root");
  root = createRoot(container);
});

afterEach(async () => {
  globalThis.fetch = originalFetch;
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

test("モバイルメニューの選択・閉じる・Escapeでスクロールとフォーカスを復元する", async () => {
  await render(`${appUrl}#stamp-rally`);
  dom.document.body.style.overflow = "auto";
  const open = container.querySelector(".site-header__menu-button");
  const menu = container.querySelector("#mobile-navigation");

  await act(async () => open.click());
  assert.equal(menu.open, true);
  assert.equal(open.getAttribute("aria-expanded"), "true");
  assert.equal(dom.document.body.style.overflow, "hidden");
  await act(async () => menu.querySelector('button[aria-controls="access-panel"]').click());
  assert.equal(menu.open, false);
  assert.equal(open.getAttribute("aria-expanded"), "false");
  assert.equal(dom.location.hash, "#access");
  assert.equal(dom.document.body.style.overflow, "auto");
  assert.equal(dom.document.activeElement, open);

  await act(async () => open.click());
  await act(async () => menu.querySelector(".site-menu__close").click());
  assert.equal(menu.open, false);
  assert.equal(dom.document.body.style.overflow, "auto");
  await act(async () => open.click());
  await act(async () => menu.dispatchEvent(new dom.Event("cancel", { cancelable: true })));
  assert.equal(menu.open, false);
  assert.equal(dom.document.body.style.overflow, "auto");
  assert.equal(dom.document.activeElement, open);
});

test("モバイルメニューを開いたままPC幅へ戻っても閉じてスクロールを復元する", async () => {
  dom.happyDOM.setWindowSize({ width: 390, height: 844 });
  await render(`${appUrl}#stamp-rally`);
  const open = container.querySelector(".site-header__menu-button");
  await act(async () => open.click());
  assert.equal(dom.document.body.style.overflow, "hidden");
  await act(async () => dom.happyDOM.setWindowSize({ width: 1024, height: 768 }));
  assert.equal(container.querySelector("#mobile-navigation").open, false);
  assert.equal(open.getAttribute("aria-expanded"), "false");
  assert.equal(dom.document.body.style.overflow, "");
});

test("読み取り成功はカメラを停止し、時間が経っても結果を保持してボタンでカードへ戻る", async (t) => {
  const camera = mockQrCamera(t);
  await render(`${appUrl}#stamp-rally`);
  const dialog = await openScanner();
  await camera.read(`${appUrl}?stamp=spot-1#stamp-rally`);
  assert.ok(camera.stopped > 0);
  assert.equal(dialog.querySelector('.rally-dialog__camera').hidden, true);
  assert.match(dialog.querySelector('.rally-scan-result[role="status"]').textContent, /スタンプを獲得/);
  assert.ok(savedCard().visits['spot-1']);
  t.mock.timers.enable({ apis: ["setTimeout"] });
  await act(async () => t.mock.timers.tick(30_000));
  assert.equal(dialog.open, true);
  assert.ok(dialog.querySelector('[data-kind="added"]'));
  assert.match(dialog.querySelector('.rally-scan-result__progress').textContent, /1\s*\/\s*4/);
  await act(async () => dialog.querySelector('.rally-scan-result__actions button').click());
  assert.equal(container.querySelector('.rally-dialog'), null);
  assert.equal(dom.document.activeElement, container.querySelector('.rally-collection'));
  assert.equal(collectedCount(), 1);
  assert.equal(container.querySelectorAll('[data-recent="true"]').length, 1);
});

test("重複は取得数と最初の時刻を維持し、別のQRでは取得せず再読み取りできる", async (t) => {
  const camera = mockQrCamera(t);
  await render(`${appUrl}?stamp=spot-1`);
  const first = savedCard();
  let dialog = await openScanner();
  await camera.read(`${appUrl}?stamp=spot-1#stamp-rally`);
  assert.ok(dialog.querySelector('[data-kind="duplicate"]'));
  assert.deepEqual(savedCard(), first);
  await act(async () => dialog.querySelector('.rally-scan-result__actions button').click());
  assert.equal(container.querySelectorAll('[data-recent="true"]').length, 0);
  dialog = await openScanner();
  await camera.read('https://other.example/?stamp=spot-2');
  assert.ok(dialog.querySelector('[data-kind="invalid"][role="alert"]'));
  assert.deepEqual(savedCard(), first);
  await act(async () => dialog.querySelector('.rally-scan-result__actions button').click());
  assert.equal(dialog.querySelector('.rally-dialog__camera').hidden, false);
  assert.equal(dialog.querySelector('.rally-scan-result'), null);
  await camera.read(`${appUrl}?stamp=spot-2#stamp-rally`);
  assert.ok(dialog.querySelector('[data-kind="added"]'));
  assert.equal(collectedCount(), 2);
});

test("スキャン後の保存失敗は完了表示にせず、再撮影なしで再試行して保存する", async (t) => {
  const camera = mockQrCamera(t);
  await render(`${appUrl}?stamp=spot-1`);
  const dialog = await openScanner();
  setStorageWriter(() => { throw new Error('storage blocked'); });
  await camera.read(`${appUrl}?stamp=spot-2#stamp-rally`);
  assert.ok(dialog.querySelector('[data-kind="save-error"][role="alert"]'));
  assert.equal(dialog.querySelector('.rally-scan-result__progress'), null);
  assert.equal(savedCard().visits['spot-2'], undefined);
  await act(async () => dialog.querySelector('.rally-scan-result__actions button').click());
  assert.ok(dialog.querySelector('[data-kind="save-error"]'));
  setStorageWriter(originalSetItem);
  await act(async () => dialog.querySelector('.rally-scan-result__actions button').click());
  assert.ok(dialog.querySelector('[data-kind="added"][role="status"]'));
  assert.ok(savedCard().visits['spot-2']);
  assert.equal(Object.keys(savedCard().visits).length, 2);
  await act(async () => dialog.querySelector('.rally-scan-result__actions button').click());
  assert.equal(container.querySelector('.rally-dialog'), null);
  assert.equal(collectedCount(), 2);
});

test("APIの8ブースを表示し、過去の対象外スタンプを完了条件に含めない", async () => {
  const data = makeBoothList(["1", "2", "3", "4", "5", "6", "7", "A-1"]);
  globalThis.fetch = async () => new Response(JSON.stringify(data));
  const existing = {
    version: 1, joinedAt: "2026-11-01T01:00:00Z",
    visits: Object.fromEntries(["1", "2", "3", "4", "5", "6", "7", "removed"].map(number => [`spot-${number}`, "2026-11-01T01:01:00Z"])),
  };
  dom.localStorage.setItem(STAMP_RALLY_STORAGE_KEY, JSON.stringify(existing));
  await render(`${appUrl}#stamp-rally`);
  assert.equal(container.querySelectorAll(".rally-stamp-card").length, 8);
  assert.equal(collectedCount(), 7);
  assert.equal(container.querySelector('[role="progressbar"]').getAttribute("aria-valuemax"), "8");
  assert.match(container.querySelector('.rally-progress__numbers').textContent, /7\s*\/\s*8/);
  assert.match(container.querySelector('.masthead__note').textContent, /8か所/);
  assert.ok(container.querySelector(".rally-primary-action"));
  await navigate(`${appUrl}?stamp=spot-A-1`);
  assert.equal(collectedCount(), 8);
  assert.match(container.querySelector('.rally-progress__numbers').textContent, /8\s*\/\s*8/);
  assert.equal(container.querySelector(".rally-primary-action"), null);
  assert.ok(savedCard().visits["spot-removed"]);
});

test("API取得中はURLを保ち、取得成功後に初回スタンプを処理する", async () => {
  const pending = [];
  globalThis.fetch = () => new Promise(resolve => pending.push(resolve));
  await render(`${appUrl}?stamp=spot-2`, { waitForCard: false });
  assert.equal(dom.location.search, "?stamp=spot-2");
  assert.equal(savedCard(), null);
  assert.equal(container.querySelector(".rally-primary-action"), null);
  assert.match(container.querySelector('[role="status"]').textContent, /ブース情報を読み込んでいます/);
  await act(async () => {
    for (const resolve of pending) resolve(new Response(JSON.stringify(makeBoothList())));
  });
  assert.equal(collectedCount(), 1);
  assert.ok(savedCard().visits["spot-2"]);
  assert.equal(dom.location.search, "");
});

test("API失敗時は保存済みカードとURLを保ち、再試行後に取得する", async () => {
  globalThis.fetch = async () => new Response("unavailable", { status: 503 });
  const existing = { version: 1, joinedAt: "2026-11-01T01:00:00Z", visits: { "spot-1": "2026-11-01T01:01:00Z" } };
  dom.localStorage.setItem(STAMP_RALLY_STORAGE_KEY, JSON.stringify(existing));
  await render(`${appUrl}?stamp=spot-3`, { waitForCard: false });
  assert.deepEqual(savedCard(), existing);
  assert.equal(dom.location.search, "?stamp=spot-3");
  const error = container.querySelector('.venue-state[role="alert"]');
  assert.match(error.textContent, /取得できませんでした/);
  assert.equal(container.querySelector('.rally-primary-action'), null);
  globalThis.fetch = async () => new Response(JSON.stringify(makeBoothList()));
  await act(async () => error.querySelector("button").click());
  assert.equal(collectedCount(), 2);
  assert.ok(savedCard().visits["spot-3"]);
  assert.equal(dom.location.search, "");
});

test("ブースが0件なら参加・読み取りや誤った完了状態を表示しない", async () => {
  globalThis.fetch = async () => new Response(JSON.stringify(makeBoothList([])));
  await render(`${appUrl}#stamp-rally`, { waitForCard: false });
  assert.match(container.querySelector('.venue-state[role="status"]').textContent, /準備しています/);
  assert.equal(container.querySelector('.rally-primary-action'), null);
  assert.equal(container.querySelector('[role="progressbar"]'), null);
  assert.equal(savedCard(), null);
});

test("会場のブース一覧とスタンプカードが同じAPIの番号・名称を使う", async () => {
  const data = makeBoothList(["A-1", "0", "3"]);
  data.booths[0].title = "共同展示";
  data.booths[0].communities.push({ ...data.booths[0].communities[0], id: "another", name: "別の出展者", url: null });
  data.booths[1].title = "運営受付";
  data.booths[1].communities = [];
  data.booths[2].communities[0].url = null;
  globalThis.fetch = async () => new Response(JSON.stringify(data));
  await render(`${appUrl}#stamp-rally`);
  const titles = [...container.querySelectorAll('.rally-stamp-card h3')].map(node => node.textContent);
  assert.deepEqual(titles, ["共同展示", "運営受付", "kintone Café 山梨"]);
  await navigate(`${appUrl}#venue`);
  const booths = [...container.querySelectorAll('.booth-card')];
  assert.equal(booths.length, 3);
  assert.deepEqual(booths.map(booth => booth.querySelector('h4').textContent), titles);
  assert.match(booths[0].textContent, /別の出展者/);
  assert.match(booths[0].querySelector('.booth-card__number').textContent, /A-1/);
  assert.equal(booths[1].querySelector('a'), null);
  assert.equal(booths[2].querySelector('a'), null);
});
