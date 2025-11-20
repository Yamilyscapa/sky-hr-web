import { createFileRoute } from "@tanstack/react-router";
import { EmployeesPage } from "@/features/employees/pages/EmployeesPage";

export const Route = createFileRoute("/_protected/(people)/employees")({
  component: EmployeesPage,
});
