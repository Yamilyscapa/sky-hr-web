import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { MonthPaginationControls } from "@/components/month-pagination-controls";
import { useOrganizationStore } from "@/store/organization-store";
import {
  buildMonthOptions,
  endOfMonth,
  formatMonthLabel,
  formatMonthValue,
  getMonthRangeStrings,
  isWithinRange,
  startOfMonth,
} from "@/lib/month-utils";
import { Download, RefreshCw, UserX } from "lucide-react";
import type { ActionMenuItem } from "@/components/ui/action-menu";
import type { AttendanceEvent, UserInfo } from "../types";
import { ATTENDANCE_PAGE_SIZE, updateAttendanceStatus } from "../data";
import { useAttendanceTable } from "../hooks/useAttendanceTable";
import {
  useAttendanceEventsQuery,
  useAttendanceFlaggedEventsQuery,
  useAttendanceMembersMap,
} from "../hooks/useAttendanceData";
import { AttendanceTableCard } from "../components/AttendanceTableCard";
import { MarkAbsencesDialog } from "../components/MarkAbsencesDialog";
import { AttendanceSummary } from "../components/AttendanceSummary";
import { EventDetailsDialog } from "../components/EventDetailsDialog";
import { UpdateStatusDialog } from "../components/UpdateStatusDialog";
import { AttendanceHistoryDialog } from "../components/AttendanceHistoryDialog";

