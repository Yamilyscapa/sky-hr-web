import { create } from 'zustand'

export interface Organization {
  id: string
  name: string
  slug: string
  logo?: string | null
  createdAt?: Date | string
  updatedAt?: Date | string
  metadata?: string | null
  [key: string]: any // Allow additional properties from Better Auth
}

export interface OrganizationStore {
  organization: Organization | null
  setOrganization: (organization: Organization | null) => void
  clearOrganization: () => void
}

export const useOrganizationStore = create<OrganizationStore>((set) => ({
  organization: null,
  setOrganization: (organization) => set({ organization }),
  clearOrganization: () => set({ organization: null }),
}))

