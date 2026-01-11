import { Bounds, Environment, Html, OrbitControls } from "@react-three/drei";
import React, { useMemo, useRef, useEffect } from "react";
import { MeshStandardNodeMaterial } from "three/webgpu";
import Sculture from "./Sculture";
import ComputePoints from "./ComputePoints";
import { useState } from "react";

type Props = {
  lab: "Sculture" | "Points";
};

export const Experience = (props: Props) => {
  return (
    <>
      <directionalLight position={[5, 5, -5]} intensity={0.5} castShadow />
      <Environment preset="sunset" environmentIntensity={0.5} />
      {/* <OrbitControls maxPolarAngle={Math.PI / 2 - 0.1} /> */}

      {/* <ComputePoints
        count={500000}
      /> */}
      <Sculture
        position={[0.08, -0.3, 0]}
        scale={0.5}
        rotation={[-0.8, Math.PI, 0]}
      />
    </>
  );
};
