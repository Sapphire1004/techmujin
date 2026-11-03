import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdtemp, readFile, readdir, rm, writeFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { Window } from "happy-dom";
import { BinaryBitmap, DecodeHintType, HybridBinarizer, QRCodeReader, RGBLuminanceSource } from "@zxing/library";
import { generateStampQr } from "../scripts/generate-stamp-qr.mjs";
import { claimStampLink, createEmptyStampCard, STAMP_SPOTS } from "../src/stamp-rally/rally.ts";

const temporary = await mkdtemp(join(tmpdir(), "techmujin-stamp-qr-"));
const dom = new Window();
const cli = fileURLToPath(new URL("../scripts/generate-stamp-qr.mjs", import.meta.url));
after(async () => {
  await dom.happyDOM.abort();
  await rm(temporary, { recursive: true, force: true });
});

function decodeSvg(svg) {
  const document = new dom.DOMParser().parseFromString(svg, "image/svg+xml");
  const [, , columns, rows] = document.documentElement.getAttribute("viewBox").split(" ").map(Number);
  const scale = 8;
  const width = columns * scale;
  const height = rows * scale;
  const pixels = new Uint8ClampedArray(width * height).fill(255);
  // 保存されたSVGの矩形を画素に展開し、QRリーダーでURLを復号します。
  for (const rect of document.querySelectorAll("g rect")) {
    const x = Number(rect.getAttribute("x")) * scale;
    const y = Number(rect.getAttribute("y")) * scale;
    const w = Number(rect.getAttribute("width")) * scale;
    const h = Number(rect.getAttribute("height")) * scale;
    assert.ok(x >= 4 * scale && y >= 4 * scale);
    assert.ok(x + w <= width - 4 * scale && y + h <= height - 4 * scale);
    for (let row = y; row < y + h; row++) {
      pixels.fill(0, row * width + x, row * width + x + w);
    }
  }
  // 正面・単色のSVGなので、写真向けの位置検出を省いてQR自体の内容を復号します。
  return new QRCodeReader().decode(new BinaryBitmap(
    new HybridBinarizer(new RGBLuminanceSource(pixels, width, height)),
  ), new Map([[DecodeHintType.PURE_BARCODE, true]])).getText();
}

test("生成した全SVGを復号でき、各URLで対応するスタンプを取得できる", async () => {
  const outputDir = join(temporary, "roundtrip");
  const { manifest } = await generateStampQr({ baseUrl: "https://event.example/app/?old=value#access", outputDir });
  assert.equal(manifest.baseUrl, "https://event.example/app/");
  assert.deepEqual(await readdir(outputDir), ["index.html", "manifest.json", ...STAMP_SPOTS.map((spot) => `${spot.id}.svg`)].sort());
  assert.deepEqual(JSON.parse(await readFile(join(outputDir, "manifest.json"), "utf8")), manifest);

  for (const checkpoint of manifest.checkpoints) {
    const decoded = decodeSvg(await readFile(join(outputDir, checkpoint.svg), "utf8"));
    assert.equal(decoded, checkpoint.url);
    const url = new URL(decoded);
    assert.equal(url.origin, "https://event.example");
    assert.equal(url.pathname, "/app/");
    assert.equal(url.search, `?stamp=${checkpoint.id}`);
    assert.equal(url.hash, "#stamp-rally");
    const result = claimStampLink(createEmptyStampCard(), url, "2026-11-03T01:00:00Z");
    assert.equal(result.kind, "added");
    assert.equal(result.spot.id, checkpoint.id);
  }

  const document = new dom.DOMParser().parseFromString(await readFile(join(outputDir, "index.html"), "utf8"), "text/html");
  assert.equal(document.querySelectorAll(".sheet").length, STAMP_SPOTS.length);
  assert.deepEqual([...document.querySelectorAll(".sheet img")].map((image) => image.getAttribute("src")), manifest.checkpoints.map((spot) => spot.svg));
});

test("ローカル用QRにはスマートフォン向けの注意を表示する", async () => {
  const outputDir = join(temporary, "local");
  const { manifest } = await generateStampQr({ baseUrl: "http://localhost:5176/", outputDir });
  assert.ok(manifest.checkpoints.every((spot) => spot.url.startsWith("http://localhost:5176/?stamp=")));
  const html = await readFile(join(outputDir, "index.html"), "utf8");
  assert.match(html, /スマートフォンのlocalhostはPCを指しません/);
});

test("再生成は配布先を更新し、出力先の他のファイルを削除しない", async () => {
  const outputDir = join(temporary, "regenerate");
  await generateStampQr({ baseUrl: "https://preview.example/", outputDir });
  await writeFile(join(outputDir, "custom-notes.txt"), "keep");
  const { manifest } = await generateStampQr({ baseUrl: "https://production.example/", outputDir });
  const decoded = decodeSvg(await readFile(join(outputDir, "spot-1.svg"), "utf8"));
  assert.equal(decoded, manifest.checkpoints[0].url);
  assert.ok(decoded.startsWith("https://production.example/"));
  assert.equal(await readFile(join(outputDir, "custom-notes.txt"), "utf8"), "keep");
});

for (const baseUrl of [undefined, "not-a-url", "javascript:alert(1)", "https://user:password@event.example/"]) {
  test(`不正な配布先では出力先を作らない: ${baseUrl ?? "未指定"}`, async () => {
    const outputDir = join(temporary, `invalid-${String(baseUrl).length}`);
    await assert.rejects(generateStampQr({ baseUrl, outputDir }));
    await assert.rejects(access(outputDir));
  });
}

test("CLIのヘルプ・必須引数エラー・発行コマンドが動作する", () => {
  const help = spawnSync(process.execPath, [cli, "--help"], { encoding: "utf8", cwd: temporary });
  assert.equal(help.status, 0);
  assert.match(help.stdout, /--base-url/);
  const missing = spawnSync(process.execPath, [cli], { encoding: "utf8", cwd: temporary });
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /配布先の完全なURL/);
  const created = spawnSync(process.execPath, [cli, "--base-url", "https://event.example/", "--output", join(temporary, "cli")], { encoding: "utf8", cwd: temporary });
  assert.equal(created.status, 0, created.stderr);
  assert.match(created.stdout, /5か所のQRを作成しました/);
});
