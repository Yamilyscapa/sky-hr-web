import type { TanStackDevtoolsReactPlugin } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";

export function createTanStackQueryDevtoolsPlugin(
  queryClient: QueryClient,
): TanStackDevtoolsReactPlugin {
  return {
    name: "Tanstack Query",
    render: <ReactQueryDevtoolsPanel client={queryClient} />,
  };
}
