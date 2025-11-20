import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import {
  useIsOrgAdmin,
  useOrganizationStore,
  type Organization,
  attachCurrentMemberData,
} from "@/store/organization-store";
import { useUserStore } from "@/store/user-store";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

type FormState = {
  name: string;
  logo: string;
  timezone: string;
  supportEmail: string;
  standardOvertimeRate: string;
};

type OrganizationMetadata = Record<string, any> & {
  timezone?: string;
  supportEmail?: string;
  standardOvertimeRate?: number;
};

const DEFAULT_FORM_STATE: FormState = {
  name: "",
  logo: "",
  timezone: "",
  supportEmail: "",
  standardOvertimeRate: "",
};

function parseMetadata(metadata: unknown): OrganizationMetadata {
  if (!metadata) {
    return {};
  }

  if (typeof metadata === "string") {
    try {
      return JSON.parse(metadata) ?? {};
    } catch (error) {
      console.warn("Failed to parse organization metadata", error);
      return {};
    }
  }

  if (typeof metadata === "object" && !Array.isArray(metadata)) {
    return metadata as OrganizationMetadata;
  }

  return {};
}

function buildFormState(
  organization: Organization | null,
  metadata: OrganizationMetadata,
): FormState {
  if (!organization) {
    return DEFAULT_FORM_STATE;
  }

  return {
    name: organization.name ?? "",
    logo: organization.logo ?? "",
    timezone: metadata.timezone ?? "",
    supportEmail: metadata.supportEmail ?? "",
    standardOvertimeRate:
      metadata.standardOvertimeRate !== undefined &&
      metadata.standardOvertimeRate !== null
        ? String(metadata.standardOvertimeRate)
        : "",
  };
}

