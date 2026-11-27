import { expect, test } from "@playwright/test";

test.describe("Public home, portal navigation, and join-class continuation", () => {
  test("renders Student and Teacher portals cleanly with no horizontal overflow", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: "Student Portal" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Teacher Portal" })).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(overflow).toBe(false);
  });

  test("preserves ?join-class=CS101 across unauthenticated redirect to student login and register", async ({
    page,
  }) => {
    await page.goto("/?join-class=CS101");

    await expect(page).toHaveURL(/\/student\/login\?join-class=CS101/);
    await expect(page.getByText(/Joining Class:/i)).toBeVisible();
    await expect(page.getByText("CS101", { exact: true })).toBeVisible();

    await page
      .getByRole("link", { name: /Don't have an account\? Register/i })
      .click();
    await expect(page).toHaveURL(/\/student\/register\?join-class=CS101/);
  });

  test("handles invalid join-class query safely without redirecting blindly", async ({
    page,
  }) => {
    await page.goto("/?join-class=..%2Fevil");

    await expect(page).toHaveURL(/\?join-class=/);
    await expect(
      page.getByText(/subject join code in the URL was invalid/i)
    ).toBeVisible();
  });
});
