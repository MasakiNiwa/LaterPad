import { RECOMMENDED } from '../core/export';

export type ThemeMode = 'system' | 'light' | 'dark';

export interface Settings {
  themeMode: ThemeMode;
  /** 'recommended' または exporter の ID */
  copyFormat: string;
  /** 本文の文字サイズ（px） */
  fontSize: number;
  /** 本文の行間（倍率） */
  lineHeight: number;
  /** 余白を狭くして、画面により多く表示する */
  compact: boolean;
  /** AI用にコピーした時点をリビジョンとして自動記録する */
  revisionOnCopy: boolean;
  /** リスト項目内の Enter で改行する（空の行で Enter すると新しい項目） */
  listEnterLineBreak: boolean;
  /** 起動時に前回の内容を開く（オフなら空の文書で始める） */
  restoreOnStartup: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  themeMode: 'system',
  copyFormat: RECOMMENDED,
  fontSize: 16,
  lineHeight: 1.7,
  compact: false,
  revisionOnCopy: true,
  restoreOnStartup: false,
  listEnterLineBreak: false,
};

const STORAGE_KEY = 'laterpad.settings.v1';

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return migrate({ ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) });
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ストレージが使えない環境（プライベートモード等）では保存しない
  }
}

export const FONT_SIZE_RANGE = { min: 12, max: 24, step: 1 } as const;
export const LINE_HEIGHT_RANGE = { min: 1.2, max: 2.2, step: 0.1 } as const;

/** 以前の形式（文字サイズを 小/中/大 で保存していた）からの移行 */
function migrate(s: Settings): Settings {
  const legacy: Record<string, number> = { small: 15, medium: 17, large: 19 };
  const fontSize = typeof s.fontSize === 'string' ? (legacy[s.fontSize] ?? DEFAULT_SETTINGS.fontSize) : s.fontSize;
  const clamp = (v: number, r: { min: number; max: number }, d: number) =>
    Number.isFinite(v) ? Math.min(r.max, Math.max(r.min, v)) : d;
  return {
    ...s,
    fontSize: clamp(Number(fontSize), FONT_SIZE_RANGE, DEFAULT_SETTINGS.fontSize),
    lineHeight: clamp(Number(s.lineHeight), LINE_HEIGHT_RANGE, DEFAULT_SETTINGS.lineHeight),
  };
}
