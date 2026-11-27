"use client";

import { Eye, EyeOff, LogIn, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function TeacherRegisterForm({
  initialTeacherId,
}: {
  initialTeacherId: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [gender, setGender] = useState<string>("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    if (!name.trim() || !email.trim() || !mobileNumber.trim() || !gender || !password || !confirmPassword) {
      setErrorMessage("Please fill in all the required fields.");
      return;
    }

    if (!/^\d{10}$/.test(mobileNumber.trim())) {
      setErrorMessage("Mobile number must be 10 digits long.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please try again.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/teacher/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId: initialTeacherId,
          name: name.trim(),
          email: email.trim(),
          mobileNumber: mobileNumber.trim(),
          gender,
          password,
          confirmPassword,
        }),
      });

      const data = (await response.json()) as {
        ok: boolean;
        message: string;
        data?: { teacherId: string };
      };

      if (!response.ok || !data.ok) {
        setErrorMessage(data.message || "Registration failed.");
        return;
      }

      toast.success(data.message);
      const assignedId = data.data?.teacherId ?? initialTeacherId;
      router.push(`/teacher/login?id=${encodeURIComponent(assignedId)}`);
    } catch {
      setErrorMessage("Network error during registration. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="glass-elevated relative overflow-hidden p-1.5">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[#91AAB4]/50 to-transparent"
      />
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle as="h1" className="text-2xl">Teacher Registration</CardTitle>
          <Badge>
            Assigned ID: <span className="telemetry-num">{initialTeacherId}</span>
          </Badge>
        </div>
        <CardDescription>
          Create your teacher account to set up classes and take attendance effortlessly.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {errorMessage ? (
            <Alert variant="error" aria-live="polite">
              {errorMessage}
            </Alert>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="t-name">Full Name</Label>
            <Input
              id="t-name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              autoComplete="name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="t-email">Email Address</Label>
            <Input
              id="t-email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="t-mobile">Mobile Number</Label>
              <Input
                id="t-mobile"
                name="mobileNumber"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                placeholder="10-digit mobile number"
                autoComplete="tel-national"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="t-gender">Gender</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger id="t-gender" aria-label="Gender">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="t-password">Password</Label>
              <div className="relative">
                <Input
                  id="t-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  autoComplete="new-password"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  suppressHydrationWarning
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-[8px] p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[#22272A] hover:text-[var(--text-primary)]"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="t-confirm-password">Confirm Password</Label>
              <Input
                id="t-confirm-password"
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                autoComplete="new-password"
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            {isSubmitting ? "Creating account..." : "Register Account"}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex flex-col gap-3 border-t border-[var(--border-hairline)] pt-5 sm:flex-row sm:justify-between">
        <p className="text-xs text-[var(--text-secondary)]">Already registered?</p>
        <Button variant="outline" size="sm" asChild>
          <Link href="/teacher/login">
            <LogIn className="h-4 w-4" aria-hidden="true" />
            Back to Login
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
