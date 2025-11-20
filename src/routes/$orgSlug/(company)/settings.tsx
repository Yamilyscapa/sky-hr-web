import { createFileRoute } from "@tanstack/react-router";
import { OrganizationSettingsPage } from "@/features/settings/pages/OrganizationSettingsPage";

export const Route = createFileRoute("/$orgSlug/(company)/settings")({
  component: OrganizationSettingsPage,
});
