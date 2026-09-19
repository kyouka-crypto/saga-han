import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    subtitleEn: z.string().optional(),
    era: z.enum(['geo', 'jomon', 'yayoi', 'kofun', 'ancient', 'medieval', 'shoni', 'ryuzoji', 'edo', 'bakumatsu', 'modern']),
    /** 表示用の年代ラベル（例: "1570" "1610–1621"） */
    year: z.string().optional(),
    /** 年表・ソート用の代表年（西暦） */
    sortYear: z.number(),
    summary: z.string(),
    tags: z.array(z.string()).default([]),
    confidence: z.enum(['sourced', 'ai', 'note']).default('ai'),
    sources: z.array(z.string()).default([]),
    created: z.string(),
    updated: z.string(),
    /** 関連記事の slug */
    related: z.array(z.string()).default([]),
  }),
});

export const collections = { articles };
