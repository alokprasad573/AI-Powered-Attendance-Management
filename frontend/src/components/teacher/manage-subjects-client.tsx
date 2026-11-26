"use client";

import { Clock, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SubjectCard } from "@/components/subjects/subject-card";
import { Alert } from "@/components/ui/alert";
import type { TeacherSubjectSummary } from "@/services/subjects.service";
import { CreateSubjectDialog } from "./create-subject-dialog";
import { DeleteSubjectDialog } from "./delete-subject-dialog";
import { ShareSubjectQrDialog } from "./share-subject-qr-dialog";

export function ManageSubjectsClient({
  initialSubjects,
}: {
  initialSubjects: TeacherSubjectSummary[];
}) {
  const router = useRouter();
  const [subjects, setSubjects] =
    useState<TeacherSubjectSummary[]>(initialSubjects);

  function handleCreated(newSubject: TeacherSubjectSummary) {
    setSubjects((prev) => [newSubject, ...prev]);
    router.refresh();
  }

  function handleDeleted(deletedSubjectId: number) {
    setSubjects((prev) => prev.filter((item) => item.id !== deletedSubjectId));
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            Manage Subjects
          </h2>
        </div>

        <CreateSubjectDialog onCreated={handleCreated} />
      </div>

      {subjects.length === 0 ? (
        <Alert variant="info">
          NO SUBJECTS FOUND. CREATE ONE ABOVE
        </Alert>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {subjects.map((sub) => (
            <SubjectCard
              key={sub.id}
              code={sub.code}
              name={sub.name}
              section={sub.section}
              stats={[
                {
                  icon: <Users className="h-4 w-4" />,
                  label: "Students",
                  value: sub.totalStudents,
                },
                {
                  icon: <Clock className="h-4 w-4" />,
                  label: "Classes",
                  value: sub.totalClasses,
                },
              ]}
              footer={
                <div className="flex w-full items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <ShareSubjectQrDialog
                      subjectName={sub.name}
                      subjectCode={sub.code}
                    />
                  </div>
                  <DeleteSubjectDialog
                    subjectId={sub.id}
                    subjectName={sub.name}
                    subjectCode={sub.code}
                    section={sub.section}
                    totalStudents={sub.totalStudents}
                    totalClasses={sub.totalClasses}
                    onDeleted={handleDeleted}
                  />
                </div>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
