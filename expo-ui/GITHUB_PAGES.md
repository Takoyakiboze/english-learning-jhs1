# GitHub Pages公開前の確認

検証日：2026-10-24

## 判定

公開用の静的Webビルドと、リポジトリ名の付いたURLでの動作検証に合格しました。依存関係の脆弱性警告は残っています。下記の「依存パッケージ」を確認してください。実際のGitHubリポジトリ・Actions・公開URLでの検証は未実施です。

## 登録する範囲

リポジトリのルートは `english-learning-jhs1/` とします。

```text
english-learning-jhs1/
  .github/workflows/pages.yml
  README.md
  expo-ui/
    package.json
    package-lock.json
    app.json
    app.config.js
    src/
    ...
```

Gitの除外設定で `node_modules/`、`.expo/`、`dist-pages/`、`dist-web/`、`dist-ios/`、テスト結果、`artifacts/` のQR・画面画像、誤生成された `--offline=false/` キャッシュ、`.env`・`.env.*`（`.env.example` を除く）、`.npmrc`、秘密鍵を除外しています。`package-lock.json` と教材データは登録対象です。

`.gitignore` はGit経由の追加に適用されます。Web画面でのファイルアップロードには適用されないため、作業フォルダー全体をドラッグしてアップロードしないでください。すでに登録済みのファイルは `.gitignore` だけでは除去されません。

現在の対象ファイルからAPIキー・アクセストークン・秘密鍵は検出されませんでした。個人端末の絶対パスはREADMEから除去しました。初回検証時はGit未導入でしたが、その後、作業領域内に公式のMinGitを用意しました。新規のローカルリポジトリを初期化し、登録対象をGitで確認しています。

## GitHub側の設定

登録先は [Takoyakiboze/english-learning-jhs1](https://github.com/Takoyakiboze/english-learning-jhs1) です。初回の認証には、リポジトリのルートで `powershell -ExecutionPolicy Bypass -File .\connect-github.ps1` を実行します。ブラウザーで `Takoyakiboze` にログインしてください。ワークフローファイルを登録するため `workflow` スコープを要求します。認証情報はGitHub CLIが管理し、リポジトリには保存しません。

1. 上記の構成を保ってGitHubリポジトリに登録します。
2. リポジトリの **Settings → Pages → Build and deployment → Source** を **GitHub Actions** にします。
3. `main` にpushするか、**Actions → Publish vocabulary app to GitHub Pages → Run workflow** を実行します。メインブランチ名が違う場合は `pages.yml` の `branches` を変更します。
4. Actionsの成功後、Pagesに表示された公開URLを開きます。

ワークフローはNode.js 24で `npm ci`、lint、型チェック、教材検査、静的Webビルド、Chromiumでの全テストを実行してから、`expo-ui/dist-pages/` だけを公開します。リポジトリ名付きURL・ユーザーサイト・独自ドメインのパスは `actions/configure-pages` の出力から設定します。外部サービス用のAPIキー登録は不要です。

`expo-ui/` だけをリポジトリのルートにする場合は、親にある `.github/` を同じルートへ移し、ワークフローの `working-directory` を `.`、`cache-dependency-path` を `package-lock.json`、公開する `path` を `dist-pages` に変更してください。

ソースコードをpushするだけ、またはPagesでソースブランチをそのまま配信するだけでは、このアプリは動きません。Web用に生成したHTML・JavaScriptを配信する必要があります。

## ローカルで同じ構成を確認

Node.js 24を用意し、`expo-ui/` で実行します。`english-learning-jhs1` は実際のGitHubリポジトリ名に置き換えます。ローカルのフォルダー名を変更しても、GitHub側のリポジトリ名は自動では変わりません。

```powershell
npm ci
npm run build:pages -- /english-learning-jhs1
npm run preview:pages -- /english-learning-jhs1
```

ブラウザで `http://127.0.0.1:8090/english-learning-jhs1/` を開きます。プレビューの停止は `Ctrl+C` です。

自動操作テストはプレビューを停止した状態で実行します。テスト自身がプレビューサーバーを起動・停止します。

```powershell
npx playwright install chromium
$env:PAGES_BASE_PATH = '/english-learning-jhs1'
npm run test:pages
Remove-Item Env:PAGES_BASE_PATH
```

ドメインのルートで使う場合はビルド・プレビューの引数を `/` にします。ビルドは公開先の指定を必須とし、パス違いのまま生成することを防ぎます。通常のExpo Go・開発サーバーは公開用のパス指定なしで利用できます。

## 確認内容

- `/english-learning-jhs1/` を使った静的ビルドに成功。配信物は約1.6MB。
- ロジック14件・画面操作7件の計21件が成功。20問・誤答5問の復習・検索・ヒント・小型画面・報酬デモ・保存と復元・進級と未解放レベルの制限を確認。
- lint・型チェック・1,200語と10レベルの教材検査に成功。
- 隔離ディレクトリーで `npm ci --dry-run --ignore-scripts` に成功。実際のLinux環境でのインストール・Actions実行は未検証。
- サーバーAPI・利用者アカウント・解析サービスへの外部送信処理は実装されていません。
- 公開用出力に端末の学習履歴・開発キャッシュ・ソースマップを含めません。

## 学習状況

習得状況・誤答履歴はブラウザの `localStorage` に保存します。GitHubには送信しません。同じブラウザで公開サイトを開き直すと復元します。結果一覧・報酬残高・設定・途中の問題は再読み込みで戻ります。別端末への同期・Expo Goやローカルプレビューからの自動移行はありません。サイトデータ削除時には保存記録も消えます。

GitHub Pagesの複数のリポジトリが同じ `https://ユーザー名.github.io` にある場合、ブラウザの保存領域は共有されます。同じアプリを複数コピーして別々の学習記録にする用途には、保存キーの分離が必要です。

## 依存パッケージ

`npm audit` は **high 5件・critical 0件** でした。原因は次の2パッケージで、親のExpo関連パッケージへの波及も含めて5件と数えられます。

- `node-forge@1.4.0`：RSA署名検証の警告。監査時のアドバイザリーに修正版の記載なし。[GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv)
- `zod@3.25.76`：制約のある巨大なコレクション検証でのメモリ枯渇の警告。修正版は4.6.6ですが、現在のExpo CLIは3系に依存しています。[GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5)

いずれもExpo CLI等の開発ツールの依存経由です。別途生成した検証用ソースマップ5ファイルの802ソースを確認し、`node-forge`・`zod`・`@expo/code-signing-certificates` がブラウザ用バンドルに含まれないことを確認しました。この結果は静的サイトの公開判断を支えるもので、依存全体に警告がないという意味ではありません。開発ツールの更新は引き続き必要です。

`npm audit fix --force` の提示するExpo 44への変更はSDK 58対応を壊すため適用していません。

## 参照

- [ExpoのGitHub Pages公開方法](https://docs.expo.dev/guides/publishing-websites/#github-pages)
- [Expo SDK 58のbaseUrl設定](https://docs.expo.dev/versions/v58.0.0/config/app/#baseurl)
- [GitHub Pagesのワークフロー](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
