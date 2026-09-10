"use client";
import { useCallback, useRef, useState } from "react";
import { Config, cloneConfig, sameConfig } from "./config";

/* Undo / redo over Config snapshots. `set` updates the live value without
   recording; `commit` records the current value as an undo step (call it once
   a slider drag ends, or on any discrete change). */
export function useHistory(initial: Config, limit = 80) {
  const [config, setConfigState] = useState<Config>(initial);
  const past = useRef<Config[]>([]);
  const future = useRef<Config[]>([]);
  const last = useRef<Config>(cloneConfig(initial));
  const [, bump] = useState(0);

  const set = useCallback((next: Config | ((c: Config) => Config)) => {
    setConfigState((c) => (typeof next === "function" ? next(c) : next));
  }, []);

  const commit = useCallback((value: Config) => {
    if (sameConfig(value, last.current)) return;
    past.current.push(cloneConfig(last.current));
    if (past.current.length > limit) past.current.shift();
    future.current = [];
    last.current = cloneConfig(value);
    bump((n) => n + 1);
  }, [limit]);

  /* set + commit in one go, for discrete changes */
  const apply = useCallback((next: Config) => {
    setConfigState(next);
    commit(next);
  }, [commit]);

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push(cloneConfig(last.current));
    last.current = cloneConfig(prev);
    setConfigState(prev);
    bump((n) => n + 1);
  }, []);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push(cloneConfig(last.current));
    last.current = cloneConfig(next);
    setConfigState(next);
    bump((n) => n + 1);
  }, []);

  return {
    config, set, commit, apply, undo, redo,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
  };
}
