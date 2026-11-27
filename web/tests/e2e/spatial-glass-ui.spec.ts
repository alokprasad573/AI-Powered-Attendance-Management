import { expect, test } from "@playwright/test";

test.describe("Monochrome Platinum Facial Landmark Mesh & Biometric Scanner checks", () => {
  test("renders Monochrome Platinum palette, 3D mesh stage, 4-stage scanner, and portals with zero page errors", async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });

    await page.goto("/");

    // Verify Absolute Black (#090A0B -> rgb(9, 10, 11)) background token
    const bodyBg = await page.evaluate(
      () => window.getComputedStyle(document.body).backgroundColor
    );
    expect(bodyBg).toBe("rgb(9, 10, 11)");

    // Verify global animated fluid canvas mounts across the viewport
    const fluidCanvas = page.getByTestId("fluid-canvas-bg");
    await expect(fluidCanvas).toBeVisible();
    const fluidBox = await fluidCanvas.boundingBox();
    expect(fluidBox?.width ?? 0).toBeGreaterThan(300);
    expect(fluidBox?.height ?? 0).toBeGreaterThan(300);

    // Verify hero, biometric scanner, and portal cards
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("Standby Reference Mesh")).toBeVisible();
    await expect(page.getByText("Live Biometric Face Scanner")).toBeVisible();
    await expect(page.getByRole("button", { name: /Start Scanning/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: "I'm a Student" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "I'm a Teacher" })).toBeVisible();

    // Verify keyboard focus moves to skip link first
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();

    // Verify auth screens render cleanly with semantic <h1> and zero horizontal overflow
    for (const route of [
      "/teacher/login",
      "/teacher/register",
      "/student/login",
      "/student/register",
    ]) {
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth
      );
      expect(overflow, `Unexpected horizontal overflow on ${route}`).toBe(false);
    }

    // Verify Student Login FaceID tab displays 4-stage recognition progress
    await page.goto("/student/login");
    await page.getByRole("tab", { name: /FaceID Login/i }).click();
    await expect(page.getByText("Biometric Pipeline")).toBeVisible();

    expect(pageErrors).toEqual([]);
  });

  test("handles camera permission denial, WebGL fallback, and prefers-reduced-motion cleanly", async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(() => {
      // Simulate WebGL-unavailable environment
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      const patchedGetContext = function patched(
        this: HTMLCanvasElement,
        contextId: string,
        options?: unknown
      ): RenderingContext | null {
        if (contextId === "webgl" || contextId === "webgl2") {
          return null;
        }
        return Reflect.apply(originalGetContext, this, [
          contextId,
          options,
        ]) as RenderingContext | null;
      };
      Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
        configurable: true,
        writable: true,
        value: patchedGetContext,
      });

      // Simulate denied camera permission
      Object.defineProperty(navigator, "mediaDevices", {
        configurable: true,
        value: {
          getUserMedia: () =>
            Promise.reject(new DOMException("Permission denied", "NotAllowedError")),
        },
      });
    });

    await page.goto("/");
    await expect(page.getByText("Standby Reference Mesh")).toBeVisible();

    await page.getByRole("button", { name: /Start Scanning/i }).click();
    await expect(page.getByText("Camera Permission Required")).toBeVisible();

    expect(pageErrors).toEqual([]);
  });
});
