# テック無尽 タイムテーブル

テック無尽のセッションを確認し、自分の参加予定を作成できる、モバイルファーストのWebアプリです。ログインは不要で、選択したセッションは利用中のブラウザーに保存されます。

## 主な機能

- タイムテーブルAPIからのセッション取得・表示
- セッションを選択して「マイスケジュール」を作成
- 選択した予定のICSファイル出力と、対応するモバイルブラウザーでの共有
- 選択した予定のPNG画像出力
- QRのURLを開いてスタンプを集めるスタンプラリー（試作・[仕様と確認方法](./docs/stamp-rally.md)）
- 日本語表示を標準とし、環境変数で英語・韓国語の言語切り替えを有効化

## 技術構成

- React 19 / TypeScript 7 / Vite 8
- pnpm 11.17.0
- SEED Design
- Zod
- i18next / react-i18next

## ローカル開発

Node.jsは[package.json](./package.json)の `engines` を満たすバージョンを使用してください。pnpmのバージョンも同ファイルの `packageManager` で指定しています。

依存関係をインストールし、開発サーバーを起動します。

```bash
pnpm install --frozen-lockfile
pnpm dev
```

起動後、ターミナルに表示されるURLをブラウザーで開いてください。

### 型チェックとビルド

```bash
pnpm typecheck
pnpm build
```

ビルド結果は `dist/` に出力されます。ビルド済みアプリをローカルで確認する場合は、次のコマンドを実行します。

```bash
pnpm preview
```

## Cloudflareへのデプロイ

Cloudflare WorkersのStatic Assetsで、Viteが生成した`dist/`を配信します。SSR用のサーバーやWorkerスクリプトは追加しません。タイムテーブルAPIは既存の配信先を引き続き利用し、Vercel側の設定も変更しません。

