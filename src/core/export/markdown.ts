import type { DocMark, DocNode } from '../document';
import { AI_BLOCK_NODE, roleInfo } from '../aiBlocks';
import { tableToGrid } from './tableGrid';
import type { Exporter } from './types';

/**
 * LaterPad の文書構造を、AI に渡しやすい Markdown に変換する。
 *
 * 方針:
 * - 人間が見た改行・空行の見た目をできるだけ保つ（段落同士は 1 改行で連結し、
 *   空段落は空行として残す）。見出し・リスト・表などのブロックの前後には空行を入れる。
 * - AI が読むことを前提に、過剰なエスケープはしない。
 * - 文字色やフォントなど、構造として意味の薄い装飾は出力しない。
 */
export function toMarkdown(doc: DocNode): string {
  return blocksToMarkdown(doc.content ?? []);
}

/** ブロックの並びを Markdown に変換する（他の形式から部分的に利用する） */
export function blocksToMarkdown(blocks: DocNode[]): string {
  const out = serializeBlocks(blocks);
  return out.replace(/\n{3,}/g, '\n\n').replace(/^\n+|\s+$/g, '');
}

/** インライン要素だけを Markdown に変換する（見出しテキスト等） */
export function inlineToMarkdown(nodes: DocNode[]): string {
  return serializeInline(nodes);
}

export const markdownExporter: Exporter = {
  id: 'markdown',
  label: 'Markdown',
  description: '見出し・リスト・表などを Markdown 記法で表現します。多くの AI が最も安定して解釈できます。',
  export: (doc) => toMarkdown(doc),
};

// ---------------------------------------------------------------- blocks

function serializeBlocks(blocks: DocNode[], tight = false): string {
  let out = '';
  let prev: DocNode | null = null;
  for (const block of blocks) {
    const text = serializeBlock(block);
    if (prev) out += separator(prev, block, tight);
    out += text;
    prev = block;
  }
  return out;
}

function separator(prev: DocNode, next: DocNode, tight: boolean): string {
  if (tight) return '\n';
  // 段落が続く場合は、ユーザーが Enter で改行しただけとみなして 1 改行
  if (prev.type === 'paragraph' && next.type === 'paragraph') return '\n';
  return '\n\n';
}

function serializeBlock(node: DocNode): string {
  switch (node.type) {
    case 'paragraph':
      return serializeInline(node.content ?? []);
    case 'heading': {
      const level = clamp(Number(node.attrs?.level ?? 1), 1, 6);
      return `${'#'.repeat(level)} ${serializeInline(node.content ?? []).replace(/\n/g, ' ')}`;
    }
    case 'bulletList':
      return serializeList(node, false);
    case 'orderedList':
      return serializeList(node, true);
    case 'blockquote':
      return prefixLines(serializeBlocks(node.content ?? []), '> ', '>');
    case 'codeBlock':
      return serializeCodeBlock(node);
    case 'horizontalRule':
      return '---';
    case 'table':
      return serializeTable(node);
    case AI_BLOCK_NODE:
      return serializeAiBlock(node);
    default:
      // 未知のブロックは中身だけを出力して情報を落とさない
      return node.content ? serializeBlocks(node.content) : (node.text ?? '');
  }
}

/** Markdown では意味ブロックを「【指示】」のような見出し行で表す。メモは出力しない */
function serializeAiBlock(node: DocNode): string {
  const info = roleInfo(node.attrs?.role);
  if (!info.tag) return '';
  const body = serializeBlocks(node.content ?? []).trim();
  if (!body) return '';
  const label = typeof node.attrs?.label === 'string' && node.attrs.label.trim() ? `：${node.attrs.label.trim()}` : '';
  return `**【${info.label}${label}】**\n${body}`;
}

function serializeList(node: DocNode, ordered: boolean): string {
  const start = Number(node.attrs?.start ?? 1) || 1;
  const items = node.content ?? [];
  return items
    .map((item, i) => {
      const marker = ordered ? `${start + i}. ` : '- ';
      const body = serializeBlocks(item.content ?? [], isTightItem(item));
      if (body.trim() === '') return marker.trimEnd();
      return prefixLines(body, marker, '', ' '.repeat(marker.length));
    })
    .join('\n');
}

/** 段落 1 つ + 入れ子リスト程度のリスト項目は、空行なしで詰めて出力する */
function isTightItem(item: DocNode): boolean {
  const blocks = item.content ?? [];
  return blocks.filter((b) => b.type === 'paragraph').length <= 1;
}

