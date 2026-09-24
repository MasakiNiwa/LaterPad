import type { DocNode } from '../document';
import { plainTextOf } from '../document';
import { AI_BLOCK_NODE } from '../aiBlocks';
import { renderAiBlock } from './aiPrompt';
import { blocksToMarkdown } from './markdown';
import type { ExportOptions, Exporter } from './types';

/**
 * Markdown + XML タグ形式。
 * 文書全体を <document> で囲み、見出しごとの区切りを <section title="…"> で明示する。
 * 見出しの階層がそのまま入れ子になるため、長い文書や「指示」と「資料」が混在する文書で
 * AI が各部分の範囲を取り違えにくい。本文は Markdown のまま出力する。
 */
export function toMarkdownXml(doc: DocNode, options: ExportOptions = {}): string {
  const lines: string[] = [];
  const title = options.title?.trim();
  lines.push(title ? `<document title="${escapeAttr(title)}">` : '<document>');

  const stack: number[] = [];
  let buffer: DocNode[] = [];
  const flush = () => {
    const md = blocksToMarkdown(buffer);
    if (md) lines.push(md);
    buffer = [];
  };

  for (const block of doc.content ?? []) {
    if (block.type === AI_BLOCK_NODE) {
      flush();
      const rendered = renderAiBlock(block);
      if (rendered) lines.push(rendered);
      continue;
    }
    if (block.type !== 'heading') {
      buffer.push(block);
      continue;
    }
    flush();
    const level = Number(block.attrs?.level ?? 1);
    while (stack.length && stack[stack.length - 1] >= level) {
      stack.pop();
      lines.push('</section>');
    }
    const heading = plainTextOf(block).replace(/\s+/g, ' ').trim();
    lines.push(heading ? `<section title="${escapeAttr(heading)}">` : '<section>');
    stack.push(level);
  }
  flush();
  while (stack.pop() !== undefined) lines.push('</section>');
  lines.push('</document>');

  // 空の文書は空文字にする（コピー対象なしとして扱う）
  if (lines.length === 2 && !title) return '';
  return lines.join('\n');
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export const markdownXmlExporter: Exporter = {
  id: 'markdown-xml',
  label: 'Markdown + XML タグ',
  description:
    '見出しごとの区切りを XML タグで囲み、本文は Markdown で表現します。長い文書や、指示と資料が混在する文書に向きます。',
  export: (doc, options) => toMarkdownXml(doc, options),
};
