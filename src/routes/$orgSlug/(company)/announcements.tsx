import { createFileRoute } from "@tanstack/react-router";
import { AnnouncementsPage } from "@/features/announcements/pages/AnnouncementsPage";

export const Route = createFileRoute("/$orgSlug/(company)/announcements")({
  component: AnnouncementsPage,
});
