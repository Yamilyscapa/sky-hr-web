import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { signUp } from "@/lib/auth"
import { useRouter } from "@tanstack/react-router"

export function SignupForm({
  className,
  inviteToken,
  redirect,
  ...props
}: React.ComponentProps<"form"> & {
  inviteToken: string
  redirect: string
}) {
  const router = useRouter()

  async function handleSignUp(email: string, password: string, confirmPassword: string, name: string) {
    if (password !== confirmPassword) {
      throw new Error("Las contraseñas no coinciden")
    }

    const { data, error } = await signUp(email, password, name)

    if (error) {
      throw new Error(error.message)
    }

    if (!data) {
      throw new Error("No data returned from sign up")
    }

    return data
  }

  async function handleAcceptInvitation(token: string) {
    router.navigate({ to: '/accept-invitation', search: { token } })
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.target as HTMLFormElement;
    const name: string = (form.querySelector("#name") as HTMLInputElement).value;
    const email: string = (form.querySelector("#email") as HTMLInputElement).value;
    const password: string = (form.querySelector("#password") as HTMLInputElement).value;
    const confirmPassword: string = (form.querySelector("#confirm-password") as HTMLInputElement).value;

    const data = await handleSignUp(email, password, confirmPassword, name)

    if (inviteToken) {
      await handleAcceptInvitation(inviteToken)
    }

    console.log(data)
  }

  return (
    <form className={cn("flex flex-col gap-6", className)} {...props} onSubmit={(event) => handleSubmit(event)}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Crear tu cuenta</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Llena el formulario a continuación para crear tu cuenta
          </p>
        </div>
        <Field>
          <FieldLabel htmlFor="name">Nombre completo</FieldLabel>
          <Input id="name" type="text" placeholder="John Doe" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="email">Correo electrónico</FieldLabel>
          <Input id="email" type="email" placeholder="ejemplo@correo.com" required />
          <FieldDescription>
            Usaremos este correo electrónico para contactarte. No compartiremos tu correo electrónico
            con nadie más.
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="password">Contraseña</FieldLabel>
          <Input id="password" type="password" required />
          <FieldDescription>
            Debe tener al menos 8 caracteres.
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="confirm-password">Confirmar contraseña</FieldLabel>
          <Input id="confirm-password" type="password" required />
          <FieldDescription>Por favor, confirma tu contraseña.</FieldDescription>
        </Field>
        <Field>
          <Button type="submit">
            Crear cuenta
          </Button>
        </Field>
        <Field>
          <FieldDescription className="px-6 text-center">
            Ya tienes una cuenta? <a href="/login" className="underline underline-offset-4">Iniciar sesión</a>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  )
}
