import { useEffect, useState } from 'react';

/** タッチ操作が主の端末か（スマホ・タブレット） */
export function isCoarsePointer(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches === true;
}

export interface VisualViewportState {
  /** 表示領域の上端がページの上端からどれだけずれているか（iOS でキーボード表示時にずれる） */
  offsetTop: number;
  /** 画面下端から表示領域の下端までの高さ（≒ ソフトウェアキーボードの高さ） */
  bottomInset: number;
  /** ソフトウェアキーボードが開いていそうか */
  keyboardOpen: boolean;
}

const INITIAL: VisualViewportState = { offsetTop: 0, bottomInset: 0, keyboardOpen: false };

/**
 * Visual Viewport API で「実際に見えている領域」を追跡する。
 * スマホでソフトウェアキーボードが開くと見える領域が縮む・ずれるため、
 * 上部バーや下部ステータスバーをこの値に合わせて配置する。
 */
export function useVisualViewport(): VisualViewportState {
  const [state, setState] = useState(INITIAL);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        // ピンチで拡大しているときは追従しない（バーが画面内を動き回るのを防ぐ）
        if (vv.scale > 1.01) {
          setState(INITIAL);
          return;
        }
        const offsetTop = Math.max(0, vv.offsetTop);
        const bottomInset = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
        const next = { offsetTop, bottomInset, keyboardOpen: bottomInset > 120 };
        setState((prev) =>
          prev.offsetTop === next.offsetTop && prev.bottomInset === next.bottomInset && prev.keyboardOpen === next.keyboardOpen
            ? prev
            : next,
        );
      });
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(frame);
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return state;
}
