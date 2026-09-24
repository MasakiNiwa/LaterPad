import { Node, mergeAttributes, ReactNodeViewRenderer, type Editor } from '@tiptap/react';
import { TextSelection } from '@tiptap/pm/state';
import { AI_BLOCK_NODE, AI_TEMPLATES, roleInfo, templateContent, type AiBlockRole } from '../../core/aiBlocks';
import { AiBlockView } from './AiBlockView';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    aiBlock: {
      /** 選択中の段落を意味ブロックで囲む（すでにブロック内なら種類を変える） */
      setAiBlock: (role: AiBlockRole) => ReturnType;
      /** 意味ブロックの囲みを外す（中身は残す） */
      unsetAiBlock: () => ReturnType;
      /** 選択中の段落を新しい意味ブロックで囲む（ブロック内なら入れ子にする） */
      wrapAiBlock: (role: AiBlockRole) => ReturnType;
      /** テンプレート（空のブロックの組み合わせ）を挿入する */
      insertAiTemplate: (templateId: string) => ReturnType;
    };
  }
}

/** AI書式の意味ブロック（指示・背景・条件・資料・出力形式・例・メモ） */
export const AiBlock = Node.create({
  name: AI_BLOCK_NODE,
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      role: {
        default: 'instruction',
        parseHTML: (el) => roleInfo(el.getAttribute('data-ai-block')).role,
        renderHTML: (attrs) => ({ 'data-ai-block': attrs.role }),
      },
      label: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-label'),
        renderHTML: (attrs) => (attrs.label ? { 'data-label': attrs.label } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-ai-block]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(AiBlockView);
  },

  addKeyboardShortcuts() {
    /** カーソルがある段落が意味ブロックの直接の子なら、そのブロックの深さと位置を返す */
    const directChild = (editor: Editor) => {
      const { $from, empty } = editor.state.selection;
      if (!empty || $from.depth < 2) return null;
      const d = $from.depth - 1;
      const wrapper = $from.node(d);
      if (wrapper.type.name !== AI_BLOCK_NODE) return null;
      return { $from, wrapper, index: $from.index(d) };
    };
    return {
      // 最後の空行で Enter → ブロックの外へ出る（続けて普通の文章を書ける）
      Enter: ({ editor }) => {
        const c = directChild(editor);
        if (!c || c.$from.parent.type.name !== 'paragraph' || c.$from.parent.content.size !== 0) return false;
        if (c.wrapper.childCount < 2 || c.index !== c.wrapper.childCount - 1) return false;
        return editor.commands.lift(AI_BLOCK_NODE);
      },
      // ブロック先頭で Backspace → その段落をブロックの外へ出す
      Backspace: ({ editor }) => {
        const c = directChild(editor);
        if (!c || c.$from.parentOffset !== 0 || c.index !== 0) return false;
        return editor.commands.lift(AI_BLOCK_NODE);
      },
    };
  },

  addCommands() {
    return {
      setAiBlock:
        (role) =>
        ({ editor, chain }) => {
          if (editor.isActive(AI_BLOCK_NODE)) return chain().updateAttributes(AI_BLOCK_NODE, { role }).run();
          return chain().wrapIn(AI_BLOCK_NODE, { role }).run();
        },
      unsetAiBlock:
        () =>
        ({ commands }) =>
          commands.lift(AI_BLOCK_NODE),
      wrapAiBlock:
        (role) =>
        ({ commands }) =>
          commands.wrapIn(AI_BLOCK_NODE, { role }),
      insertAiTemplate:
        (templateId) =>
        ({ editor, chain }) => {
          const template = AI_TEMPLATES.find((t) => t.id === templateId);
          if (!template) return false;
          const { $from } = editor.state.selection;
          // 空の段落にいるならそこを置き換え、そうでなければ段落の後ろに挿入する
          const emptyParagraph = $from.parent.type.name === 'paragraph' && $from.parent.content.size === 0;
          const at = emptyParagraph ? { from: $from.before(), to: $from.after() } : $from.after();
          return chain()
            .insertContentAt(at, templateContent(template))
            .command(({ tr }) => {
              // 最初のブロックの中へカーソルを移す
              const start = typeof at === 'number' ? at : at.from;
              tr.setSelection(TextSelection.near(tr.doc.resolve(start + 2)));
              return true;
            })
            .scrollIntoView()
            .run();
        },
    };
  },
});
