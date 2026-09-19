# 佐賀通史アーカイブ（saga-han）

大地の形成（Layer 0）から現代（Layer 9）まで、佐賀という土地の「完全な伝記」を目指す個人研究アーカイブの公開サイト。

- フレームワーク：**Astro 6**（静的サイト生成）
- 検索：**Pagefind**（ビルド後に静的インデックス生成）
- デザイン：和紙×墨の独自デザインシステム（`src/styles/global.css`）。ライト／ダーク（行灯）両対応
- コンテンツ：`src/content/articles/*.md`（frontmatter スキーマは `src/content.config.ts`）

## コマンド

```bash
npm install        # 初回のみ
npm run dev        # 開発サーバー http://localhost:4321（検索は動かない）
npm run build      # dist/ に静的サイト生成 + Pagefind インデックス
npm run preview    # ビルド結果の確認（検索もここで動く）
```

## 構造

```
src/
├── content.config.ts        記事コレクションのスキーマ（信頼度・出典・時代を必須化）
├── content/articles/*.md    記事本体（1記事1テーマ）
├── data/eras.ts             時代レイヤー定義（Layer 0–9・配色・部構成）の正本
├── styles/global.css        デザインシステム 2.0（トークン・prose・ダークモード）
├── layouts/Base.astro       共通レイアウト（フォント・テーマ切替・View Transitions）
├── components/              Header（メガメニュー）/ Footer / EraChip / ArticleCard
└── pages/
    ├── index.astro          トップ（ヒーロー・時代スパイン・横ドラッグ年表・記事）
    ├── articles/[slug].astro 記事（目次スパイ・欄外注・出典・信頼度バッジ・前後ナビ）
    ├── era/[era].astro      時代ハブ（全11時代を自動生成）
    ├── timeline.astro       全記事の縦年表
    ├── search.astro         全文検索（Pagefind）
    └── about.astro          編集方針・信頼度凡例
```

## 記事の追加

`src/content/articles/` に `.md` を置くだけ。フロントマター必須項目：

```yaml
title: "記事タイトル"
era: edo            # geo|jomon|yayoi|kofun|ancient|medieval|shoni|ryuzoji|edo|bakumatsu|modern
year: "1610–1621"   # 表示用ラベル
sortYear: 1610      # 年表・前後ナビの並び順
summary: "カード・OGP・年表に使う要約"
confidence: ai      # sourced（出典準拠）| ai（AI統合・検証中）| note（研究メモ）
sources:
  - "『佐賀藩の総合研究』第2章（研究ノート経由）"
created: "2026-05-09"
updated: "2026-07-12"
```

本文内で使える装置：

- `> 引用` → 「史料」ラベル付き引用ブロック
- `[^1]` 脚注 → 広い画面では欄外注（サイドノート）として表示
- `<sup><a href="#src-1">[1]</a></sup>` → 出典欄へのアンカー
- `<div class="fact">` KEY FACTS ／ `<div class="status">` 研究状況 ／ `<div class="modern">` 今と比べると

## 出典元

記事は Obsidian Vault（非公開・佐賀地方史 約230ページ）の研究ノートから選別・再構成して公開する。
編集方針・信頼度表示の凡例は `/about/` を参照。
