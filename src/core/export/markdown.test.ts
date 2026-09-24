import { describe, expect, it } from 'vitest';
import type { DocNode } from '../document';
import { toMarkdown } from './markdown';
import { toPlainText } from './plainText';

const t = (text: string, ...marks: (string | [string, Record<string, unknown>])[]): DocNode => ({
  type: 'text',
  text,
  marks: marks.map((m) => (typeof m === 'string' ? { type: m } : { type: m[0], attrs: m[1] })),
});
const p = (...content: DocNode[]): DocNode => ({ type: 'paragraph', content });
const doc = (...content: DocNode[]): DocNode => ({ type: 'doc', content });
const li = (...content: DocNode[]): DocNode => ({ type: 'listItem', content });

describe('toMarkdown', () => {
  it('keeps plain paragraphs as simple lines', () => {
    expect(toMarkdown(doc(p(t('一行目')), p(t('二行目')), p(), p(t('四行目'))))).toBe(
      '一行目\n二行目\n\n四行目',
    );
  });

  it('serializes headings with blank lines around', () => {
    expect(
      toMarkdown(doc({ type: 'heading', attrs: { level: 2 }, content: [t('見出し')] }, p(t('本文')))),
    ).toBe('## 見出し\n\n本文');
  });

  it('merges adjacent marks and moves whitespace outside', () => {
    expect(toMarkdown(doc(p(t('a '), t('bold ', 'bold'), t('both', 'bold', 'italic'), t(' end'))))).toBe(
      'a **bold *both*** end',
    );
  });

  it('serializes links and inline code', () => {
    expect(
      toMarkdown(doc(p(t('see ', ), t('here', ['link', { href: 'https://example.com' }]), t(' and '), t('a`b', 'code')))),
    ).toBe('see [here](https://example.com) and ``a`b``');
  });

  it('serializes nested lists', () => {
    const md = toMarkdown(
      doc({
        type: 'bulletList',
        content: [
          li(p(t('one')), { type: 'orderedList', attrs: { start: 3 }, content: [li(p(t('three'))), li(p(t('four')))] }),
          li(p(t('two'))),
        ],
      }),
    );
    expect(md).toBe('- one\n  3. three\n  4. four\n- two');
  });

  it('serializes blockquotes and code blocks', () => {
    const md = toMarkdown(
      doc(
        { type: 'blockquote', content: [p(t('引用1')), p(t('引用2'))] },
        { type: 'codeBlock', attrs: { language: 'ts' }, content: [t('const a = 1;\n```')] },
      ),
    );
    expect(md).toBe('> 引用1\n> 引用2\n\n````ts\nconst a = 1;\n```\n````');
  });

  it('serializes tables as GFM', () => {
    const cell = (type: string, text: string): DocNode => ({ type, content: [p(t(text))] });
    const md = toMarkdown(
      doc({
        type: 'table',
        content: [
          { type: 'tableRow', content: [cell('tableHeader', '名前'), cell('tableHeader', '値')] },
          { type: 'tableRow', content: [cell('tableCell', 'a|b'), cell('tableCell', '1')] },
        ],
      }),
    );
    expect(md).toBe('| 名前 | 値 |\n| --- | --- |\n| a\\|b | 1 |');
  });

  it('returns empty string for empty document', () => {
    expect(toMarkdown(doc(p()))).toBe('');
  });
});

describe('toPlainText', () => {
  it('drops markup but keeps list markers', () => {
    expect(
      toPlainText(
        doc(
          { type: 'heading', attrs: { level: 1 }, content: [t('Title')] },
          { type: 'bulletList', content: [li(p(t('a', 'bold')))] },
        ),
      ),
    ).toBe('Title\n\n・a');
  });
});
