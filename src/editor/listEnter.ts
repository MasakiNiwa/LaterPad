import { Extension } from '@tiptap/react';

declare module '@tiptap/core' {
  interface Storage {
    listEnter: { lineBreak: boolean };
  }
}

/**
 * リスト項目内の Enter の動作。
 * 設定で「項目内で改行」を選ぶと、Enter は項目内の改行になり、
 * 空の行で Enter をもう一度押すと新しい項目になる。
 */
export const ListEnter = Extension.create<unknown, { lineBreak: boolean }>({
  name: 'listEnter',
  // リスト拡張の Enter より先に処理する
  priority: 1000,

  addStorage() {
    return { lineBreak: false };
  },

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        if (!this.storage.lineBreak) return false;
        const { $from, empty } = editor.state.selection;
        if (!empty || $from.depth < 2) return false;
        const item = $from.node($from.depth - 1);
        if (item.type.name !== 'listItem' && item.type.name !== 'taskItem') return false;
        // 空の項目では通常の動作（リストを抜ける）
        if ($from.parent.content.size === 0) return false;
        const atEnd = $from.parentOffset === $from.parent.content.size;
        const before = $from.nodeBefore;
        if (atEnd && before?.type.name === 'hardBreak') {
          // 改行の直後でもう一度 Enter → 改行を消して新しい項目へ
          return editor
            .chain()
            .deleteRange({ from: $from.pos - before.nodeSize, to: $from.pos })
            .splitListItem(item.type.name)
            .run();
        }
        return editor.commands.setHardBreak();
      },
    };
  },
});
