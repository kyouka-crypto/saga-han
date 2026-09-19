import type { APIRoute } from 'astro';

/**
 * robots.txt は静的ファイルではなく、ここで生成する。
 * 独自ドメインを付けたときに sitemap の URL を書き換え忘れる事故を防ぐため。
 */
export const GET: APIRoute = ({ site }) =>
  new Response(
    `User-agent: *
Allow: /

Sitemap: ${new URL('sitemap-index.xml', site).href}
`,
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
  );
