import { LoginForm } from '@/components/login-form'
import { isAuthenticated } from '@/server/auth.server'
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/(auth)/login')({
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
                    <LoginForm />
                </div>
            </div>
    )
}
