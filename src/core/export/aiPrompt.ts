import { AI_BLOCK_NODE, roleInfo } from '../aiBlocks';
import type { DocNode } from '../document';
import { blocksToMarkdown } from './markdown';
import type { Exporter } from './types';

/**
 * LaterPad AI書式。
 *
 * 意味ブロック（指示・背景・条件・資料・出力形式・例）を役割ごとの XML タグで囲み、
 * それ以外の本文と書式は Markdown で表現する。メモは出力しない。
 * XML タグで各部分の境界と役割を明示するのは、主要な AI ベンダーが推奨する
 * プロンプト構造化の方法で、資料の中の文を指示と取り違えにくくなる。
 */
export function toAiPrompt(doc: DocNode): string {
  return renderWithAiBlocks(doc.content ?? []);
}

/** 意味ブロックをタグに、それ以外を Markdown にして連結する */
export function renderWithAiBlocks(blocks: DocNode[]): string {
  const parts: string[] = [];
  let buffer: DocNode[] = [];
  const flush = () => {
    const md = blocksToMarkdown(buffer);
    if (md) parts.push(md);
    buffer = [];
  };
  for (const block of blocks) {
    if (block.type !== AI_BLOCK_NODE) {
      buffer.push(block);
      continue;
    }
    flush();
    const rendered = renderAiBlock(block);
    if (rendered) parts.push(rendered);
  }
  flush();
  return parts.join('\n\n');
}

/** 意味ブロック 1 つを XML タグ付きで出力する。メモや空のブロックは空文字 */
export function renderAiBlock(block: DocNode): string {
  const info = roleInfo(block.attrs?.role);
  if (!info.tag) return '';
  const inner = renderWithAiBlocks(block.content ?? []);
  if (!inner) return '';
  const label = typeof block.attrs?.label === 'string' ? block.attrs.label.trim() : '';
  const open = label ? `<${info.tag} title="${escapeAttr(label)}">` : `<${info.tag}>`;
  return `${open}\n${inner}\n</${info.tag}>`;
}

export function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export const aiPromptExporter: Exporter = {
  id: 'laterpad-ai',
  label: 'AI書式（LaterPad）',
  description:
    '指示・背景・条件・資料・出力形式・例のブロックを XML タグで区切り、本文は Markdown で表現します。AI が各部分の役割を取り違えにくい形式です。',
  export: (doc) => toAiPrompt(doc),
};
