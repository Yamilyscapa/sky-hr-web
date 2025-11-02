import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { login } from "@/lib/auth";
import { useRouter } from "@tanstack/react-router";

export function LoginForm({
  className,
  inviteToken,
  redirect,
  ...props
}: React.ComponentProps<"form"> & {
  inviteToken: string;
  redirect: string;
}) {
  const router = useRouter();
  async function handleLogin(email: string, password: string) {
    const { data, error } = await login(email, password);

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error("No data returned from login");
    }

    return data;
  }

  async function handleAcceptInvitation(token: string) {

    router.navigate({ to: '/accept-invitation', search: { token } });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.target as HTMLFormElement;
    const email: string = (form.querySelector("#email") as HTMLInputElement)
      .value;
    const password: string = (
      form.querySelector("#password") as HTMLInputElement
    ).value;

    const data = await handleLogin(email, password);

    if (inviteToken) {
      await handleAcceptInvitation(inviteToken);
    }

    console.log(data);
  }

  return (
    <form
      className={cn("flex flex-col gap-6", className)}
      {...props}
      onSubmit={(event) => handleSubmit(event)}
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Iniciar sesión</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Ingresa tu correo electrónico para iniciar sesión
          </p>
        </div>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder="ejemplo@correo.com"
            required
          />
        </Field>
        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="password">Contraseña</FieldLabel>
            <a
              href="#"
              className="ml-auto text-sm underline-offset-4 hover:underline"
            >
              Olvidaste tu contraseña?
            </a>
          </div>
          <Input id="password" type="password" required />
        </Field>
        <Field>
          <Button type="submit">Iniciar sesión</Button>
        </Field>
        <Field>
          <FieldDescription className="text-center">
            No tienes una cuenta?{" "}
            <a href="/signup" className="underline underline-offset-4">
              Registrate
            </a>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
}
