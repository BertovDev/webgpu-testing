import { useGLTF } from "@react-three/drei";
import { useRef } from "react";
import { useMemo } from "react";
import { useEffect } from "react";
import { Fn, vec4 } from "three/tsl";
import { Mesh, NodeMaterial, Texture } from "three/webgpu";
type Props = {};

const SculturePoints = (props: Props) => {
  const { scene } = useGLTF("/models/sculture1.glb");
  const mapTexture = useRef<Texture>(null);
  const emissiveTexture = useRef<Texture>(null);

  const material = useMemo(() => {
    const material = new NodeMaterial();

    material.colorNode = Fn(() => {
      return vec4(1, 1, 1, 1);
    })();

    return material;
  }, []);

  useEffect(() => {
    if (scene) {
      scene.traverse((child) => {
        if (child instanceof Mesh) {
          if (child.material) {
            if (child.material.map) {
              mapTexture.current = child.material.map;
            }
            if (child.material.emissiveMap) {
              emissiveTexture.current = child.material.emissiveMap;
            }
          }
          child.material = material;
        }
      });
    }
  }, [material, scene]);

  return (
    <points ref={pointsRef} geometry={geometry} material={material as Material} />
  );
};

export default SculturePoints;