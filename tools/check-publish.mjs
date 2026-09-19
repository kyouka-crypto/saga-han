#!/usr/bin/env node
/**
 * 公開前の機械的な点検
 *
 * 一般公開サイトなので、出してはいけないものが混ざったまま公開される事故を
 * ビルドの一部として機械的に止める。人の注意力には頼らない。
 *
 *   node tools/check-publish.mjs
 *
 * 検出するもの：
 *   1. pdfpage:// リンク      … 手元の PDF ビューア用。外部には無意味かつ内部情報
 *   2. ローカルパス（Y:\ など）… 作業環境の情報が漏れる
 *   3. OCR 全文の混入          … 他人の著作物。掲載してはいけない
 *   4. 出典の無い記事          … 方針違反（confidence が sourced / ai なのに出典ゼロ）
 */

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const DIST = path.resolve(process.cwd(), 'dist');
const ARTICLES = path.resolve(process.cwd(), 'src/content/articles');

const RULES = [
  { id: 'pdfpage', re: /pdfpage:\/\//g, msg: 'pdfpage:// リンク（手元の PDF ビューア用）' },
  { id: 'localpath', re: /[A-Z]:\\\\?[^\s"'<>]{3,}/g, msg: 'ローカルパス' },
  { id: 'vaultpath', re: /Obsidian_資料|Vault_O\.S_|iCloudDrive/g, msg: '作業環境のフォルダ名' },
  { id: 'ocrhead', re: /##\s*\d+ページ（/g, msg: 'OCR 全文の見出し（他人の著作物の混入）' },
];

async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else yield full;
  }
}

let problems = 0;

// ── 1. dist の中身 ────────────────────────────────────
try {
  for await (const file of walk(DIST)) {
    if (!/\.(html|js|css|json|xml|txt)$/.test(file)) continue;
    // Pagefind の索引は本文の断片を持つので、ここでは対象外にする
    if (file.includes('pagefind')) continue;
    const text = await readFile(file, 'utf8');
    for (const r of RULES) {
      const hits = text.match(r.re);
      if (hits) {
        problems++;
        const rel = path.relative(process.cwd(), file);
        console.error(`✗ ${rel}\n    ${r.msg}：${hits.length}件 例) ${hits[0].slice(0, 90)}`);
      }
    }
  }
} catch (e) {
  if (e.code === 'ENOENT') {
    console.error('dist/ がありません。先に astro build を実行してください。');
    process.exit(1);
  }
  throw e;
}

// ── 2. 記事の出典 ─────────────────────────────────────
for (const name of await readdir(ARTICLES)) {
  if (!name.endsWith('.md')) continue;
  const text = await readFile(path.join(ARTICLES, name), 'utf8');
  const fm = text.split(/^---$/m)[1] ?? '';
  const conf = /confidence:\s*(\w+)/.exec(fm)?.[1] ?? 'ai';
  const hasRefs = /sourceRefs:\s*\n\s+-\s+src:/.test(fm);
  if (!hasRefs && conf !== 'note') {
    problems++;
    console.error(`✗ src/content/articles/${name}\n    出典（sourceRefs）がありません。confidence: ${conf} で出典なしは方針違反です。`);
  }
}

if (problems > 0) {
  console.error(`\n${problems}件の問題が見つかりました。公開できません。`);
  process.exit(1);
}

console.log('✓ 公開前点検：問題なし');
