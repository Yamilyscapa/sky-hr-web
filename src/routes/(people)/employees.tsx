import { isAuthenticated } from '@/server/auth.server'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { DataTableCard } from '@/components/ui/data-table-card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ColumnDef } from '@tanstack/react-table'
import { useReactTable } from '@tanstack/react-table'
import { getCoreRowModel, getSortedRowModel } from '@tanstack/react-table'
import { ArrowUpDown, MoreHorizontal, Edit, Trash2, Eye } from 'lucide-react'

// Actions cell component with dropdown menu
function ActionsCell() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center justify-center w-8 h-8 hover:bg-gray-100 rounded-md">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem className="flex items-center gap-2 cursor-pointer">
          <Eye className="h-4 w-4" />
          <span>Ver detalles</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="flex items-center gap-2 cursor-pointer">
          <Edit className="h-4 w-4" />
          <span>Editar</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-600">
          <Trash2 className="h-4 w-4" />
          <span>Eliminar</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const columns: ColumnDef<any>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <input
        type="checkbox"
        checked={table.getIsAllPageRowsSelected()}
        onChange={(e) => table.toggleAllPageRowsSelected(!!e.target.checked)}
        className="rounded border-gray-300"
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        checked={row.getIsSelected()}
        onChange={(e) => row.toggleSelected(!!e.target.checked)}
        className="rounded border-gray-300"
      />
    ),
    enableSorting: true,
    enableHiding: false,
  },
  {
    header: ({ column }) => {
      return (
        <button
          className="flex items-center space-x-2 hover:bg-gray-100 px-2 py-1 rounded"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          <span>Correo</span>
          <ArrowUpDown className="h-4 w-4" />
        </button>
      )
    },
    accessorKey: "email",
    cell: info => info.getValue(),
    enableSorting: true,
  },
  {
    header: "Nombre",
    accessorKey: "name",
    cell: info => info.getValue(),
  },
  {
    id: "actions",
    header: "",
    cell: () => {
      return <ActionsCell />
    },
    enableSorting: false,
    enableHiding: false,
  }
]

const data: Array<{ email: string, name: string }> = [
  { email: "empleado1@ejemplo.com", name: "Empleado 1" },
  { email: "empleado2@ejemplo.com", name: "Empleado 2" },
  { email: "ana.garcia@ejemplo.com", name: "Ana García" },
  { email: "carlos.lopez@ejemplo.com", name: "Carlos López" },
  { email: "beatriz.martinez@ejemplo.com", name: "Beatriz Martínez" }
]

export const Route = createFileRoute('/(people)/employees')({
  component: RouteComponent,

  beforeLoad: async () => {
    const auth = await isAuthenticated()
    if (!auth) {
      throw redirect({ to: '/login' })
    }
  },
})

function RouteComponent() {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSorting: true,
    enableRowSelection: true,
  })

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // Your submission logic here
  }

  function handleBulkAction() {
    const selectedRows = table.getSelectedRowModel().rows
    console.log('Bulk action on selected rows:', selectedRows.map(row => row.original))
    // Your bulk action logic here
  }

  return (
    <div className="container mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Agregar empleado</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <Field>
              <Label htmlFor="employee-email">Correo electrónico</Label>
              <Input id="employee-email" type="email" placeholder="correo@ejemplo.com" />
            </Field>
            <Button type="submit">Enviar invitación</Button>
          </form>
        </CardContent>
      </Card>

      <Separator className="mt-8" />
      <DataTableCard
        title="Empleados"
        table={table}
        selectedCount={table.getSelectedRowModel().rows.length}
        bulkActionLabel="Acciones masivas"
        onBulkAction={handleBulkAction}
        className="mt-8"
      />
    </div>
  )
}
