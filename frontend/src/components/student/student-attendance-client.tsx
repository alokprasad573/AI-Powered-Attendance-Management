"use client";

import { useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AttendanceStatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { StudentAttendanceHistoryItem } from "@/domain/student-stats";

export function StudentAttendanceHistoryClient({
  history,
}: {
  history: StudentAttendanceHistoryItem[];
}) {
  const [subjectFilter, setSubjectFilter] = useState("ALL");

  const subjects = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of history) {
      map.set(item.subjectCode, item.subjectName);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [history]);

  const filtered = useMemo(() => {
    if (subjectFilter === "ALL") return history;
    return history.filter((item) => item.subjectCode === subjectFilter);
  }, [history, subjectFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            Attendance History
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Complete chronological record of your classroom sessions.
          </p>
        </div>

        <div className="w-full space-y-1.5 sm:w-64">
          <Label htmlFor="stu-history-filter">Filter by Subject</Label>
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger id="stu-history-filter" aria-label="Filter by subject">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Subjects</SelectItem>
              {subjects.map(([code, name]) => (
                <SelectItem key={code} value={code}>
                  {code}: {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {history.length === 0 ? (
        <Alert variant="info">No attendance logs found for your account.</Alert>
      ) : (
        <Table>
          <caption className="visually-hidden">
            Student attendance history table
          </caption>
          <TableHeader>
            <TableRow>
              <TableHead>Date &amp; Time</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="telemetry-num text-xs text-[var(--text-secondary)]">
                  {item.formattedTime}
                </TableCell>
                <TableCell className="font-medium text-[var(--text-primary)]">
                  {item.subjectName}
                </TableCell>
                <TableCell>
                  <Badge variant="neural">{item.subjectCode}</Badge>
                </TableCell>
                <TableCell className="telemetry-num text-xs text-[var(--text-secondary)]">
                  {item.subjectSection}
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
    </div>
  );
}
