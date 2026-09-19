import { defineCollection, reference, z } from 'astro:content';
import { glob, file } from 'astro/loaders';
import { PERIOD_IDS } from './data/periods';
import { THEME_IDS } from './data/themes';

/* ────────────────────────────────────────────────────────────
   共通スキーマ部品
   ──────────────────────────────────────────────────────────── */

/**
 * 出典参照。書誌は sources コレクションに一本化し、ここでは ID とページだけを持つ。
 * これにより (1) 出典表記の書式が全記事で自動的に統一され、
 *          (2)「この本のどのページを使ったか」の逆引きページが生成でき、
 *          (3) 未照合箇所を機械的に洗い出せる。
 */
const sourceRef = z.object({
  src: reference('sources'),
  /** 例: "24" / "142-147" / "24, 88" */
  pages: z.string().optional(),
  /** その出典から何を採ったかの覚書（任意） */
  note: z.string().optional(),
});

/** 信頼度 — 学術的誠実性の表明装置。sourced は原典と逐一照合したものだけ。 */
const confidence = z.enum(['sourced', 'ai', 'note']).default('ai');

/** 諸説がある事柄を「わからないまま」載せるための型 */
const dispute = z.object({
  label: z.string(),
  positions: z.array(
    z.object({
      claim: z.string(),
      by: z.string(),
      sourceRefs: z.array(sourceRef).default([]),
    })
  ),
});

/* ────────────────────────────────────────────────────────────
   1. articles — 本文記事
   ──────────────────────────────────────────────────────────── */

const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    subtitleEn: z.string().optional(),

    /** 時代軸。制度記事など複数期に跨がるものは複数指定する */
    periods: z.array(z.enum(PERIOD_IDS)).min(1),
    /** 主題軸。主たる系統ひとつ */
    theme: z.enum(THEME_IDS),

    /** 記事の型（PLAN.md §6）。A=主題記事 B=標準 C=小記事 */
    kind: z.enum(['A', 'B', 'C']).default('B'),

    /** 表示用の年代ラベル（例: "1610–1621"） */
    year: z.string().optional(),
    /** 年表・ソート用の代表年 */
    sortYear: z.number(),

    summary: z.string(),
    tags: z.array(z.string()).default([]),

    confidence,
    sourceRefs: z.array(sourceRef).default([]),
    disputes: z.array(dispute).default([]),

    /** 関連エンティティ（サイト内の横断リンクを自動生成する） */
    people: z.array(reference('people')).default([]),
    houses: z.array(reference('houses')).default([]),
    offices: z.array(reference('offices')).default([]),
    related: z.array(reference('articles')).default([]),

    /** 一覧・OGP に使う代表画像 */
    hero: z
      .object({
        src: z.string(),
        alt: z.string(),
        credit: z.string(),
        license: z.string(),
      })
      .optional(),

    created: z.string(),
    updated: z.string(),
    /** true の間は一覧に出すが「執筆中」表示にする */
    draft: z.boolean().default(false),
  }),
});

/* ────────────────────────────────────────────────────────────
   2. sources — 書誌（出典管理の要）
   ──────────────────────────────────────────────────────────── */

const sources = defineCollection({
  loader: file('./src/content/sources.json'),
  schema: z.object({
    id: z.string(),
    title: z.string(),
    volume: z.string().optional(),
    author: z.string(),
    publisher: z.string(),
    year: z.number(),
    /** 国立国会図書館デジタルコレクション等の URL */
    url: z.string().url().optional(),
    /** 参照日 */
    accessed: z.string().optional(),
    kind: z.enum(['自治体史', '研究書', '史料集', '論文', 'web']),
    /** 全文 OCR を手元に持っているか（サイトには出さない。作業管理用） */
    hasOcr: z.boolean().default(false),
    /** OCR のページ総数（索引ツールが埋める） */
    ocrPages: z.number().optional(),
    note: z.string().optional(),
  }),
});

/* ────────────────────────────────────────────────────────────
   3. people — 人物
   ──────────────────────────────────────────────────────────── */

const people = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/people' }),
  schema: z.object({
    name: z.string(),
    reading: z.string(),
    birth: z.number().nullable().default(null),
    death: z.number().nullable().default(null),
    /** 生没年が未詳の場合の表示（例: "生年未詳–1657"） */
    lifeLabel: z.string().optional(),
    house: reference('houses').optional(),
    /** 藩主なら在位 */
    reign: z.object({ from: z.number(), to: z.number() }).optional(),
    /**
     * 藩主の代数。『佐賀市史』は勝茂を初代、『佐賀藩の総合研究』は直茂を初代と数え、
     * 両者は 1 ずれる。どちらか一方を採らず、両論を保持する。
     */
    generation: z
      .object({
        katsushigeFirst: z.number().optional(),
        naoshigeFirst: z.number().optional(),
      })
      .optional(),
    offices: z.array(reference('offices')).default([]),
    periods: z.array(z.enum(PERIOD_IDS)).default([]),
    summary: z.string(),
    confidence,
    sourceRefs: z.array(sourceRef).default([]),
    disputes: z.array(dispute).default([]),
    portrait: z
      .object({ src: z.string(), alt: z.string(), credit: z.string(), license: z.string() })
      .optional(),
  }),
});

