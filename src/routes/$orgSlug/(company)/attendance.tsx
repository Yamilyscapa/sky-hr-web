import { createFileRoute } from "@tanstack/react-router";
import { AttendancePage } from "@/features/attendance/pages/AttendancePage";

export const Route = createFileRoute("/$orgSlug/(company)/attendance")({
  component: AttendancePage,
});
