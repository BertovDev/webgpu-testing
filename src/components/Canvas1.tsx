import { Html, Stats } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { Experience } from "./Experience.tsx";
import { WebGPURenderer } from "three/webgpu";
import { useState } from "react";
import React from "react";
import { PostProcessing } from "./PostProcesing";
import { useControls } from "leva";



export default function Canvas1() {
  const [renderer, setRenderer] = useState<string | null>(null);

  const { strength, radius, threshold } = useControls("Post-Processing", {
    strength: { value: 0.2, min: 0, max: 10, step: 0.1 },
    radius: { value: 1, min: 0, max: 2, step: 0.01 },
    threshold: { value: 0.84, min: 0, max: 1, step: 0.01 },
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
        camera={{ position: [0, 3, 1.5], fov: 15 }}
      >
        <Html fullscreen className="relative w-full h-full pointer-events-none">
          <div className=" absolute top-5 left-5 text-white">
            using : {renderer}
          </div>
        </Html>
        <color attach="background" args={["#333"]} />
        <Suspense>
          <Experience lab="Sculture" />
          <PostProcessing strength={strength} radius={radius} threshold={threshold} />

        </Suspense>
      </Canvas>
    </>
  );
}
