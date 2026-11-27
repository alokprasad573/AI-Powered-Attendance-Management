export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
  "https://haziri-ai.vercel.app";

export const SITE_NAME = "Haziri.AI";
export const SITE_TAGLINE = "AI-Powered Attendance Platform";
export const SITE_TITLE_DEFAULT =
  "Haziri.AI | AI-Powered Attendance Platform";
export const SITE_TITLE_TEMPLATE = "%s | Haziri.AI";

export const SITE_DESCRIPTION =
  "Private, fast classroom attendance that recognizes students directly from your device without storing photos. Invite classes with QR codes and export clean records anytime.";

export const SITE_LOCALE = "en_US";

export const SITE_KEYWORDS = [
  "Haziri.AI",
  "classroom attendance",
  "smart attendance",
  "student check-in",
  "QR class enrollment",
  "private attendance app",
];

export const SITE_ICON_PATH = "/brand/haziri-mark.svg";

export const PUBLIC_ROUTES = {
  home: "/",
  studentLogin: "/student/login",
  studentRegister: "/student/register",
  teacherLogin: "/teacher/login",
  teacherRegister: "/teacher/register",
} as const;

export const DISALLOWED_CRAWL_PATHS = [
  "/api/",
  "/auth/",
  "/student/dashboard/",
  "/teacher/dashboard/",
] as const;
