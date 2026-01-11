import React from "react";
import { Gltf, MatcapTexture, useGLTF } from "@react-three/drei";
import { GroupProps, useFrame, useThree } from "@react-three/fiber";
import {
  Color,
  Group,
  Mesh,
  NodeMaterial,
  Object3D,
  SRGBColorSpace,
  Texture,
  Vector3,
} from "three/webgpu";
import { useMemo } from "react";
import {
  Fn,
  normalLocal,
  positionLocal,
  positionWorld,
  uniform,
  distance,
  vec2,
  vec3,
  vec4,
  texture,
  uv,
  mix,
  screenUV,
  cameraProjectionMatrix,
  modelViewMatrix,
  varying,
  smoothstep,
  float,
  cos,
  sin,
} from "three/tsl";
import { useEffect } from "react";
import { useRef } from "react";
import { simpleNoise } from "../noise";
import { cnoise } from "./perlin";
import { useTrailCompute } from "./hooks/useComputeTrail";
import { useTrailCanvas } from "./hooks/useTrailCanvas";

export default function Sculture(props: GroupProps) {
  const { scene } = useGLTF("/models/sculture1.glb");
  const { raycaster } = useThree();
  const { getTexture, update } = useTrailCanvas();

  //ref
  const groupRef = useRef<Group | null>(null);
  const planeRef = useRef<Mesh | null>(null);
  const mapTexture = useRef<Texture | null>(null);
  const emissiveTexture = useRef<Texture | null>(null);
  const trailTextureRef = useRef<Texture | null>(null);

  // Create a dummy texture initially to avoid null errors
  const dummyTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, 1, 1);
    }
    return new Texture(canvas);
  }, []);

  const palette = Fn(({ t }) => {
    const a = vec3(0.5, 0.5, 0.5);
    const b = vec3(0.5, 0.5, 0.5);
    const c = vec3(1.0, 1.0, 1.0);
    const d = vec3(0.0, 0.1, 0.2);
    return a.add(b.mul(cos(float(3).mul(c.mul(t).add(d)))));
  });

  const mousePos = new Vector3();
  const uMouse = uniform(mousePos, "vec3");
  const uTime = uniform(0.0, "float");
  let uvScreen = varying(vec2(0.0, 0.0));

  // Update trail texture when it becomes available
  useEffect(() => {
    const texture = getTexture();
    if (texture) {
      texture.flipY = false;
      trailTextureRef.current = texture;
    }
  }, [getTexture]);

  const material = useMemo(() => {
    const material = new NodeMaterial();


    //shader
    // good thing of this, look how friendly it looks compare with glsl, is all funcional and straight foward.

    material.positionNode = Fn(() => {
      // vertex shader
      //normalize Device coordinates

      const pos = positionLocal;
      const cameraProjectionMat = cameraProjectionMatrix
        .mul(modelViewMatrix)
        .mul(vec4(pos, 1));
      // const uvScreen = cameraProjectionMat.xy.div(cameraProjectionMat.w);
      uvScreen.assign(
        cameraProjectionMat.xy.div(cameraProjectionMat.w).add(1).div(2)
      );
      uvScreen.y = uvScreen.y.oneMinus();

      const noise = cnoise([vec3(pos.x, pos.y, pos.z)]);

      let extrude = texture(trailTextureRef.current, uvScreen).x;
      pos.y.mulAssign(mix(0, 2, extrude));

      pos.y.mulAssign(extrude.mul(sin(uTime).mul(noise)));

      return pos;
    })();

    material.colorNode = Fn(() => {
      // fragmenr shader
      const dist = distance(positionWorld, uMouse);
      const mapText = texture(mapTexture.current, uv()); //wrap texture in uv() to get the texture coordinates
      const emissiveText = texture(emissiveTexture.current, uv());

      const distortedUV = screenUV;
      const trailTex = trailTextureRef.current || dummyTexture;
      const extrude = texture(trailTex, distortedUV).x;

      const emissiveColor = vec3(0.5, 2.2, 10.0).mul(0.05);
      const emissiveIntensity = 100.0;

      const finalEmissive = emissiveText
        .mul(emissiveColor)
        .mul(emissiveIntensity);

      let level0 = mapText.r;
      let level1 = mapText.g;
      let level2 = mapText.b;

      let level3 = finalEmissive.b;
      let level4 = finalEmissive.g;
      let level5 = finalEmissive.r;

      let final = level0;

      final = mix(final, level1, smoothstep(0.2, 0.3, extrude));
      final = mix(final, level2, smoothstep(0.3, 0.5, extrude));
      final = mix(final, finalEmissive, smoothstep(0.5, 0.7, extrude.mul(0.6)));
      final = mix(final, level3, smoothstep(0.7, 0.8, extrude.mul(0.2)));
      final = mix(final, level4, smoothstep(0.8, 0.9, extrude.mul(0.2)));
      final = mix(final, level5, smoothstep(0.9, 1.0, extrude.mul(0.2)));

      let finalColor = palette({ t: final }).mul(1).oneMinus();

      return vec4(vec3(finalColor), 0.1);
    })();

    material.emissiveNode = Fn(() => {
      const emissiveText = texture(emissiveTexture.current, uv());
      const distortedUV = screenUV;
      const trailTex = trailTextureRef.current || dummyTexture;
      const extrude = texture(trailTex, distortedUV).x;

      const emissiveColor = vec3(0.5, 5, 8.0).mul(0.05);
      const emissiveIntensity = 50.0;

      const finalEmissive = emissiveText
        .mul(emissiveColor)
        .mul(emissiveIntensity)

      // Use the emissive based on extrude value, similar to colorNode logic
      return finalEmissive.mul(smoothstep(0.5, 0.7, extrude.mul(.6)));
    })();

    return material;
  }, [scene, uMouse, dummyTexture, uvScreen, uTime]);

  useEffect(() => {
    if (scene) {
      scene.traverse((child) => {
        if (child instanceof Mesh) {
          const mat = child.material;
          if (mat && !Array.isArray(mat)) {
            if ("map" in mat && mat.map) {
              (mapTexture as any).current = mat.map as Texture;
            }
            if ("emissiveMap" in mat && mat.emissiveMap) {
              (emissiveTexture as any).current = mat.emissiveMap as Texture;
            }
          }
          child.material = material;
        }
      });
    }
  }, [material, scene]);

  useFrame((state, delta) => {
    uTime.value += delta;

    // Update trail with mouse position
    update({ x: state.pointer.x, y: state.pointer.y });

    // Update texture reference if needed
    const trailTex = trailTextureRef.current || getTexture();
    if (trailTex) {
      trailTex.needsUpdate = true;
    }

    if (groupRef.current && planeRef.current) {
      raycaster.setFromCamera(state.pointer, state.camera);

      const intersects = raycaster.intersectObjects([planeRef.current as any]);

      if (intersects.length > 0) {
        uMouse.value.copy(intersects[0].point);
      }
    }
  });

  return (
    <>
      <group {...props} ref={groupRef as any}>
        <primitive object={scene} />
      </group>

      <mesh ref={planeRef as any} visible={false}>
        <planeGeometry args={[2, 2]} />
        <meshStandardMaterial color="green" />
      </mesh>
    </>
  );
}

useGLTF.preload("/models/sculture1.glb");
