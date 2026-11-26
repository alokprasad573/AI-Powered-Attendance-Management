"use client";

/**
 * Soft studio lighting rig calibrated for Monochrome Platinum metallic surfaces
 * on Absolute Black (#090A0B) and Charcoal (#141719) backgrounds.
 */
export function Lighting() {
  return (
    <>
      <ambientLight intensity={0.44} color="#A0A9AC" />
      <hemisphereLight args={["#B9D0D8", "#090A0B", 0.62]} />
      <directionalLight
        position={[3.8, 4.6, 5.2]}
        intensity={1.75}
        color="#F5F6F6"
      />
      <directionalLight
        position={[-4.6, 1.2, 3.4]}
        intensity={1.25}
        color="#B9D0D8"
      />
      <pointLight position={[0.2, -3.2, 2.2]} intensity={0.85} color="#91AAB4" />
      <pointLight position={[2.6, 1.8, -2.4]} intensity={0.62} color="#CDBF9D" />
    </>
  );
}
