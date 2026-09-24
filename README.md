# LaterPad

**書式をAIに渡すための専用エディタ**

普通に書く。AI に伝わる形でコピーする。

見出し・太字・箇条書き・表・引用・コードなどをリッチテキストとして直感的に書き、
「AI用にコピー」で AI が理解しやすいテキスト形式（現在は Markdown）に変換してコピーできます。

- 公開ページ: https://masakiniwa.github.io/LaterPad/
- 仕様書: [docs/SPEC.md](docs/SPEC.md)

## 開発

```bash
npm install
npm run dev      # 開発サーバー
npm test         # 単体テスト
npm run build    # 本番ビルド（dist/）
```

main ブランチへのマージで GitHub Actions が GitHub Pages へ自動デプロイします。
初回のみ、リポジトリの **Settings → Pages → Build and deployment → Source** を
**GitHub Actions** に設定してください。

## 技術構成

TypeScript / React / Tiptap (ProseMirror) / MUI / Vite / Vitest

## ライセンス

[LICENSE](LICENSE)
