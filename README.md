# 佐賀藩アーカイブ（saga-han）

鍋島氏による藩政 264年（1607頃–1871）を対象に、制度・家臣団・財政・軍事・産業・学問を
**構造として**記述する個人研究アーカイブ。少弐氏・龍造寺氏の前史と、廃藩後の余波も範囲に含む。

- フレームワーク：**Astro 6**（静的サイト生成）／可視化が必要なページだけ島（island）を置く方針
- 検索：**Pagefind**（記事・人物・家・役職・用語・地名・年表を横断。「種別」で絞り込み可）
- デザイン：トークン層（`src/styles/tokens.css`）と構造層を分離。**デザインの差し替えはトークン層のみ**
- 計画の正本：[`docs/PLAN.md`](docs/PLAN.md)

## いまの状態

**器を先に作っている段階。** 情報構造・データ層・図表の仕組み・公開まわりは揃っており、
記事だけがこれから。空白は隠さず、俯瞰マトリクスにそのまま見えるようにしてある。

## コマンド

```bash
npm install          # 初回のみ
npm run dev          # 開発サーバー http://localhost:4321（検索は動かない）
npm run build        # dist/ に生成 + Pagefind 索引 + 公開前点検
npm run preview      # ビルド結果の確認（検索もここで動く）
npm run check        # 公開前点検だけを走らせる
```

### 藩領データの作成

近世村領域データ（CC BY-SA 4.0）から、佐賀藩と三支藩の村399件を抽出し
`src/data/datasets/villages.json` に書き出す。

```bash
node tools/build-territory.mjs
```

初回は GitHub から元データ（7.6MB）を取得し `tools/out/kyudaka/` に保存する。

続けて、村の領域ポリゴン（GeoJSON）を作る。

```bash
node tools/build-territory-polygons.mjs
```

農林水産省の農業集落境界データ（佐賀県・長崎県、計18MB）を取得し、
集落界を村単位にまとめて2段階の詳細度で書き出す。
外部ライブラリを使わず、ZIP・DBF・SHP の読み取りと簡略化をツール内で行う。

- `territory.geojson`（975KB・約33m）… 地図ページ用
- `territory-overview.geojson`（458KB・約167m）… 小さい地図用。ビルド時に SVG へ焼く想定

399村のうち**377村が面を持つ**。残る22村は佐賀城下の町方などで、
市街地に農業集落界が無いため面を持てない（推定では補わない）。

**注意**：これらのデータは CC BY-SA 4.0（継承条項つき）。
サイトに出すときは出典とライセンスの表示が義務。
また慶応4年（1868）の一断面であり、藩政264年を通じた領域ではない。
集落界は明治以降のものから推定した領域で、当時の村境そのものでもない。

### OCR 索引ツール（記事を書くための道具）

手元の OCR 全文（約4,300ページ・279万字）を「引ける」状態にする。これが無いと記事は書けない。

```bash
npm run ocr:build                             # ページ単位に分解（最初に一度）
node tools/index-ocr.mjs find 請役所           # 該当ページを本・ページ番号つきで一覧
node tools/index-ocr.mjs find 手明鑓 -c 200    # 前後200字の文脈つき
node tools/index-ocr.mjs page sagashishi-2 24  # そのページの全文
npm run ocr:vocab                             # 語彙リストを一括索引化
```

OCR の場所は環境変数 `SAGA_OCR_DIR` で変えられる。
出力は `tools/out/`（他人の著作物を含むため `.gitignore` で追跡外）。

## 構造

```
src/
├── content.config.ts        8コレクションのスキーマ
├── content/
│   ├── articles/*.md        記事
│   ├── people/*.md          人物
│   ├── houses/*.md          家（家格つき）
│   ├── offices/*.md         役職・機関（parent で職制図を組む）
│   ├── sources.json         書誌（出典管理の要）
│   ├── events.json          年表（記事が無くても載る）
│   ├── places.json          地名
│   └── terms.json           用語集
├── data/
│   ├── periods.ts           時代軸 8期
│   ├── themes.ts            主題軸 6系統
│   ├── houseRanks.ts        家格序列11段・着到15組
│   └── confidence.ts        信頼度の3段階
├── lib/archive.ts           コレクション横断のクエリ層（出典の書式もここ）
├── styles/
│   ├── tokens.css           ★デザインの差し替え口
│   ├── base.css / components.css / prose.css / pages.css
│   └── global.css           上記を束ねるだけ
├── components/
│   ├── Matrix.astro         俯瞰マトリクス（8期×6系統）
│   ├── StoryBrowser.astro   画像駆動の探索UI（依存ゼロ）
│   ├── RankPyramid.astro    家格ピラミッド
│   ├── OfficeTree.astro     職制図（データから自動生成）
│   ├── ChigyoChart.astro    知行高の推移（ビルド時 SVG・JS 0KB）
│   ├── Figure.astro         図版（出典・ライセンス必須）
│   └── SourceRefs.astro     出典欄（書式を一元管理）
└── pages/
    ├── index.astro          トップ
    ├── matrix.astro         俯瞰マトリクス
    ├── period/[id].astro    時代（8ページ）
    ├── theme/[id].astro     主題（6ページ）
    ├── articles/[slug].astro 記事
    ├── people/ houses/ offices/  人物・家・役職
    ├── sources/             出典と逆引き
    └── timeline / glossary / places / search / about
tools/
├── index-ocr.mjs            OCR 索引
└── check-publish.mjs        公開前点検（ビルドに組み込み済み）
```

## 記事の追加

`src/content/articles/` に `.md` を置く。フロントマター必須項目：

```yaml
title: "記事タイトル"
periods: [seiritsu, kakuritsu]   # 時代軸（複数可）
theme: seido                     # 主題軸（ひとつ）
kind: B                          # A=主題記事 B=標準 C=小記事
year: "1610–1621"
sortYear: 1610
summary: "カード・OGP・年表に使う要約"
confidence: ai                   # sourced（原典照合済）| ai | note
sourceRefs:
  - src: sagashishi-2            # sources.json の id
    pages: "24"
    note: "何を採ったかの覚書"
created: "2026-09-19"
updated: "2026-09-19"
```

出典（`sourceRefs`）が無い記事は**ビルドが止まる**（`tools/check-publish.mjs`）。

本文内で使える装置：

- `> 引用` → 「史料」ラベル付き引用ブロック
- `[^1]` 脚注 → 広い画面では欄外注（サイドノート）
- `<div class="fact">` KEY FACTS ／ `<div class="status">` 研究状況 ／ `<div class="modern">` 今と比べると
- 図版は必ず `Figure.astro` を通す（キャプション・出典・ライセンスが必須項目）

## デザインを差し替えるとき

`src/styles/tokens.css` を入れ替える。変数名を保てばサイト全体に一度で反映される。
既存の変数名は消さず、値だけを変えること。新しい変数を足すのは自由。

## 公開前に必ず守ること

- OCR 全文（他人の著作物）をサイトに出さない
- `pdfpage://` リンクとローカルパス（`Y:\...`）を出力に出さない
- 図版には必ず出所と利用条件を添える
- 断定できないことは「諸説あり」「未詳」と書く

上の1〜2は `npm run build` の最後に機械的に検査される。
公開先が決まったら `astro.config.mjs` の `SITE` と `public/robots.txt` の URL を実際のものに変える。
