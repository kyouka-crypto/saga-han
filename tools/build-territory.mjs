#!/usr/bin/env node
/**
 * 藩領データの作成
 *
 * 近世村領域データ（Kyudaka_agrivillage）から、佐賀藩と三支藩の村を抜き出し、
 * サイトで使う形に整えて src/data/datasets/ へ書き出す。
 *
 *   node tools/build-territory.mjs
 *
 * 元データ：
 *   本田謙一・夏目宗幸・根元裕樹「幕末期近世村領域データの作成
 *   ―旧高旧領取調帳および農業集落境界データを活用して―」
 *   GIS-理論と応用 34巻1号 p.1-10、地理情報システム学会、2026年
 *   DOI: 10.5638/thagis.34.1.1
 *   https://github.com/yaoyue00085856/Kyudaka_agrivillage
 *   ライセンス：CC BY-SA 4.0
 *
 *   そのさらに元：
 *   ・国立歴史民俗博物館「旧高旧領取調帳データベース」
 *   ・農林水産省「農業集落境界データ」（農林業センサス2015年版）
 *
 * ★ CC BY-SA 4.0 は継承条項つき。ここから作った派生データも
 *   CC BY-SA 4.0 で提供し、出典を明示する必要がある。
 *   出力する JSON にライセンス情報を必ず埋め込むこと。
 *
 * 注意：このデータは v2 系で、各種資料から「慶応4年（1868）1月1日時点」の
 * 領主を付与したもの。藩政期を通じた領域ではなく、幕末一時点の姿である。
 * 三部上地（1610・1621）の前後や、干拓の進行による村の増加は反映されない。
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const BASE =
  'https://raw.githubusercontent.com/yaoyue00085856/Kyudaka_agrivillage/master/02_kyudaka_v2.01/01_Data';
const CACHE = path.resolve(process.cwd(), 'tools/out/kyudaka');
const OUT = path.resolve(process.cwd(), 'src/data/datasets');

/** 対象とする領分の表記（元データの表記そのまま） */
const DOMAINS = {
  肥前佐賀藩: { id: 'saga', name: '佐賀藩', kind: '本藩' },
  肥前小城藩: { id: 'ogi', name: '小城藩', kind: '支藩' },
  肥前蓮池藩: { id: 'hasuike', name: '蓮池藩', kind: '支藩' },
  肥前鹿島藩: { id: 'kashima', name: '鹿島藩', kind: '支藩' },
};

const LICENSE = {
  license: 'CC BY-SA 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/deed.ja',
  source: '近世村領域データ（Kyudaka_agrivillage）v2.01',
  sourceUrl: 'https://github.com/yaoyue00085856/Kyudaka_agrivillage',
  citation:
    '本田謙一・夏目宗幸・根元裕樹「幕末期近世村領域データの作成―旧高旧領取調帳および農業集落境界データを活用して―」GIS-理論と応用 34巻1号 p.1-10、地理情報システム学会、2026年',
  doi: 'https://doi.org/10.5638/thagis.34.1.1',
  srcId: 'kyudaka-village',
  upstream: [
    '国立歴史民俗博物館「旧高旧領取調帳データベース」',
    '農林水産省「農業集落境界データ」（農林業センサス2015年版）',
  ],
  asOf: '慶応4年（1868）1月1日時点の領主',
  caveat:
    'これは幕末一時点の姿であり、藩政期を通じた領域ではない。三部上地（1610・1621）の前後や、干拓の進行による村の増減は反映されていない。',
};

/* ── CSV（Shift_JIS）を読む ───────────────────────── */

async function fetchCsv(name) {
  await mkdir(CACHE, { recursive: true });
  const local = path.join(CACHE, name);
  if (!existsSync(local)) {
    process.stdout.write(`取得中 ${name} … `);
    const res = await fetch(`${BASE}/${name}`);
    if (!res.ok) throw new Error(`${name} の取得に失敗しました（HTTP ${res.status}）`);
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(local, buf);
    console.log(`${buf.length.toLocaleString()} バイト`);
  }
  return new TextDecoder('shift_jis').decode(await readFile(local));
}

/** 素朴な CSV パーサ。引用符に対応する */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
      } else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const head = rows.shift();
  return rows
    .filter((r) => r.length === head.length)
    .map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}

/* ── 本体 ───────────────────────────────────────── */

