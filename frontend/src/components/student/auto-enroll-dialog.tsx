"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface LookupPayload {
  codeSearched: string;
  ok: boolean;
  message?: string;
  subject?: {
    id: number;
    code: string;
    name: string;
    section: string;
  };
  alreadyEnrolled?: boolean;
}

export function AutoEnrollDialog({
  joinCode,
  onCompleted,
}: {
  joinCode: string | null;
  onCompleted: () => void;
}) {
  const router = useRouter();
  const [dismissedCode, setDismissedCode] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lookup, setLookup] = useState<LookupPayload | null>(null);

  useEffect(() => {
    if (!joinCode) return;

    let active = true;
    fetch(`/api/student/lookup?code=${encodeURIComponent(joinCode)}`)
      .then(async (res) => (await res.json()) as Omit<LookupPayload, "codeSearched">)
      .then((data) => {
        if (active) {
          setLookup({ ...data, codeSearched: joinCode });
        }
      })
      .catch(() => {
        if (active) {
          setLookup({
            codeSearched: joinCode,
            ok: false,
            message: "Could not verify subject link.",
          });
        }
      });

    return () => {
      active = false;
    };
  }, [joinCode]);

  const open = Boolean(joinCode) && dismissedCode !== joinCode;
  const loading = Boolean(joinCode) && lookup?.codeSearched !== joinCode;

  function dismissAndClearParam() {
    if (joinCode) {
      setDismissedCode(joinCode);
    }
    router.replace("/student/dashboard");
  }

  async function handleConfirmEnroll() {
    if (!joinCode) return;
    setSubmitting(true);
    try {
      const response = await fetch("/api/student/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: joinCode }),
      });
      const data = (await response.json()) as { ok: boolean; message: string };
      if (!response.ok || !data.ok) {
        toast.error(data.message || "Enrollment failed.");
        return;
      }
      toast.success(data.message);
      dismissAndClearParam();
      onCompleted();
    } catch {
      toast.error("Network error while enrolling.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!joinCode) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) dismissAndClearParam();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Auto Enrolling</DialogTitle>
          <DialogDescription>
            Shared class invitation for code{" "}
            <span className="telemetry-num text-[var(--accent-primary)]">{joinCode}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {loading ? (
            <p className="text-sm text-[var(--text-secondary)]">Checking subject details...</p>
          ) : !lookup?.ok || !lookup.subject ? (
            <Alert variant="error">
              {lookup?.message ?? "Subject not found"}
            </Alert>
          ) : lookup.alreadyEnrolled ? (
            <Alert variant="info">
              You are already enrolled in{" "}
              <strong className="text-[var(--text-primary)]">{lookup.subject.name}</strong> (
              {lookup.subject.code}).
            </Alert>
          ) : (
            <div className="glass-row space-y-2 rounded-[14px] p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="neural">{lookup.subject.code}</Badge>
                <Badge variant="neutral">Section {lookup.subject.section}</Badge>
              </div>
              <p className="text-sm text-[var(--text-secondary)]">
                Would you like to enroll in{" "}
                <strong className="text-[var(--text-primary)]">{lookup.subject.name}</strong>?
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          {!loading && lookup?.ok && lookup.subject && !lookup.alreadyEnrolled ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={dismissAndClearParam}
                disabled={submitting}
              >
                No thanks
              </Button>
              <Button
                type="button"
                onClick={() => void handleConfirmEnroll()}
                disabled={submitting}
              >
                {submitting ? "Enrolling..." : "Yes enroll now!"}
              </Button>
            </>
          ) : (
            <Button type="button" onClick={dismissAndClearParam}>
              Got it
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
