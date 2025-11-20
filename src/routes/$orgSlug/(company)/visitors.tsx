import { createFileRoute } from "@tanstack/react-router";
import { VisitorsPage } from "@/features/visitors/pages/VisitorsPage";

export const Route = createFileRoute("/$orgSlug/(company)/visitors")({
  component: VisitorsPage,
});
