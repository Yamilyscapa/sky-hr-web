import { authMiddleware } from "@/middleware/auth.middleware";
import { createServerFn } from "@tanstack/react-start";
import { notMemberRoute as notMemberRouteMiddleware } from "@/middleware/auth.middleware";
import {
  getUser as getUserMiddleware,
  isAuthenticated as isAuthenticatedMiddleware,
} from "@/middleware/auth.middleware";

export const getSession = createServerFn({
  method: "GET",
})
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    return context.session;
  });

export const getUser = createServerFn({
  method: "GET",
})
  .middleware([getUserMiddleware])
  .handler(async ({ context }) => {
    return context.user as {
      id: string;
      email: string;
      name: string;
    };
  });

export const isAuthenticated = createServerFn({
  method: "GET",
})
  .middleware([isAuthenticatedMiddleware])
  .handler(async ({ context }) => {
    return context.isAuthenticated;
  });

export const notMemberRoute = createServerFn({
  method: "GET",
})
  .middleware([notMemberRouteMiddleware])
  .handler(async ({ context }) => {
    return context.isMember;
  });