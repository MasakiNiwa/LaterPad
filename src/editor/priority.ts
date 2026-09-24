import { Mark, mergeAttributes } from '@tiptap/react';
import type { EditorState } from '@tiptap/pm/state';

export type PriorityLevel = 'must' | 'should';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    priority: {
      /** 重要度を付ける。文字を選択していなければ、カーソルのある段落（項目）全体に付ける */
      setPriority: (level: PriorityLevel) => ReturnType;
      unsetPriority: () => ReturnType;
    };
  }
}

/**
 * 重要度（必須／推奨）。条件などの一部に付けて、AI に優先度を伝える。
 * 出力時は該当箇所の先頭に【必須】【推奨】が付く。
 */
export const Priority = Mark.create({
  name: 'priority',
  inclusive: false,

  addAttributes() {
    return {
      level: {
        default: 'must',
        parseHTML: (el) => (el.getAttribute('data-priority') === 'should' ? 'should' : 'must'),
        renderHTML: (attrs) => ({ 'data-priority': attrs.level }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-priority]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { class: 'priority' }), 0];
  },

  addCommands() {
    /** 対象範囲: 文字を選択していればその範囲、なければカーソルのある段落全体 */
    const rangeOf = (state: EditorState): { from: number; to: number } | null => {
      const { from, to, empty, $from } = state.selection;
      if (!empty) return { from, to };
      const parent = $from.parent;
      if (!parent.isTextblock || parent.content.size === 0) return null;
      // 段落の中の改行（Shift+Enter）で区切られた「今の行」だけを対象にする
      let lineStart = 0;
      let lineEnd = parent.content.size;
      parent.forEach((child, offset) => {
        if (child.type.name !== 'hardBreak') return;
        if (offset < $from.parentOffset) lineStart = offset + child.nodeSize;
        else if (offset >= $from.parentOffset && lineEnd === parent.content.size) lineEnd = offset;
      });
      if (lineStart >= lineEnd) return null;
      return { from: $from.start() + lineStart, to: $from.start() + lineEnd };
    };
    return {
      setPriority:
        (level) =>
        ({ state, tr, dispatch }) => {
          const range = rangeOf(state);
          if (!range) return false;
          if (dispatch) tr.addMark(range.from, range.to, state.schema.marks[this.name].create({ level }));
          return true;
        },
      unsetPriority:
        () =>
        ({ state, tr, dispatch }) => {
          const range = rangeOf(state);
          if (!range) return false;
          if (dispatch) tr.removeMark(range.from, range.to, state.schema.marks[this.name]);
          return true;
        },
    };
  },
});
