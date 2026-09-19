#!/usr/bin/env node
/**
 * OCR 索引ツール
 *
 * 手元の OCR 全文（約 4,500 ページ・8.8MB）を「引ける」状態にする。
 * これが無いと記事は書けない。計画（docs/PLAN.md）の Phase 0-2。
 *
 *   node tools/index-ocr.mjs build          ページ単位に分解して pages.json を作る
 *   node tools/index-ocr.mjs find 請役所     該当ページを本・ページ番号つきで一覧
 *   node tools/index-ocr.mjs find 手明鑓 -c 300   前後 300 字の文脈つき
 *   node tools/index-ocr.mjs page sagashishi-2 24      そのページの全文を表示
 *   node tools/index-ocr.mjs vocab          語彙リストの出現位置を索引化
 *
 * 重要：OCR 全文は他人の著作物であり、サイトには一切出さない。
 * このツールの出力は tools/out/ に置き、.gitignore で追跡から外す。
 */

import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

/* ── 設定 ───────────────────────────────────────────── */

const VAULT_OCR =
  process.env.SAGA_OCR_DIR ??
  'C:/Users/kiris/iCloudDrive/iCloud~md~obsidian/Vault_O.S_/OCR全文';

const OUT_DIR = path.resolve(process.cwd(), 'tools/out');
const PAGES_JSON = path.join(OUT_DIR, 'pages.json');
const INDEX_JSON = path.join(OUT_DIR, 'ocr-index.json');

/** OCR ファイル名 → sources.json の id */
const FILE_TO_SOURCE = {
  '佐賀市史_第1巻_OCR.md': 'sagashishi-1',
  '佐賀市史_第2巻_OCR.md': 'sagashishi-2',
  '佐賀市史_第3巻_OCR.md': 'sagashishi-3',
  '佐賀市史 第2巻_目次_OCR.md': 'sagashishi-2',
  '佐賀藩の総合研究_OCR.md': 'sogo-kenkyu',
  '佐賀藩の総合研究_前1章_OCR.md': 'sogo-kenkyu',
  '続 佐賀藩の総合研究_OCR.md': 'zoku-sogo-kenkyu',
};

/**
 * OCR の揺れ・誤認識の正規化。
 * 検索時にのみ適用し、本文そのものは書き換えない（OCR 全文は編集しない）。
 * 左が「本文に現れうる表記」、右が「正規形」。
 */
const NORMALIZE = [
  [/少式|少弍/g, '少弐'],
  [/竜造寺/g, '龍造寺'],
  [/蝦島|鎬島/g, '鍋島'],
  [/手明槍/g, '手明鑓'],
];

const normalize = (s) => NORMALIZE.reduce((acc, [re, to]) => acc.replace(re, to), s);

/* ── build ──────────────────────────────────────────── */

/** `## 24ページ（近世）　[PDFを開く](pdfpage://...)` を拾う */
const PAGE_HEAD = /^##\s*(\d+)ページ(?:（([^）]*)）)?\s*(.*)$/;

async function build() {
  if (!existsSync(VAULT_OCR)) {
    console.error(`OCR フォルダが見つかりません: ${VAULT_OCR}`);
    console.error('環境変数 SAGA_OCR_DIR で場所を指定できます。');
    process.exit(1);
  }

  const files = (await readdir(VAULT_OCR)).filter((f) => f.endsWith('.md'));
  const pages = [];

  for (const file of files) {
    const src = FILE_TO_SOURCE[file];
    if (!src) {
      console.warn(`! sources.json に対応づけの無いファイルを飛ばしました: ${file}`);
      continue;
    }

    const raw = await readFile(path.join(VAULT_OCR, file), 'utf8');
    const lines = raw.split(/\r?\n/);

    let cur = null;
    for (const line of lines) {
      const m = line.match(PAGE_HEAD);
      if (m) {
        if (cur) pages.push(cur);
        cur = {
          src,
          file,
          page: Number(m[1]),
          section: m[2] ?? '',
          text: '',
        };
        continue;
      }
      // pdfpage:// リンクとローカルパスは出力に残さない（公開事故の予防）
      if (cur && !line.startsWith('pdfpage://')) cur.text += line + '\n';
    }
    if (cur) pages.push(cur);
  }

  for (const p of pages) p.text = p.text.replace(/\s+/g, ' ').trim();

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(PAGES_JSON, JSON.stringify(pages), 'utf8');

  const bySrc = {};
  for (const p of pages) bySrc[p.src] = (bySrc[p.src] ?? 0) + 1;

  console.log(`${pages.length} ページを ${PAGES_JSON} に書き出しました`);
  for (const [s, n] of Object.entries(bySrc)) console.log(`  ${s.padEnd(18)} ${n} ページ`);
  const chars = pages.reduce((a, p) => a + p.text.length, 0);
  console.log(`  本文計 ${chars.toLocaleString()} 字`);
}

/* ── find ───────────────────────────────────────────── */

async function loadPages() {
  if (!existsSync(PAGES_JSON)) {
    console.error('先に `node tools/index-ocr.mjs build` を実行してください。');
    process.exit(1);
  }
  return JSON.parse(await readFile(PAGES_JSON, 'utf8'));
}

