// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

/**
 * 公開 URL。sitemap.xml・canonical・OGP・robots.txt がこの値を使う。
 *
 * Netlify が渡す環境変数を優先して拾う：
 *   URL              … 本番の URL（独自ドメインを付ければ自動でそちらになる）
 *   DEPLOY_PRIME_URL … デプロイプレビューの URL
 * ローカルでは末尾のフォールバックが使われる。
 */
const isProd = process.env.CONTEXT === 'production';
const SITE =
  process.env.SITE_URL ??
  (isProd ? process.env.URL : process.env.DEPLOY_PRIME_URL ?? process.env.URL) ??
  'https://dancing-concha-3433eb.netlify.app';

// https://astro.build/config
export default defineConfig({
  site: SITE,
  trailingSlash: 'always',
  integrations: [sitemap()],
  markdown: {
    remarkRehype: {
      footnoteLabel: '脚注',
      footnoteLabelProperties: { className: ['sr-only'] },
      footnoteBackLabel: '本文へ戻る',
    },
  },
  build: {
    inlineStylesheets: 'auto',
  },
});