export function OrganizationSettingsPage() {
  const { organization, setOrganization } = useOrganizationStore();
  const user = useUserStore((state) => state.user);
  const canEdit = useIsOrgAdmin();
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const metadata = useMemo(
    () => parseMetadata(organization?.metadata),
    [organization?.metadata, organization?.id],
  );

  const metadataSignature = useMemo(
    () => JSON.stringify(metadata),
    [metadata],
  );

  const initialState = useMemo(
    () => buildFormState(organization, metadata),
    [organization?.id, organization?.name, organization?.slug, organization?.logo, metadataSignature],
  );

  const [formState, setFormState] = useState<FormState>(initialState);

  useEffect(() => {
    setFormState(initialState);
  }, [initialState]);

  useEffect(() => {
    let ignore = false;
    if (organization || isBootstrapping) {
      return;
    }

    const fetchOrganization = async () => {
      setIsBootstrapping(true);
      try {
        const result = await authClient.organization.getFullOrganization();
        if (!ignore) {
          const enriched = attachCurrentMemberData(result?.data ?? null, user);
          setOrganization(enriched);
        }
      } catch (error) {
        console.error("Failed to load organization", error);
      } finally {
        if (!ignore) {
          setIsBootstrapping(false);
        }
      }
    };

    void fetchOrganization();

    return () => {
      ignore = true;
    };
  }, [organization, isBootstrapping, setOrganization, user]);

  const isDirty = useMemo(() => {
    return JSON.stringify(formState) !== JSON.stringify(initialState);
  }, [formState, initialState]);

  const showSkeleton = !organization && (isBootstrapping || isSaving);

  const updateField = (field: keyof FormState) => (value: string) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organization?.id) {
      toast.error("No hay una organización activa para actualizar.");
      return;
    }

    if (!formState.name.trim()) {
      toast.error("El nombre de la organización es obligatorio.");
      return;
    }

    const normalizedName = formState.name.trim();
    const normalizedLogo = formState.logo.trim();
    const timezone = formState.timezone.trim();
    const supportEmail = formState.supportEmail.trim();
    const overtimeInput = formState.standardOvertimeRate.trim();

    let overtimeRate: number | undefined;
    if (overtimeInput) {
      overtimeRate = Number(overtimeInput);
      if (Number.isNaN(overtimeRate) || overtimeRate < 0) {
        toast.error("La tarifa estándar de horas extra debe ser un número mayor o igual a 0.");
        return;
      }
      overtimeRate = Number(overtimeRate.toFixed(2));
    }

    const metadataPayload: OrganizationMetadata = {
      ...metadata,
    };

    if (timezone) {
      metadataPayload.timezone = timezone;
    } else {
      delete metadataPayload.timezone;
    }

    if (supportEmail) {
      metadataPayload.supportEmail = supportEmail;
    } else {
      delete metadataPayload.supportEmail;
    }

    if (overtimeRate !== undefined) {
      metadataPayload.standardOvertimeRate = overtimeRate;
    } else {
      delete metadataPayload.standardOvertimeRate;
    }

    setIsSaving(true);
    try {
      const result = await authClient.organization.update({
        data: {
          name: normalizedName,
          logo: normalizedLogo || undefined,
          metadata: metadataPayload,
        },
      });

      if (result.error) {
        throw new Error(
          result.error.message ||
            "No se pudieron guardar los cambios de la organización.",
        );
      }

      const refreshed = await authClient.organization.getFullOrganization();
      const enriched = attachCurrentMemberData(refreshed?.data ?? null, user);
      setOrganization(enriched);

      toast.success("Configuración de la organización actualizada.");
    } catch (error) {
      console.error("Failed to update organization", error);
      const message =
        error instanceof Error
          ? error.message
          : "Ocurrió un error al guardar la configuración.";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  if (!organization && !isBootstrapping && !showSkeleton) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Sin organización activa</CardTitle>
            <CardDescription>
              Necesitas crear o activar una organización antes de configurar los
              ajustes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Si recientemente aceptaste una invitación, recarga la página o
              selecciona una organización existente.
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild>
              <Link to="/(organization)/create-organization">
                Crear organización
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 pb-16">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">
          Configuración de la organización
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm">
          Actualiza los datos base que Better Auth comparte con el resto de tu
          equipo y define la tarifa estándar de horas extra para los reportes de
          tiempo.
        </p>
      </div>

      {!canEdit && organization && (
        <Alert variant="warning" className="border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-400/50 dark:bg-amber-400/10 dark:text-amber-100">
          <ShieldAlert className="size-4" />
          <AlertTitle>Modo de solo lectura</AlertTitle>
          <AlertDescription>
            Necesitas ser administrador o propietario para editar la
            configuración de la organización. Puedes revisar los valores
            actuales, pero no realizar cambios.
          </AlertDescription>
        </Alert>
      )}

      {showSkeleton || !organization ? (
        <SettingsSkeleton />
      ) : (
        <form className="space-y-6" onSubmit={(event) => void handleSubmit(event)}>
          <Card>
            <CardHeader>
              <CardTitle>Datos generales</CardTitle>
              <CardDescription>
                Se guardan directamente usando el plugin de organizaciones de
                Better Auth, por lo que estarán disponibles en todas las
                aplicaciones conectadas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="org-name">Nombre legal</FieldLabel>
                  <Input
                    id="org-name"
                    value={formState.name}
                    onChange={(event) => updateField("name")(event.target.value)}
                    placeholder="Mi Empresa S.A."
                    disabled={!canEdit || isSaving}
                    required
                  />
                  <FieldDescription>
                    Mostramos este nombre en el sidebar, facturas y reportes.
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="org-slug">Apodo / slug</FieldLabel>
                  <Input
                    id="org-slug"
                    value={organization?.slug ?? ""}
                    disabled
                    readOnly
                  />
                  <FieldDescription>
                    Este identificador se define al crear la organización y no se
                    puede modificar.
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="org-logo">Logo</FieldLabel>
                  <Input
                    id="org-logo"
                    value={formState.logo}
                    onChange={(event) => updateField("logo")(event.target.value)}
                    placeholder="https://mi-cdn.com/logo.png"
                    disabled={!canEdit || isSaving}
                  />
                  <FieldDescription>
                    Aceptamos imágenes alojadas en HTTPS. Déjalo vacío para usar
                    las iniciales de la organización.
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tiempo y nómina</CardTitle>
              <CardDescription>
                Metadatos adicionales que almacenamos en Better Auth para
                alimentar cálculos de horarios y reportes financieros.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="org-timezone">
                    Zona horaria principal
                  </FieldLabel>
                  <Input
                    id="org-timezone"
                    value={formState.timezone}
                    onChange={(event) =>
                      updateField("timezone")(event.target.value)
                    }
                    placeholder="America/Mexico_City"
                    disabled={!canEdit || isSaving}
                  />
                  <FieldDescription>
                    Usa el nombre IANA (ej. America/Santo_Domingo). Lo utilizamos
                    para generar turnos y reportes de asistencia.
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="org-support-email">
                    Email de contacto
                  </FieldLabel>
                  <Input
                    id="org-support-email"
                    type="email"
                    value={formState.supportEmail}
                    onChange={(event) =>
                      updateField("supportEmail")(event.target.value)
                    }
                    placeholder="recursos.humanos@miempresa.com"
                    disabled={!canEdit || isSaving}
                  />
                  <FieldDescription>
                    Mostramos este correo en notificaciones automáticas para que
                    el equipo sepa a quién escribir.
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="org-overtime">
                    Tarifa estándar de horas extra
                  </FieldLabel>
                  <Input
                    id="org-overtime"
                    type="number"
                    min={0}
                    step="0.01"
                    value={formState.standardOvertimeRate}
                    onChange={(event) =>
                      updateField("standardOvertimeRate")(event.target.value)
                    }
                    placeholder="150.00"
                    disabled={!canEdit || isSaving}
                  />
                  <FieldDescription>
                    Importe por hora que usaremos como referencia para estimar el
                    costo de horas extra en tableros y reportes.
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </CardContent>
            <CardFooter>
              <p className="text-xs text-muted-foreground">
                Los metadatos se guardan dentro de la organización en Better
                Auth, así que podrás leerlos desde otros servicios conectados.
              </p>
            </CardFooter>
          </Card>

          <Separator />

          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setFormState(initialState)}
              disabled={!isDirty || isSaving}
            >
              Restablecer cambios
            </Button>
            <Button
              type="submit"
              disabled={!canEdit || !isDirty || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar cambios"
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="grid gap-6">
      {[0, 1].map((card) => (
        <Card key={card}>
          <CardHeader className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[0, 1, 2].map((field) => (
              <div key={field} className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
