/**
 * 家格序列 — 佐賀藩の武士身分
 *
 * 典拠：『佐賀市史』第2巻（近世編）p.24
 *   「武士の身分は、三家・親類・親類同格・連判家老・加判家老・着座・独礼・平侍・
 *     手明鑓・徒士・足軽という序列が出来たが、これも本藩を中心としてみた場合のもので、
 *     自治を認められていた大配分では、それぞれ独自の組織をもち、家老その他の職制があった」
 *
 * 重要な留保：この序列は **本藩から見た場合** のものである。三支藩・親類・親類同格は
 * 独自の着到（軍事編成）と家老以下の職制を独立して持っていた。可視化する際は
 * 「単一のピラミッドではない」ことを必ず併記すること。
 */

export interface HouseRank {
  id: string;
  /** 上位からの序列（1 が最上位） */
  rank: number;
  name: string;
  reading: string;
  /** ピラミッド図での相対的な層の厚み（人数規模の目安。実数ではない） */
  weight: number;
  note: string;
}

export const HOUSE_RANKS: HouseRank[] = [
  { id: 'sanke', rank: 1, name: '三家', reading: 'さんけ', weight: 1,
    note: '蓮池・小城・鹿島の三支藩。本藩の家中に対して一段上にランクされた。' },
  { id: 'shinrui', rank: 2, name: '親類', reading: 'しんるい', weight: 1,
    note: '白石鍋島・川久保神代・久保田村田の三家（『佐賀藩の総合研究』p.23 に光茂「御代始条目」の宛人として列挙）。' },
  { id: 'shinrui-doukaku', rank: 3, name: '親類同格', reading: 'しんるいどうかく', weight: 1,
    note: '諫早・武雄・多久・須古の龍造寺一門四家。旧主家の一門でありながら、藩政の最高責任者である請役家老を交代で務めた。' },
  { id: 'renpan-karo', rank: 4, name: '連判家老', reading: 'れんぱんがろう', weight: 2,
    note: '家老クラス。' },
  { id: 'kahan-karo', rank: 5, name: '加判家老', reading: 'かはんがろう', weight: 2,
    note: '家老クラス。' },
  { id: 'chakuza', rank: 6, name: '着座', reading: 'ちゃくざ', weight: 4,
    note: 'のち「着座一八家」と呼ばれる。番方15組の大組頭はこの中から選ばれるのが原則だった。' },
  { id: 'dokurei', rank: 7, name: '独礼', reading: 'どくれい', weight: 6,
    note: '単独で藩主に拝謁できる格。' },
  { id: 'hiraza', rank: 8, name: '平侍', reading: 'ひらざむらい', weight: 14,
    note: '一般の侍。' },
  { id: 'teakiyari', rank: 9, name: '手明鑓', reading: 'てあきやり', weight: 12,
    note: '佐賀藩独特の身分。本藩と蓮池藩に限られた。元和6年（1620）、勝茂が50石未満の侍200人の平時の役を免じて知行を没収し、代わりに切米15石を一律支給したことに始まる。戦時には鑓一本をもって奉公すると定められた。' },
  { id: 'kachi', rank: 10, name: '徒士', reading: 'かち', weight: 16,
    note: '徒歩の下級武士。' },
  { id: 'ashigaru', rank: 11, name: '足軽', reading: 'あしがる', weight: 24,
    note: '最下層。弓足軽・鉄砲足軽など。' },
];

export const HOUSE_RANK_SOURCE = {
  src: 'sagashishi-2',
  pages: '24',
  note: '序列の列挙そのものが同書の記述に依拠する。各格の人数比は本サイトによる図示上の目安であり、史料上の実数ではない。',
} as const;

/**
 * 番方（軍事組織）の編成 — 「着到」
 * 典拠：『佐賀市史』第2巻 p.24
 * 整備された段階での着到では家臣を15組に分けた。
 */
export const CHAKUTO_GROUPS = [
  { id: 'okawa', name: '御側', count: 4, note: '側近の親兵。' },
  { id: 'sakite', name: '先手', count: 2, note: '' },
  { id: 'keigo', name: '警固', count: 6, note: '' },
  { id: 'rusui', name: '留守居', count: 3, note: '' },
] as const;

/** 大組頭を出した家老家（典拠：同 p.24–25） */
export const OOGUMIGASHIRA_HOUSES = [
  '横岳鍋島家', '神代鍋島家', '深堀鍋島家', '太田鍋島家', '倉町鍋島家', '姉川鍋島家',
] as const;
