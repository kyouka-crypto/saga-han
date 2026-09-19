/**
 * コレクション横断のクエリ層
 *
 * ページから直接 getCollection を呼ばず、ここを経由する。
 * 並び順・下書きの扱い・出典の書式といった「正しさ」を一箇所に閉じ込めるため。
 */

import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import { PERIODS, periodById, type Period } from '../data/periods';
import { THEMES, themeById, type Theme } from '../data/themes';

export type Article = CollectionEntry<'articles'>;
export type Person = CollectionEntry<'people'>;
export type House = CollectionEntry<'houses'>;
export type Office = CollectionEntry<'offices'>;
export type SourceEntry = CollectionEntry<'sources'>;
export type EventEntry = CollectionEntry<'events'>;
export type TermEntry = CollectionEntry<'terms'>;
export type PlaceEntry = CollectionEntry<'places'>;

/* ── 記事 ─────────────────────────────────────────── */

/** 年代順の全記事。下書きも含む（一覧では「執筆中」として出す） */
export async function allArticles(): Promise<Article[]> {
  const list = await getCollection('articles');
  return list.sort((a, b) => a.data.sortYear - b.data.sortYear);
}

export const articlesInPeriod = (list: Article[], periodId: string) =>
  list.filter((a) => a.data.periods.includes(periodId));

export const articlesInTheme = (list: Article[], themeId: string) =>
  list.filter((a) => a.data.theme === themeId);

/* ── 俯瞰マトリクス（8期 × 6系統） ─────────────────── */

export interface MatrixCell {
  period: Period;
  theme: Theme;
  articles: Article[];
  /** この交点の記事本数 */
  count: number;
}

export interface MatrixRow {
  period: Period;
  cells: MatrixCell[];
  count: number;
}

export function buildMatrix(list: Article[]): {
  rows: MatrixRow[];
  themeTotals: Map<string, number>;
  max: number;
  total: number;
} {
  const rows: MatrixRow[] = PERIODS.map((period) => {
    const cells = THEMES.map((theme) => {
      const articles = list.filter(
        (a) => a.data.periods.includes(period.id) && a.data.theme === theme.id
      );
      return { period, theme, articles, count: articles.length };
    });
    return { period, cells, count: cells.reduce((n, c) => n + c.count, 0) };
  });

  const themeTotals = new Map<string, number>();
  for (const t of THEMES) {
    themeTotals.set(
      t.id,
      rows.reduce((n, r) => n + (r.cells.find((c) => c.theme.id === t.id)?.count ?? 0), 0)
    );
  }

  const max = Math.max(1, ...rows.flatMap((r) => r.cells.map((c) => c.count)));
  return { rows, themeTotals, max, total: list.length };
}

/* ── 年表 ─────────────────────────────────────────── */

/** 事件と記事を突き合わせた年表。記事の無い出来事も載る。 */
export async function timeline() {
  const [events, articles] = await Promise.all([getCollection('events'), allArticles()]);
  const byId = new Map(articles.map((a) => [a.id, a]));
  return events
    .map((e) => ({ ...e, article: e.data.article ? byId.get(e.data.article.id) : undefined }))
    .sort((a, b) =>
      a.data.year - b.data.year ||
      (a.data.month ?? 0) - (b.data.month ?? 0) ||
      (a.data.day ?? 0) - (b.data.day ?? 0)
    );
}

/* ── 出典 ─────────────────────────────────────────── */

/** 書誌を一定の書式で組み立てる。表記揺れを防ぐため必ずこれを使う。 */
export function citation(s: SourceEntry['data'], pages?: string): string {
  const parts: string[] = [];
  parts.push(`${s.author}『${s.title}』`);
  if (s.volume) parts.push(s.volume);
  parts.push(`${s.publisher}、${s.year}年`);
  if (pages) parts.push(`p.${pages}`);
  return parts.join('、').replace('』、', '』');
}

/**
 * 出典の逆引き。「この本のどのページを、どの記事で使ったか」。
 * 一般公開サイトの学術的な信頼性を担保する中心的な仕掛け。
 */
export interface SourceUsage {
  source: SourceEntry;
  uses: Array<{
    kind: 'article' | 'person' | 'house' | 'office' | 'event' | 'term' | 'place';
    id: string;
    title: string;
    href: string;
    pages?: string;
    note?: string;
  }>;
}

export async function sourceUsage(): Promise<SourceUsage[]> {
  const [sources, articles, people, houses, offices, events, terms, places] = await Promise.all([
    getCollection('sources'),
    allArticles(),
    getCollection('people'),
    getCollection('houses'),
    getCollection('offices'),
    getCollection('events'),
    getCollection('terms'),
    getCollection('places'),
  ]);

  const map = new Map<string, SourceUsage>(
    sources.map((s) => [s.id, { source: s, uses: [] }])
  );

  const add = (
    kind: SourceUsage['uses'][number]['kind'],
    id: string,
    title: string,
    href: string,
    refs?: Array<{ src: { id: string }; pages?: string; note?: string }>
  ) => {
    for (const r of refs ?? []) {
      map.get(r.src.id)?.uses.push({ kind, id, title, href, pages: r.pages, note: r.note });
    }
  };

  for (const a of articles) add('article', a.id, a.data.title, `/articles/${a.id}/`, a.data.sourceRefs);
  for (const p of people) add('person', p.id, p.data.name, `/people/${p.id}/`, p.data.sourceRefs);
  for (const h of houses) {
    add('house', h.id, h.data.name, `/houses/${h.id}/`, h.data.sourceRefs);
    for (const c of h.data.chigyo) add('house', h.id, `${h.data.name}（${c.year}年の知行高）`, `/houses/${h.id}/`, c.sourceRefs);
  }
  for (const o of offices) add('office', o.id, o.data.name, `/offices/${o.id}/`, o.data.sourceRefs);
  for (const e of events) add('event', e.id, e.data.title, `/timeline/#e-${e.id}`, e.data.sourceRefs);
  for (const t of terms) add('term', t.id, t.data.term, `/glossary/#t-${t.id}`, t.data.sourceRefs);
  for (const pl of places) add('place', pl.id, pl.data.name, `/places/#p-${pl.id}`, pl.data.sourceRefs);

  return [...map.values()].sort((a, b) => b.uses.length - a.uses.length);
}

/* ── 進捗（俯瞰マトリクスと about で使う） ─────────── */

export async function progress() {
  const [articles, people, houses, offices, events, terms, places, sources] = await Promise.all([
    allArticles(),
    getCollection('people'),
    getCollection('houses'),
    getCollection('offices'),
    getCollection('events'),
    getCollection('terms'),
    getCollection('places'),
    getCollection('sources'),
  ]);

  const target = PERIODS.reduce((n, p) => n + p.target, 0);
  const byConfidence = (list: Array<{ data: { confidence: string } }>) => ({
    sourced: list.filter((x) => x.data.confidence === 'sourced').length,
    ai: list.filter((x) => x.data.confidence === 'ai').length,
    note: list.filter((x) => x.data.confidence === 'note').length,
  });

  return {
    articles: articles.length,
    target,
    people: people.length,
    houses: houses.length,
    offices: offices.length,
    events: events.length,
    terms: terms.length,
    places: places.length,
    sources: sources.length,
    confidence: byConfidence([...articles, ...people, ...houses, ...offices, ...events, ...terms]),
  };
}

export { PERIODS, THEMES, periodById, themeById, getEntry, getCollection };
