import { useThree } from "@react-three/fiber";
import { useRef, useCallback, useEffect } from "react";
import { Texture, CanvasTexture } from "three";

interface MousePosition {
  x: number;
  y: number;
}

interface UseTrailCanvasReturn {
  update: (mouse: MousePosition) => void;
  getTexture: () => Texture | null;
  getCanvas: () => HTMLCanvasElement | null;
}

export function useTrailCanvas(
  width: number = 512,
  height: number = 256,
  fadeAmount: number = 0.005,
  circleRadius: number = 30
): UseTrailCanvasReturn {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const textureRef = useRef<Texture | null>(null);

  // Initialize canvas
  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvasRef.current = canvas;

    // Style canvas to be positioned at top left corner
    canvas.style.position = "fixed";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.zIndex = "1000";
    canvas.style.pointerEvents = "none";

    // Append canvas to document body
    // document.body.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.error("Failed to get 2D context");
      return;
    }

    // Enable image smoothing for smoother rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    contextRef.current = ctx;

    // Set black background
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, width, height);

    // Create Three.js texture from canvas
    textureRef.current = new CanvasTexture(canvas);
    textureRef.current.needsUpdate = true;

    // Cleanup
    return () => {
      if (textureRef.current) {
        textureRef.current.dispose();
      }
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    };
  }, [width, height]);

  // Update mouse position and draw circle
  const update = useCallback(
    (mouse: MousePosition) => {
      if (!contextRef.current || !canvasRef.current) return;

      const ctx = contextRef.current;
      const canvas = canvasRef.current;

      // Fade the entire canvas by gradually erasing with destination-out
      // This ensures complete fade to black without leaving gray
      ctx.fillStyle = `rgba(0, 0, 0, ${fadeAmount})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    //   ctx.globalCompositeOperation = "source-over";

      // Draw white circle at mouse position with smooth gradient
      // Convert mouse coordinates from normalized (-1 to 1) to canvas coordinates (0 to width/height)
      const x = ((mouse.x + 1) / 2) * canvas.width;
      const y = ((1 - mouse.y) / 2) * canvas.height; // Flip Y axis

      // Create radial gradient for smooth brush effect with gradual falloff
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, circleRadius);
      gradient.addColorStop(0, "rgba(255, 255, 255, 1)"); // White at center
      gradient.addColorStop(0.7, "rgba(255, 255, 255, 0.8)"); // Start fading early
      gradient.addColorStop(1, "rgba(255, 255, 255, 0)"); // Fully transparent at edge

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, circleRadius, 0, Math.PI * 2);
      ctx.fill();

      // Update texture
      if (textureRef.current) {
        textureRef.current.needsUpdate = true;
      }
    },
    [fadeAmount, circleRadius]
  );

  // Get the texture
  const getTexture = useCallback((): Texture | null => {
    return textureRef.current;
  }, []);

  // Get the canvas element
  const getCanvas = useCallback((): HTMLCanvasElement | null => {
    return canvasRef.current;
  }, []);

  return {
    update,
    getTexture,
    getCanvas,
  };
}
