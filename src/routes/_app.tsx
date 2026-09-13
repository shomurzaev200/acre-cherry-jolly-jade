import { Outlet, createFileRoute } from "@tanstack/react-router";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Shell } from "@/components/shell";

export const Route = createFileRoute("/_app")({
  component: AppGate,
});

function AppGate() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return (
      <div className="grid min-h-dvh place-items-center bg-bg text-fg-muted">
        <div className="h-24 w-48 animate-pulse rounded-[var(--radius-lg)] bg-bg-subtle" />
      </div>
    );
  }
  if (!user) return <RedirectToSignIn />;
  return (
    <Shell>
      <Outlet />
    </Shell>
  );
}
