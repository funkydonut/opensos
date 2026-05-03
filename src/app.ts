import { createRouter } from "./utils/router";
import { renderRoute } from "./utils/render";

export function bootstrap(): void {
  const router = createRouter({
    onRoute: (route) => {
      renderRoute(route);
    },
  });
  router.start();
}
