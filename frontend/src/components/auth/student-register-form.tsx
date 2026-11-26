"use client";

import { Eye, EyeOff, LogIn, ShieldCheck, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  CameraHud,
  type CapturedFramePayload,
} from "@/components/biometric/camera-hud";
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
import { resolveFaceRecognitionEngine } from "@/features/face-recognition/engine";
import {
  AiCompatibilityGateError,
  type EnrollmentTemplate,
  type FaceRecognitionEngine,
} from "@/features/face-recognition/types";

export function StudentRegisterForm({
  initialStudentId,
  joinCode,
}: {
  initialStudentId: string;
  joinCode: string | null;
}) {
  const router = useRouter();
  const engineRef = useRef<FaceRecognitionEngine | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [age, setAge] = useState("20");
  const [gender, setGender] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [consentAccepted, setConsentAccepted] = useState(false);
  const [faceStatus, setFaceStatus] = useState("Awaiting face capture");
  const [faceConfidence, setFaceConfidence] = useState<number | null>(null);
  const [faceVerified, setFaceVerified] = useState(false);
  const [faceNotice, setFaceNotice] = useState<string | null>(null);
  const [capturedTemplate, setCapturedTemplate] = useState<EnrollmentTemplate | null>(
    null
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (engineRef.current) {
        void engineRef.current.dispose();
        engineRef.current = null;
      }
    };
  }, []);

  async function handleFaceCapture(frame: CapturedFramePayload) {
    setFaceNotice(null);
    setFaceVerified(false);
    setFaceConfidence(null);
    setCapturedTemplate(null);
    setFaceStatus("Detecting face...");

    try {
      if (!engineRef.current) {
        engineRef.current = resolveFaceRecognitionEngine();
        await engineRef.current.initialize();
      }

      const detections = await engineRef.current.detectFaces(frame.imageElement);
      if (detections.length === 0) {
        setFaceStatus("No face detected");
        setFaceNotice("No face detected in the captured image. Please try again.");
        return;
      }
      if (detections.length > 1) {
        setFaceStatus("Multiple faces detected");
        setFaceNotice("Multiple faces detected. Only one student face may appear during registration.");
        return;
      }

      const face = detections[0];
      if (!face || !face.qualityOk) {
        setFaceStatus("Low quality frame");
        setFaceNotice("Face framing or lighting quality was too low. Center your face and retry.");
        return;
      }

      setFaceConfidence(face.detectionConfidence * 100);
      try {
        const template = await engineRef.current.createEnrollmentTemplate(face);
        setCapturedTemplate(template);
        setFaceVerified(true);
        setFaceStatus("Biometric template ready");
      } catch (err) {
        if (err instanceof AiCompatibilityGateError) {
          setFaceStatus("Face detected — template extraction unavailable");
          setFaceNotice(
            "Face detected cleanly via MediaPipe, but biometric extraction is currently unavailable. You may still register your profile and enroll your face later from the student dashboard."
          );
          return;
        }
        throw err;
      }
    } catch (err) {
      setFaceStatus("Detection failed");
      setFaceNotice(
        err instanceof Error ? err.message : "Could not process captured face."
      );
    } finally {
      URL.revokeObjectURL(frame.previewUrl);
    }
  }

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

    const numericAge = Number(age);
    if (!Number.isInteger(numericAge) || numericAge < 5 || numericAge > 100) {
      setErrorMessage("Age must be between 5 and 100.");
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

    if (capturedTemplate && !consentAccepted) {
      setErrorMessage("Please confirm biometric template consent before saving.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/student/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: initialStudentId,
          name: name.trim(),
          email: email.trim(),
          mobileNumber: mobileNumber.trim(),
          age: numericAge,
          gender,
          password,
          confirmPassword,
          ...(capturedTemplate
            ? {
                faceTemplate: {
                  ...capturedTemplate,
                  consentAccepted: true,
                },
              }
            : {}),
        }),
      });

      const data = (await response.json()) as {
        ok: boolean;
        message: string;
        data?: { studentId: string };
      };

      if (!response.ok || !data.ok) {
        setErrorMessage(data.message || "Student registration failed.");
        return;
      }

      toast.success(data.message);
      const assignedId = data.data?.studentId ?? initialStudentId;
      const loginQuery = new URLSearchParams({ id: assignedId });
      if (joinCode) {
        loginQuery.set("join-class", joinCode);
      }
      router.push(`/student/login?${loginQuery.toString()}`);
    } catch {
      setErrorMessage("Network error during registration. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const loginHref = joinCode
    ? `/student/login?join-class=${encodeURIComponent(joinCode)}`
    : "/student/login";

  return (
    <Card className="glass-elevated relative overflow-hidden p-1.5">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[#B9D0D8]/50 to-transparent"
      />
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle as="h1" className="text-2xl">New Student Enrollment</CardTitle>
          <Badge>
            Assigned ID: <span className="telemetry-num">{initialStudentId}</span>
          </Badge>
        </div>
        <CardDescription>
          Register your student profile and capture your face for attendance recognition.
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
            <Label htmlFor="s-name">Student Full Name</Label>
            <Input
              id="s-name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              autoComplete="name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="s-email">Student Email ID</Label>
            <Input
              id="s-email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email id"
              autoComplete="email"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-1">
              <Label htmlFor="s-mobile">Mobile Number</Label>
              <Input
                id="s-mobile"
                name="mobileNumber"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                placeholder="10-digit mobile"
                required
              />
            </div>

            <div className="space-y-2 sm:col-span-1">
              <Label htmlFor="s-age">Age (5–100)</Label>
              <Input
                id="s-age"
                name="age"
                type="number"
                min={5}
                max={100}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2 sm:col-span-1">
              <Label htmlFor="s-gender">Gender</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger id="s-gender" aria-label="Gender">
                  <SelectValue placeholder="Select" />
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
              <Label htmlFor="s-password">Account Password</Label>
              <div className="relative">
                <Input
                  id="s-password"
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
              <Label htmlFor="s-confirm-password">Confirm Password</Label>
              <Input
                id="s-confirm-password"
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

          <div className="glass-row space-y-3 rounded-[16px] p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-[var(--text-primary)]">
                Register Your Face (Browser AI)
              </p>
              <Badge variant={faceVerified ? "present" : "neutral"}>
                {faceVerified ? "Template Ready" : "Browser AI Ready"}
              </Badge>
            </div>

            <CameraHud
              title="Position your face in the center"
              statusLabel={faceStatus}
              confidencePercent={faceConfidence}
              verified={faceVerified}
              onCapture={handleFaceCapture}
            />

            {faceNotice ? (
              <Alert variant="warning" aria-live="polite">
                {faceNotice}
              </Alert>
            ) : null}

            <div className="flex items-start gap-2.5 pt-1">
              <input
                id="biometric-consent"
                type="checkbox"
                suppressHydrationWarning
                checked={consentAccepted}
                onChange={(e) => setConsentAccepted(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-[var(--border-default)] bg-[#060708] accent-[#B9D0D8]"
              />
              <Label htmlFor="biometric-consent" className="text-xs leading-relaxed text-[var(--text-secondary)]">
                <span className="inline-flex items-center gap-1 font-semibold text-[var(--accent-primary)]">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  Biometric Consent:
                </span>{" "}
                I consent to generating and storing a model-versioned mathematical face
                template (never raw photos) solely for attendance verification.
              </Label>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            {isSubmitting ? "Registering..." : "Register"}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex flex-col gap-3 border-t border-[var(--border-hairline)] pt-5 sm:flex-row sm:justify-between">
        <p className="text-xs text-[var(--text-secondary)]">Already have an account?</p>
        <Button variant="outline" size="sm" asChild>
          <Link href={loginHref}>
            <LogIn className="h-4 w-4" aria-hidden="true" />
            Back to Login
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
