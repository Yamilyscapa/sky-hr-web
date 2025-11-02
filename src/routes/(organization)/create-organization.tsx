import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/(organization)/create-organization")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();

  async function handleCreateOrganization(
    name: string,
    slug: string,
    logo_url: string,
  ) {
    try {
      const result = await authClient.organization.create({
        name,
        slug,
        logo: logo_url,
      });

      if (result.data) {
        const orgId = result.data.id;
        if (orgId) {
          await authClient.organization.setActive({
            organizationId: orgId,
          });
        }

        await navigate({ to: "/" });
      } else if (result.error?.code === "ORGANIZATION_ALREADY_EXISTS") {
        const listResult = await authClient.organization.list();

        if (listResult.data && listResult.data.length > 0) {
          const existingOrg =
            listResult.data.find((org) => org.slug === slug) ||
            listResult.data[0];

          if (existingOrg) {
            const setActiveResult = await authClient.organization.setActive({
              organizationId: existingOrg.id,
            });
            console.log("Set active organization:", setActiveResult);
            await navigate({ to: "/" });
          }
        } else {
          alert("La organización ya existe pero no se pudo acceder");
        }
      } else {
        console.error("Failed to create organization:", result.error);
        alert("Error al crear la organización");
      }
    } catch (error) {
      console.error("Error creating organization:", error);
      alert("Error al crear la organización");
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const name: string = (form.querySelector("#name") as HTMLInputElement)
      .value;
    const slug: string = (form.querySelector("#slug") as HTMLInputElement)
      .value;
    const logo_url: string = (
      form.querySelector("#logo_url") as HTMLInputElement
    ).value;

    await handleCreateOrganization(name, slug, logo_url);
  }

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <form
        className={cn("flex flex-col gap-6")}
        onSubmit={(event) => handleSubmit(event)}
      >
        <FieldGroup>
          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="text-2xl font-bold">Crear organización</h1>
            <p className="text-muted-foreground text-sm text-balance">
              Llena el formulario a continuación para crear tu organización
            </p>
          </div>
          <Field>
            <FieldLabel htmlFor="name">Nombre de la organización</FieldLabel>
            <Input
              id="name"
              type="text"
              placeholder="Mi Empresa S.A."
              required
            />
            <FieldDescription>
              El nombre oficial de tu organización.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="slug">Apodo</FieldLabel>
            <Input
              id="slug"
              type="text"
              placeholder="Mi Empresa S.A."
              required
            />
            <FieldDescription>
              Como te referirás a la organización en la plataforma (ejemplo:
              "mi-empresa-s-a").
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="logo_url">Logo</FieldLabel>
            <Input
              id="logo_url"
              type="text"
              placeholder="URL del logo"
              required
            />
            <FieldDescription>
              URL del logo de la organización.
            </FieldDescription>
          </Field>
          <Field>
            <Button type="submit">Crear organización</Button>
          </Field>
        </FieldGroup>
      </form>
    </div>
  );
}
