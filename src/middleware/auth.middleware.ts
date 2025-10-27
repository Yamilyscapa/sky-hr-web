import { createMiddleware } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { authClient } from '@/lib/auth-client';

export const authMiddleware = createMiddleware({ type: 'function' })
    .server(async ({ next }) => {
        const request = getRequest();
        if (!request) {
            throw new Error('Request context not available.');
        }
        const { headers } = request;
        const session = await authClient.getSession({ fetchOptions: { headers } });
        console.log("SESSION", session)
        return next({ context: { session } });
    });

export const getUser = createMiddleware({ type: 'function' })
    .server(async ({ next }) => {
        const request = getRequest();
        if (!request) {
            throw new Error('Request context not available.');
        }
        const { headers } = request;
        const session = await authClient.getSession({ fetchOptions: { headers } });
        return next({ context: { user: session?.data?.user } });
    });

export const isAuthenticated = createMiddleware({ type: 'function' })
    .server(async ({ next }) => {
        const request = getRequest();
        if (!request) {
            throw new Error('Request context not available.');
        }
        const { headers } = request;
        const session = await authClient.getSession({ fetchOptions: { headers } });
        const res = session?.data?.user ? true : false
        return next({ context: { isAuthenticated: res } });
    });