公開URL: [techmujin-timetable.zhzkal2.workers.dev](https://techmujin-timetable.zhzkal2.workers.dev)

主な画面: [タイムテーブル](https://techmujin-timetable.zhzkal2.workers.dev/#timetable) / [アクセス](https://techmujin-timetable.zhzkal2.workers.dev/#access) / [会場内マップ](https://techmujin-timetable.zhzkal2.workers.dev/#venue) / [スタンプラリー](https://techmujin-timetable.zhzkal2.workers.dev/#stamp-rally)

Cloudflare用の配信コマンドにはNode.js 22以降が必要です。この手順はNode.js 24・pnpm 11.17.0で検証しています。`compatibility_date`は、固定したWranglerのローカルランタイムでも動作する日付に設定しています。

[pnpm-workspace.yaml](./pnpm-workspace.yaml)では、Wranglerで必要な`esbuild@0.28.2`と`workerd@1.20261023.1`のインストール用スクリプトを許可しています。pnpm 11の[allowBuilds設定](https://pnpm.io/settings/build#allowbuilds)を使い、対象のバージョンだけを指定しています。

設定は [wrangler.jsonc](./wrangler.jsonc) で管理します。

- Worker名: `techmujin-timetable`
- 配信ディレクトリー: `./dist`
- 未登録パス: `index.html`にフォールバックするSPA設定
- 公開先: Cloudflareが払い出すHTTPSの`workers.dev` URL

### 1. 依存関係のインストールと認証

```bash
pnpm install --frozen-lockfile
pnpm exec wrangler auth create techmujin-deploy --scopes account:read user:read workers_scripts:write
```

ブラウザーでCloudflareへログインし、配信先のアカウントでWorkersの操作を承認してください。既存のAI用などの認証を上書きしないように、`techmujin-deploy`という専用プロファイルを使用します。プロファイルはPCごとに一度作成し、認証を更新する場合も同じコマンドを実行します。

承認待ちでタイムアウトした場合は、古い承認ページではなく、同じコマンドを再実行して開いたページで承認してください。

複数のアカウントを利用している場合は、意図しないアカウントへの配信を避けるため、実行環境の`CLOUDFLARE_ACCOUNT_ID`で対象を指定してください。アカウントID・APIトークンを`VITE_*`に設定しないでください。

### 2. 配信前の確認

```bash
pnpm typecheck
pnpm test:stamp-rally
pnpm test:stamp-rally-ui
pnpm test:navigation
pnpm run check:cloudflare
```

`check:cloudflare`は本番ビルドとWranglerのdry-runを実行し、実際の公開先は変更しません。

Cloudflareの配信環境に近いローカル確認を行う場合は、次のコマンドを使用します。

```bash
pnpm run preview:cloudflare
```

起動後に表示されるlocalhostのURLを開き、`#timetable`、`#access`、`#venue`、`#stamp-rally`を確認してください。

### 3. 公開・更新

```bash
pnpm run deploy:cloudflare --profile techmujin-deploy
```

このコマンドはビルド後に`wrangler deploy`を実行します。完了時に表示されたHTTPSのURLが公開先です。更新時も同じコマンドを使用します。

Worker名はアカウント内で共通です。同名の既存Workerが別のサービスに使われていないことを確認し、必要に応じて`wrangler.jsonc`の`name`を変更してから配信してください。

### 言語設定と保存データ

標準は日本語のみです。JP / EN / KRの切り替えを有効にする場合は、ビルド前に`.env.local`またはビルド環境で`VITE_ENABLE_I18N=true`を設定し、再デプロイしてください。Workersの実行時環境変数だけを変更しても、ビルド済みのViteアプリには反映されません。

VercelとCloudflareでは配信URLが異なるため、`localStorage`の予定・スタンプ記録は自動では引き継がれません。独自ドメインへ変更する場合も同様です。

タイムテーブル取得にCORSエラーが出る場合は、フロント側の配信設定ではなくAPI側で新しい配信元を許可する必要があります。

### Git連携による自動デプロイを追加する場合

上記はCLIからの手動デプロイです。GitHubへpushしただけでCloudflareが自動更新される設定ではありません。

必要に応じてCloudflareのWorkers Buildsからこのリポジトリを接続し、次の値を設定します。

| 項目 | 設定 |
| --- | --- |
| 本番ブランチ | `main` |
| ルートディレクトリー | リポジトリのルート |
| ビルドコマンド | `pnpm run build` |
| デプロイコマンド | `pnpm exec wrangler deploy` |
| Node.js | 24（ローカル検証環境） |
| pnpm | `package.json`の`packageManager`に合わせる |
| 言語切り替え | 未設定、または`VITE_ENABLE_I18N=false` |

Cloudflare側の認証設定を利用し、個人PC用の`--profile`はCIでは指定しません。外部CIから配信する場合は、Workersの編集権限を持つ`CLOUDFLARE_API_TOKEN`と`CLOUDFLARE_ACCOUNT_ID`をCIのシークレットへ登録してください。

認証ファイル、APIトークン、`.dev.vars*`、`.wrangler/`はリポジトリへコミットしないでください。

公式ドキュメント: [Static Assets](https://developers.cloudflare.com/workers/static-assets/)、[Wranglerの認証](https://developers.cloudflare.com/workers/wrangler/commands/general/)、[Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)

## タイムテーブルAPI

タイムテーブルは次のエンドポイントから取得します。

```text
https://techmujin-api.t-funabiki08.workers.dev/v1/events/techmujin-2026/timetable
```

取得処理は [src/data/sessions.ts](./src/data/sessions.ts)、レスポンスの検証・変換は [src/data/parseSchedule.ts](./src/data/parseSchedule.ts) で管理しています。

レスポンスをZodで検証したうえで、画面表示用のデータに変換します。現在は、開始時刻順に並び、セッション同士の時間が重ならない1トラックのデータを前提としています。

セッションのタイトルや登壇者名など、APIから取得するコンテンツ自体は多言語翻訳の対象にしていません。

## 言語設定

標準では日本語のみを表示します。JP / EN / KR の言語切り替えを表示する場合は、`.env.local` またはデプロイ先の環境変数に次の値を設定してください。

```env
VITE_ENABLE_I18N=true
```

未設定、または `false` の場合は日本語のみとなり、言語切り替えは表示しません。設定例は [.env.example](./.env.example) を参照してください。

環境変数の変更後は開発サーバーを再起動してください。デプロイ済みのアプリに反映する場合は、再ビルド・再デプロイが必要です。

## デザインシステム

ボタン・バッジ・通知にはSEED Designを使用し、タイムテーブルのレイアウトはカスタムCSSで実装しています。

- [tokens.css](./tokens.css): タイポグラフィー、余白、サイズ、モーション、シャドウ、セマンティックカラー
- [src/theme.css](./src/theme.css): テック無尽のブランドカラーとSEED Designのカラートークンの対応
- [src/styles.css](./src/styles.css): 画面レイアウトとコンポーネントの状態別スタイル

ブランドカラーを変更する場合は、まず `src/theme.css` の `--tm-color-*` トークンを調整してください。紫と青のグラデーションは「マイスケジュール」などの重要な操作に限定し、通常のボタンや状態表示にはブランドトークンを使用します。

モバイルでの操作を優先し、タッチ操作要素は高さ44px以上を基準としています。横スクロールが必要な場合は、ページ全体ではなくタイムテーブル内で扱います。

## マイスケジュールの保存

選択した予定は、セッション全体ではなくセッションIDの一覧を `localStorage` に保存します。

```text
techmujin:timetable:v3
```

保存処理は [src/hooks/useSavedSchedule.ts](./src/hooks/useSavedSchedule.ts) にあります。

同じサイトを同じブラウザーで開くと選択内容が復元されます。別のブラウザーや端末とは同期されず、ブラウザーのサイトデータを削除すると保存内容も失われます。

## カレンダーへの出力

「マイスケジュール」画面から、選択したセッションを1つの `.ics` ファイルとして出力できます。ファイルはブラウザー内で生成し、選択内容をサーバーへ送信しません。

### PC・ファイル共有非対応の環境

ICSファイルをダウンロードし、GoogleカレンダーやAppleカレンダーなどへ読み込んで利用します。

### ファイル共有に対応したモバイルブラウザー

ICSファイルを端末の共有メニューに渡します。共有先の候補や、その後の取り込み操作はOS・インストール済みアプリによって異なります。共有機能が非対応の場合や共有処理に失敗した場合は、ダウンロードに切り替えます。

Web Share APIの利用にはHTTPSが必要なため、モバイル実機での確認にはHTTPSのプレビュー環境を使用してください。

### iPhone・iPadのSafari

「Appleカレンダーに追加」ボタンも表示します。選択した予定のICSファイルを開き、カレンダーへの取り込み画面へ進みます。最終的な追加は利用者自身が確認します。

iOS版Chromeなど、それ以外のブラウザーではICSの共有またはダウンロードを利用します。

ICSにはセッション名、開始・終了時刻、登壇者、トラック、会場、URLを含めます。APIのISO形式の日時をUTCに変換して出力します。実装は [src/calendar/ics.ts](./src/calendar/ics.ts) にあります。

## 画像の保存

「マイスケジュール」画面から、選択した予定を幅720pxのPNG画像として保存できます。

- 午前・午後を分けて表示
- 8セッション以下は1列の詳細レイアウト
- 9セッション以上は3列のコンパクトレイアウト

画像はブラウザーのCanvas APIで生成し、外部のプロフィール画像は含めません。実装は [src/calendar/image.ts](./src/calendar/image.ts) にあります。
