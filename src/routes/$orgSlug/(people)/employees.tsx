import { createFileRoute } from "@tanstack/react-router";
import { EmployeesPage } from "@/features/employees/pages/EmployeesPage";

export const Route = createFileRoute("/$orgSlug/(people)/employees")({
  component: EmployeesPage,
});
