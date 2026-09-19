/**
 * 信頼度 — 学術的誠実性の表明装置
 *
 * この3段階を記事・人物・家・役職・事件・用語のすべてに付ける。
 * `sourced` を名乗れるのは、原典（PDF 原本）と逐一照合したものだけ。
 * OCR で読めたというだけでは `ai` に留める。
 */
export const CONFIDENCE = {
  sourced: {
    label: '出典準拠',
    cls: 'badge-sourced',
    desc: '記述は明示した出典に基づき、人手で照合済み',
  },
  ai: {
    label: 'AI統合・検証中',
    cls: 'badge-ai',
    desc: '出典に基づくがAIによる統合を含む。原典との逐一照合は未了',
  },
  note: {
    label: '研究メモ',
    cls: 'badge-note',
    desc: '作業仮説・調査途上のメモ。引用非推奨',
  },
} as const;

export type ConfidenceKey = keyof typeof CONFIDENCE;
