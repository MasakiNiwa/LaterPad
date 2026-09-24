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
}

export const AI_BLOCK_ROLES: readonly AiBlockRoleInfo[] = [
  { role: 'instruction', label: '指示', description: 'AI にしてほしいこと', tag: 'instructions' },
  { role: 'context', label: '背景', description: '前提・目的・状況の説明', tag: 'context' },
  { role: 'constraint', label: '条件', description: '守ってほしいルール・制約', tag: 'constraints' },
  { role: 'material', label: '資料', description: '処理してほしい文章やデータ（指示ではない）', tag: 'data' },
  { role: 'output', label: '出力形式', description: '回答の形・長さ・書き方', tag: 'output_format' },
  { role: 'example', label: '例', description: '入力と出力の見本', tag: 'example' },
  { role: 'note', label: 'メモ', description: '自分用のメモ（AI には送らない）', tag: null },
];

export const AI_BLOCK_NODE = 'aiBlock';

export function roleInfo(role: unknown): AiBlockRoleInfo {
  return AI_BLOCK_ROLES.find((r) => r.role === role) ?? AI_BLOCK_ROLES[0];
}
