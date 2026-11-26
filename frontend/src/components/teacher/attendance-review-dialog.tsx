"use client";

import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AttendanceStatusBadge } from "@/components/ui/status-badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  AttendanceAggregationSummary,
  AttendanceReviewRow,
} from "@/domain/attendance";

interface AttendanceReviewDialogProps {
  open: boolean;
  subjectLabel: string;
  summary: AttendanceAggregationSummary | null;
  rows: AttendanceReviewRow[];
  saving: boolean;
  saveError: string | null;
  onToggleStudent: (studentId: string, nextPresent: boolean) => void;
  onDiscard: () => void;
  onConfirmSave: () => void;
}

export function AttendanceReviewDialog({
  open,
  subjectLabel,
  summary,
  rows,
  saving,
  saveError,
  onToggleStudent,
  onDiscard,
  onConfirmSave,
}: AttendanceReviewDialogProps) {
  const presentCount = rows.filter((row) => row.isPresent).length;
  const absentCount = rows.length - presentCount;
  const overrideCount = rows.filter((row) => row.isManualOverride).length;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !saving) {
          onDiscard();
        }
      }}
    >
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Attendance Report — {subjectLabel}</DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {/* Metrics Bar */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="glass-row rounded-[14px] p-3.5">
              <p className="text-xs font-medium text-[var(--text-secondary)]">
                Enrolled
              </p>
              <p className="metric-value mt-1 text-2xl font-semibold text-[var(--text-primary)]">
                {rows.length}
              </p>
            </div>
            <div className="glass-row rounded-[14px] p-3.5">
              <p className="text-xs font-medium text-[#ABE4CD]">
                Present
              </p>
              <p className="metric-value mt-1 text-2xl font-semibold text-[#76C4A4]">
                {presentCount}
              </p>
            </div>
            <div className="glass-row rounded-[14px] p-3.5">
              <p className="text-xs font-medium text-[#F3BEC4]">
                Absent
              </p>
              <p className="metric-value mt-1 text-2xl font-semibold text-[#DF848E]">
                {absentCount}
              </p>
            </div>
            <div className="glass-row rounded-[14px] p-3.5">
              <p className="text-xs font-medium text-[#ECE3CE]">
                Manual Overrides
              </p>
              <p className="metric-value mt-1 text-2xl font-semibold text-[var(--accent-highlight)]">
                {overrideCount}
              </p>
            </div>
          </div>

          {summary && summary.failedPhotos.length > 0 ? (
            <Alert variant="warning">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-highlight)]" aria-hidden="true" />
                <div>
                  <p className="font-semibold">
                    {summary.failedPhotos.length} photo(s) failed analysis
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {summary.failedPhotos
                      .map((f) => `${f.photoLabel}: ${f.errorMessage}`)
                      .join(" • ")}{" "}
                    Review manually or discard to re-run failed images.
                  </p>
                </div>
              </div>
            </Alert>
          ) : null}

          {summary &&
          (summary.unknownFaceCount > 0 ||
            summary.ambiguousFaceCount > 0 ||
            summary.lowQualityFaceCount > 0) ? (
            <Alert variant="info">
              Detection diagnostics: {summary.totalFacesDetected} total face(s) scanned •{" "}
              {summary.unknownFaceCount} unknown • {summary.ambiguousFaceCount} ambiguous •{" "}
              {summary.lowQualityFaceCount} low quality (never auto-marked present).
            </Alert>
          ) : null}

          {saveError ? (
            <Alert variant="error" aria-live="polite">
              {saveError}
            </Alert>
          ) : null}

          <Table>
            <caption className="visually-hidden">
              Enrolled student attendance review with manual override controls
            </caption>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Override</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.studentId}>
                  <TableCell className="font-medium text-[var(--text-primary)]">
                    {row.studentName}
                  </TableCell>
                  <TableCell>
                    <Badge variant="neutral" className="telemetry-num">
                      {row.studentId}
                    </Badge>
                  </TableCell>
                  <TableCell className="telemetry-num text-xs text-[var(--text-secondary)]">
                    {row.sourcePhotos.length > 0 ? row.sourcePhotos.join(", ") : "_"}
                  </TableCell>
                  <TableCell>
                    <AttendanceStatusBadge
                      isPresent={row.isPresent}
                      isManualOverride={row.isManualOverride}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-2">
                      <span className="text-xs text-[var(--text-secondary)]">
                        {row.isPresent ? "Present" : "Absent"}
                      </span>
                      <Switch
                        checked={row.isPresent}
                        disabled={saving}
                        aria-label={`Toggle attendance for ${row.studentName} (${row.studentId})`}
                        onCheckedChange={(checked) =>
                          onToggleStudent(row.studentId, checked)
                        }
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <DialogFooter className="gap-3 sm:justify-between">
          <Button
            type="button"
            variant="destructive"
            onClick={onDiscard}
            disabled={saving}
          >
            <XCircle className="h-4 w-4" aria-hidden="true" />
            Discard
          </Button>
          <Button
            type="button"
            onClick={onConfirmSave}
            disabled={saving || rows.length === 0}
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {saving ? "Saving Session..." : "Confirm & Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
