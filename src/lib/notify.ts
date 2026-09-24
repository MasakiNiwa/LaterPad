/**
 * 画面下部のお知らせ（スナックバー）を、エディタ内の部品からも出せるようにする小さな仕組み。
 * EditorPage が購読して表示する。
 */
const EVENT = 'laterpad:notify';

export function notify(message: string): void {
  window.dispatchEvent(new CustomEvent<string>(EVENT, { detail: message }));
}

export function onNotify(handler: (message: string) => void): () => void {
  const listener = (e: Event) => handler((e as CustomEvent<string>).detail);
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
