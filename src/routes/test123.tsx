import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/test123")({
  component: () => <div>test</div>,
});
