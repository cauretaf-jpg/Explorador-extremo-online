export function disposeObject3D(root) {
  if (!root?.traverse) return;
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();

  root.traverse(object => {
    if (object.geometry?.dispose) geometries.add(object.geometry);
    const mats = Array.isArray(object.material)
      ? object.material
      : object.material ? [object.material] : [];
    for (const material of mats) {
      if (!material) continue;
      materials.add(material);
      for (const value of Object.values(material)) {
        if (value?.isTexture && value.dispose) textures.add(value);
      }
      for (const uniform of Object.values(material.uniforms || {})) {
        const value = uniform?.value;
        if (value?.isTexture && value.dispose) textures.add(value);
      }
    }
  });

  for (const texture of textures) texture.dispose();
  for (const material of materials) material.dispose?.();
  for (const geometry of geometries) geometry.dispose?.();
}

if (typeof window !== 'undefined') window.ExploradorDispose = { disposeObject3D };
