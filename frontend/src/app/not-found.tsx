import { AppFooter } from "@/components/layout/app-footer";
import { AppHeader } from "@/components/layout/app-header";
import { TransitionLink } from "@/components/motion/route-transition-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  return (
    <>
      <AppHeader subtitle="Page Not Found" />
      <main
        id="main-content"
        className="mx-auto flex w-full max-w-xl flex-1 items-center justify-center px-6 py-16"
      >
        <Card className="glass-elevated relative w-full overflow-hidden text-center">
          <span
            aria-hidden="true"
            className="specular-rule pointer-events-none absolute inset-x-10 top-0 h-px"
          />
          <CardHeader>
            <p className="telemetry-num text-xs uppercase tracking-[0.2em] text-[var(--accent-primary)]">
              Error 404
            </p>
            <CardTitle as="h1" className="pt-1 text-3xl">
              Page Not Found
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm text-[var(--text-secondary)]">
              We couldn&apos;t find that page on Haziri.AI. It may have moved or no longer exists.
            </p>
            <Button asChild>
              <TransitionLink href="/">Back to Home</TransitionLink>
            </Button>
          </CardContent>
        </Card>
      </main>
      <AppFooter compact />
    </>
  );
}
