"use client";

import { Calendar, CheckCircle2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { RecognitionStats } from "@/components/dashboard/RecognitionStats";
import { SubjectCard } from "@/components/subjects/subject-card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { StudentBiometricState } from "@/domain/biometrics";
import type {
  StudentAttendanceHistoryItem,
  StudentSubjectStatsCard,
} from "@/domain/student-stats";
import { AttendanceStatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AutoEnrollDialog } from "./auto-enroll-dialog";
import { BiometricReenrollDialog } from "./biometric-reenroll-dialog";
import { EnrollSubjectDialog } from "./enroll-subject-dialog";

export function StudentDashboardClient({
  subjects,
  history,
  biometricState,
  joinCode,
  showRecentHistory = true,
}: {
  subjects: StudentSubjectStatsCard[];
  history: StudentAttendanceHistoryItem[];
  biometricState: StudentBiometricState;
  joinCode: string | null;
  showRecentHistory?: boolean;
}) {
  const router = useRouter();
  const [confirmUnenroll, setConfirmUnenroll] =
    useState<StudentSubjectStatsCard | null>(null);
  const [unenrolling, setUnenrolling] = useState(false);

  async function handleConfirmUnenroll() {
    if (!confirmUnenroll) return;
    setUnenrolling(true);
    try {
      const response = await fetch("/api/student/unenroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId: confirmUnenroll.subjectId }),
      });
      const data = (await response.json()) as { ok: boolean; message: string };
      if (!response.ok || !data.ok) {
        toast.error(data.message || "Unable to unenroll.");
        return;
      }
      toast.success(data.message);
      setConfirmUnenroll(null);
      router.refresh();
    } catch {
      toast.error("Network error while unenrolling.");
    } finally {
      setUnenrolling(false);
    }
  }

  const totalClasses = subjects.reduce((sum, s) => sum + s.total, 0);
  const totalAttended = subjects.reduce((sum, s) => sum + s.attended, 0);
  const overallRate =
    totalClasses > 0 ? `${((totalAttended / totalClasses) * 100).toFixed(1)}%` : "—";

  return (
    <div className="space-y-8">
      <AutoEnrollDialog joinCode={joinCode} onCompleted={() => router.refresh()} />

      {showRecentHistory ? (
        <RecognitionStats
          items={[
            {
              label: "Enrolled Subjects",
              value: subjects.length,
              detail: "Active course memberships",
              accent: "platinum",
            },
            {
              label: "Classes Attended",
              value: totalAttended,
              detail: `Of ${totalClasses} recorded sessions`,
              accent: "silver",
            },
            {
              label: "Attendance Rate",
              value: overallRate,
              detail: "Aggregate across subjects",
              accent: "gold",
            },
            {
              label: "Biometric Template",
              value:
                biometricState === "enrolled_v2"
                  ? "Active"
                  : biometricState === "legacy_dlib_needs_reenroll"
                  ? "Legacy"
                  : "Pending",
              detail:
                biometricState === "enrolled_v2"
                  ? "Ready to Use"
                  : "Action required for recognition",
              accent: biometricState === "enrolled_v2" ? "present" : "gold",
            },
          ]}
        />
      ) : null}

      {biometricState !== "enrolled_v2" ? (
        <Alert variant="warning">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-[#EFE8D7]">
                {biometricState === "legacy_dlib_needs_reenroll"
                  ? "Legacy Face Descriptor Detected — Re-Enrollment Required"
                  : "Face Template Not Yet Enrolled"}
              </p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                {biometricState === "legacy_dlib_needs_reenroll"
                  ? "Your existing 128D dlib embedding is preserved for historical compatibility and cannot be compared with the browser SFace v2 model. Enroll your updated template to enable classroom recognition."
                  : "Capture your versioned face template so teachers can recognize you in classroom attendance sessions."}
              </p>
            </div>
            <BiometricReenrollDialog biometricState={biometricState} />
          </div>
        </Alert>
      ) : null}

      {/* Enrolled Subjects Section */}
      <section aria-label="Enrolled Subjects" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
              Enrolled Subjects
            </h2>
          </div>

          <EnrollSubjectDialog onEnrolled={() => router.refresh()} />
        </div>

        {subjects.length === 0 ? (
          <Alert variant="info">
            You are not enrolled in any subjects yet. Enter a subject code above or scan
            your teacher&apos;s QR join link.
          </Alert>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {subjects.map((sub) => (
              <SubjectCard
                key={sub.subjectId}
                name={sub.name}
                code={sub.code}
                section={sub.section}
                stats={[
                  {
                    icon: <Calendar className="h-4 w-4" />,
                    label: "Total",
                    value: sub.total,
                  },
                  {
                    icon: <CheckCircle2 className="h-4 w-4" />,
                    label: "Attended",
                    value: sub.attended,
                  },
                  {
                    icon: <span className="font-mono text-xs">%</span>,
                    label: "Rate",
                    value: `${sub.attendancePercent.toFixed(1)}%`,
                  },
                ]}
                footer={
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="w-full"
                    onClick={() => setConfirmUnenroll(sub)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Unenroll from this subject
                  </Button>
                }
              />
            ))}
          </div>
        )}
      </section>

      {/* Recent Attendance History (Overview only) */}
      {showRecentHistory ? (
        <section aria-label="Recent Attendance History" className="space-y-4">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
              Recent Attendance History
            </h2>
          </div>

          {history.length === 0 ? (
            <Alert variant="info">No attendance logs recorded yet.</Alert>
          ) : (
            <Table>
              <caption className="visually-hidden">
                Student attendance history across enrolled subjects
              </caption>
              <TableHeader>
                <TableRow>
                  <TableHead>Date &amp; Time</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.slice(0, 20).map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="telemetry-num text-xs text-[var(--text-secondary)]">
                      {item.formattedTime}
                    </TableCell>
                    <TableCell className="font-medium text-[var(--text-primary)]">
                      {item.subjectName}{" "}
                      <span className="text-xs text-[var(--text-secondary)]">
                        (Sec {item.subjectSection})
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="neural">{item.subjectCode}</Badge>
                    </TableCell>
                    <TableCell>
                      <AttendanceStatusBadge
                        isPresent={item.isPresent}
                        isManualOverride={item.isManualOverride}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>
      ) : null}

      <Dialog
        open={Boolean(confirmUnenroll)}
        onOpenChange={(open) => {
          if (!open) setConfirmUnenroll(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Unenrollment</DialogTitle>
            <DialogDescription>
              Are you sure you want to unenroll from{" "}
              <strong className="text-[var(--text-primary)]">{confirmUnenroll?.name}</strong> (
              {confirmUnenroll?.code})? Historical attendance logs remain preserved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmUnenroll(null)}
              disabled={unenrolling}
              autoFocus
            >
              Keep Enrollment
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleConfirmUnenroll()}
              disabled={unenrolling}
            >
              {unenrolling ? "Removing..." : "Confirm Unenroll"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
