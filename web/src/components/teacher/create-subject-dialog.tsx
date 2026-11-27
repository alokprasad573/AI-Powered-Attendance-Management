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
import type { TeacherSubjectSummary } from "@/services/subjects.service";

export function CreateSubjectDialog({
  onCreated,
}: {
  onCreated: (subject: TeacherSubjectSummary) => void;
}) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [section, setSection] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    if (!code.trim() || !name.trim() || !section.trim()) {
      setErrorMessage("Please fill in all the required fields.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/teacher/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim(),
          name: name.trim(),
          section: section.trim(),
        }),
      });

      const payload = (await response.json()) as {
        ok: boolean;
        message: string;
        data?: TeacherSubjectSummary;
      };

      if (!response.ok || !payload.ok || !payload.data) {
        setErrorMessage(payload.message || "Could not create subject.");
        return;
      }

      toast.success(payload.message);
      onCreated(payload.data);
      setCode("");
      setName("");
      setSection("");
      setOpen(false);
    } catch {
      setErrorMessage("Network error while creating subject.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Create New Subject
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Subject</DialogTitle>
          <DialogDescription>
            Enter the details of the new subject. 
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
          {errorMessage ? (
            <Alert variant="error" aria-live="polite">
              {errorMessage}
            </Alert>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="sub-code">Subject Code</Label>
            <Input
              id="sub-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="CS101"
              autoCapitalize="characters"
              spellCheck={false}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sub-name">Subject Name</Label>
            <Input
              id="sub-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Introduction to AI"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sub-section">Subject Section</Label>
            <Input
              id="sub-section"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              placeholder="A"
              autoCapitalize="characters"
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
              <Plus className="h-4 w-4" aria-hidden="true" />
              {loading ? "Creating..." : "Create Subject Now"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
