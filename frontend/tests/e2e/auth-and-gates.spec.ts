import { expect, test } from "@playwright/test";

test.describe("Auth validation and Option 1 face-login guard", () => {
  test("validates teacher registration constraints in browser", async ({ page }) => {
    await page.goto("/teacher/register");

    await expect(page.getByText(/Assigned ID:/i)).toBeVisible();
    await page.getByRole("button", { name: /Register Account/i }).click();
    await expect(
      page.getByText(/Please fill in all the required fields\./i)
    ).toBeVisible();

    await page.getByLabel("Full Name").fill("Alan Turing");
    await page.getByLabel("Email Address").fill("alan@example.com");
    await page.getByLabel("Mobile Number").fill("12345");
    await page.getByLabel("Gender").click();
    await page.getByRole("option", { name: "Male", exact: true }).click();
    await page.getByLabel("Password", { exact: true }).fill("secret123");
    await page.getByLabel("Confirm Password").fill("secret123");

    await page.getByRole("button", { name: /Register Account/i }).click();
    await expect(
      page.getByText(/Mobile number must be 10 digits long\./i)
    ).toBeVisible();
  });

  test("rejects spoofed client-only face-login claims lacking a valid 128D SFace vector", async ({
    request,
  }) => {
    const response = await request.post("/api/auth/student/face-login", {
      data: { student_id: "S1001", faceDetected: true },
    });
    expect(response.status()).toBe(400);
    const body = (await response.json()) as { ok: boolean; code: string };
    expect(body.ok).toBe(false);
    expect(body.code).toBe("VALIDATION_ERROR");

    const otpResponse = await request.post(
      "/api/auth/student/face-login/verify-otp",
      {
        data: { identifier: "S1001", token: "bad" },
      }
    );
    expect(otpResponse.status()).toBe(400);
  });
});
