import { vec3, vec4 } from "three/tsl";

// Simple noise function for TSL (if three/tsl doesn't have built-in noise)
// This is a simplified version - you might want to use a more sophisticated noise
export function simpleNoise(p: any) {
  // This is a placeholder - you'll need to implement or import actual noise
  // For now, we'll use a procedural approach
  return p.x.mul(12.9898).add(p.y.mul(78.233)).sin().mul(43758.5453).fract();
}
