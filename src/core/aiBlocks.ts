/**
 * AI書式の「意味ブロック」。
 *
 * 見た目の書式（太字・見出しなど）とは別に、文章の各部分が AI にとって何なのか
 * （指示なのか、守るべき条件なのか、処理対象の資料なのか）を明示するための構造。
 * 出力時は役割ごとの XML タグで囲み、AI が指示と資料を取り違えないようにする。
 */
export type AiBlockRole = 'instruction' | 'context' | 'constraint' | 'material' | 'output' | 'example' | 'note';

export interface AiBlockRoleInfo {
  role: AiBlockRole;
  /** UI 表示名 */
  label: string;
  /** 短い説明（メニュー等） */
  description: string;
  /** 出力時の XML タグ名。null は出力しない（メモ） */
  tag: string | null;
  /** 空のブロックに表示する書き方の例 */
  hint: string;
}

export const AI_BLOCK_ROLES: readonly AiBlockRoleInfo[] = [
  { role: 'instruction', label: '指示', description: 'AI にしてほしいこと', tag: 'instructions', hint: '例）次の資料を 3 行で要約してください' },
  { role: 'context', label: '背景', description: '前提・目的・状況の説明', tag: 'context', hint: '例）社内の週報に載せる文章です。読み手は他部署のメンバーです' },
  { role: 'constraint', label: '条件', description: '守ってほしいルール・制約', tag: 'constraints', hint: '例）専門用語は使わない／300 字以内' },
  { role: 'material', label: '資料', description: '処理してほしい文章やデータ（指示ではない）', tag: 'data', hint: 'ここに処理してほしい文章やデータを貼り付け' },
  { role: 'output', label: '出力形式', description: '回答の形・長さ・書き方', tag: 'output_format', hint: '例）箇条書きで、最後に一言まとめを付けて' },
  { role: 'example', label: '例', description: '入力と出力の見本', tag: 'example', hint: '例）入力: 〇〇 → 出力: △△' },
  { role: 'note', label: 'メモ', description: '自分用のメモ（AI には送らない）', tag: null, hint: '自分用のメモ（AI には送られません）' },
];

export const AI_BLOCK_NODE = 'aiBlock';

export function roleInfo(role: unknown): AiBlockRoleInfo {
  return AI_BLOCK_ROLES.find((r) => r.role === role) ?? AI_BLOCK_ROLES[0];
}

export interface AiTemplate {
  id: string;
  label: string;
  description: string;
  roles: AiBlockRole[];
}

/** よく使うブロックの組み合わせ（空のブロックを並べて挿入する） */
export const AI_TEMPLATES: readonly AiTemplate[] = [
  { id: 'basic', label: '基本の依頼', description: '指示・条件・出力形式', roles: ['instruction', 'constraint', 'output'] },
  { id: 'process', label: '資料を渡して処理', description: '指示・資料・出力形式（要約・翻訳・添削など）', roles: ['instruction', 'material', 'output'] },
  { id: 'write', label: '文章を作ってもらう', description: '背景・指示・条件・例・出力形式', roles: ['context', 'instruction', 'constraint', 'example', 'output'] },
  { id: 'consult', label: '相談・質問する', description: '背景・指示', roles: ['context', 'instruction'] },
];

/** テンプレートを文書構造（ProseMirror JSON 互換）にする */
export function templateContent(template: AiTemplate) {
  return template.roles.map((role) => ({ type: AI_BLOCK_NODE, attrs: { role, label: null }, content: [{ type: 'paragraph' }] }));
}
