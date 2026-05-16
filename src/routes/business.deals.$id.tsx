import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/business/deals/$id")({
  component: () => <Outlet />,
});