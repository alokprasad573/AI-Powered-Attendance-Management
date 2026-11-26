"use client";

import { Eye, EyeOff, KeyRound, LogIn, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TeacherLoginFormProps {
  prefillTeacherId: string;
  nextPath: string;
  initialAuthError: string | null;
}

export function TeacherLoginForm({
  prefillTeacherId,
  nextPath,
  initialAuthError,
}: TeacherLoginFormProps) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState(prefillTeacherId);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    initialAuthError ? "Authentication link failed or expired. Please sign in again." : null
  );

  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    if (!identifier.trim() || !password) {
      setErrorMessage("Please enter both Teacher ID (or Email) and password.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/teacher/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        message: string;
      };

      if (!response.ok || !data.ok) {
        setErrorMessage(data.message || "Sign in failed.");
        return;
      }

      toast.success(data.message);
      const safeTarget =
        nextPath.startsWith("/teacher") && !nextPath.startsWith("//")
          ? nextPath
          : "/teacher/dashboard";
      router.push(safeTarget);
      router.refresh();
    } catch {
      setErrorMessage("Network error while signing in. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRecoverySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRecoveryLoading(true);
    setRecoveryMessage(null);

    try {
      const response = await fetch("/api/auth/recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: recoveryEmail.trim(), role: "teacher" }),
      });
      const data = (await response.json()) as { ok: boolean; message: string };
      setRecoveryMessage(data.message);
      if (data.ok) {
        toast.success(data.message);
      }
    } catch {
      setRecoveryMessage("Unable to send recovery email right now.");
    } finally {
      setRecoveryLoading(false);
    }
  }

  return (
    <Card className="glass-elevated relative overflow-hidden p-1.5">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[#B9D0D8]/50 to-transparent"
      />
      <CardHeader>
        <CardTitle as="h1" className="text-2xl">Teacher Login</CardTitle>
        <CardDescription>
          Sign in with your assigned Teacher ID (e.g.{" "}
          <code className="font-mono text-[var(--accent-primary)]">T4567</code>) or
          registered email address.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {errorMessage ? (
            <Alert variant="error" aria-live="polite">
              {errorMessage}
            </Alert>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="teacher-identifier">Teacher ID or Email</Label>
            <Input
              id="teacher-identifier"
              name="identifier"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Ex - T4567 or teacher@school.edu"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="teacher-password">Password</Label>
              <Dialog open={recoveryOpen} onOpenChange={setRecoveryOpen}>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    suppressHydrationWarning
                    className="inline-flex items-center gap-1 text-xs text-[var(--accent-primary)] transition-colors hover:text-[#DCE9EE]"
                  >
                    <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                    Reset password
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Teacher Account Recovery</DialogTitle>
                    <DialogDescription>
                      Enter your registered email address to receive a password reset link.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleRecoverySubmit} className="mt-4 space-y-4">
                    {recoveryMessage ? (
                      <Alert variant="info">{recoveryMessage}</Alert>
                    ) : null}
                    <div className="space-y-2">
                      <Label htmlFor="recovery-email">Registered Email</Label>
                      <Input
                        id="recovery-email"
                        type="email"
                        value={recoveryEmail}
                        onChange={(e) => setRecoveryEmail(e.target.value)}
                        placeholder="teacher@example.com"
                        required
                      />
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={recoveryLoading}>
                        {recoveryLoading ? "Sending..." : "Send Recovery Link"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="relative">
              <Input
                id="teacher-password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                className="pr-12"
                required
              />
              <button
                type="button"
                suppressHydrationWarning
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-[8px] p-2 text-[var(--text-secondary)] transition-colors hover:bg-[#22272A] hover:text-[var(--text-primary)]"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            <LogIn className="h-4 w-4" aria-hidden="true" />
            {isSubmitting ? "Verifying..." : "Login"}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex flex-col gap-3 border-t border-[var(--border-hairline)] pt-5 sm:flex-row sm:justify-between">
        <p className="text-xs text-[var(--text-secondary)]">New to Haziri.AI?</p>
        <Button variant="secondary" size="sm" asChild>
          <Link href="/teacher/register">
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Don&apos;t have an account? Register
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
