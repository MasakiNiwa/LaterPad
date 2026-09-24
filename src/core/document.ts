/**
 * LaterPad の文書構造。
 *
 * 内部表現は ProseMirror / Tiptap の JSON 形式と互換な木構造。
 * Markdown などのテキスト表現は「出力形式」であり、保存形式の中心にはしない。
 * エディタライブラリに依存しないよう、core 層ではこの最小限の型だけを使う。
 */
export interface DocMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface DocNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: DocNode[];
  marks?: DocMark[];
  text?: string;
}

export function createEmptyDoc(): DocNode {
  return { type: 'doc', content: [{ type: 'paragraph' }] };
}

/** 文書が実質的に空か（空段落のみ）を判定する */
export function isDocEmpty(doc: DocNode): boolean {
  return plainTextOf(doc).trim() === '' && !hasNonTextBlock(doc);
}

function hasNonTextBlock(node: DocNode): boolean {
  if (node.type === 'horizontalRule' || node.type === 'table') return true;
  return (node.content ?? []).some(hasNonTextBlock);
}

/** 装飾を無視したテキストだけを連結して返す（文字数カウント等に使う） */
export function plainTextOf(node: DocNode): string {
  if (node.type === 'text') return node.text ?? '';
  if (node.type === 'hardBreak') return '\n';
  return (node.content ?? []).map(plainTextOf).join(node.type === 'doc' ? '\n' : '');
}
