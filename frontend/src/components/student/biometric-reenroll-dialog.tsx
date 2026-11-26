"use client";

import { ScanFace, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  CameraHud,
  type CapturedFramePayload,
} from "@/components/biometric/camera-hud";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { StudentBiometricState } from "@/domain/biometrics";
import { resolveFaceRecognitionEngine } from "@/features/face-recognition/engine";
import {
  AiCompatibilityGateError,
  type EnrollmentTemplate,
  type FaceRecognitionEngine,
} from "@/features/face-recognition/types";

export function BiometricReenrollDialog({
  biometricState,
}: {
  biometricState: StudentBiometricState;
}) {
  const router = useRouter();
  const engineRef = useRef<FaceRecognitionEngine | null>(null);

  const [open, setOpen] = useState(false);
  const [consent, setConsent] = useState(false);
  const [statusLabel, setStatusLabel] = useState("Ready to capture");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [verified, setVerified] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [template, setTemplate] = useState<EnrollmentTemplate | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    return () => {
      if (engineRef.current) {
        void engineRef.current.dispose();
        engineRef.current = null;
      }
    };
  }, []);

  async function handleCapture(frame: CapturedFramePayload) {
    setNotice(null);
    setVerified(false);
    setConfidence(null);
    setTemplate(null);
    setStatusLabel("Running MediaPipe face check...");

    try {
      if (!engineRef.current) {
        engineRef.current = resolveFaceRecognitionEngine();
        await engineRef.current.initialize();
      }
      const detections = await engineRef.current.detectFaces(frame.imageElement);
      if (detections.length === 0) {
        setStatusLabel("No face found");
        setNotice("No face detected. Ensure even lighting and try again.");
        return;
      }
      if (detections.length > 1) {
        setStatusLabel("Multiple faces");
        setNotice("Multiple faces detected. Only one face may be present.");
        return;
      }

      const face = detections[0];
      if (!face || !face.qualityOk) {
        setStatusLabel("Low quality");
        setNotice("Face bounding box or confidence is too low.");
        return;
      }

      setConfidence(face.detectionConfidence * 100);
      const created = await engineRef.current.createEnrollmentTemplate(face);
      setTemplate(created);
      setVerified(true);
      setStatusLabel("Template generated");
    } catch (err) {
      if (err instanceof AiCompatibilityGateError) {
        setStatusLabel("BLK-01 gate active");
        setNotice(err.message);
        return;
      }
      setStatusLabel("Capture error");
      setNotice(err instanceof Error ? err.message : "Failed to analyze face.");
    } finally {
      URL.revokeObjectURL(frame.previewUrl);
    }
  }

  async function handleSaveTemplate() {
    if (!template || !consent) return;
    setSaving(true);
    try {
      const response = await fetch("/api/student/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...template, consentAccepted: true }),
      });
      const data = (await response.json()) as { ok: boolean; message: string };
      if (!response.ok || !data.ok) {
        setNotice(data.message || "Failed to save biometric template.");
        return;
      }
      toast.success(data.message);
      setOpen(false);
      router.refresh();
    } catch {
      setNotice("Network error saving template.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={biometricState === "enrolled_v2" ? "outline" : "warning"} size="sm">
          <ScanFace className="h-4 w-4" aria-hidden="true" />
          {biometricState === "enrolled_v2"
            ? "Update Face Template"
            : "Re-Enroll Face (v2 Model)"}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Biometric Face Template Enrollment</DialogTitle>
          <DialogDescription>
            Legacy 128D dlib embeddings are incompatible with the browser AI stack and
            excluded automatically. Capture a fresh v2 template below.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <CameraHud
            title="Student Face Re-Enrollment"
            statusLabel={statusLabel}
            confidencePercent={confidence}
            verified={verified}
            onCapture={handleCapture}
          />

          {notice ? <Alert variant="warning">{notice}</Alert> : null}

          <div className="flex items-start gap-2.5">
            <input
              id="reenroll-consent"
              type="checkbox"
              suppressHydrationWarning
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-[var(--border-default)] bg-[#060708] accent-[#B9D0D8]"
            />
            <Label htmlFor="reenroll-consent" className="text-xs leading-relaxed text-[var(--text-secondary)]">
              <span className="inline-flex items-center gap-1 font-semibold text-[var(--accent-primary)]">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Consent:
              </span>{" "}
              Store only the mathematical model-versioned template vector for attendance.
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
          <Button
            type="button"
            disabled={!template || !consent || saving}
            onClick={() => void handleSaveTemplate()}
          >
            {saving ? "Saving..." : "Save Active Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
