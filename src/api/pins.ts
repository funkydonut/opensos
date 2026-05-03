import type { PinListItem, PinStatus, PinType } from "../domain/types";

export interface FetchPinsParams {
  bbox: string;
  eventId?: string;
  type?: PinType;
  status?: PinStatus[];
  signal?: AbortSignal;
}

/**
 * Stub for `GET /pins?bbox=...` per specs/05-api-contracts.md.
 *
 * Phase 1 only wires the request lifecycle (debounce + cancel). The real
 * implementation lands in Phase 2 (typed API client). The stub honors the
 * provided AbortSignal so the cancel-in-flight path is exercised today.
 */
export async function fetchPinsByBbox(params: FetchPinsParams): Promise<PinListItem[]> {
  if (params.signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }
  return new Promise<PinListItem[]>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      resolve([]);
    }, 0);
    const onAbort = () => {
      cleanup();
      reject(new DOMException("Aborted", "AbortError"));
    };
    const cleanup = () => {
      window.clearTimeout(timeout);
      params.signal?.removeEventListener("abort", onAbort);
    };
    params.signal?.addEventListener("abort", onAbort, { once: true });
  });
}
