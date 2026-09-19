/**
 * 時代レイヤー定義 — 設計書「佐賀通史アーカイブ」Layer 0–9
 * サイト全体の情報構造・配色の正本。
 */
export interface Era {
  id: string;
  layer: number;
  name: string;
  en: string;
  period: string;
  /** CSS 変数名（global.css の時代カラー） */
  color: string;
  part: 'I' | 'II' | 'III' | 'IV' | 'V';
  /** コンテンツ配分の重み（トップの帯年表の幅） */
  weight: number;
  /** 時代ハブに載せる一行紹介 */
  lede: string;
}

export const ERAS: Era[] = [
  { id: 'geo',       layer: 0, name: '地質',            en: 'Geology',    period: '〜BC10,000',      color: '--c-geo',       part: 'I',   weight: 6,
    lede: '有明海の干満と筑後川の土砂が、佐賀平野という「若い大地」を形づくるまで。' },
  { id: 'jomon',     layer: 1, name: '縄文',            en: 'Jomon',      period: 'BC10,000–BC300', color: '--c-jomon',     part: 'I',   weight: 5,
    lede: '東名遺跡の編み籠が示す、湿地とともに生きた最初の定住者たち。' },
  { id: 'yayoi',     layer: 1, name: '弥生',            en: 'Yayoi',      period: 'BC300–AD300',    color: '--c-yayoi',     part: 'I',   weight: 5,
    lede: '吉野ヶ里の環濠集落。稲作とクニの萌芽、そして戦いの始まり。' },
  { id: 'kofun',     layer: 1, name: '古墳',            en: 'Kofun',      period: '300–600',        color: '--c-kofun',     part: 'I',   weight: 4,
    lede: '筑紫平野の首長墓群と、ヤマト王権への接続。' },
  { id: 'ancient',   layer: 2, name: '古代（火国・肥前国）', en: 'Ancient',  period: '600–1100',       color: '--c-ancient',   part: 'II',  weight: 8,
    lede: '火国から肥前国へ。律令制と大宰府の管轄下に置かれた古代の佐賀。' },
  { id: 'medieval',  layer: 3, name: '中世武士団',       en: 'Medieval',   period: '1100–1300',      color: '--c-medieval',  part: 'II',  weight: 5,
    lede: '在地領主の割拠。松浦党・肥前千葉氏ら、中世前期の武士団の世界。' },
  { id: 'shoni',     layer: 4, name: '少弐氏',          en: 'Shoni',      period: '1200–1500',      color: '--c-shoni',     part: 'II',  weight: 5,
    lede: '大宰少弐として九州北部に君臨した名門の栄光と没落。' },
  { id: 'ryuzoji',   layer: 5, name: '龍造寺氏',        en: 'Ryuzoji',    period: '1500–1607',      color: '--c-ryuzoji',   part: 'II',  weight: 8,
    lede: '「五州二島の太守」龍造寺隆信の急成長と沖田畷の破局、そして鍋島への権力移行。' },
  { id: 'edo',       layer: 7, name: '佐賀藩（江戸）',   en: 'Edo / Saga Domain', period: '1607–1840', color: '--c-edo', part: 'III', weight: 30,
    lede: '鍋島氏による藩政260年。二重構造の家臣団、長崎警備、独自の藩財政と葉隠の世界。' },
  { id: 'bakumatsu', layer: 8, name: '幕末維新',        en: 'Bakumatsu',  period: '1840–1877',      color: '--c-bakumatsu', part: 'IV',  weight: 14,
    lede: '鍋島直正の藩政改革から反射炉・三重津海軍所、七賢人、佐賀の乱まで。' },
  { id: 'modern',    layer: 9, name: '近代〜現代',       en: 'Modern',     period: '1877–',          color: '--c-modern',    part: 'V',   weight: 10,
    lede: '佐賀の乱以降の県政と産業。近代佐賀から現在への接続。' },
];

export const PARTS = [
  { id: 'I',   num: '第I部',   title: '大地と原始',  sub: '地質〜古墳',        share: 15, eras: ['geo', 'jomon', 'yayoi', 'kofun'], hint: '佐賀という土地はどうやって形づくられたか' },
  { id: 'II',  num: '第II部',  title: '古代〜中世',  sub: '火国〜龍造寺',      share: 20, eras: ['ancient', 'medieval', 'shoni', 'ryuzoji'], hint: '火国、肥前国、少弐氏、そして龍造寺の覇権' },
  { id: 'III', num: '第III部', title: '佐賀藩',      sub: '江戸260年',         share: 35, eras: ['edo'], hint: '鍋島氏による藩政の260年 — 本アーカイブの中核' },
  { id: 'IV',  num: '第IV部',  title: '幕末維新',    sub: '直正〜佐賀の乱',    share: 15, eras: ['bakumatsu'], hint: '反射炉・七賢人・佐賀の乱' },
  { id: 'V',   num: '第V部',   title: '近代〜現代',  sub: '佐賀の乱以降',      share: 15, eras: ['modern'], hint: '県政・産業・現在へ' },
] as const;

export const eraById = (id: string): Era => {
  const era = ERAS.find((e) => e.id === id);
  if (!era) throw new Error(`Unknown era id: ${id}`);
  return era;
};

export const eraColor = (id: string): string => `var(${eraById(id).color})`;

/** 信頼度バッジ — 学術的誠実性の表明装置 */
export const CONFIDENCE = {
  sourced: { label: '出典準拠',       cls: 'badge-sourced', desc: '記述は明示した出典に基づき、人手で照合済み' },
  ai:      { label: 'AI統合・検証中', cls: 'badge-ai',      desc: '出典に基づくがAIによる統合を含む。原典との逐一照合は未了' },
  note:    { label: '研究メモ',       cls: 'badge-note',    desc: '作業仮説・調査途上のメモ。引用非推奨' },
} as const;

export type ConfidenceKey = keyof typeof CONFIDENCE;
