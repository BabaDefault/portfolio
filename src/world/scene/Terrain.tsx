// The world's block meshes: a terrain mesh and a placed-blocks mesh per chunk. Chunks can be
// re-meshed after an explosion changes them.
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { Atlas } from '../atlas';
import type { Chunk, World } from '../generate';
import { meshBlocks, meshTerrain } from '../mesher';
import { edits } from '../tnt';

type Props = { world: World; atlas: Atlas; material: THREE.Material; chunks: Chunk[]; geometries: THREE.BufferGeometry[] };

export function Terrain({ world, atlas, material, chunks, geometries }: Props) {
  const meshes = useMemo(
    () =>
      geometries.map((g) => {
        const m = new THREE.Mesh(g, material);
        m.visible = g.attributes.position.count > 0;
        return m;
      }),
    [geometries, material],
  );

  useEffect(() => {
    edits.remesh = (changed) => {
      for (const chunk of changed) {
        const i = chunks.indexOf(chunk);
        if (i < 0) continue;
        const next = [meshTerrain(world, atlas, chunk), meshBlocks(world, atlas, chunk)];
        next.forEach((g, k) => {
          const m = meshes[i * 2 + k];
          m.geometry.dispose();
          m.geometry = g;
          m.visible = g.attributes.position.count > 0;
        });
      }
    };
    return () => {
      edits.remesh = () => {};
    };
  }, [world, atlas, chunks, meshes]);

  return (
    <>
      {meshes.map((m, i) => (
        <primitive key={i} object={m} />
      ))}
    </>
  );
}
