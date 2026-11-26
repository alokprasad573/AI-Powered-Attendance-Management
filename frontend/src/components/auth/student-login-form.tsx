"use client";

import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  KeyRound,
  LogIn,
  MailCheck,
  RotateCcw,
  ScanFace,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  CameraHud,
  type CapturedFramePayload,
} from "@/components/biometric/camera-hud";
import { RecognitionProgress } from "@/components/biometric/RecognitionProgress";
import type { BiometricInteractionState } from "@/components/biometric/types";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { resolveFaceRecognitionEngine } from "@/features/face-recognition/engine";
import type { FaceRecognitionEngine } from "@/features/face-recognition/types";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

interface StudentLoginFormProps {
  prefillStudentId: string;
  joinCode: string | null;
  initialAuthError?: string | null;
}

export function StudentLoginForm({
  prefillStudentId,
  joinCode,
  initialAuthError = null,
}: StudentLoginFormProps) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState(prefillStudentId);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    initialAuthError === "auth_callback_failed"
      ? "Your email sign-in link expired or was opened in a different browser. Open the link in the same browser where you scanned your face, or sign in again."
      : initialAuthError
        ? "Your email sign-in link expired or could not be verified. Please sign in again."
        : null
  );

  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);

  const engineRef = useRef<FaceRecognitionEngine | null>(null);
  const [faceStatus, setFaceStatus] = useState("Ready for scan");
  const [faceMessage, setFaceMessage] = useState<string | null>(null);
  const [faceError, setFaceError] = useState<string | null>(null);
  const [faceBusy, setFaceBusy] = useState(false);
  const [facePipelineState, setFacePipelineState] =
    useState<BiometricInteractionState>("standby");
  const [faceLandmarksCount, setFaceLandmarksCount] = useState<number | null>(null);
  const [otpChallenge, setOtpChallenge] = useState<{
    studentId: string;
    maskedEmail: string;
    identifierUsed: string;
  } | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [showOtpEntry, setShowOtpEntry] = useState(false);
  const [checkingLinkSession, setCheckingLinkSession] = useState(false);

  const dashboardTarget = joinCode
    ? `/student/dashboard?join-class=${encodeURIComponent(joinCode)}`
    : "/student/dashboard";

  const checkVerifiedEmailLinkSession = useCallback(
    async (notifyIfPending: boolean) => {
      if (notifyIfPending) {
        setCheckingLinkSession(true);
        setFaceError(null);
      }
      try {
        const supabase = createBrowserSupabaseClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          toast.success("Email sign-in verified! Redirecting to your dashboard...");
          router.push(dashboardTarget);
          router.refresh();
          return;
        }
        if (notifyIfPending) {
          setFaceError(
            "Sign-in link hasn't been completed in this browser yet. Open the email we sent and click the Sign-In Link (in this same browser), or enter a 6-digit OTP code below if shown."
          );
        }
      } catch {
        if (notifyIfPending) {
          setFaceError(
            "Could not verify session status right now. Click the Sign-In Link in your email directly."
          );
        }
      } finally {
        if (notifyIfPending) {
          setCheckingLinkSession(false);
        }
      }
    },
    [dashboardTarget, router]
  );

  useEffect(() => {
    if (!otpChallenge) {
      return;
    }

    const handleResumeCheck = () => {
      if (!document.hidden) {
        void checkVerifiedEmailLinkSession(false);
      }
    };

    window.addEventListener("focus", handleResumeCheck);
    document.addEventListener("visibilitychange", handleResumeCheck);
    return () => {
      window.removeEventListener("focus", handleResumeCheck);
      document.removeEventListener("visibilitychange", handleResumeCheck);
    };
  }, [checkVerifiedEmailLinkSession, otpChallenge]);

  useEffect(() => {
    return () => {
      if (engineRef.current) {
        void engineRef.current.dispose();
        engineRef.current = null;
      }
    };
  }, []);

  async function handlePasswordLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    if (!identifier.trim() || !password) {
      setErrorMessage("Please enter both your Student ID (or Email) and password.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/student/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });

      const data = (await response.json()) as { ok: boolean; message: string };
      if (!response.ok || !data.ok) {
        setErrorMessage(data.message || "Student login failed.");
        return;
      }

      toast.success(data.message);
      const target = joinCode
        ? `/student/dashboard?join-class=${encodeURIComponent(joinCode)}`
        : "/student/dashboard";
      router.push(target);
      router.refresh();
    } catch {
      setErrorMessage("Network error while signing in. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleFaceLoginProbe(frame: CapturedFramePayload) {
    setFaceMessage(null);
    setFaceError(null);

    const trimmedIdentifier = identifier.trim();
    if (trimmedIdentifier.length < 3) {
      URL.revokeObjectURL(frame.previewUrl);
      setFaceStatus("Student ID required");
      setFaceError(
        "Please enter your Student ID (e.g. S1234) or registered Email before scanning your face."
      );
      return;
    }

    setFaceBusy(true);
    setFaceLandmarksCount(null);
    setFacePipelineState("camera_initializing");
    setFaceStatus("Initializing biometric models...");
    try {
      if (!engineRef.current) {
        engineRef.current = resolveFaceRecognitionEngine();
        await engineRef.current.initialize();
      }

      setFacePipelineState("analyzing_landmarks");
      setFaceStatus("Detecting face...");
      const detections = await engineRef.current.detectFaces(frame.imageElement);
      if (detections.length === 0) {
        setFacePipelineState("no_face_detected");
        setFaceStatus("Face not found");
        setFaceError("Face not found! Position one face clearly in the frame.");
        return;
      }
      if (detections.length > 1) {
        setFacePipelineState("multiple_faces_detected");
        setFaceStatus("Multiple faces detected");
        setFaceError(
          "More than one face detected! Ensure only your face is visible."
        );
        return;
      }

      const primaryFace = detections[0];
      if (!primaryFace || !primaryFace.qualityOk) {
        setFacePipelineState("recognition_failed");
        setFaceStatus("Low quality frame");
        setFaceError(
          "Face framing or lighting quality was too low. Center your face clearly and try again."
        );
        return;
      }

      setFaceLandmarksCount(primaryFace.landmarksCount ?? null);
      setFacePipelineState("face_detected");
      setFaceStatus("Extracting 128D SFace template...");
      const template =
        await engineRef.current.createEnrollmentTemplate(primaryFace);

      setFacePipelineState("matching_identity");
      setFaceStatus("Verifying identity with server...");
      const res = await fetch("/api/auth/student/face-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: trimmedIdentifier,
          modelId: template.modelId,
          modelVersion: template.modelVersion,
          preprocessingVersion: template.preprocessingVersion,
          embeddingDimension: template.embeddingDimension,
          vector: template.vector,
          ...(joinCode ? { joinCode } : {}),
        }),
      });

      const payload = (await res.json()) as {
        ok: boolean;
        message?: string;
        data?: { studentId: string; maskedEmail: string; otpSent: boolean };
      };

      if (!res.ok || !payload.ok || !payload.data) {
        setFacePipelineState("recognition_failed");
        setFaceStatus("Verification failed");
        setFaceError(
          payload.message ??
          "Face verification failed. Ensure clear lighting or sign in with Credentials."
        );
        return;
      }

      setFacePipelineState("recognition_successful");
      setOtpChallenge({
        studentId: payload.data.studentId,
        maskedEmail: payload.data.maskedEmail,
        identifierUsed: trimmedIdentifier,
      });
      setOtpCode("");
      setShowOtpEntry(false);
      setFaceStatus("Face matched — verification email sent");
      setFaceMessage(
        payload.message ??
        `Face verified! Open the email sent to ${payload.data.maskedEmail} and click the Sign-In Link to continue.`
      );
      toast.success("Face verified! Check your registered email to finish signing in.");
    } catch (err) {
      setFacePipelineState("recognition_failed");
      setFaceStatus("Scan error");
      setFaceError(
        err instanceof Error ? err.message : "Could not process face scan."
      );
    } finally {
      setFaceBusy(false);
      URL.revokeObjectURL(frame.previewUrl);
    }
  }

  async function handleVerifyOtpSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!otpChallenge) return;
    setFaceError(null);

    const cleanedCode = otpCode.trim();
    if (!/^\d{6,10}$/.test(cleanedCode)) {
      setFaceError("Please enter the numeric verification code from your email.");
      return;
    }

    setVerifyingOtp(true);
    try {
      const response = await fetch("/api/auth/student/face-login/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: otpChallenge.identifierUsed,
          token: cleanedCode,
        }),
      });

      const data = (await response.json()) as { ok: boolean; message?: string };
      if (!response.ok || !data.ok) {
        setFaceError(
          data.message ?? "Invalid or expired verification code. Please try again."
        );
        return;
      }

      toast.success(data.message ?? "Signed in successfully!");
      const target = joinCode
        ? `/student/dashboard?join-class=${encodeURIComponent(joinCode)}`
        : "/student/dashboard";
      router.push(target);
      router.refresh();
    } catch {
      setFaceError("Network error while verifying code. Please try again.");
    } finally {
      setVerifyingOtp(false);
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
        body: JSON.stringify({ email: recoveryEmail.trim(), role: "student" }),
      });
      const data = (await response.json()) as { ok: boolean; message: string };
      setRecoveryMessage(data.message);
      if (data.ok) toast.success(data.message);
    } catch {
      setRecoveryMessage("Unable to send recovery email right now.");
    } finally {
      setRecoveryLoading(false);
    }
  }

  const registerHref = joinCode
    ? `/student/register?join-class=${encodeURIComponent(joinCode)}`
    : "/student/register";

  return (
    <Card className="glass-elevated relative overflow-hidden p-1.5">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[#B9D0D8]/50 to-transparent"
      />
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle as="h1" className="text-2xl">Student Login</CardTitle>
          {joinCode ? (
            <Badge variant="present">
              Joining Class: <span className="telemetry-num">{joinCode}</span>
            </Badge>
          ) : null}
        </div>
        <CardDescription>
          {joinCode
            ? `Sign in to enroll in subject ${joinCode}.`
            : "Access your enrolled subjects, attendance metrics, and biometric profile."}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="credentials">
          <TabsList>
            <TabsTrigger value="credentials">
              <LogIn className="h-4 w-4" aria-hidden="true" />
              Credentials
            </TabsTrigger>
            <TabsTrigger value="face-id">
              <ScanFace className="h-4 w-4" aria-hidden="true" />
              FaceID Login
            </TabsTrigger>
          </TabsList>

          <TabsContent value="credentials">
            <form onSubmit={handlePasswordLogin} className="mt-4 space-y-4" noValidate>
              {errorMessage ? (
                <Alert variant="error" aria-live="polite">
                  {errorMessage}
                </Alert>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="student-identifier">Student ID or Email</Label>
                <Input
                  id="student-identifier"
                  name="identifier"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Ex - S1234 or student@school.edu"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="student-password">Password</Label>
                  <Dialog open={recoveryOpen} onOpenChange={setRecoveryOpen}>
                    <DialogTrigger asChild>
                      <button
                        type="button"
                        suppressHydrationWarning
                        className="inline-flex items-center gap-1 text-xs text-[var(--accent-primary)] transition-colors hover:text-[#DCE9EE]"
                      >
                        <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                        Activate legacy / Reset password
                      </button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Student Account Recovery</DialogTitle>
                        <DialogDescription>
                          Enter your registered student email to set or reset a Supabase Auth password.
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleRecoverySubmit} className="mt-4 space-y-4">
                        {recoveryMessage ? (
                          <Alert variant="info">{recoveryMessage}</Alert>
                        ) : null}
                        <div className="space-y-2">
                          <Label htmlFor="stu-recovery-email">Registered Email</Label>
                          <Input
                            id="stu-recovery-email"
                            type="email"
                            value={recoveryEmail}
                            onChange={(e) => setRecoveryEmail(e.target.value)}
                            placeholder="student@example.com"
                            required
                          />
                        </div>
                        <DialogFooter>
                          <Button type="submit" disabled={recoveryLoading}>
                            {recoveryLoading ? "Sending..." : "Send Activation / Reset Link"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="relative">
                  <Input
                    id="student-password"
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
                {isSubmitting ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="face-id" className="mt-4 space-y-4">
            <Alert variant="info">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-primary)]" aria-hidden="true" />
                <div>

                  <p className="font-semibold text-[var(--text-primary)]">
                    Passwordless Face Recognition + Email Verification
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    Enter your Student ID or email and scan your face to verify your identity.
                    Once verified, we’ll send a secure sign-in link to your registered email
                    to help you access your account.
                  </p>

                </div>
              </div>
            </Alert>

            
            {faceError ? (
              <Alert variant="error" aria-live="polite">
                {faceError}
              </Alert>
            ) : null}

            {!otpChallenge ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="face-student-identifier">
                    Student ID or Registered Email
                  </Label>
                  <Input
                    id="face-student-identifier"
                    name="faceIdentifier"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Ex - S1234 or student@school.edu"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    disabled={faceBusy}
                    required
                  />
                </div>

                <CameraHud
                  title="Student FaceID Scanner"
                  statusLabel={faceStatus}
                  onCapture={handleFaceLoginProbe}
                  disabled={faceBusy}
                />

              <RecognitionProgress
              state={facePipelineState}
              landmarksCount={faceLandmarksCount}
            />
              </div>
            ) : (
              <div className="space-y-4 rounded-[16px] border border-[#76C4A4]/30 bg-[#76C4A4]/[0.07] p-5">
                <div className="flex items-start gap-3">
                  <CheckCircle2
                    className="mt-0.5 h-5 w-5 shrink-0 text-[#76C4A4]"
                    aria-hidden="true"
                  />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-[#C8EFE0]">
                      Face Verified ({otpChallenge.studentId}) — Check Your Email
                    </p>
                    <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                      {faceMessage ??
                        `Open the verification email sent to ${otpChallenge.maskedEmail} and click the Sign-In Link to enter your Student Dashboard.`}
                    </p>
                  </div>
                </div>

                <div className="rounded-[12px] border border-[var(--border-hairline)] bg-[#090A0B]/55 p-3.5 text-xs text-[var(--text-secondary)]">
                  <p className="font-medium text-[var(--text-primary)]">
                    How to complete sign-in:
                  </p>
                  <ol className="mt-1.5 list-decimal space-y-1 pl-4">
                    <li>
                      Open your inbox for{" "}
                      <span className="telemetry-num text-[var(--accent-primary)]">
                        {otpChallenge.maskedEmail}
                      </span>
                      .
                    </li>
                    <li>
                      Click the <span className="text-[var(--text-primary)]">Sign-In Link</span>{" "}
                      inside the email (in this same browser) to open your Student Dashboard
                      automatically.
                    </li>
                  </ol>
                </div>

                <div className="flex flex-col gap-2.5 sm:flex-row">
                  <Button
                    type="button"
                    className="flex-1"
                    disabled={checkingLinkSession || verifyingOtp}
                    onClick={() => void checkVerifiedEmailLinkSession(true)}
                  >
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    {checkingLinkSession
                      ? "Checking Session..."
                      : "I Clicked the Sign-In Link"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={verifyingOtp || checkingLinkSession}
                    onClick={() => {
                      setOtpChallenge(null);
                      setOtpCode("");
                      setShowOtpEntry(false);
                      setFaceMessage(null);
                      setFaceError(null);
                      setFaceLandmarksCount(null);
                      setFacePipelineState("standby");
                      setFaceStatus("Ready for scan");
                    }}
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    Scan Again
                  </Button>
                </div>

                <div className="border-t border-[var(--border-hairline)] pt-3">
                  <button
                    type="button"
                    onClick={() => setShowOtpEntry((prev) => !prev)}
                    aria-expanded={showOtpEntry}
                    className="flex w-full items-center justify-between text-xs font-medium text-[var(--accent-primary)] transition-colors hover:text-[#DCE9EE]"
                  >
                    <span>Have a 6-digit OTP code in your email instead?</span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${showOtpEntry ? "rotate-180" : ""}`}
                      aria-hidden="true"
                    />
                  </button>

                  {showOtpEntry ? (
                    <form
                      onSubmit={handleVerifyOtpSubmit}
                      className="mt-3 space-y-3"
                      noValidate
                    >
                      <div className="space-y-2">
                        <Label htmlFor="student-face-otp">
                          Email Verification Code (OTP)
                        </Label>
                        <Input
                          id="student-face-otp"
                          name="otp"
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          value={otpCode}
                          onChange={(e) =>
                            setOtpCode(e.target.value.replace(/\s+/g, ""))
                          }
                          placeholder="Enter 6-digit code from email"
                          maxLength={10}
                          required
                        />
                      </div>
                      <Button
                        type="submit"
                        variant="secondary"
                        className="w-full"
                        disabled={verifyingOtp}
                      >
                        <MailCheck className="h-4 w-4" aria-hidden="true" />
                        {verifyingOtp ? "Verifying Code..." : "Verify OTP & Sign In"}
                      </Button>
                    </form>
                  ) : null}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      <CardFooter className="flex flex-col gap-3 border-t border-[var(--border-hairline)] pt-5 sm:flex-row sm:justify-between">
        <p className="text-xs text-[var(--text-secondary)]">New student?</p>
        <Button variant="secondary" size="sm" asChild>
          <Link href={registerHref}>
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Don&apos;t have an account? Register
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