export function AttendancePage() {
  const [selectedEvent, setSelectedEvent] = useState<AttendanceEvent | null>(
    null,
  );
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [markAbsencesDialogOpen, setMarkAbsencesDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyUserId, setHistoryUserId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMonth, setSelectedMonth] = useState(() =>
    startOfMonth(new Date()),
  );
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  const { organization } = useOrganizationStore();

  const monthRange = useMemo(() => {
    const startDateObj = startOfMonth(selectedMonth);
    const endDateObj = endOfMonth(selectedMonth);
    const { startDate, endDate } = getMonthRangeStrings(selectedMonth);
    return { startDateObj, endDateObj, startDate, endDate };
  }, [selectedMonth]);

  const attendanceEventsQuery = useAttendanceEventsQuery({
    organizationId: organization?.id,
    startDate: monthRange.startDate,
    endDate: monthRange.endDate,
    page: currentPage,
    pageSize: ATTENDANCE_PAGE_SIZE,
    enabled: Boolean(organization?.id),
  });

  const flaggedEventsQuery = useAttendanceFlaggedEventsQuery(organization?.id);
  const membersMapQuery = useAttendanceMembersMap(organization?.id);

  const emptyUsersMap = useMemo(() => new Map<string, UserInfo>(), []);
  const usersMap = membersMapQuery.data ?? emptyUsersMap;
  const attendanceEvents = attendanceEventsQuery.data?.events ?? [];
  const pagination = attendanceEventsQuery.data?.pagination ?? null;
  const isLoading = attendanceEventsQuery.isFetching;

  const { startDateObj, endDateObj } = monthRange;
  const selectedMonthValue = formatMonthValue(selectedMonth);
  const monthOptions = useMemo(
    () => buildMonthOptions(selectedMonth),
    [selectedMonth],
  );
  const currentMonthValue = formatMonthValue(startOfMonth(new Date()));
  const isNextMonthDisabled = selectedMonthValue >= currentMonthValue;
  const selectedMonthLabel = formatMonthLabel(selectedMonth);

  const flaggedCount = useMemo(() => {
    const flaggedEvents = flaggedEventsQuery.data ?? [];
    if (!flaggedEvents.length) {
      return 0;
    }

    return flaggedEvents.filter((event) =>
      isWithinRange(event.check_in, startDateObj, endDateObj),
    ).length;
  }, [flaggedEventsQuery.data, startDateObj, endDateObj]);

  const { table, getSelectedEvents } = useAttendanceTable({
    events: attendanceEvents,
    handlers: {
      onViewDetails: (event) => {
        setSelectedEvent(event);
        setDetailsDialogOpen(true);
      },
      onUpdateStatus: (event) => {
        setSelectedEvent(event);
        setUpdateDialogOpen(true);
      },
      onViewMap: (event) => {
        if (!event.latitude || !event.longitude) {
          alert("Este evento no tiene coordenadas registradas.");
          return;
        }
        const url = `https://www.google.com/maps?q=${event.latitude},${event.longitude}`;
        window.open(url, "_blank", "noopener,noreferrer");
      },
      onViewHistory: (event) => {
        setHistoryUserId(event.user_id);
        setHistoryDialogOpen(true);
      },
      usersMap,
    },
  });

  const handleBulkExportCsv = () => {
    const selected = getSelectedEvents();
    if (selected.length === 0) {
      alert("Selecciona al menos un evento.");
      return;
    }

    const headers = [
      "Usuario",
      "Email",
      "Fecha",
      "Entrada",
      "Salida",
      "Estado",
      "Verificado",
      "Notas",
    ];

    const rows = selected.map((event) => {
      const userInfo = usersMap.get(event.user_id);
      const checkInDate = new Date(event.check_in);
      const dateString = checkInDate.toLocaleDateString("es-ES");
      const checkInTime = checkInDate.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const checkOutTime = event.check_out
        ? new Date(event.check_out).toLocaleTimeString("es-ES", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "";

      const values = [
        userInfo?.name || "",
        userInfo?.email || "",
        dateString,
        checkInTime,
        checkOutTime,
        event.status,
        event.is_verified ? "Sí" : "No",
        event.notes || "",
      ];

      return values
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `asistencia-${selectedMonthValue}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleBulkMarkAbsent = async () => {
    const selected = getSelectedEvents();
    if (selected.length === 0) {
      alert("Selecciona al menos un evento.");
      return;
    }

    if (
      !window.confirm(
        `¿Deseas marcar ${selected.length} evento(s) como ausente? Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }

    setIsBulkProcessing(true);
    try {
      await Promise.all(
        selected.map((event) =>
          updateAttendanceStatus(event.id, {
            status: "absent",
            notes: event.notes || "Actualizado de forma masiva",
          }),
        ),
      );
      alert("Eventos actualizados correctamente");
      table.resetRowSelection();
      await refetchAttendanceData();
    } catch (error) {
      console.error("Error updating events:", error);
      alert("No se pudieron actualizar los eventos seleccionados.");
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const attendanceBulkActions: ActionMenuItem[] = [
    {
      label: "Exportar CSV",
      icon: Download,
      action: handleBulkExportCsv,
      disabled: isBulkProcessing,
    },
    {
      label: "Marcar como ausentes",
      icon: UserX,
      action: handleBulkMarkAbsent,
      destructive: true,
      disabled: isBulkProcessing,
    },
  ];

  const refetchAttendanceData = async () => {
    if (!organization?.id) {
      return;
    }
    await Promise.all([
      attendanceEventsQuery.refetch(),
      flaggedEventsQuery.refetch(),
    ]);
  };

  const handlePageChange = (nextPage: number) => {
    if (!pagination) {
      return;
    }
    const totalPages = pagination.totalPages ?? 1;
    if (nextPage < 1 || nextPage > totalPages || nextPage === currentPage) {
      return;
    }
    setCurrentPage(nextPage);
  };

  const handlePreviousMonth = () => {
    setSelectedMonth((prev) => {
      const prevMonth = startOfMonth(prev);
      prevMonth.setMonth(prevMonth.getMonth() - 1);
      return startOfMonth(prevMonth);
    });
  };

  const handleNextMonth = () => {
    if (isNextMonthDisabled) {
      return;
    }
    setSelectedMonth((prev) => {
      const nextMonth = startOfMonth(prev);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      return startOfMonth(nextMonth);
    });
  };

  const handleSelectMonth = (value: string) => {
    const [year, month] = value.split("-").map(Number);
    if (!year || !month) return;
    const newDate = startOfMonth(new Date(year, month - 1, 1));
    setSelectedMonth(newDate);
  };

  const handleUpdateComplete = () => {
    void refetchAttendanceData();
  };
  useEffect(() => {
    if (organization?.id) {
      setCurrentPage(1);
    }
  }, [organization?.id, selectedMonth]);

  useEffect(() => {
    if (pagination?.page && pagination.page !== currentPage) {
      setCurrentPage(pagination.page);
    }
  }, [pagination?.page, currentPage]);

  return (
    <div className="space-y-6 p-6 pb-12">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle>Panel de asistencia</CardTitle>
              <p className="text-sm text-muted-foreground">
                Mostrando datos de {selectedMonthLabel}
              </p>
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
              <MonthPaginationControls
                selectedValue={selectedMonthValue}
                options={monthOptions}
                onPrevious={handlePreviousMonth}
                onNext={handleNextMonth}
                onSelect={handleSelectMonth}
                disableNext={isNextMonthDisabled}
              />
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void refetchAttendanceData();
                  }}
                  disabled={isLoading}
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
                  />
                  Actualizar
                </Button>
                <Button
                  size="sm"
                  onClick={() => setMarkAbsencesDialogOpen(true)}
                >
                  <UserX className="h-4 w-4 mr-2" />
                  Marcar ausencias
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <AttendanceSummary
            flaggedCount={flaggedCount}
            events={attendanceEvents}
          />
        </CardContent>
      </Card>

      <Separator className="my-8" />

      <AttendanceTableCard table={table} bulkActions={attendanceBulkActions} />

      {pagination && (
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando{" "}
            {Math.min(
              (pagination.page - 1) * pagination.pageSize + 1,
              pagination.total,
            )}{" "}
            -{" "}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)}{" "}
            de {pagination.total} registros
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1 || isLoading}
              onClick={() => handlePageChange(pagination.page - 1)}
            >
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
              Página {pagination.page} de {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={
                pagination.page >= (pagination.totalPages ?? pagination.page) ||
                isLoading
              }
              onClick={() => handlePageChange(pagination.page + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      <MarkAbsencesDialog
        open={markAbsencesDialogOpen}
        onOpenChange={setMarkAbsencesDialogOpen}
        onComplete={handleUpdateComplete}
      />

      {selectedEvent && (
        <>
          <EventDetailsDialog
            event={selectedEvent}
            open={detailsDialogOpen}
            onOpenChange={setDetailsDialogOpen}
            usersMap={usersMap}
          />
          <UpdateStatusDialog
            event={selectedEvent}
            open={updateDialogOpen}
            onOpenChange={setUpdateDialogOpen}
            onUpdate={handleUpdateComplete}
          />
        </>
      )}

      <AttendanceHistoryDialog
        userId={historyUserId}
        userInfo={historyUserId ? usersMap.get(historyUserId) ?? null : null}
        open={historyDialogOpen}
        onOpenChange={(open) => {
          setHistoryDialogOpen(open);
          if (!open) {
            setHistoryUserId(null);
          }
        }}
        referenceMonth={selectedMonth}
      />
    </div>
  );
}
