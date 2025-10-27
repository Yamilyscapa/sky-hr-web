import { createAuthClient } from "better-auth/react";
import { reactStartCookies } from 'better-auth/react-start'
import { organizationClient } from "better-auth/client/plugins";

const BASE_URL = process.env.BETTER_AUTH_URL ?? "http://localhost:8080";

if (!BASE_URL) {
    throw new Error("BETTER_AUTH_URL is not set");
}

export const authClient = createAuthClient({
    baseURL: `${BASE_URL}/auth`,
    plugins: [reactStartCookies(), organizationClient()],
    fetch: (input: RequestInfo, init: RequestInit) => fetch(input, {
        ...init,
        credentials: 'include',               // IMPORTANT
      }), 
})