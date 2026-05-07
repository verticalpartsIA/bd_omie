import { createFileRoute, Link, Outlet, useMatches } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/produtos")({
  component: () => <Outlet />,
});

// Layout-only file; child routes (index, $id) handle rendering.
export { Link, useMatches };