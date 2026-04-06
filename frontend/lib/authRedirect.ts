import { clearToken } from "./auth";

type RouterLike = {
  replace: (href: string) => void;
};

export function redirectToLogin(
  router: RouterLike,
  options: { next?: string } = {}
) {
  clearToken();
  const params = new URLSearchParams({ reason: "session" });
  if (options.next) params.set("next", options.next);
  router.replace(`/login?${params.toString()}`);
}
