"use client";

import { Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function EnrollSubjectDialog({
  onEnrolled,
}: {
  onEnrolled: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    if (!code.trim()) {
      setErrorMessage("Please enter a subject code.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/student/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });

      const payload = (await response.json()) as {
        ok: boolean;
        message: string;
        data?: { alreadyEnrolled: boolean };
      };

      if (!response.ok || !payload.ok) {
        setErrorMessage(payload.message || "Unable to enroll.");
        return;
      }

      if (payload.data?.alreadyEnrolled) {
        toast.info(payload.message);
      } else {
        toast.success(payload.message);
      }
      setCode("");
      setOpen(false);
      onEnrolled();
    } catch {
      setErrorMessage("Network error while enrolling in subject.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Enroll in subject
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enroll in Subject</DialogTitle>
          <DialogDescription>
            Enter the subject join code shared by your teacher (e.g. CS101).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
          {errorMessage ? (
            <Alert variant="error" aria-live="polite">
              {errorMessage}
            </Alert>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="enroll-code">Subject Code</Label>
            <Input
              id="enroll-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter the Subject Code. Eg. CS101"
              autoCapitalize="characters"
              spellCheck={false}
              required
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Enrolling..." : "Enroll Now"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
