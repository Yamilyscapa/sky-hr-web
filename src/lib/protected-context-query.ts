import type { QueryClient, DefaultError, QueryKey } from "@tanstack/react-query";
import { getProtectedContext, type ProtectedContextResult } from "@/server/protected-context.server";

export const protectedContextQueryKey = ["protected-context"] as const satisfies QueryKey;

export const protectedContextQueryOptions = {
  queryKey: protectedContextQueryKey,
  queryFn: () => getProtectedContext(),
  staleTime: 5 * 60 * 1000,
  gcTime: 10 * 60 * 1000,
  retry: 1,
} satisfies {
  queryKey: typeof protectedContextQueryKey;
  queryFn: () => Promise<ProtectedContextResult>;
  staleTime: number;
  gcTime: number;
  retry: number;
};

export async function ensureProtectedContext(
  queryClient?: QueryClient<ProtectedContextResult, DefaultError>,
) {
  if (queryClient) {
    return queryClient.ensureQueryData(protectedContextQueryOptions);
  }

  return protectedContextQueryOptions.queryFn();
}
