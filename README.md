# ことばの時間

中学1年向けの英単語1,200語を10レベルに分けて学習するExpo / Webアプリです。フォルダー名の `jhs1` は中学1年を表します。実装は `expo-ui/` にあります。

- [起動方法とアプリの内容](expo-ui/README.md)
- [GitHub Pagesでの公開方法・公開前検証](expo-ui/GITHUB_PAGES.md)
- [検証結果](expo-ui/検証結果.md)

このディレクトリーをGitHubリポジトリのルートにしてください。`.github/workflows/pages.yml` が `expo-ui/` をビルドし、生成されたWebファイルだけをGitHub Pagesへ公開します。`work/` 全体には別のアプリや開発ツールがあるため、登録対象には含めません。

登録先：[Takoyakiboze/english-learning-jhs1](https://github.com/Takoyakiboze/english-learning-jhs1)。初回のGitHub認証は、このディレクトリーで `powershell -ExecutionPolicy Bypass -File .\connect-github.ps1` を実行し、ブラウザーで `Takoyakiboze` にログインします。認証スクリプトはログインのみを行います。
