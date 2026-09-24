"use client";
import { useEffect, useRef, useState } from "react";
import { Config, DEFAULTS, cloneConfig } from "@/lib/config";
import { Renderer } from "@/lib/renderer";
import { configFromHash } from "@/lib/share";
import { Stage } from "./Stage";

/* The live pattern alone, full-bleed, with the look read from #c= so an
   iframe can carry it. Changing the hash swaps the look in place. */
export function EmbedView() {
  const [config, setConfig] = useState<Config | null>(null);
  const cfgRef = useRef<Config>(DEFAULTS);
  const rendererRef = useRef<Renderer | null>(null);

  useEffect(() => {
    const read = () => setConfig(configFromHash(window.location.hash) ?? cloneConfig(DEFAULTS));
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  if (!config) return null;
  cfgRef.current = config;
  return <Stage configRef={cfgRef} rendererRef={rendererRef} className="full" />;
}
