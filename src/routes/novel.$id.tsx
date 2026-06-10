import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/novel/$id")({
  component: () => <Outlet />,
});
