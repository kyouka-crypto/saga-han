#!/usr/bin/env node
/**
 * 藩領ポリゴンの作成
 *
 * 近世村領域データ（Kyudaka_agrivillage）の村と、農林水産省の農業集落境界データを
 * 結び、佐賀藩と三支藩の領域ポリゴンを GeoJSON として書き出す。
 *
 *   node tools/build-territory-polygons.mjs [--tolerance 0.00015]
 *
 * 先に build-territory.mjs を実行しておくこと（村の一覧を使う）。
 *
 * ── 仕組み ──────────────────────────────────────────
 *   村（VID/AID）─ 03_KEY_AID.csv ─ 農業集落コード（KEY）─ 農業集落境界データ
 * 村ひとつが複数の農業集落にまたがるため、KEY を村単位でまとめて面にする。
 *
 * ── 依存 ────────────────────────────────────────────
 * 外部ライブラリを使わない。ZIP・DBF・SHP をこのファイル内で読む。
 * 元データの測地系は JGD2000 の緯度経度（EPSG:4612）で、WGS84 との差は
 * この縮尺では無視できるため投影変換もしない。
 *
 * ── 出典（表示が義務） ──────────────────────────────
 * ・本田謙一・夏目宗幸・根元裕樹「幕末期近世村領域データの作成―旧高旧領取調帳
 *   および農業集落境界データを活用して―」GIS-理論と応用 34巻1号 p.1-10、
 *   地理情報システム学会、2026年 ／ CC BY-SA 4.0
 * ・農林水産省「農業集落境界データ」（農林業センサス2015年版）
 * ・国立歴史民俗博物館「旧高旧領取調帳データベース」
 *
 * CC BY-SA 4.0 は継承条項つき。ここから作った GeoJSON も同じ条件で提供する。
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import path from 'node:path';
import process from 'node:process';

const KYUDAKA =
  'https://raw.githubusercontent.com/yaoyue00085856/Kyudaka_agrivillage/master/02_kyudaka_v2.01/01_Data';
const MAFF = 'https://www.machimura.maff.go.jp/shurakudata/2015/ma';
/** 佐賀県・長崎県。肥前国の村はこの2県に収まる */
const PREFS = ['41', '42'];

const CACHE_K = path.resolve(process.cwd(), 'tools/out/kyudaka');
const CACHE_M = path.resolve(process.cwd(), 'tools/out/maff');
const OUT = path.resolve(process.cwd(), 'src/data/datasets');

const arg = (name, def) => {
  const i = process.argv.indexOf(name);
  return i === -1 ? def : Number(process.argv[i + 1]);
};
/**
 * 簡略化の許容誤差（度）。2段階で書き出す。
 *   detail   … 地図ページ用。必要になったときだけ読み込む
 *   overview … 家のページなどに置く小さな地図用。ビルド時に SVG へ焼ける軽さ
 * 緯度33度あたりでは 0.0001度 ≒ 11m。
 */
const LEVELS = [
  { name: 'territory.geojson', tol: arg('--tolerance', 0.0003) },
  { name: 'territory-overview.geojson', tol: arg('--tolerance-overview', 0.0015) },
];

const sjis = new TextDecoder('shift_jis');

/* ── 取得 ───────────────────────────────────────── */

async function cached(dir, name, url) {
  await mkdir(dir, { recursive: true });
  const p = path.join(dir, name);
  if (!existsSync(p)) {
    process.stdout.write(`取得中 ${name} … `);
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) throw new Error(`${name} の取得に失敗（HTTP ${res.status}）`);
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(p, buf);
    console.log(`${buf.length.toLocaleString()} バイト`);
  }
  return readFile(p);
}

/* ── ZIP（格納・deflate のみ。この用途には十分） ──── */

function unzip(buf) {
  const files = new Map();
  // 末尾の中央ディレクトリから辿る
  let eocd = buf.length - 22;
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error('ZIP の終端が見つかりません');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);

  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('ZIP の中央ディレクトリが壊れています');
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOff = buf.readUInt32LE(p + 42);
    const name = buf.toString('latin1', p + 46, p + 46 + nameLen);

    // ローカルヘッダを読んで実データの位置を決める
    const lNameLen = buf.readUInt16LE(localOff + 26);
    const lExtraLen = buf.readUInt16LE(localOff + 28);
    const start = localOff + 30 + lNameLen + lExtraLen;
    const raw = buf.subarray(start, start + compSize);
    files.set(name, method === 0 ? raw : inflateRawSync(raw));

    p += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

