import { useQuery } from "@tanstack/react-query";
import {
  protectedContextQueryOptions,
  ensureProtectedContext,
} from "@/lib/protected-context-query";
import type { ProtectedContextResult } from "@/server/protected-context.server";

type UseQueryOptions = {
  enabled?: boolean;
};

function useProtectedContextQuery(options?: UseQueryOptions) {
  return useQuery({
    ...protectedContextQueryOptions,
    refetchOnWindowFocus: true,
    enabled: options?.enabled ?? true,
  });
}

export function useSession(options?: UseQueryOptions) {
  return useProtectedContextQuery(options);
}

export function useUserData(options?: UseQueryOptions) {
  const query = useProtectedContextQuery(options);
  return {
    ...query,
    data: query.data?.user ?? null,
  };
}

export function useOrganizationData(options?: UseQueryOptions) {
  const query = useProtectedContextQuery(options);
  return {
    ...query,
    data: query.data?.organization?.data ?? null,
  };
}

export function useAuthData(options?: UseQueryOptions) {
  const query = useProtectedContextQuery(options);
  const authData = query.data;

  return {
    session: authData?.session ?? null,
    user: authData?.user ?? null,
    organization: authData?.organization?.data ?? null,
    isMember: authData?.isMember ?? false,
    membershipStatus: authData?.membershipStatus ?? "unknown",
    pendingInvitations: authData?.pendingInvitations ?? [],
    isAuthenticated: authData?.isAuthenticated ?? false,
    isLoading: query.isLoading,
  };
}

export type { ProtectedContextResult };
export { ensureProtectedContext };
