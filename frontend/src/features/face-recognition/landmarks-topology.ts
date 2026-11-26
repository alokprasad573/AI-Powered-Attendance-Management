/**
 * Canonical MediaPipe FaceLandmarker (468 / 478-point) anatomical contour indices.
 * Used identically for 2D live camera overlay and 3D Platinum Facial Landmark Mesh
 * rendering when real MediaPipe landmarks are active.
 */

export type IndexChain = readonly number[];

/** Closed outer face silhouette contour (36 points) */
export const FACE_OVAL_CHAIN: IndexChain = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379,
  378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127,
  162, 21, 54, 103, 67, 109, 10,
];

/** Left eye contour (viewer's right in unmirrored image) */
export const LEFT_EYE_CHAIN: IndexChain = [
  33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246,
  33,
];

/** Right eye contour */
export const RIGHT_EYE_CHAIN: IndexChain = [
  362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384,
  398, 362,
];

/** Eyebrow ridges */
export const LEFT_EYEBROW_CHAIN: IndexChain = [
  70, 63, 105, 66, 107, 55, 65, 52, 53, 46,
];

export const RIGHT_EYEBROW_CHAIN: IndexChain = [
  300, 293, 334, 296, 336, 285, 295, 282, 283, 276,
];

/** Nose bridge and alar contour */
export const NOSE_BRIDGE_CHAIN: IndexChain = [168, 6, 197, 195, 5, 4, 1, 19, 94, 2];
export const NOSE_BASE_CHAIN: IndexChain = [98, 97, 2, 326, 327];

/** Outer and inner lip contours */
export const LIPS_OUTER_CHAIN: IndexChain = [
  61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84,
  181, 91, 146, 61,
];

export const LIPS_INNER_CHAIN: IndexChain = [
  78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14, 87,
  178, 88, 95, 78,
];

/** Structural facial triangulation ribs connecting major biometric anchor planes */
export const STRUCTURAL_LATTICE_PAIRS: ReadonlyArray<readonly [number, number]> = [
  // Forehead & brow bridge
  [10, 151], [151, 9], [9, 168],
  [10, 105], [10, 334], [151, 107], [151, 336],
  [67, 105], [297, 334], [54, 70], [284, 300],
  // Orbital-to-nose vectors
  [107, 168], [336, 168], [133, 168], [362, 168],
  [133, 6], [362, 6], [33, 70], [263, 300],
  [33, 127], [263, 356], [33, 116], [263, 345],
  // Cheekbone & mid-face geometry
  [116, 123], [345, 352], [123, 234], [352, 454],
  [145, 116], [374, 345], [145, 50], [374, 280],
  [50, 1], [280, 1], [50, 98], [280, 327],
  [123, 50], [352, 280], [50, 205], [280, 425],
  [205, 61], [425, 291], [98, 61], [327, 291],
  [1, 0], [2, 0], [1, 98], [1, 327],
  // Jawline & chin triangulation
  [123, 132], [352, 361], [205, 58], [425, 288],
  [61, 58], [291, 288], [61, 172], [291, 397],
  [61, 150], [291, 379], [17, 152], [17, 148], [17, 377],
  [146, 149], [375, 378], [181, 176], [405, 400],
  [205, 172], [425, 397], [136, 61], [365, 291],
];

/** Highlighted biometric feature anchor landmark indices (eyes, nose, lips, chin, crown) */
export const FEATURE_LANDMARK_INDICES: readonly number[] = [
  10, 151, 9, 168, 6, 1, 2, 0, 17, 152,
  33, 133, 159, 145, 362, 263, 386, 374,
  70, 105, 107, 300, 334, 336,
  98, 327, 61, 291, 50, 280, 123, 352, 234, 454, 172, 397,
];

/** Selective Pale Gold key identity lock landmarks (iris centers / eye corners, nose tip, mouth corners, chin) */
export const GOLD_ANCHOR_INDICES: readonly number[] = [
  1, 61, 291, 152, 168, 468, 473,
];

/** Converts all anatomical contour chains + structural pairs into flat index pairs for fast LineSegments rendering. */
export function buildMediaPipeContourEdges(): ReadonlyArray<readonly [number, number]> {
  const edges: Array<readonly [number, number]> = [];
  const chains: readonly IndexChain[] = [
    FACE_OVAL_CHAIN,
    LEFT_EYE_CHAIN,
    RIGHT_EYE_CHAIN,
    LEFT_EYEBROW_CHAIN,
    RIGHT_EYEBROW_CHAIN,
    NOSE_BRIDGE_CHAIN,
    NOSE_BASE_CHAIN,
    LIPS_OUTER_CHAIN,
    LIPS_INNER_CHAIN,
  ];

  for (const chain of chains) {
    for (let i = 0; i < chain.length - 1; i += 1) {
      const a = chain[i];
      const b = chain[i + 1];
      if (a !== undefined && b !== undefined) {
        edges.push([a, b]);
      }
    }
  }

  for (const pair of STRUCTURAL_LATTICE_PAIRS) {
    edges.push(pair);
  }

  return edges;
}

export const MEDIAPIPE_CONTOUR_EDGES = buildMediaPipeContourEdges();
