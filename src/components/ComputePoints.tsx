import * as THREE from "three/webgpu";
import { useMemo, useRef, useEffect, useCallback } from "react";
import {
    distance,
  Fn,
  instancedArray,
  instanceIndex,
  smoothstep,
  vec2,
  vec3,
  vertexIndex,
  wgslFn,
} from "three/tsl";
import { useFrame } from "@react-three/fiber";
import { useThree } from "@react-three/fiber";
import { WebGPURenderer } from "three/webgpu";
import { uniform } from "three/tsl";

export default function ComputePoints({ count = 50000 }) {
  const pointsRef = useRef<THREE.Points>(null);
  const planeRef = useRef<THREE.Mesh>(null);
  const { gl } = useThree<{ gl: WebGPURenderer }>();
  const { raycaster } = useThree();

  //uniforms
  const mouse = new THREE.Vector2();
  const uMouse = uniform(mouse, "vec2");

  // Create storage buffers for compute shaders
  const { nodes } = useMemo(() => {
    // Create storage arrays for positions and offsets
    const positionsArray = new Float32Array(count * 3);
    const offsetsArray = new Float32Array(count * 3);
    const velocitiesArray = new Float32Array(count * 3);

    // Create TSL nodes for instanced arrays (storage buffers)
    const positionNode = instancedArray(positionsArray, "vec3");
    const offsetNode = instancedArray(offsetsArray, "vec3");
    const velocityNode = instancedArray(velocitiesArray, "vec3");

    // Access the value for the current instance (for compute shader)
    const instancePosition = positionNode.element(instanceIndex);
    const instanceOffset = offsetNode.element(instanceIndex);
    const instanceVelocity = velocityNode.element(instanceIndex);

    // Access the value for the current vertex (for rendering)
    const vertexPosition = positionNode.element(vertexIndex);
    const vertexOffset = offsetNode.element(vertexIndex);

    // Thomas attractor function for particle movement
    const computeUpdateAnimation = wgslFn(`
      fn computeUpdateAnimation(pos: vec3<f32>) -> vec3<f32> {
        let b = 0.09;

        let dt = 0.03;

        let x = pos.x;
        let y = pos.y - 2.0 * b;
        let z = pos.z * 2.0;

        let dx = (-b * x + sin(y)) * dt;
        let dy = (-b * y + sin(z)) * dt;
        let dz = (-b * z + sin(x)) * dt * sin(y);

        return vec3<f32>(dx, dy, dz);
      }
    `);

    // Hash function for WGSL
    const hashWgsl = wgslFn(
      `
      fn hash(p: f32) -> f32 {
        return fract(sin(p * 12.9898) * 43758.5453);
      }
    `,
      []
    );

    // Compute shader for initialization
    const computeInitWgsl = wgslFn(
      `
      fn computeInit(
        spawnPositions: ptr<storage, array<vec3<f32>>, read_write>,
        offsetPositions: ptr<storage, array<vec3<f32>>, read_write>,
        index: u32
      ) -> void {
        let h0 = hash(f32(index));
        let h1 = hash(f32(index + 1u));
        let h2 = hash(f32(index + 2u));

        let distance = sqrt(h0 * 0.5);
        let theta = h1 * 6.28318530718; // 2 * PI
        let phi = h2 * 3.14159265359; // PI

        let x = distance * sin(phi) * cos(theta);
        let y = distance * sin(phi) * cos(theta);
        let z = distance * cos(phi);

        spawnPositions[index] = vec3<f32>(x, y, z);
        offsetPositions[index] = vec3<f32>(0.0, 0.0, 0.0);
      }
    `,
      [hashWgsl]
    );

    // Create compute nodes
    const computeNode = computeInitWgsl({
      spawnPositions: positionNode,
      offsetPositions: offsetNode,
      index: instanceIndex,
    }).compute(count);

    // Compute shader for updating positions (Thomas attractor)
    const computeNodeUpdate = Fn(() => {
      const currentPos = instancePosition.add(instanceOffset);
      const updateOffset = computeUpdateAnimation({
        pos: currentPos,
      });
      instanceVelocity.addAssign(vec2(0, 0.01, 0));
      instanceOffset.addAssign(updateOffset);

      instanceVelocity.mulAssign(0.99);
      let distanceToMouse = smoothstep(0, 1, distance(instancePosition, uMouse));

      if(distanceToMouse > 0.5){
        instanceVelocity.x.assign(vec2(0, 10.0, 0));
        instanceVelocity.y.assign(vec2(0, 0.01, 0));
      }
    })().compute(count);

    return {
      nodes: {
        positionNode,
        offsetNode,
        velocityNode,
        instancePosition,
        instanceOffset,
        instanceVelocity,
        vertexPosition,
        vertexOffset,
        computeNode,
        computeNodeUpdate,
      },
    };
  }, [count]);

  // Create geometry and material for points
  const { geometry, baseMaterial } = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    // Create positions array - each point needs a vertex
    const positions = new Float32Array(count * 3);
    // Initialize with zero positions (will be set by compute shader via TSL)
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    // Create base PointsMaterial
    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1,
      sizeAttenuation: true,
    });

    return { geometry: geom, baseMaterial: mat };
  }, [count]);

  // Initialize compute shader once
  const compute = useCallback(async () => {
    try {
      if (nodes?.computeNode) {
        await gl.computeAsync(nodes.computeNode);
      }
    } catch (error) {
      console.error("Compute initialization error:", error);
    }
  }, [nodes?.computeNode, gl]);

  useEffect(() => {
    compute();
  }, [compute]);

  // Update material with position node and emissive for bloom
  useEffect(() => {
    if (!baseMaterial || !pointsRef.current || !nodes) return;

    const newMaterial = baseMaterial.clone();

    // Override vertex position: use vertex position from storage buffer
    // For points, each vertex corresponds to one particle
    newMaterial.positionNode = nodes.vertexPosition.add(nodes.vertexOffset.add(nodes.instanceVelocity));

    // Add emissive color to make particles react to bloom
    // Using a bright white/cyan color for the glow effect
    newMaterial.emissiveNode = vec3(0.5, 2.8, 5.0).mul(.5);

    pointsRef.current.material = newMaterial;
  }, [baseMaterial, nodes]);

  // Update compute shader every frame
  useFrame((state) => {
    if (nodes?.computeNodeUpdate) {
      gl.compute(nodes.computeNodeUpdate);
    }

    //raycast
    if (planeRef.current) {
      raycaster.setFromCamera(state.pointer, state.camera);
      const intersects = raycaster.intersectObjects([planeRef.current as any]);
      if (intersects.length > 0) {
        uMouse.value.copy(intersects[0].point);
      }
    }
  });

  return (
    // @ts-ignore
    <>
      {/* @ts-ignore */}
      <points ref={pointsRef} geometry={geometry} material={baseMaterial} />;
      {/* @ts-ignore */}
      <mesh visible={false} ref={planeRef}>
        {/* @ts-ignore */}
        <planeGeometry args={[20, 20]} />
        {/* @ts-ignore */}
        <meshBasicMaterial color="red" />
      </mesh>
    </>
  );
}
