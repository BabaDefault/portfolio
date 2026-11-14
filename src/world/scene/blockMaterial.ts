import * as THREE from 'three';

/**
 * Lambert material for voxel geometry: samples the pixel atlas up close, fades to each tile's
 * average colour with distance (no shimmering moiré on far terrain), applies baked AO, and lets
 * glowing tiles (lava, lanterns, windows…) shine regardless of the scene lighting.
 */
export function blockMaterial(map: THREE.Texture) {
  const mat = new THREE.MeshLambertMaterial({ map, alphaTest: 0.5 });
  const uTime = { value: 0 };
  mat.userData.uTime = uTime; // advanced each frame so glowing blocks flicker
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uTime;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
attribute vec3 aAvg;
attribute vec2 aAo;
uniform float uTime;
varying vec3 vAvg;
varying vec2 vAo;
varying float vFlick;
varying float vViewDist;`,
      )
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
vFlick = sin(dot(position, vec3(1.3, 2.1, 1.7)) + uTime * 3.0);
vAvg = aAvg;
vAo = aAo;
vViewDist = -mvPosition.z;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vAvg;
varying vec2 vAo;
varying float vFlick;
varying float vViewDist;`,
      )
      .replace(
        '#include <map_fragment>',
        `#ifdef USE_MAP
  vec4 sampledDiffuseColor = texture2D( map, vMapUv );
  float detailFade = smoothstep( 38.0, 105.0, vViewDist );
  sampledDiffuseColor.rgb = mix( sampledDiffuseColor.rgb, vAvg, detailFade );
  diffuseColor *= sampledDiffuseColor;
#endif
vec3 glowColor = diffuseColor.rgb * vAo.y * (0.9 + 0.14 * vFlick);
diffuseColor.rgb *= vAo.x;`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
totalEmissiveRadiance += glowColor;`,
      );
  };
  return mat;
}
