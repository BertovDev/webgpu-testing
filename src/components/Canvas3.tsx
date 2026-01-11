import { Environment, Html, OrbitControls, Stats } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { Experience } from "./Experience.tsx";
import { WebGPURenderer } from "three/webgpu";
import { useState } from "react";
import React from "react";
import Compute2 from "./Compute2";

export default function Canvas3() {
  const [renderer, setRenderer] = useState<string | null>(null);
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
          <div className=" absolute top-5 left-5 text-white">
            using : {renderer}
          </div>
        </Html>
        {/* <Environment   preset="sunset"  /> */}
        <color attach="background" args={["#333"]} />
        <Suspense>
          <OrbitControls />
          <Compute2 />
        </Suspense>
      </Canvas>
    </>
  );
}
