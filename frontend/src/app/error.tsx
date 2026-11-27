"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { TransitionLink } from "@/components/motion/route-transition-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-[80dvh] w-full max-w-2xl items-center justify-center px-6"
    >
      <Card className="glass-elevated relative w-full overflow-hidden border-[#DF848E]/30 p-2">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[#DF848E]/55 to-transparent"
        />
        <CardHeader>
          <div className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-[12px] border border-[#DF848E]/35 bg-[#DF848E]/12 text-[#DF848E]">
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
          </div>
          <CardTitle as="h1" className="text-2xl">Something went wrong</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
            {error.message || "An unexpected error occurred while rendering this route."}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={reset}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Try again
            </Button>
            <Button variant="outline" asChild>
              <TransitionLink href="/">Return Home</TransitionLink>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
