type RedirectSearch = Record<string, unknown> | undefined;

export function sanitizeRedirectPath(path: unknown) {
  if (typeof path !== "string") return "";
  if (!path.startsWith("/") || path.startsWith("//")) return "";
  return path;
}

export function getAuthRedirectTarget(
  search: RedirectSearch,
  isAuthenticated: boolean,
) {
  if (!isAuthenticated) {
    return null;
  }

  const redirectPath = sanitizeRedirectPath(search?.redirect);
  const token = typeof search?.token === "string" ? search?.token : "";

  if (redirectPath === "/accept-invitation" && token) {
    return {
      to: "/accept-invitation" as const,
      search: { token },
    };
  }

  return {
    to: "/" as const,
  };
}
