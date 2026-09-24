import type { DocNode } from '../document';

/**
 * AI 用コピーの変換器。
 * 新しい出力形式（Markdown + XML、TSV など）はこのインターフェースを実装して
 * registry に登録するだけで追加できる。
 */
export interface Exporter {
  /** 設定・保存に使う安定した ID */
  id: string;
  /** UI 表示名 */
  label: string;
  /** 短い説明（設定画面で表示） */
  description: string;
  export(doc: DocNode, options?: ExportOptions): string;
}

export interface ExportOptions {
  /** 文書タイトル（形式によっては見出しとして出力に含める） */
  title?: string;
}
