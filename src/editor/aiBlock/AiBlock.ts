import { Node, mergeAttributes, ReactNodeViewRenderer, type Editor } from '@tiptap/react';
import { TextSelection } from '@tiptap/pm/state';
import type { Node as PMNode } from '@tiptap/pm/model';
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
      /** pos の意味ブロックを中身ごと削除する */
      deleteAiBlockAt: (pos: number) => ReturnType;
      /** pos の意味ブロックを同じ階層の中で前後に移動する */
      moveAiBlockAt: (pos: number, direction: -1 | 1) => ReturnType;
      /** pos の意味ブロックを、同じ親の中の index 番目の子の前へ移動する（末尾は子の数） */
      moveAiBlockTo: (pos: number, index: number) => ReturnType;
      /** pos の意味ブロックの中身だけを選択する */
      selectAiBlockContentAt: (pos: number) => ReturnType;
      /** pos の意味ブロックの中身を空にする（ブロックは残す） */
      clearAiBlockContentAt: (pos: number) => ReturnType;
    };
  }
}

/** 親ノードの index 番目の子が始まる位置（親の中身の先頭からの距離） */
function childOffset(parent: PMNode, index: number): number {
  let offset = 0;
  for (let i = 0; i < index && i < parent.childCount; i++) offset += parent.child(i).nodeSize;
  return offset;
}

/** 意味ブロックの中身全体を覆うテキスト選択 */
function contentSelection(doc: PMNode, pos: number, nodeSize: number) {
  return TextSelection.between(doc.resolve(pos + 1), doc.resolve(pos + nodeSize - 1));
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
      // 意味ブロックの中で全選択 → まずブロックの中身だけ。もう一度押すと外側（最終的に文書全体）
      'Mod-a': ({ editor }) => {
        const { state } = editor;
        const { $from, from, to } = state.selection;
        for (let d = $from.depth; d > 0; d--) {
          const node = $from.node(d);
          if (node.type.name !== AI_BLOCK_NODE) continue;
          const sel = contentSelection(state.doc, $from.before(d), node.nodeSize);
          if (from <= sel.from && to >= sel.to) continue;
          editor.view.dispatch(state.tr.setSelection(sel));
          return true;
        }
        return false;
      },
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
      deleteAiBlockAt:
        (pos) =>
        ({ state, tr, dispatch }) => {
          const node = state.doc.nodeAt(pos);
          if (node?.type.name !== AI_BLOCK_NODE) return false;
          if (dispatch) {
            tr.delete(pos, pos + node.nodeSize);
            tr.setSelection(TextSelection.near(tr.doc.resolve(Math.min(pos, tr.doc.content.size))));
          }
          return true;
        },
      moveAiBlockAt:
        (pos, direction) =>
        ({ state, tr, dispatch }) => {
          const node = state.doc.nodeAt(pos);
          if (node?.type.name !== AI_BLOCK_NODE) return false;
          const $pos = state.doc.resolve(pos);
          const sibling = $pos.parent.maybeChild($pos.index() + direction);
          if (!sibling) return false;
          if (dispatch) {
            tr.delete(pos, pos + node.nodeSize);
            const target = direction < 0 ? pos - sibling.nodeSize : pos + sibling.nodeSize;
            tr.insert(target, node);
            tr.setSelection(TextSelection.near(tr.doc.resolve(target + 1))).scrollIntoView();
          }
          return true;
        },
      moveAiBlockTo:
        (pos, index) =>
        ({ state, tr, dispatch }) => {
          const node = state.doc.nodeAt(pos);
          if (node?.type.name !== AI_BLOCK_NODE) return false;
          const $pos = state.doc.resolve(pos);
          const origin = $pos.index();
          if (index === origin || index === origin + 1 || index < 0 || index > $pos.parent.childCount) return false;
          if (dispatch) {
            const target = $pos.start() + childOffset($pos.parent, index);
            tr.insert(target, node);
            const from = tr.mapping.map(pos, 1);
            tr.delete(from, from + node.nodeSize);
            const inserted = tr.mapping.map(target, -1);
            tr.setSelection(TextSelection.near(tr.doc.resolve(inserted + 1))).scrollIntoView();
          }
          return true;
        },
      selectAiBlockContentAt:
        (pos) =>
        ({ state, tr, dispatch }) => {
          const node = state.doc.nodeAt(pos);
          if (node?.type.name !== AI_BLOCK_NODE) return false;
          if (dispatch) tr.setSelection(contentSelection(state.doc, pos, node.nodeSize));
          return true;
        },
      clearAiBlockContentAt:
        (pos) =>
        ({ state, tr, dispatch }) => {
          const node = state.doc.nodeAt(pos);
          if (node?.type.name !== AI_BLOCK_NODE) return false;
          if (dispatch) {
            tr.replaceWith(pos + 1, pos + node.nodeSize - 1, state.schema.nodes.paragraph.create());
            tr.setSelection(TextSelection.near(tr.doc.resolve(pos + 2)));
          }
          return true;
        },
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
