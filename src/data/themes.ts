/**
 * 主題軸 — 6系統
 *
 * 佐賀藩に守備範囲を絞ると、時代軸だけでは記事を分類できなくなる。
 * 「請役所」は260年に跨がりどの期にも属さず、逆に主題軸だけでは時系列が失われる。
 * そのため時代軸（periods.ts）と直交する第二の軸を置く。
 *
 * この2軸の交差が俯瞰マトリクス（8期 × 6系統 = 48セル）になる。
 */

export interface Theme {
  id: string;
  order: number;
  name: string;
  en: string;
  colorVar: string;
  /** 記事本数の目標 */
  target: number;
  /** この系統が扱う範囲 */
  scope: string;
  lede: string;
}

export const THEMES: Theme[] = [
  {
    id: 'seido',
    order: 1,
    name: '制度・職制',
    en: 'Institutions',
    colorVar: '--t-seido',
    target: 25,
    scope: '請役所、御目安方、郡代、代官、村役人、法令、裁判',
    lede: '誰が何を決めていたのか。藩政を動かした機構と、その文書主義。',
  },
  {
    id: 'kashin',
    order: 2,
    name: '家臣団・身分',
    en: 'Retainers',
    colorVar: '--t-kashin',
    target: 20,
    scope: '家格序列、三家、親類同格、地方知行、蔵入地、手明鑓',
    lede: '三家から足軽まで11段の序列。旧主家一門を抱え込んだ二重構造の家臣団。',
  },
  {
    id: 'zaisei',
    order: 3,
    name: '財政・経済',
    en: 'Finance',
    colorVar: '--t-zaisei',
    target: 12,
    scope: '借銀、御蔵方と懸硯方の二重会計、藩札、御用商人、専売',
    lede: '借銀が収入の過半を占めた藩。赤字をやり繰りし続けた260年の実務。',
  },
  {
    id: 'gunji',
    order: 4,
    name: '軍事・対外',
    en: 'Military',
    colorVar: '--t-gunji',
    target: 15,
    scope: '着到と番方15組、与と備、長崎警備、島原の乱、幕命普請、戊辰戦争',
    lede: '長崎警備という重荷。福岡藩との一年交代が、藩の財政と軍制を規定した。',
  },
  {
    id: 'sangyo',
    order: 5,
    name: '土地・産業',
    en: 'Land & Industry',
    colorVar: '--t-sangyo',
    target: 13,
    scope: '干拓・新田開発、有明海、搦と籠、農政、陶磁器、石炭',
    lede: '海を田に変え続けた藩。干拓こそ佐賀藩の財政と景観をつくった営みである。',
  },
  {
    id: 'bunka',
    order: 6,
    name: '学問・文化・宗教',
    en: 'Culture',
    colorVar: '--t-bunka',
    target: 13,
    scope: '葉隠、弘道館、蘭学と医学、寺社、陶工と窯',
    lede: '『葉隠』を生み、弘道館を置き、やがて蘭学の最前線となった知の系譜。',
  },
];

export const themeById = (id: string): Theme => {
  const t = THEMES.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown theme id: ${id}`);
  return t;
};

export const themeColor = (id: string): string => `var(${themeById(id).colorVar})`;

export const THEME_IDS = THEMES.map((t) => t.id) as [string, ...string[]];
