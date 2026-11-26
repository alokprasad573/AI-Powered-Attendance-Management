"use client";

import type * as Ort from "onnxruntime-web";
import {
  TARGET_BIOMETRIC_CONTRACT,
  validateEmbeddingVector,
} from "@/domain/biometrics";
import type { EnrollmentTemplate } from "../types";
import {
  SFACE_ONNX_TENSOR_SPEC,
  imageDataToOnnxFloat32Tensor,
} from "./alignment";
import { l2Normalize } from "./matcher";

const DEFAULT_ORT_WASM_BASE =
  "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.1/dist/";

const DEFAULT_SFACE_MODEL_URL =
  "https://huggingface.co/opencv/face_recognition_sface/resolve/3d7082438a6e4551e840c9b2bb60b71e8da4b524/face_recognition_sface_2021dec_int8.onnx";

const DEFAULT_SFACE_MODEL_SHA256 =
  "2b0e941e6f16cc048c20aee0c8e31f569118f65d702914540f7bfdc14048d78a";

function toHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let hex = "";
  for (let i = 0; i < bytes.length; i += 1) {
    hex += (bytes[i] ?? 0).toString(16).padStart(2, "0");
  }
  return hex;
}

/**
 * Browser-only ONNX Runtime Web embedder executing the verified Apache-2.0
 * OpenCV Zoo SFace MobileFaceNet graph (`face_recognition_sface_2021dec_int8.onnx`).
 */
export class OnnxFaceEmbedder {
  private ort: typeof Ort | null = null;
  private session: Ort.InferenceSession | null = null;
  private initializing: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.session) {
      return;
    }
    if (this.initializing) {
      return this.initializing;
    }

    this.initializing = (async () => {
      if (typeof window === "undefined") {
        throw new Error("ONNX face embedder can run only in the browser.");
      }

      const ortModule = await import("onnxruntime-web");
      ortModule.env.logLevel = "error";
      const wasmBase =
        process.env.NEXT_PUBLIC_ORT_WASM_BASE_URL?.trim() ||
        DEFAULT_ORT_WASM_BASE;
      ortModule.env.wasm.wasmPaths = wasmBase.endsWith("/")
        ? wasmBase
        : `${wasmBase}/`;
      if (!globalThis.crossOriginIsolated) {
        ortModule.env.wasm.numThreads = 1;
      }

      const customModelUrl = process.env.NEXT_PUBLIC_FACE_EMBEDDING_MODEL_URL?.trim();
      const modelUrl = customModelUrl || DEFAULT_SFACE_MODEL_URL;

      const response = await fetch(modelUrl, {
        mode: "cors",
        cache: "force-cache",
      });
      if (!response.ok) {
        throw new Error(
          `Failed to load face embedding ONNX model (HTTP ${response.status}).`
        );
      }

      const modelBuffer = await response.arrayBuffer();

      // Verify cryptographic integrity for the pinned default upstream artifact
      if (!customModelUrl && globalThis.crypto?.subtle) {
        const digestBuffer = await globalThis.crypto.subtle.digest(
          "SHA-256",
          modelBuffer
        );
        const actualHash = toHex(digestBuffer);
        if (actualHash !== DEFAULT_SFACE_MODEL_SHA256) {
          throw new Error(
            "Face embedding ONNX model integrity verification failed (SHA-256 mismatch)."
          );
        }
      }

      this.session = await ortModule.InferenceSession.create(
        new Uint8Array(modelBuffer),
        {
          executionProviders: ["wasm"],
          logSeverityLevel: 3,
        }
      );
      this.ort = ortModule;
    })();

    try {
      await this.initializing;
    } finally {
      this.initializing = null;
    }
  }

  async extractEmbedding(alignedCrop: ImageData): Promise<EnrollmentTemplate> {
    if (!this.session || !this.ort) {
      await this.initialize();
    }
    if (!this.session || !this.ort) {
      throw new Error("ONNX face embedder failed to initialize.");
    }

    const inputName = this.session.inputNames[0] ?? "data";
    const outputName = this.session.outputNames[0] ?? "fc1";

    const tensorData = imageDataToOnnxFloat32Tensor(
      alignedCrop,
      SFACE_ONNX_TENSOR_SPEC
    );
    const inputTensor = new this.ort.Tensor("float32", tensorData, [
      1,
      3,
      SFACE_ONNX_TENSOR_SPEC.height,
      SFACE_ONNX_TENSOR_SPEC.width,
    ]);

    const outputs = await this.session.run({ [inputName]: inputTensor });
    const outputTensor = outputs[outputName];
    if (!outputTensor) {
      throw new Error("ONNX model returned empty embedding output.");
    }

    const rawVector = Array.from(outputTensor.data as Float32Array);
    const validation = validateEmbeddingVector(
      rawVector,
      TARGET_BIOMETRIC_CONTRACT.expectedDimension
    );
    if (!validation.valid) {
      throw new Error(validation.reason);
    }

    return {
      modelId: TARGET_BIOMETRIC_CONTRACT.modelId,
      modelVersion: TARGET_BIOMETRIC_CONTRACT.modelVersion,
      preprocessingVersion: TARGET_BIOMETRIC_CONTRACT.preprocessingVersion,
      embeddingDimension: TARGET_BIOMETRIC_CONTRACT.expectedDimension,
      vector: l2Normalize(rawVector),
    };
  }

  async dispose(): Promise<void> {
    if (this.session) {
      await this.session.release();
      this.session = null;
    }
    this.ort = null;
    this.initializing = null;
  }
}
