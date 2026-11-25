---
name: face-recognition-pipeline
description: Designs and validates face-recognition workflows including preprocessing, embeddings, 1:N matching, threshold calibration, unknown-face rejection, and human review for Haziri.AI.
---

# Face Recognition Pipeline

## When to use

Use for student face enrollment, embedding generation, gallery matching, multi-face identification, threshold selection, and attendance recognition.

## Mandatory first step: compatibility proof

Do not implement the complete production pipeline until a reproducible proof of concept verifies:
- Exact FaceNet/ArcFace model and version, runtime, artifact source, and license.
- Input color space, image sizing, face crop, alignment, normalization, and landmark requirements.
- Embedding dimension, dtype, normalization, and model-specific distance/similarity metric.
- FaceX's documented input/output contract and whether it can consume the chosen embeddings.
- Browser support, model download size, cold-start time, inference latency, and memory.
- 1:1 verification and 1:N identification behavior on consented representative data.

If FaceX and the embedding model are incompatible, stop and report the evidence. Do not silently substitute FaceX, invent a custom KNN matcher, or compare embeddings from different model families.

## Pipeline stages

1. **Capture:** Request camera/image access only after user action; handle permission denial and device changes.
2. **Detection:** Detect faces and reject unusable frames (too small, occluded, blurred, or out of bounds).
3. **Landmarking/alignment:** Use the verified landmark and alignment contract.
4. **Embedding:** Run the exact approved model and validate output shape, finite values, and normalization.
5. **Matching:** Use the model-compatible metric and calibrated threshold. Separate candidate ranking from acceptance.
6. **Decision:** Accept only sufficiently strong, unambiguous matches. Unknown or ambiguous faces must go to manual review.
7. **Attendance review:** Preserve source-photo attribution, allow Present/Absent correction, and require explicit confirmation before persistence.
8. **Persistence:** Send only the minimum required decision data to the server; server-side authorization and integrity checks remain mandatory.

## Quality and calibration

- Never describe cosine similarity or distance as a probability unless separately calibrated.
- Measure false accept and false reject rates on a representative, consented validation set.
- Evaluate lighting, pose, camera quality, occlusion, demographic performance, and device variation.
- Set thresholds based on measured risk, not arbitrary internet examples.
- Record model version and preprocessing version with enrollment and inference metadata.

## Privacy and reliability

- Minimize raw image and embedding retention.
- Do not log or commit biometric samples.
- Define consent, purpose limitation, retention, deletion, and access controls before persistence.
- Handle no-face, multiple-face, duplicate-face, unknown-face, low-quality, timeout, and model-load failures explicitly.
- Always provide a human correction/review path.

## Deliverables

Produce a reproducible compatibility report, model contract, benchmark, calibrated evaluation results, failure-mode matrix, and typed adapter interface before declaring the pipeline production-ready.
