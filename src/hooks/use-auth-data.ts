import { useQuery } from "@tanstack/react-query";
import { getSession, getUser } from "@/server/auth.server";
import { getOrganization } from "@/server/organization.server";

/**
 * Hook to fetch and cache user session data
 * Uses stale-while-revalidate strategy for optimal performance
 */
export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: () => getSession(),
    staleTime: 5 * 60 * 1000, // 5 minutes - data is considered fresh
    gcTime: 10 * 60 * 1000, // 10 minutes - cache time
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

/**
 * Hook to fetch and cache user data
 * Automatically skips if no session exists
 */
export function useUserData() {
  const { data: session } = useSession();
  
  return useQuery({
    queryKey: ["user"],
    queryFn: () => getUser(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!session?.data?.user, // Only fetch if user is authenticated
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

/**
 * Hook to fetch and cache organization data
 * Automatically skips if no user exists
 */
export function useOrganizationData() {
  const { data: session } = useSession();
  
  return useQuery({
    queryKey: ["organization"],
    queryFn: () => getOrganization(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!session?.data?.user, // Only fetch if user is authenticated
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

/**
 * Combined hook for all auth-related data
 * Returns session, user, and organization data with loading states
 * @param options.enabled - Whether to fetch data (default: true)
 */
export function useAuthData(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  
  const sessionQuery = useQuery({
    queryKey: ["session"],
    queryFn: () => getSession(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
    enabled,
    retry: 1,
  });
  
  const userQuery = useQuery({
    queryKey: ["user"],
    queryFn: () => getUser(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: enabled && !!sessionQuery.data?.data?.user,
    refetchOnWindowFocus: true,
    retry: 1,
  });
  
  const organizationQuery = useQuery({
    queryKey: ["organization"],
    queryFn: () => getOrganization(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: enabled && !!sessionQuery.data?.data?.user,
    refetchOnWindowFocus: true,
    retry: 1,
  });
  
  return {
    session: sessionQuery.data?.data,
    user: userQuery.data,
    organization: organizationQuery.data?.data,
    isLoading: sessionQuery.isLoading || userQuery.isLoading || organizationQuery.isLoading,
    isAuthenticated: !!sessionQuery.data?.data?.user,
  };
}

