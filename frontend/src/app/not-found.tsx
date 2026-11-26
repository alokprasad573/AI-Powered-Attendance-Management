import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-[75dvh] max-w-xl items-center justify-center px-6"
    >
      <Card className="glass-elevated w-full text-center">
        <CardHeader>
          <p className="telemetry-num text-sm text-[var(--accent-primary)]">Error 404</p>
          <CardTitle as="h1" className="text-2xl">Page Not Found</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-[var(--text-secondary)]">
            The requested Haziri.AI route does not exist or has moved.
          </p>
          <Button asChild>
            <Link href="/">Back to Home</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
