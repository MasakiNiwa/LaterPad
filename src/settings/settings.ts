import { RECOMMENDED } from '../core/export';

export type ThemeMode = 'system' | 'light' | 'dark';
export type FontSize = 'small' | 'medium' | 'large';

export interface Settings {
  themeMode: ThemeMode;
  /** 'recommended' または exporter の ID */
  copyFormat: string;
  fontSize: FontSize;
  /** AI用にコピーした時点をリビジョンとして自動記録する */
  revisionOnCopy: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  themeMode: 'system',
  copyFormat: RECOMMENDED,
  fontSize: 'medium',
  revisionOnCopy: true,
};

const STORAGE_KEY = 'laterpad.settings.v1';

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
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
