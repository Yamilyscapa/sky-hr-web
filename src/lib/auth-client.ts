import { createAuthClient } from "better-auth/client";
import { organizationClient } from "better-auth/client/plugins";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export const authClient = createAuthClient({
  baseURL: `${BASE_URL}/auth`,
  plugins: [organizationClient()],
  fetch: (input: RequestInfo, init: RequestInit) => {
    // Better Auth passes fetchOptions.headers in init.headers
    // We need to ensure headers are properly converted to Headers object
    // This is critical for SSR cookie forwarding from TanStack Start
    const headers = new Headers();
    
    // Copy existing headers from init (if any)
    if (init?.headers) {
      if (init.headers instanceof Headers) {
        init.headers.forEach((value, key) => {
          headers.set(key, value);
        });
      } else if (Array.isArray(init.headers)) {
        init.headers.forEach(([key, value]) => {
          headers.set(key, value);
        });
      } else {
        // Plain object
        Object.entries(init.headers).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            headers.set(key, String(value));
          }
        });
      }
    }

    return fetch(input, {
      ...init,
      headers,
      // Always include credentials for cookie support (critical for SSR)
      credentials: "include",
    });
  },
});
