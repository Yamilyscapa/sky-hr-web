import { create } from "zustand";
import { useSession } from "@/hooks/use-auth-data";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  metadata?: string | null;
  members?: Array<Record<string, any>>;
  member?: Record<string, any> | null;
  currentMember?: Record<string, any> | null;
  [key: string]: any; // Allow additional properties from Better Auth
}

export interface OrganizationStore {
  organization: Organization | null;
  setOrganization: (organization: Organization | null) => void;
  clearOrganization: () => void;
}

export const useOrganizationStore = create<OrganizationStore>((set) => ({
  organization: null,
  setOrganization: (organization) => set({ organization }),
  clearOrganization: () => set({ organization: null }),
}));

type UserLike = {
  id?: string | null;
} | null;

export function attachCurrentMemberData(
  organization: Organization | null,
  user: UserLike,
): Organization | null {
  if (!organization) {
    return null;
  }

  if (!user?.id) {
    return organization;
  }

  const members = Array.isArray(organization.members)
    ? organization.members
    : null;

  if (!members?.length) {
    return organization;
  }

  const currentMember = members.find(
    (member: any) => member?.user?.id === user.id,
  );

  if (!currentMember) {
    return organization;
  }

  return {
    ...organization,
    currentMember,
    member: organization.member ?? currentMember,
    membership: organization.membership ?? currentMember,
  };
}

export type OrganizationRole = "owner" | "admin" | "member" | null;

function normalizeRole(role: unknown): OrganizationRole {
  if (typeof role !== "string") {
    return null;
  }

  const normalized = role.toLowerCase() as OrganizationRole;
  return normalized === "owner" || normalized === "admin" || normalized === "member"
    ? normalized
    : null;
}

function getRoleFromMemberships(
  memberships: any,
  orgId?: string | null,
): OrganizationRole {
  if (!Array.isArray(memberships)) {
    return null;
  }

  const targetMembership = memberships.find((membership: any) => {
    if (!membership) return false;
    if (orgId) {
      return (
        membership.organizationId === orgId ||
        membership.organization_id === orgId
      );
    }
    return Boolean(membership.role);
  });

  return normalizeRole(targetMembership?.role);
}

export function getMemberRoleFromOrg(
  org?: Organization | null,
): OrganizationRole {
  if (!org) {
    return null;
  }

  const membershipRole = getRoleFromMemberships(org.memberships, org.id);
  const nestedRole = Array.isArray(org.organizations)
    ? normalizeRole(
        org.organizations.find?.(
          (organization: any) => organization?.id === org.id,
        )?.role,
      )
    : null;

  const roleOrder = [
    normalizeRole(org?.member?.role),
    normalizeRole(org?.currentMember?.role),
    normalizeRole(org?.membership?.role),
    membershipRole,
    nestedRole,
  ].filter(Boolean) as Array<"owner" | "admin" | "member">;

  return roleOrder[0] ?? null;
}

export const useOrganizationRole = () =>
  useOrganizationStore((state) => getMemberRoleFromOrg(state.organization));

function getRoleFromSessionData(
  sessionData: any,
  orgId?: string | null,
): OrganizationRole {
  if (!sessionData) {
    return null;
  }

  const { session, user } = sessionData;

  const candidates = [
    normalizeRole(session?.activeOrganization?.role),
    normalizeRole(session?.organization?.role),
    normalizeRole(session?.member?.role),
    normalizeRole(session?.currentMember?.role),
    normalizeRole(session?.membership?.role),
    getRoleFromMemberships(session?.memberships, orgId),
    normalizeRole(user?.member?.role),
    normalizeRole(user?.currentMember?.role),
    normalizeRole(user?.membership?.role),
    getRoleFromMemberships(user?.memberships, orgId),
  ].filter(Boolean) as Array<"owner" | "admin" | "member">;

  return candidates[0] ?? null;
}

export function useIsOrgAdmin() {
  const { organization } = useOrganizationStore();
  const organizationRole = getMemberRoleFromOrg(organization);
  const { data: protectedContext } = useSession();

  const betterAuthRole = getRoleFromSessionData(
    protectedContext?.session,
    organization?.id,
  );

  const role = organizationRole ?? betterAuthRole ?? null;

  return role === "owner" || role === "admin";
}
