import type { Editor } from '@tiptap/react';
import type { PointerEvent as ReactPointerEvent } from 'react';

/**
 * 意味ブロックのつまみを押したまま上下に動かして並べ替える（マウス・タッチ共通）。
 * HTML のドラッグ＆ドロップはスマホのタッチで動かないため、ポインターイベントで実装する。
 * 移動先は元と同じ親の中（同じ階層）に限る。
 */
export function startBlockDrag(e: ReactPointerEvent<HTMLElement>, editor: Editor, pos: number, color: string) {
  if (e.button !== 0) return;
  e.preventDefault();
  e.stopPropagation();
  const { view } = editor;
  const $pos = view.state.doc.resolve(pos);
  const parent = $pos.parent;
  const parentStart = $pos.start();
  const origin = $pos.index();

  const siblings = (): HTMLElement[] => {
    const list: HTMLElement[] = [];
    let offset = 0;
    parent.forEach((child) => {
      list.push(view.nodeDOM(parentStart + offset) as HTMLElement);
      offset += child.nodeSize;
    });
    return list;
  };
  const dragged = siblings()[origin];
  if (!dragged) return;

  const handle = e.currentTarget;
  handle.setPointerCapture(e.pointerId);
  dragged.style.opacity = '0.45';
  dragged.style.transition = 'opacity 120ms';

  // 落とす位置を示す線
  const indicator = document.createElement('div');
  Object.assign(indicator.style, {
    position: 'fixed',
    height: '3px',
    borderRadius: '2px',
    background: color,
    pointerEvents: 'none',
    zIndex: '2000',
    display: 'none',
  } satisfies Partial<CSSStyleDeclaration>);
  document.body.appendChild(indicator);

  let index = origin;
  let lastY = e.clientY;
  let scrollTimer = 0;

  const update = () => {
    const els = siblings();
    index = els.length;
    for (let i = 0; i < els.length; i++) {
      const r = els[i]?.getBoundingClientRect();
      if (r && lastY < r.top + r.height / 2) {
        index = i;
        break;
      }
    }
    const unchanged = index === origin || index === origin + 1;
    const ref = els[Math.min(index, els.length - 1)]?.getBoundingClientRect();
    const box = dragged.getBoundingClientRect();
    if (!ref || unchanged) {
      indicator.style.display = 'none';
      return;
    }
    const y = index < els.length ? ref.top - 4 : ref.bottom + 2;
    Object.assign(indicator.style, { display: 'block', top: `${y}px`, left: `${box.left}px`, width: `${box.width}px` });
  };

  // 画面の上下の端に近づいたら自動でスクロールする
  const autoScroll = () => {
    const edge = 72;
    const top = (document.querySelector('header')?.getBoundingClientRect().bottom ?? 0) + edge;
    const bottom = (window.visualViewport?.height ?? window.innerHeight) - edge;
    const dy = lastY < top ? -10 : lastY > bottom ? 10 : 0;
    if (dy) {
      window.scrollBy(0, dy);
      update();
    }
    scrollTimer = window.requestAnimationFrame(autoScroll);
  };
  scrollTimer = window.requestAnimationFrame(autoScroll);

  const onMove = (ev: PointerEvent) => {
    lastY = ev.clientY;
    update();
  };
  const finish = (commit: boolean) => {
    window.cancelAnimationFrame(scrollTimer);
    handle.removeEventListener('pointermove', onMove);
    handle.removeEventListener('pointerup', onUp);
    handle.removeEventListener('pointercancel', onCancel);
    indicator.remove();
    dragged.style.opacity = '';
    if (commit) editor.chain().moveAiBlockTo(pos, index).run();
  };
  const onUp = () => finish(true);
  const onCancel = () => finish(false);
  handle.addEventListener('pointermove', onMove);
  handle.addEventListener('pointerup', onUp);
  handle.addEventListener('pointercancel', onCancel);
  update();
}
