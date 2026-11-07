# スタンプラリーのQR作成・配布

チェックポイントごとの取得用URLをQR画像に変換します。QR発行用のサーバーやログインは不要です。生成処理はPC上で行い、外部のQR作成サービスには送信しません。

## 会場用QRを作る

Node.js 22.18以降で、プロジェクトの依存関係をインストールした状態で実行します。

```bash
pnpm generate:stamp-qr --base-url https://techmujin-timetable.zhzkal2.workers.dev/
```

`--base-url` には参加者が使うアプリのURLを指定してください。独自ドメインに変更する場合は、そのURLで作り直します。パスに配置する場合は `https://example.com/app/` のように末尾のパスまで指定します。クエリーとハッシュは取り除いてから、チェックポイント用の値を設定します。

事前に、このブランチのQR URLによる自動取得に対応したアプリを同じ配布先へデプロイしてください。QR画像を生成するだけでは、アプリの公開・更新は行われません。

出力先は `artifacts/stamp-rally-qr/` です。

| ファイル | 用途 |
| --- | --- |
| `spot-1.svg` ～ `spot-5.svg` | 各チェックポイントに置くQR画像。拡大・印刷やFigmaへの配置に利用できます |
| `index.html` | QR一覧・画像保存・印刷用ページ。印刷時は1チェックポイントにつき1ページです |
| `manifest.json` | チェックポイントID・名称・取得URL・画像ファイル名の対応表 |

`index.html` をブラウザーで開き、「印刷 / PDFで保存」を選ぶか、個別のSVGを保存してください。開発サーバーをポート5176で起動している場合は、`http://localhost:5176/artifacts/stamp-rally-qr/index.html` からも確認できます。

```bash
# 出力先を指定する場合
pnpm generate:stamp-qr --base-url https://techmujin-timetable.zhzkal2.workers.dev/ --output artifacts/stamp-rally-qr-print

# 使用方法を確認
pnpm generate:stamp-qr --help
```

既定の出力先と `artifacts/stamp-rally-qr-` で始まる出力先はGitの管理対象から外しています。生成物はWebアプリのビルドにも含まれません。同じフォルダーへ再生成すると、同名の生成ファイルを更新します。

## 名称・チェックポイントの変更

設定元は [src/stamp-rally/rally.ts](../src/stamp-rally/rally.ts) の `STAMP_SPOTS` です。現在は仮の5か所です。名称を変更した後に再生成すると、印刷ページと対応表にも反映されます。

名称のみの変更では `id` を維持してください。QRの取得先と保存済みスタンプの対応に使用しています。QRには `stamprally:v1:spot-1` のような旧テキストではなく、次の形式のURLを入れます。

```text
https://techmujin-timetable.zhzkal2.workers.dev/?stamp=spot-1#stamp-rally
```

## ローカル用QRを作る

```bash
pnpm generate:stamp-qr --base-url http://localhost:5176/ --output artifacts/stamp-rally-qr-local
```

これはPCのブラウザー内の補助スキャナーで読み取る場合などに使います。スマートフォンでQRを読むと、`localhost` はスマートフォン自身を指すため、PCのアプリには接続できません。実機確認には、URL自動取得に対応したバージョンを公開したHTTPSの配布先URLを使ってください。

## 設置前の確認

1. 生成した画像を別画面に表示するか、印刷します。QR周囲の白い余白を残してください。
2. スマートフォンの標準カメラで読み取り、表示されたURLを開きます。
3. 正しいチェックポイントのスタンプが増え、再読み込み後も残ることを確認します。
4. 同じQRをもう一度開いても数が増えず、別のQRでは増えることを確認します。

記録はサイトとブラウザーごとの `localStorage` に保存されます。カメラが開くブラウザーを統一して確認してください。NFCタグを使う場合も、`manifest.json` にある同じURLを設定できます。

## 自動検証

```bash
pnpm test:stamp-qr
```

生成したSVGを画素に展開してQRリーダーで復号し、各URLから対応するスタンプを取得できることを確認します。印刷物・標準カメラでの実機確認は別途行ってください。
