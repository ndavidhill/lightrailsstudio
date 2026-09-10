"use client";
import { useEffect, useRef, useState, ReactNode, MutableRefObject } from "react";
import { Config } from "@/lib/config";
import { Renderer } from "@/lib/renderer";

interface Props {
  configRef: MutableRefObject<Config>;
  rendererRef: MutableRefObject<Renderer | null>;
  children?: ReactNode;
}

export function Stage({ configRef, rendererRef, children }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let r: Renderer;
    try {
      r = new Renderer(canvas, () => configRef.current);
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    rendererRef.current = r;
    r.play();
    const ro = new ResizeObserver(() => r.resize());
    ro.observe(canvas);
    const onVis = () => (document.hidden ? r.pause() : r.play());
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      ro.disconnect();
      r.dispose();
      rendererRef.current = null;
    };
  }, [configRef, rendererRef]);

  return (
    <div className="stage-wrap">
      <canvas ref={canvasRef} className="stage" aria-label="Light Rails pattern" />
      {error && <div className="stage-error">{error}</div>}
      {children}
    </div>
  );
}
