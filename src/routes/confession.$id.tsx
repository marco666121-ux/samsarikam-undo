import { createFileRoute, redirect } from "@tanstack/react-router";

// Alias route: /confession/$id permanently redirects to /post/$id
// so confession-type posts get a friendlier shareable URL.
export const Route = createFileRoute("/confession/$id")({
  loader: ({ params }) => {
    throw redirect({ to: "/post/$id", params: { id: params.id } });
  },
  component: () => null,
});