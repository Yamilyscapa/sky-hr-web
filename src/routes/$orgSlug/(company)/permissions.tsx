import { createFileRoute } from "@tanstack/react-router";
import { PermissionsPage } from "@/features/permissions/pages/PermissionsPage";

export const Route = createFileRoute("/$orgSlug/(company)/permissions")({
  component: PermissionsPage,
});
