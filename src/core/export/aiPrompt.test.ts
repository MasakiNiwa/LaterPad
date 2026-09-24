import { describe, expect, it } from 'vitest';
import type { DocNode } from '../document';
import { toAiPrompt } from './aiPrompt';
import { toMarkdown } from './markdown';
import { toPlainText } from './plainText';
import { resolveExporter } from './index';

const p = (text: string, marks?: string[]): DocNode => ({
  type: 'paragraph',
  content: [{ type: 'text', text, marks: marks?.map((type) => ({ type })) }],
});
const block = (role: string, content: DocNode[], label?: string): DocNode => ({ type: 'aiBlock', attrs: { role, label }, content });
const li = (text: string): DocNode => ({ type: 'listItem', content: [p(text)] });

const doc: DocNode = {
  type: 'doc',
  content: [
    p('こんにちは。'),
    block('instruction', [p('次の議事録を要約してください。')]),
    block('constraint', [{ type: 'bulletList', content: [li('300字以内'), li('敬語で')] }]),
    block('material', [p('本日の会議では…'), p('予算は未定', ['bold'])], '議事録 "9/24"'),
    block('note', [p('あとで数字を確認')]),
    block('output', [p('箇条書き')]),
  ],
};

describe('toAiPrompt', () => {
  it('wraps semantic blocks in XML tags and omits notes', () => {
    expect(toAiPrompt(doc)).toBe(
      [
        'こんにちは。',
        '',
        '<instructions>\n次の議事録を要約してください。\n</instructions>',
        '',
        '<constraints>\n- 300字以内\n- 敬語で\n</constraints>',
        '',
        '<data title="議事録 &quot;9/24&quot;">\n本日の会議では…\n**予算は未定**\n</data>',
        '',
        '<output_format>\n箇条書き\n</output_format>',
      ].join('\n'),
    );
  });

  it('skips empty blocks', () => {
    expect(toAiPrompt({ type: 'doc', content: [block('instruction', [{ type: 'paragraph' }])] })).toBe('');
  });

  it('is the recommended format', () => {
    expect(resolveExporter('recommended').id).toBe('laterpad-ai');
  });
});

describe('semantic blocks in other formats', () => {
  it('renders labels in Markdown and plain text', () => {
    const d: DocNode = { type: 'doc', content: [block('context', [p('社内向け')], '前提'), block('note', [p('秘密')])] };
    expect(toMarkdown(d)).toBe('**【背景：前提】**\n社内向け');
    expect(toPlainText(d)).toBe('【背景：前提】\n社内向け');
  });
});
