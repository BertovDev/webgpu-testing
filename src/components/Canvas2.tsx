import { Environment, Html, OrbitControls, Stats } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { Experience } from "./Experience.tsx";
import { WebGPURenderer } from "three/webgpu";
import { useState } from "react";
import React from "react";
import ComputePoints from "./ComputePoints";
import { PostProcessing } from "./PostProcesing";
import { useControls } from "leva";

const count = 1000000;

export default function Canvas2() {
  const [renderer, setRenderer] = useState<string | null>(null);
  
  const { strength, radius, threshold } = useControls("Post-Processing", {
    strength: { value: 1.0, min: 0, max: 10, step: 0.1 },
    radius: { value: 0.22, min: 0, max: 2, step: 0.01 },
    threshold: { value: 0.25, min: 0, max: 1, step: 0.01 },
  });

  const { envPreset, envIntensity } = useControls("Environment", {
    envPreset: {
      value: "sunset",
      options: [
        "sunset",
        "dawn",
        "night",
        "warehouse",
        "forest",
        "apartment",
        "studio",
        "city",
        "park",
        "lobby",
      ],
    },
    envIntensity: { value: 0.5, min: 0, max: 2, step: 0.1 },
  });

  return (
    <>
      <Stats />
      <Canvas
        // @ts-ignore
        gl={(canvas) => {
          const renderer = new WebGPURenderer({
            // @ts-ignore
            canvas,
            antialias: true,
            powerPreference: "high-performance",
          });

          renderer.init().then(() => {
            setRenderer("WebGPU");
          });

          return renderer;
        }}
        shadows
        camera={{ position: [0, 0, 10], fov: 45 }}
      >
        <Html fullscreen className="relative w-full h-full pointer-events-none">
          <div className="absolute top-15 left-5 text-white">
            using : {renderer}
          </div>
          <div className="absolute bottom-5 left-5 text-white">
            particles : {count}
          </div>
        </Html>
        <Environment preset={envPreset as any} environmentIntensity={envIntensity} />
        <Suspense>
          <OrbitControls />
          <ComputePoints count={count} />
          <PostProcessing strength={strength} radius={radius} threshold={threshold} />
        </Suspense>
      </Canvas>
    </>
  );
}