// 列名は全角数字。元データの表記に合わせる
const RYO = ['１', '２', '３', '４', '５', '６'].map((n) => `領分${n}`);

const lordsOf = (row) => RYO.map((k) => (row[k] ?? '').trim()).filter(Boolean);

async function main() {
  const points = parseCsv(await fetchCsv('01_Village_point_data_v2.csv'));
  console.log(`全国の近世村 ${points.length.toLocaleString()} 件を読み込みました`);

  const villages = [];
  for (const row of points) {
    const lords = lordsOf(row);
    const mine = lords.filter((l) => DOMAINS[l]);
    if (!mine.length) continue;

    const lng = Number(row.Longitude);
    const lat = Number(row.Latitude);
    // 座標 0 は欠測。推定で埋めず、欠測のまま持つ
    const hasCoord = Number.isFinite(lng) && Number.isFinite(lat) && lng !== 0 && lat !== 0;

    villages.push({
      vid: row.VID,
      kuni: row.国名,
      gun: row.郡名,
      name: row.村名,
      reading: row.よみ || null,
      /** 本サイトが扱う藩のみ（id で持つ） */
      domains: mine.map((l) => DOMAINS[l].id),
      /** 他領と相給の場合、その相手（表記そのまま） */
      shared: lords.filter((l) => !DOMAINS[l]),
      /** 相給かどうか（領主が2つ以上） */
      isShared: lords.length > 1,
      lat: hasCoord ? lat : null,
      lng: hasCoord ? lng : null,
    });
  }

  villages.sort((a, b) =>
    a.gun.localeCompare(b.gun, 'ja') || a.name.localeCompare(b.name, 'ja')
  );

  /* 集計 */
  const byDomain = {};
  for (const [, d] of Object.entries(DOMAINS)) {
    const list = villages.filter((v) => v.domains.includes(d.id));
    const gunCount = {};
    for (const v of list) gunCount[v.gun] = (gunCount[v.gun] ?? 0) + 1;
    byDomain[d.id] = {
      name: d.name,
      kind: d.kind,
      villages: list.length,
      soleHeld: list.filter((v) => !v.isShared).length,
      shared: list.filter((v) => v.isShared).length,
      gun: Object.fromEntries(
        Object.entries(gunCount).sort((a, b) => b[1] - a[1])
      ),
    };
  }

  const noCoord = villages.filter((v) => v.lat === null);
  const lats = villages.filter((v) => v.lat !== null).map((v) => v.lat);
  const lngs = villages.filter((v) => v.lng !== null).map((v) => v.lng);

  const out = {
    ...LICENSE,
    generated: new Date().toISOString().slice(0, 10),
    counts: {
      villages: villages.length,
      withCoord: villages.length - noCoord.length,
      withoutCoord: noCoord.length,
      shared: villages.filter((v) => v.isShared).length,
    },
    bbox: {
      minLng: Math.min(...lngs), maxLng: Math.max(...lngs),
      minLat: Math.min(...lats), maxLat: Math.max(...lats),
    },
    byDomain,
    villages,
  };

  await mkdir(OUT, { recursive: true });
  await writeFile(path.join(OUT, 'villages.json'), JSON.stringify(out, null, 1), 'utf8');

  /* 報告 */
  console.log(`\n対象の村 ${villages.length} 件（座標あり ${out.counts.withCoord} / なし ${noCoord.length}）`);
  console.log(`相給（領主が複数）の村 ${out.counts.shared} 件\n`);
  console.log('藩'.padEnd(8) + '村数'.padStart(6) + '単独'.padStart(6) + '相給'.padStart(6) + '  主な郡');
  for (const [, d] of Object.entries(byDomain)) {
    const top = Object.entries(d.gun).slice(0, 4).map(([g, n]) => `${g}${n}`).join('・');
    console.log(
      d.name.padEnd(8) +
        String(d.villages).padStart(6) +
        String(d.soleHeld).padStart(6) +
        String(d.shared).padStart(6) +
        '  ' + top
    );
  }
  if (noCoord.length) {
    console.log(`\n座標なし：${noCoord.map((v) => v.kuni + v.gun + v.name).join('、')}`);
    console.log('（推定で埋めていない。原データで欠測のもの）');
  }
  console.log(`\n→ ${path.join(OUT, 'villages.json')}`);
  console.log('\n★ このデータは CC BY-SA 4.0。サイトに出すときは出典とライセンスを必ず表示すること。');
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