function serializeCodeBlock(node: DocNode): string {
  const code = (node.content ?? []).map((n) => n.text ?? '').join('');
  const lang = typeof node.attrs?.language === 'string' ? node.attrs.language : '';
  const longest = Math.max(0, ...(code.match(/`+/g) ?? []).map((s) => s.length));
  const fence = '`'.repeat(Math.max(3, longest + 1));
  return `${fence}${lang}\n${code}\n${fence}`;
}

function serializeTable(node: DocNode): string {
  const rows = tableToGrid(node, serializeCell);
  if (rows.length === 0 || rows[0].length === 0) return '';
  const line = (r: string[]) => `| ${r.join(' | ')} |`;
  const [header, ...body] = rows;
  return [line(header), line(header.map(() => '---')), ...body.map(line)].join('\n');
}

function serializeCell(cell: DocNode): string {
  return (cell.content ?? [])
    .map((block) => serializeBlock(block))
    .join('\n')
    .replace(/\|/g, '\\|')
    .replace(/\n/g, '<br>')
    .trim();
}

// ---------------------------------------------------------------- inline

const MARK_ORDER = ['link', 'bold', 'italic', 'strike', 'code'] as const;
type SupportedMark = (typeof MARK_ORDER)[number];

function supportedMarks(node: DocNode): DocMark[] {
  return (node.marks ?? [])
    .filter((m): m is DocMark & { type: SupportedMark } =>
      (MARK_ORDER as readonly string[]).includes(m.type),
    )
    .sort(
      (a, b) =>
        MARK_ORDER.indexOf(a.type as SupportedMark) - MARK_ORDER.indexOf(b.type as SupportedMark),
    );
}

function sameMark(a: DocMark, b: DocMark): boolean {
  return a.type === b.type && (a.type !== 'link' || a.attrs?.href === b.attrs?.href);
}

function openMark(mark: DocMark, codeText: string): string {
  switch (mark.type) {
    case 'link':
      return '[';
    case 'bold':
      return '**';
    case 'italic':
      return '*';
    case 'strike':
      return '~~';
    case 'code':
      return codeFence(codeText);
    default:
      return '';
  }
}

function closeMark(mark: DocMark, codeText: string): string {
  if (mark.type === 'link') return `](${String(mark.attrs?.href ?? '')})`;
  return openMark(mark, codeText);
}

function codeFence(text: string): string {
  const longest = Math.max(0, ...(text.match(/`+/g) ?? []).map((s) => s.length));
  return '`'.repeat(longest + 1);
}

/**
 * インライン要素を Markdown に変換する。
 * 隣接するテキストノードで共通する装飾は開いたまま維持し、`**a****b**` のような
 * 冗長な出力を避ける。装飾の内側の前後空白は外側へ出す（`** a**` は無効な記法のため）。
 */
function serializeInline(nodes: DocNode[]): string {
  let out = '';
  const stack: { mark: DocMark; codeText: string }[] = [];
  let pendingWs = '';

  const closeTo = (depth: number) => {
    while (stack.length > depth) {
      const top = stack.pop()!;
      out += closeMark(top.mark, top.codeText);
    }
  };

  for (const node of nodes) {
    if (node.type === 'hardBreak') {
      closeTo(0);
      out += pendingWs + '\n';
      pendingWs = '';
      continue;
    }
    if (node.type !== 'text') continue;
    const text = node.text ?? '';
    const marks = supportedMarks(node);
    const isCode = marks.some((m) => m.type === 'code');

    const match = isCode ? ['', '', text, ''] : /^(\s*)([\s\S]*?)(\s*)$/.exec(text)!;
    const [, lead, core, trail] = match;
    if (core === '') {
      pendingWs += text;
      continue;
    }

    // 共通する先頭部分の装飾は維持し、それ以降を閉じる
    let keep = 0;
    while (keep < stack.length && keep < marks.length && sameMark(stack[keep].mark, marks[keep])) {
      keep++;
    }
    // code は中身ごとにフェンス長が変わるため、毎回開き直す
    if (keep > 0 && stack[keep - 1].mark.type === 'code') keep--;
    const reopening = keep < marks.length;
    closeTo(keep);

    if (reopening) {
      out += pendingWs + lead;
      for (const mark of marks.slice(keep)) {
        out += openMark(mark, core);
        stack.push({ mark, codeText: core });
      }
    } else {
      out += pendingWs + lead;
    }
    out += core;
    pendingWs = trail;
  }
  closeTo(0);
  return out + pendingWs;
}

// ---------------------------------------------------------------- utils

function prefixLines(text: string, first: string, emptyPrefix: string, rest = first): string {
  return text
    .split('\n')
    .map((line, i) => {
      if (line === '') return emptyPrefix.trimEnd();
      return (i === 0 ? first : rest) + line;
    })
    .join('\n');
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(n) ? n : min));
}
