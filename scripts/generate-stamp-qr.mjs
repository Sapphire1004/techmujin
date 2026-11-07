import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { BarcodeFormat, EncodeHintType, QRCodeWriter } from "@zxing/library";
import { createStampLink, STAMP_SPOTS } from "../src/stamp-rally/rally.ts";

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function normalizeBaseUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("--base-url に配布先の完全なURLを指定してください。");
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("認証情報を含まないHTTPまたはHTTPSのURLを指定してください。");
  }
  url.search = "";
  url.hash = "";
  return url;
}

function createQrSvg(url, title) {
  const hints = new Map([
    [EncodeHintType.MARGIN, 4],
    [EncodeHintType.ERROR_CORRECTION, "M"],
  ]);
  const matrix = new QRCodeWriter().encode(url, BarcodeFormat.QR_CODE, 0, 0, hints);
  const size = matrix.getWidth();
  const rectangles = [];
  // 横に連続する黒いモジュールを1つの矩形にまとめ、SVGを小さく保ちます。
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!matrix.get(x, y)) continue;
      const start = x;
      while (x + 1 < size && matrix.get(x + 1, y)) x++;
      rectangles.push(`<rect x="${start}" y="${y}" width="${x - start + 1}" height="1"/>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 ${size} ${size}" role="img" aria-labelledby="title" shape-rendering="crispEdges">
<title id="title">${escapeHtml(title)}</title>
<rect width="${size}" height="${size}" fill="#fff"/>
<g fill="#000">${rectangles.join("")}</g>
</svg>\n`;
}

function createPrintPage(baseUrl, checkpoints) {
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(baseUrl.hostname);
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>テック無尽 スタンプラリー QR配布用</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #f2f0f5; color: #241c35; font-family: system-ui, sans-serif; line-height: 1.6; }
    .controls { max-width: 42rem; margin: 2rem auto; padding: 0 1rem; }
    .controls h1 { font-size: 1.5rem; }
    .controls code, .url { overflow-wrap: anywhere; }
    button, .download { display: inline-block; padding: .75rem 1rem; border: 0; background: #6b3eb0; color: white; font: inherit; cursor: pointer; text-decoration: none; }
    .sheet { max-width: 40rem; margin: 1.5rem auto; padding: 2.5rem 1.25rem; background: white; text-align: center; break-after: page; }
    .brand { color: #6b3eb0; font-weight: 800; letter-spacing: .12em; }
    .spot { margin: 1.5rem 0 0; font-size: 1rem; }
    h2 { margin: .25rem 0 1rem; font-size: clamp(1.5rem, 5vw, 2rem); }
    img { display: block; width: min(100%, 20rem); height: auto; margin: 1rem auto; }
    .instruction { max-width: 25rem; margin: 1rem auto; }
    .url { display: block; margin: 1.5rem auto; font-size: .75rem; color: #514a5d; }
    .download { font-size: .875rem; }
    .warning { font-weight: 700; color: #922b21; }
    @page { size: A4; margin: 15mm; }
    @media print {
      body { background: white; }
      .controls, .download { display: none; }
      .sheet { max-width: none; margin: 0; padding: 15mm 0; }
      .sheet:last-child { break-after: auto; }
      img { width: 90mm; }
    }
  </style>
</head>
<body>
  <header class="controls">
    <h1>スタンプラリー QR配布用</h1>
    <p>配布先: <code>${escapeHtml(baseUrl.href)}</code></p>
    <p>各SVGを保存するか、このページを印刷してください。1チェックポイントにつき1ページです。</p>
    ${local ? '<p class="warning">ローカル確認用です。スマートフォンのlocalhostはPCを指しません。会場用QRは配布先のHTTPS URLで作り直してください。</p>' : ""}
    <p>設置前に、配布先へURL取得対応版をデプロイし、QRを読み取ってスタンプを取得できることを確認してください。</p>
    <button type="button" onclick="window.print()">印刷 / PDFで保存</button>
  </header>
  <main>
    ${checkpoints.map((spot) => `<section class="sheet">
      <p class="brand">TECHMUJIN 2026 / STAMP RALLY</p>
      <p class="spot">SPOT ${escapeHtml(spot.number)}</p>
      <h2>${escapeHtml(spot.title)}</h2>
      <img src="${spot.svg}" alt="${escapeHtml(spot.title)}のスタンプ取得用QRコード" width="512" height="512">
      <p class="instruction">スマートフォンのカメラでQRを読み取り、表示されたURLを開いてください。</p>
      <p>スタンプを集めて、すべてのチェックポイントを巡りましょう。</p>
      <code class="url">${escapeHtml(spot.url)}</code>
      <a class="download" href="${spot.svg}" download>QR画像を保存（SVG）</a>
    </section>`).join("\n")}
  </main>
</body>
</html>\n`;
}

export async function generateStampQr({ baseUrl, outputDir = "artifacts/stamp-rally-qr" }) {
  const url = normalizeBaseUrl(baseUrl);
  const checkpoints = STAMP_SPOTS.map((spot) => ({
    id: spot.id,
    number: spot.number,
    title: spot.title,
    url: createStampLink(spot.id, url.href),
    svg: `${spot.id}.svg`,
  }));
  // QRの生成を先に完了させ、入力エラーでは出力先を変更しません。
  const images = checkpoints.map((spot) => ({ ...spot, content: createQrSvg(spot.url, spot.title) }));
  const manifest = { version: 1, baseUrl: url.href, checkpoints };
  const destination = resolve(outputDir);
  await mkdir(destination, { recursive: true });
  await Promise.all([
    ...images.map((spot) => writeFile(resolve(destination, spot.svg), spot.content)),
    writeFile(resolve(destination, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`),
    writeFile(resolve(destination, "index.html"), createPrintPage(url, checkpoints)),
  ]);
  return { destination, manifest };
}

const help = `チェックポイントごとのQR画像と印刷ページを作成します（Node.js 22.18以降）。

使用方法:
  pnpm generate:stamp-qr --base-url https://配布先のホスト/
  pnpm generate:stamp-qr --base-url http://localhost:5176/ --output artifacts/stamp-rally-qr-local

オプション:
  --base-url  QRを開く配布先URL（必須）
  --output    出力フォルダー（既定: artifacts/stamp-rally-qr）
  --help      この説明を表示

チェックポイントの名称・数は src/stamp-rally/rally.ts の STAMP_SPOTS を使用します。
同じ出力先で再実行すると、同名の生成ファイルを更新します。`;

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const { values } = parseArgs({ options: {
      "base-url": { type: "string" },
      output: { type: "string" },
      help: { type: "boolean" },
    } });
    if (values.help) {
      console.log(help);
    } else {
      const { destination, manifest } = await generateStampQr({ baseUrl: values["base-url"], outputDir: values.output });
      console.log(`${manifest.checkpoints.length}か所のQRを作成しました: ${destination}`);
      console.log("index.html をブラウザーで開くと、確認・印刷・SVGの保存ができます。");
      console.log("配布先にURL取得対応版をデプロイしてから、実機で確認してください。");
    }
  } catch (error) {
    console.error(error.message);
    console.error("pnpm generate:stamp-qr --help で使用方法を確認してください。");
    process.exitCode = 1;
  }
}
