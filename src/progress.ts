// Remembers which screens the visitor has explored (localStorage, with an in-memory fallback).
import { useEffect, useState } from 'react';
import { isScreenId, type ScreenId } from './screens/registry';

const KEY = 'mc-visited';
const listeners = new Set<(v: Set<ScreenId>) => void>();
let visited: Set<ScreenId> = read();

function read(): Set<ScreenId> {
  try {
    const raw = localStorage.getItem(KEY);
    const arr: unknown = raw ? JSON.parse(raw) : [];
    if (Array.isArray(arr)) return new Set(arr.filter((v): v is ScreenId => typeof v === 'string' && isScreenId(v)));
  } catch {
    /* storage unavailable or corrupt */
  }
  return new Set();
}

export function markVisited(id: ScreenId) {
  if (visited.has(id)) return;
  visited = new Set(visited).add(id);
  try {
    localStorage.setItem(KEY, JSON.stringify([...visited]));
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((fn) => fn(visited));
}

export function getVisited(): ReadonlySet<ScreenId> {
  return visited;
}

export function useProgress(): { visited: Set<ScreenId>; count: number } {
  const [v, setV] = useState(visited);
  useEffect(() => {
    listeners.add(setV);
    setV(visited);
    return () => {
      listeners.delete(setV);
    };
  }, []);
  return { visited: v, count: v.size };
}
