import type { Extensions } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TableKit } from '@tiptap/extension-table';
import { Placeholder } from '@tiptap/extensions';

/**
 * エディタで扱う書式。
 * AI へ渡す構造として意味のあるものだけを有効にする（下線・文字色・フォント等は扱わない）。
 */
export function createExtensions(placeholder: string): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      underline: false,
      link: {
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
      },
    }),
    TableKit.configure({
      table: { resizable: false },
    }),
    Placeholder.configure({ placeholder }),
  ];
}
