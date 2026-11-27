"use client";

import {
  AlertTriangle,
  BookOpen,
  ClipboardCheck,
  ScanFace,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  aggregateMultiPhotoAttendance,
  applyManualOverride,
  buildAttendanceSavePayload,
  type AttendanceAggregationSummary,
  type AttendanceReviewRow,
  type PhotoAnalysisResult,
} from "@/domain/attendance";
import { TARGET_BIOMETRIC_CONTRACT } from "@/domain/biometrics";
import { resolveFaceRecognitionEngine } from "@/features/face-recognition/engine";
import {
  AiCompatibilityGateError,
  type FaceRecognitionEngine,
  type RecognitionGallery,
} from "@/features/face-recognition/types";
import type { TeacherSubjectSummary } from "@/services/subjects.service";
import type { SubjectAttendanceRosterData } from "@/services/attendance.service";
import { AddPhotosDialog, type StagedPhotoItem } from "./add-photos-dialog";
import { AttendanceReviewDialog } from "./attendance-review-dialog";

export function AttendanceWorkflowClient({
  subjects,
}: {
  subjects: TeacherSubjectSummary[];
}) {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [stagedPhotos, setStagedPhotos] = useState<StagedPhotoItem[]>([]);
  const stagedPhotosRef = useRef<StagedPhotoItem[]>([]);
  const engineRef = useRef<FaceRecognitionEngine | null>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<string | null>(null);
  const [workflowWarning, setWorkflowWarning] = useState<string | null>(null);
  const [blk01ManualOffer, setBlk01ManualOffer] =
    useState<SubjectAttendanceRosterData | null>(null);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewSummary, setReviewSummary] =
    useState<AttendanceAggregationSummary | null>(null);
  const [reviewRows, setReviewRows] = useState<AttendanceReviewRow[]>([]);
  const [idempotencyKey, setIdempotencyKey] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    stagedPhotosRef.current = stagedPhotos;
  }, [stagedPhotos]);

  useEffect(() => {
    return () => {
      for (const photo of stagedPhotosRef.current) {
        URL.revokeObjectURL(photo.previewUrl);
      }
      if (engineRef.current) {
        void engineRef.current.dispose();
        engineRef.current = null;
      }
    };
  }, []);

  // FR-TCH-DASH-04: Warn before losing unsaved classroom photos
  useEffect(() => {
    if (stagedPhotos.length === 0 && !reviewOpen) return;
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [stagedPhotos.length, reviewOpen]);

  const selectedSubject = subjects.find(
    (item) => String(item.id) === selectedSubjectId
  );

  function handleAddPhotos(newItems: StagedPhotoItem[]) {
    setWorkflowWarning(null);
    setBlk01ManualOffer(null);
    setStagedPhotos((prev) => [...prev, ...newItems]);
  }

  function handleRemovePhoto(photoId: string) {
    setStagedPhotos((prev) => {
      const target = prev.find((item) => item.id === photoId);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((item) => item.id !== photoId);
    });
  }

  function handleClearAllPhotos() {
    for (const item of stagedPhotos) {
      URL.revokeObjectURL(item.previewUrl);
    }
    setStagedPhotos([]);
    setBlk01ManualOffer(null);
    setWorkflowWarning(null);
  }

  function openReviewFromSummary(summary: AttendanceAggregationSummary) {
    setReviewSummary(summary);
    setReviewRows(summary.rows);
    setIdempotencyKey(crypto.randomUUID());
    setSaveError(null);
    setReviewOpen(true);
  }

  async function handleRunFaceAnalysis() {
    setWorkflowWarning(null);
    setBlk01ManualOffer(null);

    if (!selectedSubject) {
      setWorkflowWarning("Please select a subject first.");
      return;
    }

    if (stagedPhotos.length === 0) {
      setWorkflowWarning("Please add at least one classroom photo first.");
      return;
    }

    setAnalyzing(true);
    setAnalysisProgress("Loading class roster...");

    try {
      const rosterRes = await fetch(
        `/api/teacher/attendance/roster?subjectId=${selectedSubject.id}`,
        { cache: "no-store" }
      );
      const rosterPayload = (await rosterRes.json()) as {
        ok: boolean;
        message?: string;
      } & Partial<SubjectAttendanceRosterData>;

      if (!rosterRes.ok || !rosterPayload.ok || !rosterPayload.roster) {
        setWorkflowWarning(
          rosterPayload.message ?? "Could not load the student list for this subject."
        );
        return;
      }

      if (rosterPayload.roster.length === 0) {
        setWorkflowWarning("No students have joined this subject yet.");
        return;
      }

      const rosterData: SubjectAttendanceRosterData = {
        subject: rosterPayload.subject ?? {
          id: selectedSubject.id,
          code: selectedSubject.code,
          name: selectedSubject.name,
          section: selectedSubject.section,
        },
        roster: rosterPayload.roster,
        galleryTemplates: rosterPayload.galleryTemplates ?? [],
      };

      if (rosterData.galleryTemplates.length === 0) {
        setWorkflowWarning(
          `None of the ${rosterData.roster.length} enrolled students have an active face profile yet. Ask students to set up their face in the Student Portal, or take manual attendance below.`
        );
        setBlk01ManualOffer(rosterData);
        return;
      }

      try {
        if (!engineRef.current) {
          engineRef.current = resolveFaceRecognitionEngine();
          setAnalysisProgress("Getting scanner ready...");
          await engineRef.current.initialize();
        }
      } catch (initErr) {
        const message =
          initErr instanceof Error
            ? initErr.message
            : "The face scanner could not start in your browser.";
        setWorkflowWarning(
          `${message} You can retry online or run a manual roll call across all ${rosterData.roster.length} enrolled students below.`
        );
        setBlk01ManualOffer(rosterData);
        return;
      }

      const gallery: RecognitionGallery = {
        subjectId: selectedSubject.id,
        modelId: TARGET_BIOMETRIC_CONTRACT.modelId,
        modelVersion: TARGET_BIOMETRIC_CONTRACT.modelVersion,
        entries: rosterData.galleryTemplates.map((tpl) => ({
          studentId: tpl.studentId,
          template: {
            modelId: tpl.modelId,
            modelVersion: tpl.modelVersion,
            preprocessingVersion: tpl.preprocessingVersion,
            embeddingDimension: tpl.embeddingDimension,
            vector: tpl.vector,
          },
        })),
      };

      const photoResults: PhotoAnalysisResult[] = [];

      for (let i = 0; i < stagedPhotos.length; i += 1) {
        const photo = stagedPhotos[i];
        if (!photo) continue;
        const photoLabel = `Photo ${i + 1}`;
        setAnalysisProgress(`Scanning ${photoLabel} of ${stagedPhotos.length}...`);

        try {
          const faces = await engineRef.current.detectFaces(photo.imageElement);
          const identifications = await engineRef.current.identifyFaces(
            faces,
            gallery
          );
          photoResults.push({
            photoIndex: i,
            photoLabel,
            totalFacesDetected: faces.length,
            identifications,
            failed: false,
          });
        } catch (err) {
          if (err instanceof AiCompatibilityGateError) {
            setWorkflowWarning(
              `${err.message} You can still run a manual roll call across all ${rosterData.roster.length} enrolled students below.`
            );
            setBlk01ManualOffer(rosterData);
            return;
          }

          photoResults.push({
            photoIndex: i,
            photoLabel,
            totalFacesDetected: 0,
            identifications: [],
            failed: true,
            errorMessage:
              err instanceof Error ? err.message : "Failed to analyze photo.",
          });
        }
      }

      const summary = aggregateMultiPhotoAttendance(rosterData.roster, photoResults);
      openReviewFromSummary(summary);
    } catch (err) {
      setWorkflowWarning(
        err instanceof Error ? err.message : "Unexpected error during attendance analysis."
      );
    } finally {
      setAnalyzing(false);
      setAnalysisProgress(null);
    }
  }

  function handleOpenManualRollCall() {
    if (!blk01ManualOffer) return;
    const summary = aggregateMultiPhotoAttendance(blk01ManualOffer.roster, []);
    openReviewFromSummary(summary);
  }

  function handleDiscardReview() {
    setReviewOpen(false);
    setReviewSummary(null);
    setReviewRows([]);
    setSaveError(null);
    setIdempotencyKey("");
    toast.info("Attendance report discarded. Zero records were saved.");
  }

  async function handleConfirmSave() {
    if (!selectedSubject || reviewRows.length === 0 || saving) return;

    setSaving(true);
    setSaveError(null);
    const payload = buildAttendanceSavePayload(
      selectedSubject.id,
      idempotencyKey,
      stagedPhotos.length,
      reviewRows
    );

    try {
      const response = await fetch("/api/teacher/attendance/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as {
        ok: boolean;
        message?: string;
      };

      if (!response.ok || !data.ok) {
        setSaveError(
          data.message ??
            "Sync failed. Your review state and manual overrides are preserved — retry safely."
        );
        return;
      }

      toast.success(data.message ?? "Attendance taken successfully.");
      setReviewOpen(false);
      setReviewSummary(null);
      setReviewRows([]);
      setIdempotencyKey("");
      handleClearAllPhotos();
    } catch {
      setSaveError(
        "Network timeout while saving attendance. Your review state is preserved — retry without creating duplicates."
      );
    } finally {
      setSaving(false);
    }
  }

  if (subjects.length === 0) {
    return (
      <Alert variant="warning">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-[#EFE8D7]">
              No subjects found. Please create a subject first.
            </p>
            <p className="text-xs text-[var(--text-secondary)]">
              Attendance sessions require at least one teacher-owned subject with enrolled
              students.
            </p>
          </div>
          <Button variant="secondary" asChild>
            <Link href="/teacher/dashboard/subjects">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              Create Subject
            </Link>
          </Button>
        </div>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Take Attendance</CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-12 sm:items-end">
            <div className="space-y-2 sm:col-span-8">
              <Label htmlFor="attendance-subject-select">Select Subject</Label>
              <Select
                value={selectedSubjectId}
                onValueChange={(value) => {
                  setSelectedSubjectId(value);
                  setWorkflowWarning(null);
                  setBlk01ManualOffer(null);
                }}
              >
                <SelectTrigger
                  id="attendance-subject-select"
                  aria-label="Select Subject"
                >
                  <SelectValue placeholder="Select Subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((sub) => (
                    <SelectItem key={sub.id} value={String(sub.id)}>
                      {sub.code}: {sub.name} (Sec {sub.section} • {sub.totalStudents}{" "}
                      students)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end sm:col-span-4">
              <AddPhotosDialog onAddPhotos={handleAddPhotos} />
            </div>
          </div>

          {workflowWarning ? (
            <Alert variant="warning" aria-live="polite">
              <div className="space-y-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle
                    className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-highlight)]"
                    aria-hidden="true"
                  />
                  <p>{workflowWarning}</p>
                </div>
                {blk01ManualOffer ? (
                  <Button
                    type="button"
                    variant="warning"
                    size="sm"
                    onClick={handleOpenManualRollCall}
                  >
                    <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
                    Open Manual Roll Call ({blk01ManualOffer.roster.length} enrolled)
                  </Button>
                ) : null}
              </div>
            </Alert>
          ) : null}

          {stagedPhotos.length > 0 ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display text-lg font-semibold text-[var(--text-primary)]">
                  Added Photos{" "}
                  <Badge className="ml-1 telemetry-num">{stagedPhotos.length}</Badge>
                </h3>
                {analysisProgress ? (
                  <span className="telemetry-num text-xs text-[var(--accent-primary)]">
                    {analysisProgress}
                  </span>
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {stagedPhotos.map((photo, index) => (
                  <div
                    key={photo.id}
                    className="glass-row group relative overflow-hidden rounded-[14px] p-2.5"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden rounded-[10px] bg-[#060708]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.previewUrl}
                        alt={`Classroom snapshot Photo ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        suppressHydrationWarning
                        aria-label={`Remove Photo ${index + 1}`}
                        onClick={() => handleRemovePhoto(photo.id)}
                        disabled={analyzing}
                        className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-default)] bg-[#090A0B]/82 text-[var(--text-primary)] transition-colors hover:border-[#DF848E]/60 hover:bg-[#DF848E] hover:text-[#090A0B]"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between px-1">
                      <span className="telemetry-num text-xs font-medium text-[var(--accent-primary)]">
                        Photo {index + 1}
                      </span>
                      <span className="max-w-[130px] truncate text-[11px] text-[var(--text-secondary)]">
                        {photo.fileName}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClearAllPhotos}
                  disabled={analyzing}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Clear all photos
                </Button>

                <Button
                  type="button"
                  onClick={() => void handleRunFaceAnalysis()}
                  disabled={analyzing}
                >
                  <ScanFace className="h-4 w-4" aria-hidden="true" />
                  {analyzing ? "Scanning Classroom Photos..." : "Scan Classroom Photos"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="glass-row rounded-[14px] p-6 text-center text-sm text-[var(--text-secondary)]">
              No classroom photos staged yet. Click <strong className="text-[var(--text-primary)]">Add Photo</strong>{" "}
              above to capture from camera or upload JPG/PNG snapshots.
            </div>
          )}
        </CardContent>
      </Card>

      <AttendanceReviewDialog
        open={reviewOpen}
        subjectLabel={
          selectedSubject ? `${selectedSubject.code}: ${selectedSubject.name}` : "Subject"
        }
        summary={reviewSummary}
        rows={reviewRows}
        saving={saving}
        saveError={saveError}
        onToggleStudent={(studentId, nextPresent) =>
          setReviewRows((prev) => applyManualOverride(prev, studentId, nextPresent))
        }
        onDiscard={handleDiscardReview}
        onConfirmSave={() => void handleConfirmSave()}
      />
    </div>
  );
}
