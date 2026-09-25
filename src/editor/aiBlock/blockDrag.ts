import type { Editor } from '@tiptap/react';
import type { PointerEvent as ReactPointerEvent } from 'react';

/**
 * 意味ブロックのつまみを押したまま上下に動かして並べ替える（マウス・タッチ共通）。
 * HTML のドラッグ＆ドロップはスマホのタッチで動かないため、ポインターイベントで実装する。
 *
 * 動かしている間は、掴んだブロックが指についてきて、他のブロックは場所を空けるように滑らかにずれる。
 * 移動先は元と同じ親の中（同じ階層）に限る。
 */
export function startBlockDrag(e: ReactPointerEvent<HTMLElement>, editor: Editor, pos: number) {
  if (e.button !== 0) return;
  e.preventDefault();
  e.stopPropagation();
  const { view } = editor;
  const $pos = view.state.doc.resolve(pos);
  const parent = $pos.parent;
  const parentStart = $pos.start();
  const origin = $pos.index();

  // 同じ階層の兄弟要素と、ドラッグ開始時点の位置（ページ座標）
  const siblings: HTMLElement[] = [];
  let offset = 0;
  parent.forEach((child) => {
    siblings.push(view.nodeDOM(parentStart + offset) as HTMLElement);
    offset += child.nodeSize;
  });
  const dragged = siblings[origin];
  if (!dragged) return;
  const scrollAtStart = window.scrollY;
  const rects = siblings.map((el) => {
    const r = el.getBoundingClientRect();
    return { top: r.top + scrollAtStart, bottom: r.bottom + scrollAtStart, height: r.height };
  });
  const gap = rects.length > 1 ? Math.max(0, rects[1].top - rects[0].bottom) : 8;
  const shift = rects[origin].height + gap;
  const startY = e.clientY + scrollAtStart;

  const handle = e.currentTarget;
  handle.setPointerCapture(e.pointerId);
  const prevUserSelect = document.body.style.userSelect;
  document.body.style.userSelect = 'none';
  Object.assign(dragged.style, {
    position: 'relative',
    zIndex: '5',
    boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
    transition: 'box-shadow 120ms',
    willChange: 'transform',
  });
  siblings.forEach((el, i) => {
    if (i !== origin) el.style.transition = 'transform 160ms ease';
  });

  let index = origin;
  let lastClientY = e.clientY;
  let frame = 0;

  const update = () => {
    const y = lastClientY + window.scrollY;
    // 掴んだブロックはポインターについてくる
    dragged.style.transform = `translateY(${y - startY}px)`;
    // 落とす位置: 掴んだブロックの中心が、どの兄弟の中心より上にあるか
    const center = rects[origin].top + rects[origin].height / 2 + (y - startY);
    index = rects.length;
    for (let i = 0; i < rects.length; i++) {
      if (i === origin) continue;
      if (center < rects[i].top + rects[i].height / 2) {
        index = i;
        break;
      }
    }
    // 元の位置と移動先の間にある兄弟は、掴んだブロックの分だけずれて場所を空ける
    siblings.forEach((el, i) => {
      if (i === origin) return;
      let dy = 0;
      if (i > origin && i < index) dy = -shift;
      else if (i < origin && i >= index) dy = shift;
      el.style.transform = dy ? `translateY(${dy}px)` : '';
    });
  };

  // 画面の上下の端に近づいたら自動でスクロールする
  const tick = () => {
    const edge = 72;
    const top = (document.querySelector('header')?.getBoundingClientRect().bottom ?? 0) + edge;
    const bottom = (window.visualViewport?.height ?? window.innerHeight) - edge;
    const dy = lastClientY < top ? -10 : lastClientY > bottom ? 10 : 0;
    if (dy) {
      window.scrollBy(0, dy);
      update();
    }
    frame = window.requestAnimationFrame(tick);
  };
  frame = window.requestAnimationFrame(tick);

  const onMove = (ev: PointerEvent) => {
    lastClientY = ev.clientY;
    update();
  };
  const finish = (commit: boolean) => {
    window.cancelAnimationFrame(frame);
    handle.removeEventListener('pointermove', onMove);
    handle.removeEventListener('pointerup', onUp);
    handle.removeEventListener('pointercancel', onCancel);
    document.body.style.userSelect = prevUserSelect;
    siblings.forEach((el) => {
      el.style.transform = '';
      el.style.transition = '';
    });
    Object.assign(dragged.style, { position: '', zIndex: '', boxShadow: '', willChange: '' });
    if (commit && index !== origin && index !== origin + 1) editor.chain().moveAiBlockTo(pos, index).run();
  };
  const onUp = () => finish(true);
  const onCancel = () => finish(false);
  handle.addEventListener('pointermove', onMove);
  handle.addEventListener('pointerup', onUp);
  handle.addEventListener('pointercancel', onCancel);
  update();
}
