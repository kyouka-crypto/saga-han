// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// ★ 公開先が決まったらここを実際の URL に変える。
//    sitemap.xml と OGP の canonical URL がこの値を使う。
const SITE = process.env.SITE_URL ?? 'https://saga-han.example.com';

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
    // CSS を1本にまとめず、ページごとに必要な分だけ配る
    inlineStylesheets: 'auto',
  },
});