/* ── DBF ────────────────────────────────────────── */

function readDbf(buf) {
  const nrec = buf.readUInt32LE(4);
  const hlen = buf.readUInt16LE(8);
  const rlen = buf.readUInt16LE(10);

  const fields = [];
  for (let off = 32; buf[off] !== 0x0d; off += 32) {
    fields.push({
      name: sjis.decode(buf.subarray(off, off + 11)).replace(/\0.*$/, ''),
      len: buf[off + 16],
    });
  }

  const rows = [];
  for (let i = 0; i < nrec; i++) {
    const base = hlen + i * rlen;
    if (buf[base] === 0x2a) { rows.push(null); continue; } // 削除済み
    const row = {};
    let p = base + 1;
    for (const f of fields) {
      row[f.name] = sjis.decode(buf.subarray(p, p + f.len)).trim();
      p += f.len;
    }
    rows.push(row);
  }
  return rows;
}

/* ── SHP（ポリゴン：型5 のみ） ──────────────────── */

function readShp(buf) {
  const shapes = [];
  let p = 100; // ファイルヘッダ
  while (p < buf.length) {
    const contentLen = buf.readInt32BE(p + 4) * 2;
    const c = p + 8;
    const type = buf.readInt32LE(c);
    if (type === 5) {
      const numParts = buf.readInt32LE(c + 36);
      const numPoints = buf.readInt32LE(c + 40);
      const partsAt = c + 44;
      const pointsAt = partsAt + numParts * 4;

      const parts = [];
      for (let i = 0; i < numParts; i++) parts.push(buf.readInt32LE(partsAt + i * 4));
      parts.push(numPoints);

      const rings = [];
      for (let i = 0; i < numParts; i++) {
        const ring = [];
        for (let j = parts[i]; j < parts[i + 1]; j++) {
          ring.push([buf.readDoubleLE(pointsAt + j * 16), buf.readDoubleLE(pointsAt + j * 16 + 8)]);
        }
        rings.push(ring);
      }
      shapes.push(rings);
    } else {
      shapes.push(null); // 空・非ポリゴン
    }
    p = c + contentLen;
  }
  return shapes;
}

/* ── ジオメトリ ─────────────────────────────────── */

/** 符号付き面積。シェープファイルでは外郭が時計回り＝負 */
const signedArea = (ring) => {
  let a = 0;
  for (let i = 0, n = ring.length; i < n - 1; i++) {
    a += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  }
  return a / 2;
};

/** Douglas-Peucker。度をそのまま使う（この緯度では経度方向がやや詰まるが実害はない） */
function simplify(points, tol) {
  if (points.length <= 4) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];

  while (stack.length) {
    const [s, e] = stack.pop();
    let maxD = 0;
    let idx = -1;
    const [x1, y1] = points[s];
    const [x2, y2] = points[e];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const den = dx * dx + dy * dy;
    for (let i = s + 1; i < e; i++) {
      const [x, y] = points[i];
      let d;
      if (den === 0) d = Math.hypot(x - x1, y - y1);
      else {
        let t = ((x - x1) * dx + (y - y1) * dy) / den;
        t = Math.max(0, Math.min(1, t));
        d = Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
      }
      if (d > maxD) { maxD = d; idx = i; }
    }
    if (maxD > tol && idx !== -1) {
      keep[idx] = 1;
      stack.push([s, idx], [idx, e]);
    }
  }
  const out = [];
  for (let i = 0; i < points.length; i++) if (keep[i]) out.push(points[i]);
  // 環として閉じていなければ閉じる
  if (out.length >= 3 && (out[0][0] !== out.at(-1)[0] || out[0][1] !== out.at(-1)[1])) out.push(out[0]);
  return out.length >= 4 ? out : points;
}

const round = (ring) => ring.map(([x, y]) => [Number(x.toFixed(5)), Number(y.toFixed(5))]);

