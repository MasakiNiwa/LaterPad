import { FILE_EXTENSION, FILE_MIME, fileNameFor, parseFile, serializeFile, type LaterPadFile } from './format';

/**
 * ファイルの読み書き。
 * File System Access API が使える環境（PC の Chrome / Edge 等）では同じファイルへ上書き保存し、
 * 使えない環境（Safari / Firefox / スマホ）ではダウンロード・ファイル選択にフォールバックする。
 */

// File System Access API の最小限の型（lib.dom に未収録の部分）
interface FsWritable {
  write(data: Blob | string): Promise<void>;
  close(): Promise<void>;
}
export interface FsFileHandle {
  name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<FsWritable>;
}
interface PickerType {
  description: string;
  accept: Record<string, string[]>;
}
interface FsWindow {
  showOpenFilePicker?: (o: { types: PickerType[]; multiple?: boolean }) => Promise<FsFileHandle[]>;
  showSaveFilePicker?: (o: { suggestedName: string; types: PickerType[] }) => Promise<FsFileHandle>;
}

const PICKER_TYPES: PickerType[] = [
  { description: 'LaterPad 文書', accept: { [FILE_MIME]: [FILE_EXTENSION] } },
];

const fsWindow = () => window as unknown as FsWindow;

export function supportsFileSystemAccess(): boolean {
  return typeof window !== 'undefined' && !!fsWindow().showSaveFilePicker && !!fsWindow().showOpenFilePicker;
}

export interface OpenedFile {
  file: LaterPadFile;
  fileName: string;
  handle: FsFileHandle | null;
}

export function isAbortError(e: unknown): boolean {
  return e instanceof DOMException && e.name === 'AbortError';
}

/** ファイル選択ダイアログから開く。キャンセル時は null */
export async function openFileWithPicker(): Promise<OpenedFile | null> {
  if (supportsFileSystemAccess()) {
    try {
      const [handle] = await fsWindow().showOpenFilePicker!({ types: PICKER_TYPES });
      const f = await handle.getFile();
      return { file: parseFile(await f.text()), fileName: handle.name, handle };
    } catch (e) {
      if (isAbortError(e)) return null;
      throw e;
    }
  }
  const f = await pickFileWithInput();
  return f ? readFile(f) : null;
}

/** ドラッグ＆ドロップなどで得た File を読み込む */
export async function readFile(f: File): Promise<OpenedFile> {
  return { file: parseFile(await f.text()), fileName: f.name, handle: null };
}

export interface SaveResult {
  fileName: string;
  handle: FsFileHandle | null;
  /** ダウンロードとして保存した（上書き保存できない）場合 true */
  downloaded: boolean;
}

/**
 * 保存する。handle があれば上書き、なければ保存先を選ばせる（非対応環境ではダウンロード）。
 * キャンセル時は null。
 */
export async function saveFile(file: LaterPadFile, handle: FsFileHandle | null, saveAs = false): Promise<SaveResult | null> {
  const text = serializeFile(file);
  if (supportsFileSystemAccess()) {
    try {
      const target =
        handle && !saveAs
          ? handle
          : await fsWindow().showSaveFilePicker!({ suggestedName: fileNameFor(file.title), types: PICKER_TYPES });
      const writable = await target.createWritable();
      await writable.write(text);
      await writable.close();
      return { fileName: target.name, handle: target, downloaded: false };
    } catch (e) {
      if (isAbortError(e)) return null;
      throw e;
    }
  }
  const fileName = fileNameFor(file.title);
  downloadText(text, fileName, FILE_MIME);
  return { fileName, handle: null, downloaded: true };
}

export function downloadText(text: string, fileName: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function pickFileWithInput(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    // 独自拡張子はスマホで選択不可になることがあるため、種類で絞り込まない
    // （中身は読み込み時に検証する）
    input.addEventListener('change', () => resolve(input.files?.[0] ?? null), { once: true });
    input.addEventListener('cancel', () => resolve(null), { once: true });
    input.click();
  });
}
