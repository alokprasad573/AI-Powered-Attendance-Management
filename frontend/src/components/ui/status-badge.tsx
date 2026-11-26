import { CheckCircle2, Edit3, XCircle } from "lucide-react";
import { Badge } from "./badge";

export function AttendanceStatusBadge({
  isPresent,
  isManualOverride = false,
}: {
  isPresent: boolean;
  isManualOverride?: boolean;
}) {
  return (
    <div className="inline-flex flex-wrap items-center gap-1.5">
      {isPresent ? (
        <Badge variant="present">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          Present
        </Badge>
      ) : (
        <Badge variant="absent">
          <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
          Absent
        </Badge>
      )}
      {isManualOverride ? (
        <Badge variant="override">
          <Edit3 className="h-3 w-3" aria-hidden="true" />
          Manual Override
        </Badge>
      ) : null}
    </div>
  );
}
