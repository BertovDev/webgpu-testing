import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { bloom } from "three/examples/jsm/tsl/display/BloomNode.js";
import { emissive, mrt, output, pass } from "three/tsl";
import * as THREE from "three/webgpu";

export const PostProcessing = ({
  strength = 2.5,
  radius = 0.5,
  threshold = 0.25,
}) => {
  const { gl: renderer, scene, camera } = useThree();
  const postProcessingRef = useRef(null);
  const bloomPassRef = useRef(null);

  useEffect(() => {
    if (!renderer || !scene || !camera) {
      return;
    }

    const scenePass = pass(scene, camera);

    // Create MRT (Multiple Render Targets)
    scenePass.setMRT(
      mrt({
        output,
        emissive,
      })
    );

    // Get texture nodes
    const outputPass = scenePass.getTextureNode("output");
    const emissivePass = scenePass.getTextureNode("emissive");

    // Create bloom pass
    const bloomPass = bloom(emissivePass, strength, radius, threshold);
    bloomPassRef.current = bloomPass;

    // Setup post-processing
    const postProcessing = new THREE.PostProcessing(renderer);

    const outputNode = outputPass.add(bloomPass);
    postProcessing.outputNode = outputNode;
    postProcessingRef.current = postProcessing;

    return () => {
      postProcessingRef.current = null;
    };
  }, [renderer, scene, camera]);

  useFrame(() => {
    if (bloomPassRef.current) {
      // @ts-ignore
      bloomPassRef.current.strength.value = strength;
      // @ts-ignore
      bloomPassRef.current.radius.value = radius;
      // @ts-ignore
      bloomPassRef.current.threshold.value = threshold;
    }
    if (postProcessingRef.current) {
      // @ts-ignore
      postProcessingRef.current.render();
    }
  }, 1);

  return null;
};
