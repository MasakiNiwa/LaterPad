export function isMac(): boolean {
  return typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
}

/** ショートカット表記用の修飾キー名 */
export function modKey(): string {
  return isMac() ? '⌘' : 'Ctrl';
}
