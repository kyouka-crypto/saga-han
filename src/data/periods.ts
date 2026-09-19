/**
 * 時代軸 — 佐賀藩の内部時代区分（8期）
 *
 * 旧 eras.ts（Layer 0–9 の通史モデル）を置き換える。守備範囲を佐賀藩に絞った結果、
 * 江戸260年を `edo` ひとつで扱えなくなったため、藩政の内部で区分し直したもの。
 *
 * 区分の境界は便宜的なものであり、史学上の定説ではない。サイト上では
 * 「この区分は本サイトの整理であって、通説ではない」旨を明示すること。
 */

export interface Period {
  id: string;
  /** 通し番号（年表・ナビの並び順） */
  order: number;
  name: string;
  en: string;
  /** 表示用の期間ラベル */
  span: string;
  /** ソート・年表配置用 */
  startYear: number;
  endYear: number;
  /** CSS 変数名（トークン層で定義。デザイン差し替え時はトークン側だけを変える） */
  colorVar: string;
  /** 前史か藩政期か余波か */
  stage: 'pre' | 'han' | 'post';
  /** 記事本数の目標（俯瞰マトリクスの進捗表示に使う） */
  target: number;
  /** 一行紹介 */
  lede: string;
}

export const PERIODS: Period[] = [
  {
    id: 'shoni',
    order: 1,
    name: '前史・少弐氏',
    en: 'Shoni',
    span: '〜1559',
    startYear: 1200,
    endYear: 1559,
    colorVar: '--c-shoni',
    stage: 'pre',
    target: 5,
    lede: '大宰少弐として九州北部に君臨した名門が、二世紀半をかけて衰滅するまで。',
  },
  {
    id: 'ryuzoji',
    order: 2,
    name: '前史・龍造寺氏と権力移行',
    en: 'Ryuzoji',
    span: '1530–1607',
    startYear: 1530,
    endYear: 1607,
    colorVar: '--c-ryuzoji',
    stage: 'pre',
    target: 10,
    lede: '「五州二島の太守」隆信の急成長と沖田畷の破局、そして鍋島氏への権力移行。',
  },
  {
    id: 'seiritsu',
    order: 3,
    name: '藩制の成立',
    en: 'Foundation',
    span: '1607頃–1657',
    startYear: 1607,
    endYear: 1657,
    colorVar: '--c-seiritsu',
    stage: 'han',
    target: 20,
    lede: '勝茂の治世。三部上地による集権化、家格序列の形成、長崎警備と島原の乱。',
  },
  {
    id: 'kakuritsu',
    order: 4,
    name: '藩制の確立と矛盾',
    en: 'Consolidation',
    span: '1657–1750',
    startYear: 1657,
    endYear: 1750,
    colorVar: '--c-kakuritsu',
    stage: 'han',
    target: 22,
    lede: '光茂・綱茂による機構の確立。『葉隠』の成立と、慢性化していく借銀財政。',
  },
  {
    id: 'mosaku',
    order: 5,
    name: '改革の模索',
    en: 'Reform Attempts',
    span: '1750–1830',
    startYear: 1750,
    endYear: 1830,
    colorVar: '--c-mosaku',
    stage: 'han',
    target: 15,
    lede: '治茂の天明改革と弘道館の創設。長崎警備の負担と財政窮乏の深化。',
  },
  {
    id: 'naomasa',
    order: 6,
    name: '直正の藩政改革',
    en: 'Naomasa',
    span: '1830–1861',
    startYear: 1830,
    endYear: 1861,
    colorVar: '--c-naomasa',
    stage: 'han',
    target: 22,
    lede: '均田制による農政再建、反射炉と精煉方。西洋技術導入の集中期。',
  },
  {
    id: 'ishin',
    order: 7,
    name: '幕末維新と藩の終焉',
    en: 'Bakumatsu',
    span: '1861–1871',
    startYear: 1861,
    endYear: 1871,
    colorVar: '--c-ishin',
    stage: 'han',
    target: 13,
    lede: '三重津海軍所とアームストロング砲、戊辰戦争への参加、版籍奉還と廃藩置県。',
  },
  {
    id: 'yoha',
    order: 8,
    name: '余波',
    en: 'Aftermath',
    span: '1871–1877',
    startYear: 1871,
    endYear: 1877,
    colorVar: '--c-yoha',
    stage: 'post',
    target: 8,
    lede: '藩が消えたあと。士族の行方、佐賀の乱、そして「佐賀の七賢人」という記憶。',
  },
];

export const periodById = (id: string): Period => {
  const p = PERIODS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown period id: ${id}`);
  return p;
};

export const periodColor = (id: string): string => `var(${periodById(id).colorVar})`;

/** 年から期を引く（年表・自動分類用。境界年は後の期に寄せる） */
export const periodOfYear = (year: number): Period =>
  [...PERIODS].reverse().find((p) => year >= p.startYear) ?? PERIODS[0];

export const PERIOD_IDS = PERIODS.map((p) => p.id) as [string, ...string[]];
