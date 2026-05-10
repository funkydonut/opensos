import { fetchPinDetail } from "../api/pins";
import { fetchMatchesForPin } from "../api/matches";
import { getAuthState } from "../auth/state";
import {
  renderLoading,
  renderError,
  renderDetailHtml,
  wireMatchActions,
  wireCreateMatchAction,
  wireReportAction,
  wireIdCopyButtons,
} from "./pinDetailRendering";

export interface PinDetailModalHandle {
  open: (pinId: string) => void;
  close: () => void;
  destroy: () => void;
}

/**
 * Slide-over modal for pin detail on the home screen.
 * Shows pin info, items with coverage, matches list, and match status actions.
 */
export function mountPinDetailModal(container: HTMLElement): PinDetailModalHandle {
  const backdrop = document.createElement("div");
  backdrop.className =
    "fixed inset-0 z-50 hidden bg-black/40 transition-opacity";
  backdrop.setAttribute("aria-hidden", "true");

  const panel = document.createElement("div");
  panel.className =
    "fixed right-0 top-0 z-50 hidden h-full w-full max-w-md translate-x-full overflow-y-auto bg-white shadow-xl transition-transform sm:max-w-lg";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-label", "Pin detail");

  container.append(backdrop, panel);

  let currentPinId: string | null = null;

  const close = () => {
    currentPinId = null;
    backdrop.classList.add("hidden");
    panel.classList.add("hidden", "translate-x-full");
    panel.innerHTML = "";
    window.history.pushState(null, "", "/");
  };

  backdrop.addEventListener("click", close);

  const open = (pinId: string) => {
    currentPinId = pinId;
    window.history.pushState(null, "", `/pins/${pinId}`);

    backdrop.classList.remove("hidden");
    panel.classList.remove("hidden");
    requestAnimationFrame(() =>
      panel.classList.remove("translate-x-full")
    );

    panel.innerHTML = renderLoading();
    void loadPin(pinId);
  };

  const loadPin = async (pinId: string) => {
    try {
      const [pin, matches] = await Promise.all([
        fetchPinDetail(pinId),
        fetchMatchesForPin(pinId),
      ]);
      if (currentPinId !== pinId) return;
      if (!pin) {
        panel.innerHTML = renderError("Pin not found.");
        wireClose(panel, close);
        return;
      }
      const isLoggedIn = !!getAuthState().user;
      panel.innerHTML = renderDetailHtml(pin, matches, isLoggedIn, { showCloseButton: true });
      wireClose(panel, close);
      wireMatchActions(panel, () => void loadPin(pinId));
      wireCreateMatchAction(panel, pin, () => void loadPin(pinId));
      wireReportAction(panel, pinId);
      wireIdCopyButtons(panel);
    } catch {
      if (currentPinId !== pinId) return;
      panel.innerHTML = renderError("Failed to load pin.");
      wireClose(panel, close);
    }
  };

  const destroy = () => {
    backdrop.remove();
    panel.remove();
  };

  return { open, close, destroy };
}

function wireClose(el: HTMLElement, close: () => void) {
  el.querySelectorAll<HTMLButtonElement>("[data-close]").forEach((btn) =>
    btn.addEventListener("click", close)
  );
}
