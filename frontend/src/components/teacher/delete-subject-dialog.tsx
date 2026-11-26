"use client";

import { AlertTriangle, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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

interface DeleteSubjectDialogProps {
  subjectId: number;
  subjectName: string;
  subjectCode: string;
  section: string;
  totalStudents: number;
  totalClasses: number;
  onDeleted: (subjectId: number) => void;
}

export function DeleteSubjectDialog({
  subjectId,
  subjectName,
  subjectCode,
  section,
  totalStudents,
  totalClasses,
  onDeleted,
}: DeleteSubjectDialogProps) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleConfirmDelete() {
    setErrorMessage(null);
    setDeleting(true);
    try {
      const response = await fetch("/api/teacher/subjects", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId }),
      });

      const payload = (await response.json()) as {
        ok: boolean;
        message?: string;
      };

      if (!response.ok || !payload.ok) {
        setErrorMessage(payload.message ?? "Unable to delete subject.");
        return;
      }

      toast.success(
        payload.message ?? `Subject "${subjectName}" (${subjectCode}) deleted.`
      );
      setOpen(false);
      onDeleted(subjectId);
    } catch {
      setErrorMessage("Network error while deleting subject. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!deleting) {
          setErrorMessage(null);
          setOpen(nextOpen);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          aria-label={`Delete subject ${subjectName}`}
          className="shrink-0"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">Delete</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#F5F6F6]">
            <AlertTriangle
              className="h-5 w-5 shrink-0 text-[#DF848E]"
              aria-hidden="true"
            />
            Delete Subject?
          </DialogTitle>
          <DialogDescription>
            This action permanently deletes{" "}
            <span className="font-medium text-[var(--text-primary)]">
              {subjectName}
            </span>{" "}
            (<span className="telemetry-num text-[var(--accent-primary)]">{subjectCode}</span>{" "}
            · Section <span className="telemetry-num">{section}</span>).
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-3">
          {errorMessage ? (
            <Alert variant="error" aria-live="polite">
              {errorMessage}
            </Alert>
          ) : null}

          <Alert variant="warning">
            <p className="font-medium text-[var(--text-primary)]">
              Permanent cascade removal
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
              Deleting this subject will also permanently remove{" "}
              <span className="telemetry-num text-[var(--text-primary)]">
                {totalStudents}
              </span>{" "}
              student {totalStudents === 1 ? "enrollment" : "enrollments"} and{" "}
              <span className="telemetry-num text-[var(--text-primary)]">
                {totalClasses}
              </span>{" "}
              recorded attendance {totalClasses === 1 ? "session" : "sessions"}. This
              cannot be undone.
            </p>
          </Alert>
        </div>

        <DialogFooter className="mt-5">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={deleting}
            onClick={() => void handleConfirmDelete()}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            {deleting ? "Deleting..." : "Delete Subject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
