import type { RouteInfo } from "./router";
import { renderAuthScreen } from "../screens/AuthScreen";
import { renderHomeScreen } from "../screens/HomeScreen";
import { renderNotFound } from "../screens/NotFound";
import { renderPinDetailScreen } from "../screens/PinDetailScreen";
import { renderPinsNewScreen } from "../screens/PinsNewScreen";

let lastTeardown: (() => void) | undefined;

export function renderRoute(route: RouteInfo): void {
  lastTeardown?.();
  lastTeardown = undefined;

  const root = document.getElementById("app");
  if (!root) {
    throw new Error("#app missing");
  }
  root.innerHTML = "";

  switch (route.name) {
    case "home":
      lastTeardown = renderHomeScreen(root);
      break;
    case "pinsNew":
      lastTeardown = renderPinsNewScreen(root) ?? undefined;
      break;
    case "pinDetail":
      lastTeardown = renderPinDetailScreen(root, route.id);
      break;
    case "auth":
      lastTeardown = renderAuthScreen(root);
      break;
    case "notFound":
      renderNotFound(root, route.path);
      break;
    default: {
      const _exhaustive: never = route;
      return _exhaustive;
    }
  }
}
