import { expect, test } from "@playwright/test";

test.describe("Protected route boundaries", () => {
  test("redirects unauthenticated visitors away from teacher dashboard routes", async ({
    page,
  }) => {
    for (const path of [
      "/teacher/dashboard",
      "/teacher/dashboard/subjects",
      "/teacher/dashboard/attendance",
      "/teacher/dashboard/records",
    ]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/teacher\/login/);
    }
  });

  test("redirects unauthenticated student dashboard access and keeps join-class query", async ({
    page,
  }) => {
    await page.goto("/student/dashboard?join-class=CS202");
    await expect(page).toHaveURL(/\/student\/login\?join-class=CS202/);
  });

  test("returns 401 JSON for unauthenticated API calls", async ({ request }) => {
    const teacherRes = await request.get("/api/teacher/subjects");
    expect(teacherRes.status()).toBe(401);

    const studentRes = await request.get("/api/student/subjects");
    expect(studentRes.status()).toBe(401);

    const saveRes = await request.post("/api/teacher/attendance/save", {
      data: {},
    });
    expect(saveRes.status()).toBe(401);
  });
});
