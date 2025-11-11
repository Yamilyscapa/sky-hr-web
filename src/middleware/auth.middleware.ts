import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { authClient } from "@/lib/auth-client";

export const authMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const request = getRequest();
    if (!request) {
      throw new Error("Request context not available.");
    }
    const { headers } = request;
    const session = await authClient.getSession({ fetchOptions: { headers } });
    return next({ context: { session } });
  },
);

export const getUser = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const request = getRequest();
    if (!request) {
      throw new Error("Request context not available.");
    }
    const { headers } = request;
    const session = await authClient.getSession({ fetchOptions: { headers } });
    return next({ context: { user: session?.data?.user } });
  },
);

export const isAuthenticated = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const request = getRequest();
    if (!request) {
      throw new Error("Request context not available.");
    }
    const { headers } = request;
    const session = await authClient.getSession({ fetchOptions: { headers } });
    const res = session?.data?.user ? true : false;
    return next({ context: { isAuthenticated: res } });
  },
);

export const notMemberRoute = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const request = getRequest();

    if (!request) {
      throw new Error("Request context not available.");
    }

    const { headers } = request;
    const orgMembers = await authClient.organization.listMembers({ fetchOptions: { headers } });
    const session = await authClient.getSession({ fetchOptions: { headers } });
    const user = session?.data?.user;
    const userRole = orgMembers.data?.members?.find((member) => member.user?.id === user?.id)?.role;
    
    if (userRole !== "owner" && userRole !== "admin") {
      // If the user is not an owner or admin, they are a member
      return next({ context: { isMember: true } }); 
    }
    
    return next({ context: { isMember: false } }); // A little obvious to comment on this
  },
);