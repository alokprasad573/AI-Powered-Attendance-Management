---
name: mediapipe-face-landmarker
description: Integrates MediaPipe Face Detector and Face Landmarker in browser environments with lifecycle cleanup, typed results, and performance safeguards for Haziri.AI.
---

# MediaPipe Face Detector and Face Landmarker

## When to use

Use when implementing browser-based face detection, facial landmarks, face alignment inputs, camera processing, or MediaPipe runtime integration.

## Procedure

1. Verify the current official MediaPipe Tasks Vision package, API, model asset, license, and browser support. Pin versions; do not rely on stale snippets.
2. Load WASM assets and model files from a controlled, versioned source. Handle offline, blocked, and failed downloads.
3. Initialize detector/landmarker lazily on the client; never import browser-only APIs into Server Components.
4. Define explicit interfaces for image/video input, timestamps, detections, landmarks, and errors.
5. Use a Web Worker or supported GPU/WASM delegate when it demonstrably improves responsiveness; avoid blocking the main thread.
6. Throttle video inference to a measured frame rate and prevent overlapping inference calls.
7. Track camera stream, video element, task instance, worker, animation frame, and GPU resources; release all resources on stop/unmount.
8. Handle camera permission denial, no camera, device switch, tab backgrounding, no face, multiple faces, and malformed input.
9. Keep inference results separate from identity matching; MediaPipe landmarks do not identify a student.
10. Benchmark target browsers and low-end devices.

## Haziri.AI constraints

- MediaPipe output is an input to a separately validated embedding/matching pipeline; it is not itself FaceNet/ArcFace.
- Keep preprocessing consistent with the selected embedding model.
- Do not persist camera frames or landmarks unless an approved requirement exists.
- Never infer identity solely from face bounding boxes or landmarks.

## Verification

Test initialization failures, repeated start/stop, component unmount, device changes, zero/multiple detections, worker failure, and performance under sustained camera use. Document browser/runtime/model versions and measured latency.
