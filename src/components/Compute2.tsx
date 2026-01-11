import { useThree } from "@react-three/fiber";
import { useFrame } from "@react-three/fiber";
import React from "react";
import { useEffect } from "react";
import { useCallback } from "react";
import { useMemo } from "react";
import { useRef } from "react";
import {
  Fn,
  instancedArray,
  instanceIndex,
  materialAO,
  materialIOR,
  uniform,
  vec3,
  velocity,
} from "three/tsl";
import {
  BufferAttribute,
  BufferGeometry,
  Mesh,
  Points,
  PointsNodeMaterial,
  WebGPURenderer,
} from "three/webgpu";

const count = 100000;
export default function Compute2() {
  const planerRef = useRef<Mesh>(null);
  const pointsRef = useRef<Points>(null);
  const { gl } = useThree<{ gl: WebGPURenderer }>();
  /// Create WebGPU particles

  let uTime = uniform(0.0, "float");

  //shader material with nodes
  const { nodes } = useMemo(() => {
    // to create the compute shaders we need:
    const initPositions = instancedArray(count, "vec3");
    const velocities = instancedArray(count, "vec3");
    const colors = instancedArray(count, "vec3");

    const position = initPositions.element(instanceIndex); // this gives acces to the node for the current instance index
    const velocity = velocities.element(instanceIndex);
    const color = colors.element(instanceIndex);

    const computeInit = Fn(() => {
      // references

      position.assign(vec3(10, 10, 10));
      color.assign(vec3(1, 0, 0));
      velocity.assign(vec3(1, 0, 0));
    })().compute(count);

    const computeUpdate = Fn(() => {
      //references
      position.addAssign(velocity.mul(uTime)); // Update all components, use deltaTime
    })().compute(count);

    return {
      nodes: {
        positionNode: initPositions,
        velocityNode: velocities,
        colorNode: colors,
        computeNodeUpdate: computeUpdate,
        computeNodeInit: computeInit,
      },
    };
  }, []);

  // Create geometry and material for points
  const { geometry, material } = useMemo(() => {
    const geom = new BufferGeometry();
    const positions = new Float32Array(count * 3);
    geom.setAttribute("position", new BufferAttribute(positions, 3));

    for (let i = 0; i < count; i++) {
      positions[i * 3] = Math.random() * 10 - 5;
      positions[i * 3 + 1] = Math.random() * 10 - 5;
      positions[i * 3 + 2] = Math.random() * 10 - 5;
    }

    const material = new PointsNodeMaterial({
      color: 0xffffff,
      size: 1,
      sizeAttenuation: true,
    });

    return { geometry: geom, material: material };
  }, [count]);

  const compute = useCallback(async () => {
    console.log(nodes?.computeNodeInit);
    if (nodes?.computeNodeInit) {
      await gl.computeAsync(nodes.computeNodeInit);
    }
  }, [nodes?.computeNodeInit, gl]);

  useEffect(() => {
    compute();
  }, [compute]);


  useEffect(() => {
    const newMaterial = material.clone();
    newMaterial.positionNode = nodes.positionNode;
    newMaterial.colorNode = nodes.colorNode;
    pointsRef.current.material = newMaterial;
  }, [nodes, material]);

  useFrame((state) => {
    if (nodes?.computeNodeUpdate) {
      gl.compute(nodes.computeNodeUpdate);
    }

    uTime.value += state.clock.getDelta();
  });

  return (
    <>
      <points
        ref={pointsRef as any}
        geometry={geometry as any}
        material={material as any}
      />
      <mesh ref={planerRef as any} visible={false}>
        <planeGeometry args={[10, 10]} />
        <meshBasicMaterial color="red" />
      </mesh>
    </>
  );
}
