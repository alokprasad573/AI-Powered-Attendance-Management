"use client";

import { ChevronDown, ChevronUp, Download, Search } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import {
  filterAndSortSessionSummaries,
  type AttendanceSessionSummary,
  type RecordFilterOptions,
} from "@/domain/attendance";

export function AttendanceRecordsClient({
  initialSessions,
}: {
  initialSessions: AttendanceSessionSummary[];
}) {
  const [subjectCode, setSubjectCode] = useState("ALL");
  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] =
    useState<NonNullable<RecordFilterOptions["sortBy"]>>("time_desc");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const availableSubjects = useMemo(() => {
    const map = new Map<string, string>();
    for (const session of initialSessions) {
      map.set(session.subjectCode, session.subjectName);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [initialSessions]);

  const filtered = useMemo(
    () =>
      filterAndSortSessionSummaries(initialSessions, {
        subjectCode,
        query,
        dateFrom,
        dateTo,
        sortBy,
      }),
    [initialSessions, subjectCode, query, dateFrom, dateTo, sortBy]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedSessions = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  const exportParams = new URLSearchParams();
  if (subjectCode !== "ALL") exportParams.set("subjectCode", subjectCode);
  if (query.trim()) exportParams.set("q", query.trim());
  if (dateFrom) exportParams.set("from", dateFrom);
  if (dateTo) exportParams.set("to", dateTo);
  exportParams.set("sortBy", sortBy);
  const exportUrl = `/api/teacher/records/export?${exportParams.toString()}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            Attendance Records
          </h2>
        </div>

        <Button asChild variant="outline">
          <a href={exportUrl}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Export CSV
          </a>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filter &amp; Sort Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <search>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-1.5">
                <Label htmlFor="rec-search">Search Student / Subject</Label>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]"
                    aria-hidden="true"
                  />
                  <Input
                    id="rec-search"
                    type="search"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setPage(1);
                    }}
                    placeholder="S1234, Alice, CS101..."
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rec-subject">Subject</Label>
                <Select
                  value={subjectCode}
                  onValueChange={(value) => {
                    setSubjectCode(value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger id="rec-subject" aria-label="Filter by subject">
                    <SelectValue placeholder="All subjects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Subjects</SelectItem>
                    {availableSubjects.map(([code, name]) => (
                      <SelectItem key={code} value={code}>
                        {code}: {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rec-from">From Date</Label>
                <Input
                  id="rec-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(1);
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rec-to">To Date</Label>
                <Input
                  id="rec-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rec-sort">Sort Order</Label>
                <Select
                  value={sortBy}
                  onValueChange={(value) =>
                    setSortBy(value as NonNullable<RecordFilterOptions["sortBy"]>)
                  }
                >
                  <SelectTrigger id="rec-sort" aria-label="Sort order">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="time_desc">Newest First</SelectItem>
                    <SelectItem value="time_asc">Oldest First</SelectItem>
                    <SelectItem value="subject_asc">Subject Code (A–Z)</SelectItem>
                    <SelectItem value="rate_desc">Highest Attendance %</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </search>
        </CardContent>
      </Card>

      {initialSessions.length === 0 ? (
        <Alert variant="info">No attendance records found.</Alert>
      ) : filtered.length === 0 ? (
        <Alert variant="warning">
          No attendance sessions match the active filters.
        </Alert>
      ) : (
        <div className="space-y-4">
          <Table>
            <caption className="visually-hidden">
              Teacher attendance sessions grouped by timestamp and subject
            </caption>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Subject Code</TableHead>
                <TableHead>Attendance Stats</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead className="text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedSessions.map((session) => {
                const isExpanded = expandedKey === session.sessionKey;
                return (
                  <Fragment key={session.sessionKey}>
                    <TableRow>
                      <TableCell className="telemetry-num text-xs text-[var(--text-secondary)]">
                        {session.formattedTime}
                      </TableCell>
                      <TableCell className="font-medium text-[var(--text-primary)]">
                        {session.subjectName}{" "}
                        <span className="text-xs text-[var(--text-secondary)]">
                          (Sec {session.subjectSection})
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="neural">{session.subjectCode}</Badge>
                      </TableCell>
                      <TableCell className="telemetry-num text-sm">
                        {session.statsLabel}
                      </TableCell>
                      <TableCell className="telemetry-num text-xs font-medium text-[var(--accent-primary)]">
                        {session.attendanceRatePercent.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-expanded={isExpanded}
                          onClick={() =>
                            setExpandedKey(isExpanded ? null : session.sessionKey)
                          }
                        >
                          {isExpanded ? (
                            <>
                              Hide
                              <ChevronUp className="h-4 w-4" aria-hidden="true" />
                            </>
                          ) : (
                            <>
                              Roster ({session.entries.length})
                              <ChevronDown className="h-4 w-4" aria-hidden="true" />
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>

                    {isExpanded ? (
                      <TableRow className="bg-[#090A0B]/92 hover:bg-[#090A0B]/92">
                        <TableCell colSpan={6} className="p-4">
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {session.entries.map((entry) => (
                              <div
                                key={`${session.sessionKey}-${entry.studentId}`}
                                className="glass-row flex items-center justify-between gap-3 rounded-[12px] px-3.5 py-2.5"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                                    {entry.studentName}
                                  </p>
                                  <p className="telemetry-num text-xs text-[var(--text-secondary)]">
                                    {entry.studentId}
                                    {entry.sourcePhotos.length > 0
                                      ? ` • ${entry.sourcePhotos.join(", ")}`
                                      : ""}
                                  </p>
                                </div>
                                <AttendanceStatusBadge
                                  isPresent={entry.isPresent}
                                  isManualOverride={entry.isManualOverride}
                                />
                              </div>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>

          {totalPages > 1 ? (
            <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
              <span className="telemetry-num">
                Page {safePage} of {totalPages} ({filtered.length} sessions)
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