/* ────────────────────────────────────────────────────────────
   4. houses — 家（家格つき）
   ──────────────────────────────────────────────────────────── */

const houses = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/houses' }),
  schema: z.object({
    name: z.string(),
    reading: z.string(),
    /** houseRanks.ts の id */
    rank: z.string(),
    /** 出自 */
    origin: z.enum(['鍋島一門', '龍造寺系', '外様', 'その他']).default('その他'),
    /** 知行高の推移（石）。年ごとに記録し、欠測はそのまま欠かす */
    chigyo: z
      .array(
        z.object({
          year: z.number(),
          koku: z.number(),
          sourceRefs: z.array(sourceRef).default([]),
        })
      )
      .default([]),
    seat: z.string().optional(),
    summary: z.string(),
    confidence,
    sourceRefs: z.array(sourceRef).default([]),
  }),
});

/* ────────────────────────────────────────────────────────────
   5. offices — 役職・機関
   ──────────────────────────────────────────────────────────── */

const offices = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/offices' }),
  schema: z.object({
    name: z.string(),
    reading: z.string(),
    /** 番方（軍事）か役方（行政）か */
    branch: z.enum(['番方', '役方', 'その他']).default('役方'),
    /** 上位機関（職制図の親子関係をこれで組む） */
    parent: reference('offices').optional(),
    /** 定員 */
    seats: z.string().optional(),
    duties: z.array(z.string()).default([]),
    /** 就任資格となる家格（houseRanks.ts の id） */
    eligibleRanks: z.array(z.string()).default([]),
    periods: z.array(z.enum(PERIOD_IDS)).default([]),
    summary: z.string(),
    confidence,
    sourceRefs: z.array(sourceRef).default([]),
  }),
});

/* ────────────────────────────────────────────────────────────
   6. events — 年表エントリ（記事が無くても年表に載る）
   ──────────────────────────────────────────────────────────── */

const events = defineCollection({
  loader: file('./src/content/events.json'),
  schema: z.object({
    id: z.string(),
    year: z.number(),
    /** 和暦表記（例: "元和六年"） */
    wareki: z.string().optional(),
    month: z.number().optional(),
    day: z.number().optional(),
    title: z.string(),
    period: z.enum(PERIOD_IDS),
    themes: z.array(z.enum(THEME_IDS)).default([]),
    summary: z.string().optional(),
    /** 全国史の出来事（対照用）か、佐賀藩の出来事か */
    scope: z.enum(['han', 'national']).default('han'),
    /** 重要度 1–3。年表の初期表示密度の制御に使う */
    weight: z.number().min(1).max(3).default(2),
    article: reference('articles').optional(),
    confidence,
    sourceRefs: z.array(sourceRef).default([]),
  }),
});

/* ────────────────────────────────────────────────────────────
   7. places — 地名
   ──────────────────────────────────────────────────────────── */

const places = defineCollection({
  loader: file('./src/content/places.json'),
  schema: z.object({
    id: z.string(),
    name: z.string(),
    reading: z.string(),
    kind: z.enum(['城', '陣屋', '遺構', '寺社', '郡', '窯', '海軍所', 'その他']),
    /** 近世の郡 */
    gun: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
    modern: z.string().optional(),
    summary: z.string().optional(),
    confidence,
    sourceRefs: z.array(sourceRef).default([]),
  }),
});

/* ────────────────────────────────────────────────────────────
   8. terms — 用語集（本文のツールチップに使う）
   ──────────────────────────────────────────────────────────── */

const terms = defineCollection({
  loader: file('./src/content/terms.json'),
  schema: z.object({
    id: z.string(),
    term: z.string(),
    reading: z.string(),
    /** 一行定義。ツールチップに出るので 80 字以内を目安にする */
    definition: z.string(),
    themes: z.array(z.enum(THEME_IDS)).default([]),
    article: reference('articles').optional(),
    confidence,
    sourceRefs: z.array(sourceRef).default([]),
  }),
});

export const collections = {
  articles,
  sources,
  people,
  houses,
  offices,
  events,
  places,
  terms,
};
