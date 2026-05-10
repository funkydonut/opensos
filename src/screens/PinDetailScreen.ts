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
} from "../components/pinDetailRendering";
import { navigate } from "../utils/router";

export function renderPinDetailScreen(root: HTMLElement, pinId: string): () => void {
  root.className = "flex min-h-screen flex-col bg-slate-50";

  const header = document.createElement("header");
  header.className =
    "flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3 py-2 text-sm";
  header.innerHTML = `
    <span class="font-semibold text-slate-800">OpenSOS</span>
    <button type="button" data-back class="rounded border border-slate-300 px-2 py-1 hover:bg-slate-50">Back to map</button>
  `;
  header.querySelector<HTMLButtonElement>("[data-back]")!.addEventListener("click", () => navigate("/"));

  const content = document.createElement("div");
  content.className = "mx-auto w-full max-w-lg flex-1 py-4 px-4";

  const card = document.createElement("div");
  card.className = "min-h-[60vh] rounded-lg border border-slate-200 bg-white shadow-sm";
  content.appendChild(card);

  root.append(header, content);

  card.innerHTML = renderLoading();

  let cancelled = false;

  const loadPin = async () => {
    try {
      const [pin, matches] = await Promise.all([
        fetchPinDetail(pinId),
        fetchMatchesForPin(pinId),
      ]);
      if (cancelled) return;
      if (!pin) {
        card.innerHTML = renderError("Pin not found.", "Back to map");
        card.querySelector<HTMLButtonElement>("[data-close]")?.addEventListener("click", () => navigate("/"));
        return;
      }
      const isLoggedIn = !!getAuthState().user;
      card.innerHTML = renderDetailHtml(pin, matches, isLoggedIn, { showCloseButton: false });
      wireMatchActions(card, () => void loadPin());
      wireCreateMatchAction(card, pin, () => void loadPin());
      wireReportAction(card, pinId);
      wireIdCopyButtons(card);
    } catch {
      if (cancelled) return;
      card.innerHTML = renderError("Failed to load pin.", "Back to map");
      card.querySelector<HTMLButtonElement>("[data-close]")?.addEventListener("click", () => navigate("/"));
    }
  };

  void loadPin();

  return () => {
    cancelled = true;
  };
}