/** 概算面積（km²）。緯度33度あたりの経度の詰まりだけを補正した粗い値 */
function areaKm2(geometry) {
  const polys = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  let a = 0;
  for (const poly of polys) {
    for (let r = 0; r < poly.length; r++) {
      const ring = poly[r];
      let s = 0;
      for (let i = 0; i < ring.length - 1; i++) {
        s += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
      }
      // 外郭は足し、穴は引く
      a += (r === 0 ? 1 : -1) * Math.abs(s / 2);
    }
  }
  return a * 111 * 111 * Math.cos((33.2 * Math.PI) / 180);
}

/** 藩ごとの集計。相給の村は関係する藩すべてに数える */
function domainStats(features) {
  const NAMES = { saga: '佐賀藩', ogi: '小城藩', hasuike: '蓮池藩', kashima: '鹿島藩' };
  const out = {};
  for (const f of features) {
    const km2 = areaKm2(f.geometry);
    for (const d of f.properties.domains) {
      out[d] ??= { name: NAMES[d] ?? d, polygons: 0, areaKm2: 0, shared: 0 };
      out[d].polygons++;
      out[d].areaKm2 += km2;
      if (f.properties.isShared) out[d].shared++;
    }
  }
  for (const v of Object.values(out)) v.areaKm2 = Number(v.areaKm2.toFixed(1));
  return out;
}

/**
 * シェープファイルの環の集合を GeoJSON の Polygon 群に組み替える。
 * 外郭（時計回り＝面積が負）ごとに、その後に続く穴をまとめる。
 */
function toPolygons(rings) {
  const polys = [];
  let cur = null;
  for (const ring of rings) {
    if (ring.length < 4) continue;
    if (signedArea(ring) < 0) {
      // 外郭。GeoJSON は反時計回りが外郭なので向きを反転する
      cur = [[...ring].reverse()];
      polys.push(cur);
    } else if (cur) {
      cur.push([...ring].reverse()); // 穴
    }
  }
  return polys;
}

/* ── CSV ────────────────────────────────────────── */

function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else quoted = false; }
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const head = rows.shift();
  return rows.filter((r) => r.length === head.length)
             .map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}

/* ── 本体 ───────────────────────────────────────── */

