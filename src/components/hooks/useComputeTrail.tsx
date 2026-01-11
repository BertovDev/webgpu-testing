// hooks/useComputeTrail.tsx
import { useRef, useCallback, useMemo } from "react";
import { Texture, DataTexture } from "three/webgpu";
import { useThree } from "@react-three/fiber";
import { WebGPURenderer } from "three/webgpu";
import { 
  Fn, 
  instancedArray, 
  instanceIndex, 
  wgslFn, 
  vec2, 
  vec4, 
  float,
  uniform 
} from "three/tsl";

interface MousePosition {
  x: number;
  y: number;
}

interface UseTrailComputeReturn {
  update: (mouse: MousePosition) => void;
  getTexture: () => Texture | null;
}

export function useTrailCompute(
  width: number = 512,
  height: number = 256,
  fadeAmount: number = 0.005,
  circleRadius: number = 30
): UseTrailComputeReturn {
  const { gl } = useThree<{ gl: WebGPURenderer }>();
  const textureRef = useRef<Texture | null>(null);
  const computeNodeRef = useRef<any>(null);
  
  // Use uniforms for dynamic values
  const uMousePos = uniform(vec2(0, 0), "vec2");
  const uFadeAmount = uniform(float(fadeAmount), "float");
  const uRadius = uniform(float(circleRadius), "float");

  // Create storage texture data
  const computeNode = useMemo(() => {
    // Create initial texture data (black)
    const data = new Float32Array(width * height * 4);
    data.fill(0); // Initialize to black

    // Create DataTexture
    const tex = new DataTexture(data as any, width, height);
    tex.format = 1023; // RGBAFormat
    tex.type = 1015; // FloatType
    tex.needsUpdate = true;
    textureRef.current = tex;

    // Create storage array for texture data
    const textureData = instancedArray(data, "vec4");

    // WGSL function for computing trail
    const computeTrailWgsl = wgslFn(`
      fn computeTrail(
        textureData: ptr<storage, array<vec4<f32>>, read_write>,
        mousePos: vec2<f32>,
        fadeAmount: f32,
        radius: f32,
        width: u32,
        height: u32,
        index: u32
      ) -> void {
        let x = index % width;
        let y = index / width;
        let uv = vec2<f32>(f32(x) / f32(width), f32(y) / f32(height));
        
        // Get current pixel value
        let current = textureData[index];
        
        // Apply fade
        let faded = current * (1.0 - fadeAmount);
        
        // Calculate distance from mouse position
        var mouseUV = (mousePos + vec2<f32>(1.0)) * 0.5;
        mouseUV.y = 1.0 - mouseUV.y; // Flip Y
        let dist = distance(uv, mouseUV) * vec2<f32>(f32(width), f32(height));
        
        // Draw circle at mouse position
        let circle = 1.0 - smoothstep(0.0, radius / f32(width), length(dist));
        let newValue = max(faded.r, circle);
        
        textureData[index] = vec4<f32>(newValue, newValue, newValue, 1.0);
      }
    `);

    // Create compute node with uniforms
    const compute = computeTrailWgsl({
      textureData: textureData,
      mousePos: uMousePos,
      fadeAmount: uFadeAmount,
      radius: uRadius,
      width: width,
      height: height,
      index: instanceIndex,
    }).compute(width * height);

    computeNodeRef.current = compute;

    return compute;
  }, [width, height, uMousePos, uFadeAmount, uRadius]);

  const update = useCallback((mouse: MousePosition) => {
    // Update mouse position uniform
    uMousePos.value.set(mouse.x, mouse.y);
    
    // Dispatch compute shader
    if (computeNodeRef.current) {
      gl.compute(computeNodeRef.current);
      
      // Mark texture as needing update
      if (textureRef.current) {
        textureRef.current.needsUpdate = true;
      }
    }
  }, [gl, uMousePos]);

  const getTexture = useCallback((): Texture | null => {
    return textureRef.current;
  }, []);

  return { update, getTexture };
}