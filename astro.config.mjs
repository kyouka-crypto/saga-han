// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  markdown: {
    remarkRehype: {
      footnoteLabel: '脚注',
      footnoteLabelProperties: { className: ['sr-only'] },
      footnoteBackLabel: '本文へ戻る',
    },
  },
});
