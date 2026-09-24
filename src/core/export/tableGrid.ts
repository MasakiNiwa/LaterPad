import type { DocNode } from '../document';

/**
 * 結合セル（colspan / rowspan）を含む表を、行 × 列の単純な格子に展開する。
 * Markdown の表などは結合を表現できないため、結合されたセルの内容は左上のマスにだけ置き、
 * 残りのマスは空にする（列ずれを防ぐ）。
 */
export function tableToGrid(table: DocNode, renderCell: (cell: DocNode) => string): string[][] {
  const grid: string[][] = [];
  (table.content ?? []).forEach((row, r) => {
    grid[r] ??= [];
    let c = 0;
    for (const cell of row.content ?? []) {
      while (grid[r][c] !== undefined) c++;
      const colspan = Math.max(1, Number(cell.attrs?.colspan ?? 1) || 1);
      const rowspan = Math.max(1, Number(cell.attrs?.rowspan ?? 1) || 1);
      for (let dr = 0; dr < rowspan; dr++) {
        grid[r + dr] ??= [];
        for (let dc = 0; dc < colspan; dc++) {
          grid[r + dr][c + dc] = dr === 0 && dc === 0 ? renderCell(cell) : '';
        }
      }
      c += colspan;
    }
  });
  const rows = grid.slice(0, (table.content ?? []).length);
  const width = Math.max(0, ...rows.map((r) => r.length));
  return rows.map((r) => Array.from({ length: width }, (_, i) => r[i] ?? ''));
}
