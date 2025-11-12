import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const API = import.meta.env.VITE_API_URL as string;

function getOrgId() {
  try {
    const keys = ['activeOrganizationId','organizationId','orgId','active_org_id'];
    for (const k of keys) { const v = localStorage.getItem(k); if (v) return v; }
    // @ts-expect-error
    if (typeof window !== 'undefined' && window.__ORG_ID__) return window.__ORG_ID__ as string;
  } catch {}
  return undefined;
}

type Visitor = {
  id: string;
  name: string;
  accessAreas: string;
  entryDate: string;
  exitDate: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  approvedByUserId?: string | null;
  approvedAt?: string | null;
};

export const Route = createFileRoute("/(company)/visitors")({ component: VisitorsPage });

function VisitorsPage() {
  const [data, setData] = useState<Visitor[]>([]);
  const [status, setStatus] = useState<string>("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  async function fetchList() {
    try {
      const params = new URLSearchParams();
      if (status !== "all") params.set("status", status);
      if (q) params.set("q", q);
      const orgId = getOrgId();
      const res = await fetch(`${API}/visitors?${params.toString()}`, {
        credentials: 'include',
        headers: orgId ? { 'x-organization-id': orgId } : undefined,
      });
      if (!res.ok) throw new Error("Error al cargar visitantes");
      const json = await res.json();
      const rows = (json.data ?? json.rows ?? []).map((r: any) => ({
        id: r.id,
        name: r.name,
        accessAreas: r.access_areas ?? r.accessAreas,
        entryDate: r.entry_date ?? r.entryDate,
        exitDate: r.exit_date ?? r.exitDate,
        status: r.status,
        approvedByUserId: r.approved_by_user_id ?? r.approvedByUserId,
        approvedAt: r.approved_at ?? r.approvedAt,
      })) as Visitor[];
      setData(rows);
    } catch (e: any) {
      toast.error(e.message || "No se pudo cargar la lista");
    }
  }

  useEffect(() => { fetchList(); }, [status]);

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Guardar la referencia al formulario ANTES de cualquier await
    const form = e.currentTarget as HTMLFormElement | null;
    if (!form) {
      toast.error("No se pudo leer el formulario");
      return;
    }

    const fd = new FormData(form);
    const name = String(fd.get("name") || "").trim();
    const accessAreas = String(fd.get("accessAreas") || "").trim();
    const entryDateStr = String(fd.get("entryDate") || "");
    const exitDateStr = String(fd.get("exitDate") || "");

    if (!name || !accessAreas || !entryDateStr || !exitDateStr) {
      toast.error("Completa todos los campos");
      return;
    }

    const entryDate = new Date(entryDateStr);
    const exitDate = new Date(exitDateStr);
    if (entryDate > exitDate) {
      toast.error("La entrada debe ser antes o igual a la salida");
      return;
    }

    const body = {
      name,
      accessAreas,
      entryDate: entryDate.toISOString(),
      exitDate: exitDate.toISOString(),
      approveNow: false,
    } as const;

    const orgId = getOrgId();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (orgId) headers["x-organization-id"] = orgId;

    const res = await fetch(`${API}/visitors`, {
      method: "POST",
      credentials: "include",
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await safeJson(res);
      console.error("Create visitor failed", err);
      toast.error(err?.error || `Error al crear (${res.status})`);
      return;
    }

    await safeJson(res);
    toast.success("Visitante creado");
    setOpen(false);
    form.reset();
    fetchList();
  }

  async function approve(id: string) { const r = await fetch(`${API}/visitors/${id}/approve`, { method: 'POST', credentials: 'include' }); if (!r.ok) { toast.error((await safeJson(r))?.error || 'Error'); return;} fetchList(); }
  async function rejectV(id: string) { const r = await fetch(`${API}/visitors/${id}/reject`, { method: 'POST', credentials: 'include' }); if (!r.ok) { toast.error((await safeJson(r))?.error || 'Error'); return;} fetchList(); }
  async function cancelV(id: string) { const r = await fetch(`${API}/visitors/${id}/cancel`, { method: 'POST', credentials: 'include' }); if (!r.ok) { toast.error((await safeJson(r))?.error || 'Error'); return;} fetchList(); }

  return (
    <Card className="mx-auto max-w-6xl">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>Visitantes</CardTitle>
        <div className="flex gap-2 items-center">
          <select className="border rounded px-2 py-1 h-9" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">Todos</option>
            <option value="pending">Pendientes</option>
            <option value="approved">Aprobados</option>
            <option value="rejected">Rechazados</option>
            <option value="cancelled">Cancelados</option>
          </select>
          <Input placeholder="Buscar por nombre o acceso" value={q} onChange={(e) => setQ(e.target.value)} />
          <Button onClick={fetchList}>Filtrar</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>Nuevo</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuevo visitante</DialogTitle>
                <DialogDescription>Introduce nombre, accesos y fechas. Todos los campos son obligatorios.</DialogDescription>
              </DialogHeader>
              <form className="space-y-3" onSubmit={onCreate}>
                <Input name="name" placeholder="Nombre" required />
                <textarea name="accessAreas" placeholder="Lugares de acceso (texto libre)" required className="w-full min-h-24 border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm">Entrada</label>
                    <Input name="entryDate" type="datetime-local" required />
                  </div>
                  <div>
                    <label className="text-sm">Salida</label>
                    <Input name="exitDate" type="datetime-local" required />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button type="submit">Crear</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <HeaderRow />
        {data.map((v) => (<Row key={v.id} v={v} onApprove={approve} onReject={rejectV} onCancel={cancelV} />))}
        {data.length === 0 && <div className="text-sm text-muted-foreground py-6">No hay visitantes.</div>}
      </CardContent>
    </Card>
  );
}

function HeaderRow() {
  return (
    <div className="grid grid-cols-12 gap-2 font-medium border-b py-2">
      <div className="col-span-3">Nombre</div>
      <div className="col-span-2">Entrada</div>
      <div className="col-span-2">Salida</div>
      <div className="col-span-3">Accesos</div>
      <div className="col-span-2 text-right">Acciones</div>
    </div>
  );
}

function Row({ v, onApprove, onReject, onCancel }: { v: Visitor; onApprove: (id: string) => void; onReject: (id: string) => void; onCancel: (id: string) => void; }) {
  return (
    <div className="grid grid-cols-12 gap-2 py-2 border-b">
      <div className="col-span-3">{v.name}</div>
      <div className="col-span-2">{new Date(v.entryDate).toLocaleString()}</div>
      <div className="col-span-2">{new Date(v.exitDate).toLocaleString()}</div>
      <div className="col-span-3 truncate">{v.accessAreas}</div>
      <div className="col-span-2 flex gap-2 justify-end">
        {v.status === "pending" && (<>
          <Button size="sm" onClick={() => onApprove(v.id)}>Aprobar</Button>
          <Button size="sm" variant="destructive" onClick={() => onReject(v.id)}>Rechazar</Button>
        </>)}
        {v.status !== "cancelled" && (<Button size="sm" variant="outline" onClick={() => onCancel(v.id)}>Cancelar</Button>)}
      </div>
    </div>
  );
}

async function safeJson(res: Response) { try { return await res.json(); } catch { return null; } }