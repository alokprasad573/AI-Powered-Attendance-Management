export function generateTeacherId(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `T${num}`;
}

export function generateStudentId(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `S${num}`;
}

export interface NormalizedSubjectInput {
  code: string;
  name: string;
  section: string;
}

export function normalizeSubjectInput(input: {
  code: string;
  name: string;
  section: string;
}): NormalizedSubjectInput {
  return {
    code: input.code.trim(),
    name: input.name.trim().toLowerCase(),
    section: input.section.trim().toUpperCase(),
  };
}

export function formatDisplayName(rawName: string): string {
  return rawName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function getTimeGreeting(
  hour: number,
  role: "teacher" | "student"
): string {
  if (role === "student") {
    if (hour >= 5 && hour < 12) return "Good Morning, Student";
    if (hour >= 12 && hour < 17) return "Good Afternoon, Student";
    if (hour >= 17 && hour < 20) return "Good Evening, Student";
    if (hour >= 20 && hour < 24) return "Good Night, Student";
    return "Welcome, Back";
  }

  if (role === "teacher") {
    if (hour >= 5 && hour < 12) return "Good Morning";
    if (hour >= 12 && hour < 17) return "Good Afternoon";
    if (hour >= 17 && hour < 20) return "Good Evening";
    if (hour >= 20 && hour < 24) return "Good Night";
    return "Welcome";
  }

  return "";
}

export function getTeacherHonorific(
  rawName: string,
  gender: string
): { displayName: string; honorific: string } {
  const titled = formatDisplayName(rawName);
  if (gender.trim().toLowerCase() === "male") {
    return {
      displayName: `Mr. ${titled}`,
      honorific: "Sir",
    };
  }
  return {
    displayName: `Ms. ${titled}`,
    honorific: "Ma'am",
  };
}
