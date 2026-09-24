import type { DocNode } from '../document';
import { markdownExporter } from './markdown';
import { plainTextExporter } from './plainText';
import type { ExportOptions, Exporter } from './types';

export type { Exporter, ExportOptions } from './types';

/** 利用可能な出力形式。追加する場合はここに登録する。 */
export const exporters: readonly Exporter[] = [markdownExporter, plainTextExporter];

/**
 * 「推奨形式」の ID。
 * ユーザーが形式を意識しなくて済むよう、LaterPad がその時点で最適と考える形式を指す。
 * 変換ロジックの改善に応じてここを差し替える。
 */
export const RECOMMENDED_EXPORTER_ID = 'markdown';

export const RECOMMENDED = 'recommended';

export function resolveExporter(id: string | undefined): Exporter {
  const target = !id || id === RECOMMENDED ? RECOMMENDED_EXPORTER_ID : id;
  return (
    exporters.find((e) => e.id === target) ??
    exporters.find((e) => e.id === RECOMMENDED_EXPORTER_ID)!
  );
}

export function exportDoc(doc: DocNode, exporterId?: string, options?: ExportOptions) {
  const exporter = resolveExporter(exporterId);
  return { exporter, text: exporter.export(doc, options) };
}
