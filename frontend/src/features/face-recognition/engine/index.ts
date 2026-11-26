"use client";

import type { FaceRecognitionEngine } from "../types";
import { ProductionFaceRecognitionEngine } from "./production-adapter";

declare global {
  interface Window {
    __HAZIRI_TEST_RECOGNITION_ENGINE__?: FaceRecognitionEngine;
  }
}

export function resolveFaceRecognitionEngine(
  injectedEngine?: FaceRecognitionEngine
): FaceRecognitionEngine {
  if (injectedEngine) {
    return injectedEngine;
  }

  if (
    typeof window !== "undefined" &&
    process.env.NEXT_PUBLIC_ENABLE_TEST_AI_HOOK === "true" &&
    window.__HAZIRI_TEST_RECOGNITION_ENGINE__
  ) {
    return window.__HAZIRI_TEST_RECOGNITION_ENGINE__;
  }

  return new ProductionFaceRecognitionEngine();
}
