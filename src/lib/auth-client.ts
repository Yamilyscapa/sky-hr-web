import { createAuthClient } from "better-auth/client";
import { organizationClient } from "better-auth/client/plugins";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export const authClient = createAuthClient({
  baseURL: `${BASE_URL}/auth`,
  plugins: [organizationClient()],
  fetch: (input: RequestInfo, init: RequestInit) =>
    fetch(input, {
      ...init,
      credentials: "include", // IMPORTANT
    }),
});
