export type RouteInfo =
  | { name: "home"; path: "/" }
  | { name: "pinsNew"; path: "/pins/new" }
  | { name: "pinDetail"; path: string; id: string }
  | { name: "auth"; path: "/auth" }
  | { name: "notFound"; path: string };

export function parsePathname(pathname: string): RouteInfo {
  if (pathname === "/" || pathname === "") {
    return { name: "home", path: "/" };
  }
  if (pathname === "/pins/new") {
    return { name: "pinsNew", path: "/pins/new" };
  }
  if (pathname === "/auth") {
    return { name: "auth", path: "/auth" };
  }
  const pinMatch = /^\/pins\/([^/]+)$/.exec(pathname);
  if (pinMatch?.[1] && pinMatch[1] !== "new") {
    return { name: "pinDetail", path: pathname, id: pinMatch[1] };
  }
  return { name: "notFound", path: pathname };
}

export function navigate(path: string): void {
  window.history.pushState(null, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function createRouter(options: { onRoute: (route: RouteInfo) => void }): {
  start: () => void;
} {
  return {
    start() {
      const handler = () => {
        options.onRoute(parsePathname(window.location.pathname));
      };
      window.addEventListener("popstate", handler);
      handler();
    },
  };
}
