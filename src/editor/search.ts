import { Extension } from '@tiptap/react';
import type { Node as PMNode } from '@tiptap/pm/model';
import { Plugin, PluginKey, type EditorState, type Transaction } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

/**
 * 検索・置換。
 * 検索語に一致する箇所をハイライトし、前後への移動・置換・すべて置換を提供する。
 * 状態は ProseMirror プラグインが持ち、文書が変わるたびに一致箇所を再計算する。
 */

export interface SearchMatch {
  from: number;
  to: number;
}

export interface SearchState {
  term: string;
  caseSensitive: boolean;
  matches: SearchMatch[];
  /** 現在の一致箇所（matches の添字）。一致がなければ -1 */
  current: number;
}

export const searchKey = new PluginKey<SearchState>('laterpadSearch');

type SearchMeta = Partial<Pick<SearchState, 'term' | 'caseSensitive' | 'current'>>;

/** 文書から検索語に一致する範囲を探す（段落などのテキストブロックをまたいだ一致はしない） */
export function findMatches(doc: PMNode, term: string, caseSensitive: boolean): SearchMatch[] {
  if (!term) return [];
  const needle = caseSensitive ? term : term.toLowerCase();
  const matches: SearchMatch[] = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    // テキスト以外のインライン要素（改行など）は 1 文字分の置き換え文字にして位置を揃える
    let text = '';
    node.forEach((child) => {
      text += child.isText ? child.text! : '￼'.repeat(child.nodeSize);
    });
    const hay = caseSensitive ? text : text.toLowerCase();
    const start = pos + 1;
    let i = hay.indexOf(needle);
    while (i !== -1) {
      matches.push({ from: start + i, to: start + i + needle.length });
      i = hay.indexOf(needle, i + needle.length);
    }
    return false;
  });
  return matches;
}

function nearestIndex(matches: SearchMatch[], pos: number): number {
  if (matches.length === 0) return -1;
  const i = matches.findIndex((m) => m.to > pos);
  return i === -1 ? 0 : i;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    search: {
      setSearch: (options: { term?: string; caseSensitive?: boolean }) => ReturnType;
      searchNext: () => ReturnType;
      searchPrev: () => ReturnType;
      replaceCurrent: (replacement: string) => ReturnType;
      replaceAll: (replacement: string) => ReturnType;
      clearSearch: () => ReturnType;
    };
  }
}

export function getSearchState(state: EditorState): SearchState | undefined {
  return searchKey.getState(state);
}

function replaceRange(tr: Transaction, m: SearchMatch, replacement: string) {
  if (replacement) tr.insertText(replacement, m.from, m.to);
  else tr.delete(m.from, m.to);
}

export const Search = Extension.create({
  name: 'search',

  addCommands() {
    const move = (delta: number) =>
      ({ state, dispatch }: { state: EditorState; dispatch?: (tr: Transaction) => void }) => {
        const s = searchKey.getState(state);
        if (!s || s.matches.length === 0) return false;
        const current = (s.current + delta + s.matches.length) % s.matches.length;
        dispatch?.(state.tr.setMeta(searchKey, { current } satisfies SearchMeta));
        return true;
      };

    return {
      setSearch:
        (options) =>
        ({ tr, dispatch }) => {
          dispatch?.(tr.setMeta(searchKey, options satisfies SearchMeta));
          return true;
        },
      searchNext: () => move(1),
      searchPrev: () => move(-1),
      replaceCurrent:
        (replacement) =>
        ({ state, dispatch }) => {
          const s = searchKey.getState(state);
          const m = s && s.current >= 0 ? s.matches[s.current] : undefined;
          if (!m) return false;
          if (dispatch) {
            const tr = state.tr;
            replaceRange(tr, m, replacement);
            dispatch(tr);
          }
          return true;
        },
      replaceAll:
        (replacement) =>
        ({ state, dispatch }) => {
          const s = searchKey.getState(state);
          if (!s || s.matches.length === 0) return false;
          if (dispatch) {
            const tr = state.tr;
            // 後ろから置換して位置のずれを防ぐ
            [...s.matches].reverse().forEach((m) => replaceRange(tr, m, replacement));
            dispatch(tr);
          }
          return true;
        },
      clearSearch:
        () =>
        ({ tr, dispatch }) => {
          dispatch?.(tr.setMeta(searchKey, { term: '' } satisfies SearchMeta));
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<SearchState>({
        key: searchKey,
        state: {
          init: () => ({ term: '', caseSensitive: false, matches: [], current: -1 }),
          apply(tr, prev, _old, newState) {
            const meta = tr.getMeta(searchKey) as SearchMeta | undefined;
            if (!meta && !tr.docChanged) return prev;
            const term = meta?.term ?? prev.term;
            const caseSensitive = meta?.caseSensitive ?? prev.caseSensitive;
            const queryChanged = term !== prev.term || caseSensitive !== prev.caseSensitive;
            const matches =
              queryChanged || tr.docChanged ? findMatches(newState.doc, term, caseSensitive) : prev.matches;
            let current: number;
            if (meta?.current !== undefined) current = meta.current;
            else if (queryChanged) current = nearestIndex(matches, newState.selection.from);
            else if (tr.docChanged && prev.current >= 0 && prev.matches[prev.current]) {
              // 置換・編集の後は、元の位置以降で最も近い一致へ
              current = nearestIndex(matches, tr.mapping.map(prev.matches[prev.current].from));
            } else current = Math.min(prev.current, matches.length - 1);
            return { term, caseSensitive, matches, current: matches.length ? Math.max(0, current) : -1 };
          },
        },
        props: {
          decorations(state) {
            const s = searchKey.getState(state);
            if (!s || s.matches.length === 0) return DecorationSet.empty;
            return DecorationSet.create(
              state.doc,
              s.matches.map((m, i) =>
                Decoration.inline(m.from, m.to, {
                  class: i === s.current ? 'search-match search-match-current' : 'search-match',
                }),
              ),
            );
          },
        },
      }),
    ];
  },
});
