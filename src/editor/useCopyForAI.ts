import { useCallback } from 'react';
import type { Editor } from '@tiptap/react';
import type { DocNode } from '../core/document';
import { exportDoc } from '../core/export';
import { copyText } from '../lib/clipboard';
import { useSettings } from '../settings/SettingsContext';

export interface CopyResult {
  ok: boolean;
  formatLabel: string;
  length: number;
  empty: boolean;
}

/** 「AI用にコピー」の中核。現在の設定の形式に変換してクリップボードへ書き込む。 */
export function useCopyForAI(editor: Editor | null) {
  const { settings } = useSettings();

  const render = useCallback(() => {
    const doc = (editor?.getJSON() ?? { type: 'doc' }) as DocNode;
    return exportDoc(doc, settings.copyFormat);
  }, [editor, settings.copyFormat]);

  const copy = useCallback(async (): Promise<CopyResult> => {
    const { exporter, text } = render();
    const base = { formatLabel: exporter.label, length: text.length, empty: text.length === 0 };
    if (base.empty) return { ...base, ok: false };
    try {
      await copyText(text);
      return { ...base, ok: true };
    } catch {
      return { ...base, ok: false };
    }
  }, [render]);

  return { render, copy };
}
