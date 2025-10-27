import { organizationMiddleware } from "@/middleware/organization.middleware"
import { createServerFn } from "@tanstack/react-start"

export const getOrganization = createServerFn({
    method: 'GET'
}).middleware([organizationMiddleware]).handler(async ({ context }) => {
    return context.organization
})