import { SignupForm } from '@/components/signup-form'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { isAuthenticated } from '@/server/auth.server'

export const Route = createFileRoute('/(auth)/signup')({
  component: RouteComponent,
  beforeLoad: async () => {
    const auth = await isAuthenticated()

    if (auth) {
      throw redirect({ to: '/' })
    }
  },
})

function RouteComponent() {
  return (
    <div className="container mx-auto h-screen flex items-center justify-center">
      <div className="w-[600px]">
        <SignupForm />
      </div>
    </div>
  )
}
