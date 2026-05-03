/**
 * Trailing-edge debounce. The returned function exposes `cancel` to drop a
 * pending call (useful on teardown).
 */
export function debounce<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  waitMs: number
): ((...args: TArgs) => void) & { cancel: () => void } {
  let timer: number | undefined;
  const debounced = (...args: TArgs) => {
    if (timer !== undefined) {
      window.clearTimeout(timer);
    }
    timer = window.setTimeout(() => {
      timer = undefined;
      fn(...args);
    }, waitMs);
  };
  debounced.cancel = () => {
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timer = undefined;
    }
  };
  return debounced;
}
