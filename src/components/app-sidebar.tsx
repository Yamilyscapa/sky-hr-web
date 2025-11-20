import { LogOutIcon, UserIcon, Settings } from "lucide-react";
import { useRouter, Link } from "@tanstack/react-router";
import { useUserStore } from "@/store/user-store";
import { useOrganizationStore } from "@/store/organization-store";
import { Button } from "@/components/ui/button";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { logout } from "@/lib/auth";

const data = {
  navMain: [
    {
      title: "Inicio",
      url: "/",
    },
    {
      title: "Gestionar personas",
      url: "#",
      items: [
        {
          title: "Empleados",
          url: "/employees",
        },
        {
          title: "Visitantes",
          url: "/visitors",
        },
        {
          title: "Gestionar asistencia",
          url: "/attendance",
        },
        {
          title: "Gestionar permisos",
          url: "/permissions",
        },  
      ],
    },
    {
      title: "Organizacion",
      url: "#",
      items: [
        {
          title: "Sucursales",
          url: "/locations",
        },
        {
          title: "Horarios",
          url: "/schedules",
        },
        {
          title: "Anuncios",
          url: "/announcements",
        },
        // {
        //   title: "Gestionar permisos",
        //   url: "#",
        // },
        // {
        //   title: "Reportes",
        //   url: "#",
        // },
      ],
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { organization } = useOrganizationStore();
  const { user } = useUserStore();
  const router = useRouter();
  const currentPath = router.state.location.pathname;
  const slug =
    organization?.slug ??
    (organization as any)?.organization?.slug ??
    "";
  const basePath = slug ? `/${slug}` : "/";

  const resolvePath = (url: string) => {
    if (url === "#") {
      return "#";
    }

    if (!slug) {
      return url;
    }

    if (url === "/") {
      return basePath;
    }

    return `${basePath}${url.startsWith("/") ? url : `/${url}`}`;
  };

  // Check if a URL matches the current path
  const isActive = (url: string) => {
    if (url === "#") return false;
    const resolved = resolvePath(url);
    if (resolved === "#") {
      return false;
    }
    if (url === "/") {
      return currentPath === resolved;
    }
    return currentPath.startsWith(resolved);
  };

  // Check if any child item is active (for parent menu items)
  const hasActiveChild = (items?: Array<{ url: string }>) => {
    if (!items) return false;
    return items.some((child) => isActive(child.url));
  };

  return (
    <Sidebar variant="floating" {...props}>
      <SidebarHeader className="relative">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to={resolvePath("/")}>
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <img
                    src="/sky-logo.png"
                    alt="Sky HR"
                    className="size-8 rounded-lg"
                  />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-medium">{organization?.name}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <button
          className="absolute top-4 right-4 z-50 flex h-8 w-8 items-center justify-center rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          onClick={() => {
            // Toggle sidebar by clicking the document's sidebar trigger
            const trigger = document.querySelector(
              '[data-sidebar="trigger"]',
            ) as HTMLElement;
            if (trigger) {
              trigger.click();
            }
          }}
        ></button>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu className="gap-2">
            {data.navMain.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild isActive={isActive(item.url) || hasActiveChild(item.items)}>
                  <Link to={resolvePath(item.url)} className="font-medium">
                    {item.title}
                  </Link>
                </SidebarMenuButton>
                {item.items?.length ? (
                  <SidebarMenuSub className="ml-0 border-l-0 px-1.5">
                    {item.items.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton asChild isActive={isActive(subItem.url)}>
                          <Link to={resolvePath(subItem.url)}>{subItem.title}</Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                ) : null}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <SidebarMenuButton size="lg" asChild>
                    <Link to="#" className="flex items-center gap-2">
                      <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                        <UserIcon className="size-4" />
                      </div>
                      <div className="flex flex-col gap-0.5 leading-none">
                        <span className="font-medium">{user?.name}</span>
                        <span className="text-xs text-sidebar-foreground/70">
                          {user?.email}
                        </span>
                      </div>
                    </Link>
                  </SidebarMenuButton>
                </TooltipTrigger>
                <TooltipContent side="right" className="w-48 p-2">
                  <div className="space-y-2">
                    <Button className="flex items-center gap-2 p-2 hover:bg-accent rounded-md cursor-pointer">
                      <Settings className="size-4" />
                      <span className="text-sm">Configuración</span>
                    </Button>
                    <Button variant="ghost" onClick={() => logout()} className="flex items-center gap-2 p-2 hover:bg-accent rounded-md cursor-pointer text-red-600 hover:text-red-700">
                      <LogOutIcon className="size-4" />
                      <span className="text-sm">Cerrar sesión</span>
                    </Button>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
