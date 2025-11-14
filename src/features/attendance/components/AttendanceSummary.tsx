import { AlertCircle, Clock, UserX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { AttendanceEvent } from "../types";

type AttendanceSummaryProps = {
  flaggedCount: number;
  events: AttendanceEvent[];
};

export function AttendanceSummary({
  flaggedCount,
  events,
}: AttendanceSummaryProps) {
  const lateCount = events.filter((event) => event.status === "late").length;
  const absentCount = events.filter((event) => event.status === "absent").length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="bg-red-50 border border-red-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <h3 className="font-semibold text-red-900">Eventos marcados</h3>
          </div>
          <p className="text-3xl font-bold text-red-600 mt-2">{flaggedCount}</p>
          <p className="text-sm text-red-700 mt-1">
            Asistencias que requieren atención
          </p>
        </CardContent>
      </Card>

      <Card className="bg-blue-50 border border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">Tarde</h3>
          </div>
          <p className="text-3xl font-bold text-blue-600 mt-2">{lateCount}</p>
          <p className="text-sm text-blue-700 mt-1">Llegadas fuera de horario</p>
        </CardContent>
      </Card>

      <Card className="bg-gray-50 border border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <UserX className="h-5 w-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Ausente</h3>
          </div>
          <p className="text-3xl font-bold text-gray-600 mt-2">{absentCount}</p>
          <p className="text-sm text-gray-700 mt-1">Sin registro de asistencia</p>
        </CardContent>
      </Card>
    </div>
  );
}
