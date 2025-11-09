import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(organization)/settings')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/(organization)/settings"!</div>
}
