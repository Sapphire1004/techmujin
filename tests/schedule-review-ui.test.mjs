import assert from "node:assert/strict";
import { after, afterEach, beforeEach, test } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { act, createElement, StrictMode, useState } from "react";
import { Window } from "happy-dom";
import { createServer } from "vite";
import { makeSession } from "./fixtures/sessions.mjs";

const dom = new Window({ url: "http://localhost:5176/" });
for (const key of ["window", "document", "navigator", "HTMLElement", "Element", "Node", "MutationObserver", "ResizeObserver"]) {
  Object.defineProperty(globalThis, key, { configurable: true, value: key === "window" ? dom : dom[key] });
}
globalThis.getComputedStyle = dom.getComputedStyle.bind(dom);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = await import("react-dom/client");
const cacheDir = await mkdtemp(join(tmpdir(), "techmujin-schedule-review-vite-"));
const vite = await createServer({
  cacheDir,
  server: { middlewareMode: true, hmr: false, watch: null, ws: false },
  ssr: { noExternal: [/^@seed-design\//] },
  optimizeDeps: { noDiscovery: true, include: [] },
  appType: "custom",
});
await vite.ssrLoadModule("/src/i18n.ts");
const { SelectedScheduleDialog } = await vite.ssrLoadModule("/src/components/SelectedScheduleDialog.tsx");

const sessions = [makeSession("later", "14:00", "14:30"), makeSession("earlier", "10:00", "10:20")];
let root;
let container;

function Harness({ selected = sessions }) {
  const [open, setOpen] = useState(false);
  return createElement("div", null,
    createElement("button", { id: "review-trigger", disabled: selected.length === 0, onClick: () => setOpen(true) }, "確認"),
    open && createElement(SelectedScheduleDialog, { sessions: selected, conflictIds: new Set(), onClose: () => setOpen(false) }),
  );
}

async function render(selected = sessions) {
  await act(async () => root.render(createElement(StrictMode, null, createElement(Harness, { selected }))));
}

async function open() {
  container.querySelector("#review-trigger").focus();
  await act(async () => container.querySelector("#review-trigger").click());
  return container.querySelector("dialog");
}

beforeEach(() => {
  dom.document.body.innerHTML = '<div id="test-root"></div>';
  dom.document.body.style.overflow = "scroll";
  dom.localStorage.clear();
  container = dom.document.getElementById("test-root");
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
});

after(async () => {
  await vite.close();
  await dom.happyDOM.abort();
  await rm(cacheDir, { recursive: true, force: true });
});

test("初回表示では自動で開かず、選択ゼロ件では開けない", async () => {
  await render([]);
  assert.equal(container.querySelector("dialog"), null);
  assert.equal(container.querySelector("#review-trigger").disabled, true);
  assert.equal(dom.document.body.style.overflow, "scroll");
});

test("選択した予定だけを時間順に並べ、空き時間や保存内容を追加しない", async () => {
  dom.localStorage.setItem("test-existing-data", "keep");
  const before = JSON.stringify(sessions);
  await render();
  const dialog = await open();
  assert.equal(dialog.open, true);
  assert.equal(dialog.getAttribute("aria-labelledby"), "selected-schedule-title");
  assert.deepEqual([...dialog.querySelectorAll("h3")].map(el => el.textContent), ["セッション earlier", "セッション later"]);
  assert.equal(dialog.querySelectorAll("li").length, 2);
  assert.deepEqual([...dialog.querySelectorAll("time")].map(el => el.textContent), ["10:00", "10:20", "14:00", "14:30"]);
  assert.equal(JSON.stringify(sessions), before);
  assert.equal(dom.localStorage.length, 1);
  assert.equal(dom.localStorage.getItem("test-existing-data"), "keep");
});

test("閉じる操作でスクロールロックと元のフォーカスを復元する", async () => {
  await render();
  const dialog = await open();
  assert.equal(dom.document.body.style.overflow, "hidden");
  await act(async () => dialog.querySelector("header button").click());
  assert.equal(container.querySelector("dialog"), null);
  assert.equal(dom.document.body.style.overflow, "scroll");
  assert.equal(dom.document.activeElement.id, "review-trigger");
});

test("日時のオフセット表記が異なっても実際の開始時刻順に表示する", async () => {
  const laterUtc = { ...makeSession("laterUtc", "11:00", "11:20"), startsAt: "2026-11-22T02:00:00Z", endsAt: "2026-11-22T02:20:00Z" };
  await render([laterUtc, makeSession("earlierJst", "10:00", "10:20")]);
  const dialog = await open();
  assert.deepEqual([...dialog.querySelectorAll("h3")].map(el => el.textContent), ["セッション earlierJst", "セッション laterUtc"]);
});

test("Escape相当のcancelでも閉じ、フォーカスを戻す", async () => {
  await render();
  const dialog = await open();
  const event = new dom.Event("cancel", { bubbles: false, cancelable: true });
  await act(async () => dialog.dispatchEvent(event));
  assert.equal(event.defaultPrevented, true);
  assert.equal(container.querySelector("dialog"), null);
  assert.equal(dom.document.body.style.overflow, "scroll");
  assert.equal(dom.document.activeElement.id, "review-trigger");
});

test("別タブの変更などで選択がなくなっても、空表示と閉じる操作を維持する", async () => {
  await render();
  await open();
  await render([]);
  const dialog = container.querySelector("dialog");
  assert.equal(dialog.open, true);
  assert.equal(dialog.querySelectorAll("li").length, 0);
  assert.ok(dialog.querySelector('[role="status"]'));
  assert.ok(dialog.querySelector("header button"));
});
