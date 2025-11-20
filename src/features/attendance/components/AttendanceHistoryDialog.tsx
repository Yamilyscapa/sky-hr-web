import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AttendanceStatusBadge } from "./AttendanceStatusBadge";
import type { AttendanceEvent, UserInfo } from "../types";
import { fetchUserAttendanceHistory } from "../data";
import { getMonthRangeStrings, getQuarterRangeStrings } from "@/lib/month-utils";

type RangeType = "month" | "quarter";

type AttendanceHistoryDialogProps = {
  userId: string | null;
  referenceMonth: Date;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userInfo?: UserInfo | null;
};

export function AttendanceHistoryDialog({
  userId,
  referenceMonth,
  open,
  onOpenChange,
  userInfo,
}: AttendanceHistoryDialogProps) {
  const [range, setRange] = useState<RangeType>("month");
  const [events, setEvents] = useState<AttendanceEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { startDate, endDate } = useMemo(() => {
    return range === "month"
      ? getMonthRangeStrings(referenceMonth)
      : getQuarterRangeStrings(referenceMonth);
  }, [range, referenceMonth]);

  useEffect(() => {
    if (!open || !userId) {
      return;
    }

    setIsLoading(true);
    setError(null);
    fetchUserAttendanceHistory({
      userId,
      startDate,
      endDate,
      pageSize: range === "quarter" ? 500 : 200,
    })
      .then((data) => {
        setEvents(data);
      })
      .catch((err) => {
        console.error("Error fetching attendance history:", err);
        setError("No se pudo cargar el historial. Intenta nuevamente.");
      })
      .finally(() => setIsLoading(false));
  }, [open, userId, startDate, endDate, range]);

  useEffect(() => {
    if (!open) {
      setEvents([]);
      setRange("month");
      setError(null);
      setIsLoading(false);
    }
  }, [open]);

  const rangeLabel = useMemo(() => {
    const formatter = new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const start = formatter.format(new Date(startDate));
    const end = formatter.format(new Date(endDate));
    return `${start} - ${end}`;
  }, [startDate, endDate]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>
            Historial de asistencia{" "}
            {userInfo?.name ? `de ${userInfo.name}` : ""}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 flex-1 overflow-y-auto pr-1">
          <div>
            <p className="text-sm text-muted-foreground">
              Rango seleccionado: {rangeLabel}
            </p>
          </div>
          <Tabs
            value={range}
            onValueChange={(value) => setRange(value as RangeType)}
          >
            <TabsList>
              <TabsTrigger value="month">Mes actual</TabsTrigger>
              <TabsTrigger value="quarter">Último trimestre</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="border rounded-md overflow-x-auto">
            {isLoading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Cargando historial...
              </div>
            ) : error ? (
              <div className="py-12 text-center text-sm text-red-500">
                {error}
              </div>
            ) : events.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No hay registros de asistencia en este rango.
              </div>
            ) : (
              <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Entrada</TableHead>
                    <TableHead>Salida</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Notas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => {
                    const date = new Date(event.check_in);
                    const dateText = date.toLocaleDateString("es-ES", {
                      weekday: "short",
                      year: "numeric",
                      month: "short",
                      day: "2-digit",
                    });
                    const checkIn = date.toLocaleTimeString("es-ES", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    const checkOut = event.check_out
                      ? new Date(event.check_out).toLocaleTimeString("es-ES", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "-";

                    return (
                      <TableRow key={event.id}>
                        <TableCell className="font-medium">
                          {dateText}
                        </TableCell>
                        <TableCell>{checkIn}</TableCell>
                        <TableCell>{checkOut}</TableCell>
                        <TableCell>
                          <AttendanceStatusBadge status={event.status} />
                        </TableCell>
                        <TableCell className="max-w-[220px] truncate">
                          {event.notes || "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
