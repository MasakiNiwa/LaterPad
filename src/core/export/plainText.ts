import type { DocNode } from '../document';
import { AI_BLOCK_NODE, roleInfo } from '../aiBlocks';
import { priorityPrefix } from './markdown';
import { tableToGrid } from './tableGrid';
import type { Exporter } from './types';

/**
 * 記法を含まないプレーンテキスト。
 * 構造は失われるが、書式を一切使っていない文書をそのまま渡したい場合に使う。
 */
export function toPlainText(doc: DocNode): string {
  return stripBlocks(doc.content ?? []).replace(/\n{3,}/g, '\n\n').replace(/^\n+|\s+$/g, '');
}

function stripBlocks(blocks: DocNode[]): string {
  let out = '';
  let prev: DocNode | null = null;
  for (const block of blocks) {
    if (prev) out += prev.type === 'paragraph' && block.type === 'paragraph' ? '\n' : '\n\n';
    out += stripBlock(block);
    prev = block;
  }
  return out;
}

function stripBlock(node: DocNode): string {
  switch (node.type) {
    case 'bulletList':
      return (node.content ?? []).map((item) => indent(stripBlocks(item.content ?? []), '・')).join('\n');
    case 'taskList':
      return (node.content ?? [])
        .map((item) => indent(stripBlocks(item.content ?? []), item.attrs?.checked ? '☑ ' : '☐ '))
        .join('\n');
    case 'orderedList': {
      const start = Number(node.attrs?.start ?? 1) || 1;
      return (node.content ?? [])
        .map((item, i) => indent(stripBlocks(item.content ?? []), `${start + i}. `))
        .join('\n');
    }
    case 'table':
      return tableToGrid(node, (cell) => stripBlocks(cell.content ?? []).replace(/\n/g, ' '))
        .map((row) => row.join('\t'))
        .join('\n');
    case 'horizontalRule':
      return '';
    case AI_BLOCK_NODE: {
      const info = roleInfo(node.attrs?.role);
      const body = stripBlocks(node.content ?? []).trim();
      if (!info.tag || !body) return '';
      const label = typeof node.attrs?.label === 'string' && node.attrs.label.trim() ? `：${node.attrs.label.trim()}` : '';
      return `【${info.label}${label}】\n${body}`;
    }
    case 'codeBlock':
      return (node.content ?? []).map((n) => n.text ?? '').join('');
    case 'text':
      return node.text ?? '';
    case 'hardBreak':
      return '\n';
    default:
      if (!node.content) return '';
      return isInlineContainer(node) ? stripInline(node.content) : stripBlocks(node.content);
  }
}

/** インライン要素を文字だけにする。重要度の印が始まる所には【必須】【推奨】を付ける */
function stripInline(nodes: DocNode[]): string {
  let out = '';
  let prevLevel: unknown = null;
  for (const n of nodes) {
    const mark = n.marks?.find((m) => m.type === 'priority');
    const level = mark?.attrs?.level ?? null;
    if (mark && level !== prevLevel) out += priorityPrefix(mark);
    prevLevel = level;
    out += stripBlock(n);
  }
  return out;
}

function isInlineContainer(node: DocNode): boolean {
  return node.type === 'paragraph' || node.type === 'heading';
}

function indent(text: string, marker: string): string {
  const pad = ' '.repeat(marker.length);
  return text
    .split('\n')
    .map((line, i) => (i === 0 ? marker + line : line ? pad + line : line))
    .join('\n');
}

export const plainTextExporter: Exporter = {
  id: 'plain',
  label: 'プレーンテキスト',
  description: '記法を使わず文字だけを出力します。書式情報は失われます。',
  export: (doc) => toPlainText(doc),
};