async function find(query, { context = 0, limit = 60 } = {}) {
  const pages = await loadPages();
  const q = normalize(query);
  const hits = [];

  for (const p of pages) {
    const text = normalize(p.text);
    let from = 0;
    let count = 0;
    const snippets = [];
    for (;;) {
      const i = text.indexOf(q, from);
      if (i === -1) break;
      count++;
      if (context > 0 && snippets.length < 3) {
        snippets.push(text.slice(Math.max(0, i - context), i + q.length + context));
      }
      from = i + q.length;
    }
    if (count) hits.push({ ...p, count, snippets });
  }

  hits.sort((a, b) => b.count - a.count || a.src.localeCompare(b.src) || a.page - b.page);

  if (!hits.length) {
    console.log(`「${query}」は見つかりませんでした。`);
    return;
  }

  const total = hits.reduce((a, h) => a + h.count, 0);
  console.log(`「${query}」 ${hits.length} ページに ${total} 件\n`);

  const bySrc = {};
  for (const h of hits) (bySrc[h.src] ??= []).push(h);

  for (const [src, list] of Object.entries(bySrc)) {
    const pageList = [...list].sort((a, b) => a.page - b.page);
    console.log(`── ${src} （${list.length} ページ）`);
    console.log(`   p.${pageList.map((h) => `${h.page}${h.count > 1 ? `(${h.count})` : ''}`).join(', ')}`);
    if (context > 0) {
      for (const h of pageList.slice(0, limit)) {
        for (const s of h.snippets) console.log(`   p.${h.page}  …${s}…`);
      }
    }
    console.log('');
  }

  console.log('※ 引用・断定の前に必ず PDF 原本で確認すること（OCR には誤認識がある）。');
}

/* ── page ───────────────────────────────────────────── */

async function showPage(src, page) {
  const pages = await loadPages();
  const hit = pages.find((p) => p.src === src && p.page === Number(page));
  if (!hit) {
    console.error(`${src} の ${page} ページが見つかりません。`);
    process.exit(1);
  }
  console.log(`── ${hit.src} p.${hit.page}${hit.section ? `（${hit.section}）` : ''}  [${hit.file}]\n`);
  console.log(hit.text);
}

/* ── vocab ──────────────────────────────────────────── */

/** 語彙リスト。記事化したい主題の索引をまとめて作るためのもの。 */
const VOCAB = [
  // 制度・職制
  '請役所', '御目安方', '御蔵方', '懸硯方', '郡代', '代官', '五人組', '案文方', '相談役',
  // 家臣団・身分
  '家格', '三家', '親類同格', '着座', '独礼', '手明鑓', '徒士', '足軽', '地方知行', '蔵入地',
  '三部上地', '着到', '大組頭',
  // 財政
  '借銀', '藩札', '御用商人', '専売', '蔵元',
  // 軍事・対外
  '長崎警備', '島原の乱', '幕命普請', '与', '備', '戊辰',
  // 土地・産業
  '干拓', '新田', '搦', '籠', '有明海', '陶磁器', '有田', '石炭',
  // 学問・文化
  '葉隠', '弘道館', '蘭学', '医学館', '精煉方', '反射炉', '三重津',
  // 人物・家
  '直茂', '勝茂', '光茂', '綱茂', '吉茂', '宗茂', '宗教', '重茂', '治茂', '斉直', '直正', '直大',
  '多久', '武雄', '諫早', '須古', '蓮池', '小城', '鹿島',
  '龍造寺隆信', '龍造寺政家', '龍造寺高房', '江藤新平', '大隈重信',
];

async function vocab() {
  const pages = await loadPages();
  const index = {};

  for (const term of VOCAB) {
    const t = normalize(term);
    const bySrc = {};
    for (const p of pages) {
      const text = normalize(p.text);
      let from = 0;
      let count = 0;
      for (;;) {
        const i = text.indexOf(t, from);
        if (i === -1) break;
        count++;
        from = i + t.length;
      }
      if (count) (bySrc[p.src] ??= []).push([p.page, count]);
    }
    index[term] = bySrc;
  }

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(INDEX_JSON, JSON.stringify(index, null, 1), 'utf8');

  console.log(`${VOCAB.length} 語の索引を ${INDEX_JSON} に書き出しました\n`);
  const rows = VOCAB.map((t) => {
    const total = Object.values(index[t]).flat().reduce((a, [, c]) => a + c, 0);
    const pageCount = Object.values(index[t]).flat().length;
    return { t, total, pageCount };
  }).sort((a, b) => b.total - a.total);

  console.log('語'.padEnd(14) + '出現'.padStart(6) + 'ページ'.padStart(8));
  for (const r of rows) {
    console.log(r.t.padEnd(14) + String(r.total).padStart(6) + String(r.pageCount).padStart(8));
  }
  const zero = rows.filter((r) => r.total === 0);
  if (zero.length) {
    console.log(`\n出現ゼロ（表記違い・資料外の可能性）: ${zero.map((r) => r.t).join('、')}`);
  }
}

/* ── CLI ────────────────────────────────────────────── */

const [cmd, ...rest] = process.argv.slice(2);

const flag = (name, def) => {
  const i = rest.indexOf(name);
  return i === -1 ? def : Number(rest[i + 1]);
};
const positional = rest.filter((a, i) => !a.startsWith('-') && !(rest[i - 1] ?? '').startsWith('-'));

switch (cmd) {
  case 'build':
    await build();
    break;
  case 'find':
    if (!positional[0]) {
      console.error('使い方: node tools/index-ocr.mjs find <語> [-c 文脈字数]');
      process.exit(1);
    }
    await find(positional[0], { context: flag('-c', 0) });
    break;
  case 'page':
    await showPage(positional[0], positional[1]);
    break;
  case 'vocab':
    await vocab();
    break;
  default:
    console.log(`OCR 索引ツール

  build                       OCR をページ単位に分解
  find <語> [-c 字数]          該当ページを一覧（-c で文脈表示）
  page <出典id> <ページ>        そのページの全文
  vocab                       語彙リストを一括索引化

OCR フォルダ: ${VAULT_OCR}`);
}
