import { createFileRoute } from "@tanstack/react-router";
import { LocationsPage } from "@/features/locations/pages/LocationsPage";

export const Route = createFileRoute("/$orgSlug/(company)/locations")({
  component: LocationsPage,
});