async function main() {
  const villagesPath = path.join(OUT, 'villages.json');
  if (!existsSync(villagesPath)) {
    console.error('先に node tools/build-territory.mjs を実行してください。');
    process.exit(1);
  }
  const base = JSON.parse(await readFile(villagesPath, 'utf8'));
  const byVid = new Map(base.villages.map((v) => [v.vid, v]));
  console.log(`対象の村 ${byVid.size} 件`);

  // 村（AID）→ 農業集落コード（KEY）
  const keyAid = parseCsv(sjis.decode(await cached(CACHE_K, '03_KEY_AID.csv', `${KYUDAKA}/03_KEY_AID.csv`)));
  const keyToVid = new Map();
  for (const r of keyAid) if (byVid.has(r.AID)) keyToVid.set(r.KEY, r.AID);
  console.log(`必要な農業集落 ${keyToVid.size.toLocaleString()} 件`);

  // 農業集落境界データ
  /** vid → ポリゴン群 */
  const shapesByVid = new Map();
  let used = 0;
  for (const pref of PREFS) {
    const zip = unzip(await cached(CACHE_M, `ma_${pref}.zip`, `${MAFF}/MA0001_2015_2015_${pref}.zip`));
    const dir = `MA0001_2015_2015_${pref}`;
    const rows = readDbf(zip.get(`${dir}/rcom.dbf`));
    const shapes = readShp(zip.get(`${dir}/rcom.shp`));
    let hit = 0;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;
      const vid = keyToVid.get(row.KEY);
      if (!vid || !shapes[i]) continue;
      hit++;
      if (!shapesByVid.has(vid)) shapesByVid.set(vid, []);
      shapesByVid.get(vid).push(...toPolygons(shapes[i]));
    }
    console.log(`  ${pref === '41' ? '佐賀県' : '長崎県'}：${rows.length.toLocaleString()} 集落のうち ${hit.toLocaleString()} 件が該当`);
    used += hit;
  }

  // 簡略化して GeoJSON に。許容誤差ごとに作り直す
  const build = (TOLERANCE) => {
  const features = [];
  let ptsBefore = 0, ptsAfter = 0;
  for (const [vid, polys] of shapesByVid) {
    const v = byVid.get(vid);
    const simplified = [];
    for (const poly of polys) {
      const rings = [];
      for (const ring of poly) {
        ptsBefore += ring.length;
        const s = round(simplify(ring, TOLERANCE));
        ptsAfter += s.length;
        if (s.length >= 4) rings.push(s);
      }
      if (rings.length) simplified.push(rings);
    }
    if (!simplified.length) continue;

    features.push({
      type: 'Feature',
      properties: {
        vid,
        name: v.name,
        reading: v.reading,
        gun: v.gun,
        domains: v.domains,
        isShared: v.isShared,
        shared: v.shared,
      },
      geometry:
        simplified.length === 1
          ? { type: 'Polygon', coordinates: simplified[0] }
          : { type: 'MultiPolygon', coordinates: simplified },
    });
  }

  features.sort((a, b) => a.properties.vid.localeCompare(b.properties.vid));
  return { features, ptsBefore, ptsAfter };
  };

  const missingOf = (features) => {
    const has = new Set(features.map((f) => f.properties.vid));
    return base.villages.filter((v) => !has.has(v.vid));
  };

  const meta = (features, missing, TOLERANCE) => ({
    type: 'FeatureCollection',
    name: '佐賀藩・小城藩・蓮池藩・鹿島藩の村領域',
    license: base.license,
    licenseUrl: base.licenseUrl,
    citation: base.citation,
    doi: base.doi,
    upstream: [...base.upstream],
    asOf: base.asOf,
    caveat: base.caveat,
    note:
      `農業集落境界データ（2015年版）の集落界を村単位にまとめたもの。` +
      `許容誤差 ${TOLERANCE} 度（約 ${Math.round(TOLERANCE * 111000)}m）で簡略化し、座標は小数5桁に丸めている。` +
      `明治以降の集落界から推定した領域であり、当時の村境そのものではない。`,
    generated: new Date().toISOString().slice(0, 10),
    counts: {
      villages: base.villages.length,
      withPolygon: features.length,
      withoutPolygon: missing.length,
      settlements: used,
    },
    /** 藩ごとの面の数と概算面積（km²）。相給の村は関係する藩の両方に数える */
    byDomain: domainStats(features),
    /** 面を持てなかった村。城下町の町方が中心で、推定では補わない */
    withoutPolygon: missing.map((v) => ({ vid: v.vid, gun: v.gun, name: v.name, domains: v.domains })),
    features,
  });

  /* 詳細度ごとに書き出す */
  await mkdir(OUT, { recursive: true });
  let first = null;
  for (const lv of LEVELS) {
    const { features, ptsBefore, ptsAfter } = build(lv.tol);
    const missing = missingOf(features);
    const outPath = path.join(OUT, lv.name);
    await writeFile(outPath, JSON.stringify(meta(features, missing, lv.tol)), 'utf8');
    const size = (await readFile(outPath)).length;
    console.log(
      `\n${lv.name}　許容誤差 ${lv.tol} 度（約 ${Math.round(lv.tol * 111000)}m）\n` +
        `  面を持てた村 ${features.length} / ${base.villages.length}\n` +
        `  頂点 ${ptsBefore.toLocaleString()} → ${ptsAfter.toLocaleString()}` +
        `（${((1 - ptsAfter / ptsBefore) * 100).toFixed(1)}% 削減）\n` +
        `  ${(size / 1024).toFixed(0)} KB`
    );
    first ??= { features, missing };
  }

  const { features, missing } = first;
  console.log('\n藩'.padEnd(8) + '面の数'.padStart(8) + '相給'.padStart(6) + '概算面積'.padStart(12));
  for (const d of Object.values(domainStats(features))) {
    console.log(
      d.name.padEnd(8) +
        String(d.polygons).padStart(8) +
        String(d.shared).padStart(6) +
        `${d.areaKm2.toLocaleString()} km²`.padStart(14)
    );
  }
  console.log('（相給の村は関係する藩の両方に数えているため、合計は実面積と一致しない）');

  if (missing.length) {
    console.log(`\n面を持てなかった村 ${missing.length} 件：`);
    console.log('  ' + missing.map((v) => v.gun + v.name).join('、'));
    console.log('  （農業集落界に対応するものが無い。城下町など市街化した区域が多いとみられる。推定で補わない）');
  }
  console.log('\n★ CC BY-SA 4.0。サイトに出すときは出典とライセンスを必ず表示すること。');
}

main().catch((e) => {
  console.error(e.stack ?? e.message);
  process.exit(1);
});
