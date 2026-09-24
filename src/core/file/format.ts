import { createEmptyDoc, type DocNode } from '../document';

/**
 * LaterPad の保存ファイル形式（1 文書 = 1 ファイル）。
 * 文書構造とその文書のリビジョン履歴を 1 つの JSON にまとめる。
 */
export const FILE_FORMAT = 'laterpad';
export const FILE_FORMAT_VERSION = 1;
export const FILE_EXTENSION = '.laterpad';
/**
 * 保存時の MIME タイプ。
 * application/json にするとスマホ等のブラウザが拡張子 .json を付け足してしまう
 * （例: 文書.laterpad.json）ため、拡張子と対応しない独自タイプを使う。
 */
export const FILE_MIME = 'application/x-laterpad';

export type RevisionReason = 'copy' | 'save' | 'manual' | 'restore';

export interface Revision {
  id: string;
  createdAt: string;
  reason: RevisionReason;
  content: DocNode;
  /** リビジョン作成時点のタイトル */
  title?: string;
  /** 任意のメモ（手動作成時など） */
  note?: string;
}

export interface LaterPadFile {
  format: typeof FILE_FORMAT;
  formatVersion: number;
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  content: DocNode;
  revisions: Revision[];
  /** 未知のフィールド（新しいバージョンで追加されたもの）を保持する */
  [extra: string]: unknown;
}

export class FileFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileFormatError';
  }
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createNewFile(now = new Date()): LaterPadFile {
  const ts = now.toISOString();
  return {
    format: FILE_FORMAT,
    formatVersion: FILE_FORMAT_VERSION,
    id: newId(),
    title: '',
    createdAt: ts,
    updatedAt: ts,
    content: createEmptyDoc(),
    revisions: [],
  };
}

export function serializeFile(file: LaterPadFile): string {
  return JSON.stringify({ ...file, format: FILE_FORMAT, formatVersion: FILE_FORMAT_VERSION }, null, 2);
}

/** ファイルの内容を読み込み、検証・マイグレーションして返す */
export function parseFile(text: string): LaterPadFile {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new FileFormatError('LaterPad のファイルとして読み込めませんでした（JSON ではありません）');
  }
  if (!isObject(data) || data.format !== FILE_FORMAT) {
    throw new FileFormatError('LaterPad のファイルではありません');
  }
  const version = Number(data.formatVersion);
  if (!Number.isInteger(version) || version < 1) {
    throw new FileFormatError('ファイルのバージョン情報が不正です');
  }
  if (version > FILE_FORMAT_VERSION) {
    throw new FileFormatError('新しいバージョンの LaterPad で作成されたファイルです。アプリを更新してください');
  }
  if (!isDocNode(data.content)) {
    throw new FileFormatError('文書の内容が壊れています');
  }
  const now = new Date().toISOString();
  return {
    ...data,
    format: FILE_FORMAT,
    formatVersion: FILE_FORMAT_VERSION,
    id: typeof data.id === 'string' && data.id ? data.id : newId(),
    title: typeof data.title === 'string' ? data.title : '',
    createdAt: typeof data.createdAt === 'string' ? data.createdAt : now,
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : now,
    content: data.content,
    revisions: Array.isArray(data.revisions) ? data.revisions.filter(isRevision) : [],
  };
}

/** タイトルからファイル名を作る（OS で使えない文字を除去） */
export function fileNameFor(title: string): string {
  const base = title.trim().replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').slice(0, 80) || '無題';
  return base + FILE_EXTENSION;
}

/** ファイル名からタイトル候補を作る */
export function titleFromFileName(name: string): string {
  // 以前のバージョンで付いてしまった「.laterpad.json」にも対応する
  return name.replace(/(\.laterpad)?(\.json)?$/i, '');
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isDocNode(v: unknown): v is DocNode {
  return isObject(v) && v.type === 'doc' && (v.content === undefined || Array.isArray(v.content));
}

function isRevision(v: unknown): v is Revision {
  return (
    isObject(v) && typeof v.id === 'string' && typeof v.createdAt === 'string' && isDocNode(v.content)
  );
}
