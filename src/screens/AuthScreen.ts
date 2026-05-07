import {
  getAuthState,
  onAuthStateChange,
  signInWithEmail,
  signUpWithEmail,
} from "../auth/state";
import { navigate } from "../utils/router";

export function renderAuthScreen(root: HTMLElement): () => void {
  const auth = getAuthState();
  if (auth.user) {
    navigate("/");
    return () => {};
  }

  root.className = "flex min-h-screen items-center justify-center bg-slate-50 p-4";

  const card = document.createElement("div");
  card.className = "w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm";
  root.appendChild(card);

  let mode: "signin" | "signup" = "signin";

  const render = () => {
    const title = mode === "signin" ? "Sign in" : "Create account";
    const switchLabel =
      mode === "signin"
        ? `Don't have an account? <button type="button" data-switch class="text-blue-600 hover:underline">Sign up</button>`
        : `Already have an account? <button type="button" data-switch class="text-blue-600 hover:underline">Sign in</button>`;
    const submitLabel = mode === "signin" ? "Sign in" : "Sign up";

    card.innerHTML = `
      <h1 class="text-lg font-semibold text-slate-900">${title}</h1>
      <form class="mt-4 space-y-3" autocomplete="on">
        <div>
          <label for="auth-email" class="block text-sm font-medium text-slate-700">Email</label>
          <input id="auth-email" name="email" type="email" required autocomplete="email"
            class="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <div>
          <label for="auth-password" class="block text-sm font-medium text-slate-700">Password</label>
          <input id="auth-password" name="password" type="password" required minlength="6" autocomplete="${mode === "signin" ? "current-password" : "new-password"}"
            class="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <div data-error class="hidden rounded bg-red-50 px-3 py-2 text-xs text-red-700"></div>
        <button type="submit" data-submit
          class="w-full rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">
          ${submitLabel}
        </button>
      </form>
      <p class="mt-4 text-center text-xs text-slate-500">${switchLabel}</p>
      <div class="mt-3 text-center">
        <button type="button" data-nav="/" class="text-xs text-slate-400 hover:text-slate-600">Back to map</button>
      </div>
    `;

    card
      .querySelector<HTMLButtonElement>("[data-switch]")
      ?.addEventListener("click", () => {
        mode = mode === "signin" ? "signup" : "signin";
        render();
      });

    card
      .querySelector<HTMLButtonElement>("[data-nav]")
      ?.addEventListener("click", () => navigate("/"));

    const form = card.querySelector("form")!;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = (form.querySelector<HTMLInputElement>("#auth-email")!).value.trim();
      const password = (form.querySelector<HTMLInputElement>("#auth-password")!).value;
      const errorEl = card.querySelector<HTMLElement>("[data-error]")!;
      const submitBtn = card.querySelector<HTMLButtonElement>("[data-submit]")!;

      errorEl.classList.add("hidden");
      submitBtn.disabled = true;
      submitBtn.textContent = mode === "signin" ? "Signing in…" : "Creating account…";

      const result =
        mode === "signin"
          ? await signInWithEmail(email, password)
          : await signUpWithEmail(email, password);

      if (result.error) {
        errorEl.textContent = result.error;
        errorEl.classList.remove("hidden");
        submitBtn.disabled = false;
        submitBtn.textContent = mode === "signin" ? "Sign in" : "Sign up";
        return;
      }

      if (mode === "signup") {
        errorEl.textContent = "Account created! Check your email to confirm, then sign in.";
        errorEl.classList.remove("hidden");
        errorEl.classList.replace("bg-red-50", "bg-green-50");
        errorEl.classList.replace("text-red-700", "text-green-700");
        submitBtn.disabled = false;
        submitBtn.textContent = "Sign up";
        return;
      }
    });
  };

  render();

  const unsub = onAuthStateChange((state) => {
    if (state.user) navigate("/");
  });

  return unsub;
}
