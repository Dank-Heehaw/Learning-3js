import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  DEFAULT_MODEL_BACKGROUND,
  DEFAULT_MODEL_LIGHTING,
  DEFAULT_MODEL_RENDER_OVERRIDES,
  DEFAULT_MODEL_MATERIAL_OVERRIDES,
  MODEL_OVERRIDES_BY_FILE
} from "./model-overrides.js";

const KHRONOS_DUCK_GLB_URL =
  "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb";

const MODEL_URLS = import.meta.glob("../3d/*.glb", {
  eager: true,
  import: "default",
  query: "?url"
});

function toTitleCaseFromFileName(fileBaseName) {
  return fileBaseName
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function toModelId(fileBaseName) {
  return fileBaseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildModelCatalog() {
  const models = Object.entries(MODEL_URLS)
    .map(([sourcePath, url]) => {
      const fileName = sourcePath.split("/").at(-1) ?? "";
      const fileBaseName = fileName.replace(/\.glb$/i, "");
      const override = MODEL_OVERRIDES_BY_FILE[fileName] ?? MODEL_OVERRIDES_BY_FILE[fileBaseName] ?? {};

      return {
        id: override.id ?? toModelId(fileBaseName),
        label: override.label ?? toTitleCaseFromFileName(fileBaseName),
        fileName,
        url,
        backgroundColor: override.backgroundColor ?? DEFAULT_MODEL_BACKGROUND,
        frame: override.frame,
        lighting: override.lighting ?? DEFAULT_MODEL_LIGHTING,
        renderOverrides: override.renderOverrides ?? DEFAULT_MODEL_RENDER_OVERRIDES,
        materialOverrides: override.materialOverrides ?? DEFAULT_MODEL_MATERIAL_OVERRIDES
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));

  return models;
}

export const MODEL_CATALOG = buildModelCatalog();

function createPrimitiveFallbackModel() {
  const fallback = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.7, 40, 32),
    new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.55,
      metalness: 0.05
    })
  );
  body.castShadow = true;
  body.receiveShadow = true;
  fallback.add(body);

  const beak = new THREE.Mesh(
    new THREE.ConeGeometry(0.16, 0.35, 24),
    new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.45,
      metalness: 0.05
    })
  );
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 0.08, 0.72);
  beak.castShadow = true;
  fallback.add(beak);

  return fallback;
}

async function loadGltfWithProgress(loader, url, onProgress) {
  const gltf = await new Promise((resolve, reject) => {
    loader.load(url, resolve, onProgress, reject);
  });
  return gltf;
}

function computeRenderableBounds(model) {
  model.updateMatrixWorld(true);

  const bounds = new THREE.Box3();
  const meshBounds = new THREE.Box3();
  let hasRenderableMesh = false;

  model.traverse((node) => {
    if (!node.isMesh || !node.geometry) {
      return;
    }

    const geometry = node.geometry;
    if (!geometry.boundingBox) {
      geometry.computeBoundingBox();
    }
    if (!geometry.boundingBox) {
      return;
    }

    meshBounds.copy(geometry.boundingBox).applyMatrix4(node.matrixWorld);
    bounds.union(meshBounds);
    hasRenderableMesh = true;
  });

  if (!hasRenderableMesh) {
    return new THREE.Box3().setFromObject(model);
  }

  return bounds;
}

function normalizeModel(model, targetSize = 3.2) {
  const initialBox = computeRenderableBounds(model);
  const size = initialBox.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const scale = targetSize / maxDim;

  model.scale.setScalar(scale);

  const centeredBox = computeRenderableBounds(model);
  const center = centeredBox.getCenter(new THREE.Vector3());
  model.position.sub(center);
}

function enableShadowCasting(model) {
  model.traverse((node) => {
    if (node.isMesh) {
      node.castShadow = true;
      node.receiveShadow = true;
    }
  });
}

function applyMaterialOverrides(model, materialOverrides = DEFAULT_MODEL_MATERIAL_OVERRIDES) {
  const emissiveIntensityMultiplier = materialOverrides.emissiveIntensityMultiplier ?? 1;
  const clampMin = 0;
  const clampMax = 50;

  model.traverse((node) => {
    if (!node.isMesh || !node.material) {
      return;
    }

    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material) => {
      if (!("emissiveIntensity" in material)) {
        return;
      }

      const baseIntensity = Number.isFinite(material.emissiveIntensity) ? material.emissiveIntensity : 1;
      material.emissiveIntensity = THREE.MathUtils.clamp(
        baseIntensity * emissiveIntensityMultiplier,
        clampMin,
        clampMax
      );
      material.needsUpdate = true;
    });
  });
}

function frameModelInView(model, camera, controls, options = {}) {
  const box = computeRenderableBounds(model);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const target = sphere.center.clone();
  const radius = Math.max(0.35, sphere.radius);
  const padding = options.padding ?? 1.22;
  const fovRadians = THREE.MathUtils.degToRad(camera.fov);
  const distance = (radius * padding) / Math.tan(fovRadians / 2);
  const directionValues = options.viewDirection ?? [-0.58, 0.3, -0.75];
  const viewDirection = new THREE.Vector3(...directionValues).normalize();
  const cameraPosition = target.clone().add(viewDirection.multiplyScalar(distance));

  camera.position.copy(cameraPosition);
  controls.target.copy(target);
  controls.update();

  return { cameraPosition, target, radius };
}

function findNamedNode(model, names) {
  const normalizedNames = names.map((name) => name.toLowerCase().replace(/[^a-z0-9]/g, ""));
  let bestMatch = null;
  let bestScore = -1;

  model.traverse((node) => {
    if (!node.name) {
      return;
    }

    const normalizedNodeName = node.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    for (const normalizedExpected of normalizedNames) {
      if (!normalizedExpected) {
        continue;
      }

      let score = -1;
      if (normalizedNodeName === normalizedExpected) {
        score = 4;
      } else if (normalizedNodeName.startsWith(normalizedExpected)) {
        score = 3;
      } else if (normalizedNodeName.includes(normalizedExpected)) {
        score = 2;
      } else if (normalizedExpected.includes(normalizedNodeName)) {
        score = 1;
      }

      if (score > bestScore) {
        bestMatch = node;
        bestScore = score;
      }
    }
  });

  return bestMatch;
}

function applyMarkerFrame(model, camera, controls, baseFrame) {
  const targetNode = findNamedNode(model, ["cam_target", "CAM_TARGET", "camTarget"]);
  const startNode = findNamedNode(model, ["cam_start", "CAM_START", "camStart"]);

  if (!targetNode && !startNode) {
    return null;
  }

  model.updateMatrixWorld(true);

  const target = targetNode
    ? targetNode.getWorldPosition(new THREE.Vector3())
    : baseFrame.target.clone();

  let cameraPosition;
  if (startNode) {
    cameraPosition = startNode.getWorldPosition(new THREE.Vector3());
  } else {
    const currentOffset = baseFrame.cameraPosition.clone().sub(baseFrame.target);
    cameraPosition = target.clone().add(currentOffset);
  }

  camera.position.copy(cameraPosition);
  controls.target.copy(target);
  controls.update();

  return {
    cameraPosition,
    target,
    radius: baseFrame.radius
  };
}

function createAnimationController(model, animationClips = []) {
  if (!animationClips.length) {
    return {
      hasAnimations: false,
      update() {},
      stop() {}
    };
  }

  const mixer = new THREE.AnimationMixer(model);
  const actions = animationClips.map((clip) => {
    const action = mixer.clipAction(clip);
    action.reset();
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.clampWhenFinished = false;
    action.play();
    return action;
  });

  return {
    hasAnimations: true,
    update(deltaSeconds) {
      mixer.update(Math.max(0, deltaSeconds));
    },
    stop() {
      actions.forEach((action) => action.stop());
      mixer.stopAllAction();
      mixer.uncacheRoot(model);
    }
  };
}

export async function loadModelAndFrame({ modelRoot, camera, controls, modelStatus, modelId }) {
  const loader = new GLTFLoader();
  const setStatus = (text) => {
    if (modelStatus) {
      modelStatus.textContent = text;
    }
  };

  const selectedModel = MODEL_CATALOG.find((entry) => entry.id === modelId) ?? MODEL_CATALOG[0];
  if (!selectedModel) {
    const fallbackModel = createPrimitiveFallbackModel();
    modelRoot.clear();
    normalizeModel(fallbackModel);
    enableShadowCasting(fallbackModel);
    modelRoot.add(fallbackModel);
    const frame = frameModelInView(fallbackModel, camera, controls);
    setStatus("No local models found. Showing primitive fallback.");
    return {
      ...frame,
      modelName: "Primitive Fallback",
      backgroundColor: DEFAULT_MODEL_BACKGROUND,
      lighting: DEFAULT_MODEL_LIGHTING,
      renderOverrides: DEFAULT_MODEL_RENDER_OVERRIDES,
      materialOverrides: DEFAULT_MODEL_MATERIAL_OVERRIDES,
      animationController: createAnimationController(fallbackModel, [])
    };
  }
  setStatus(`Loading ${selectedModel.label}...`);

  let model = createPrimitiveFallbackModel();
  let animationClips = [];
  const progressHandler = (event) => {
    if (!event.lengthComputable || event.total === 0) {
      setStatus(`Loading ${selectedModel.label}...`);
      return;
    }

    const percent = Math.round((event.loaded / event.total) * 100);
    setStatus(`Loading ${selectedModel.label}... ${percent}%`);
  };

  try {
    if (!selectedModel.url) throw new Error("Selected model URL is empty.");
    const gltf = await loadGltfWithProgress(loader, selectedModel.url, progressHandler);
    model = gltf.scene;
    animationClips = gltf.animations ?? [];
    setStatus(`${selectedModel.label} loaded`);
  } catch (error) {
    try {
      setStatus(`Could not load ${selectedModel.label}. Loading Khronos Duck...`);
      const duckGltf = await loadGltfWithProgress(loader, KHRONOS_DUCK_GLB_URL, undefined);
      model = duckGltf.scene;
      animationClips = duckGltf.animations ?? [];
      setStatus("Loaded fallback: Khronos Duck");
    } catch (duckError) {
      model = createPrimitiveFallbackModel();
      animationClips = [];
      setStatus("Could not load fallback model. Using primitive fallback.");
      console.warn("Could not load selected model or Khronos Duck fallback.", {
        selectedModelError: error,
        duckError
      });
    }
  }

  modelRoot.clear();
  normalizeModel(model);
  enableShadowCasting(model);
  applyMaterialOverrides(model, selectedModel.materialOverrides);
  modelRoot.add(model);

  const autoFrame = frameModelInView(model, camera, controls, selectedModel.frame);
  const markerFrame = applyMarkerFrame(model, camera, controls, autoFrame);
  const finalFrame = markerFrame ?? autoFrame;
  const animationController = createAnimationController(model, animationClips);

  return {
    ...finalFrame,
    modelName: selectedModel.label,
    backgroundColor: selectedModel.backgroundColor,
    lighting: selectedModel.lighting ?? DEFAULT_MODEL_LIGHTING,
    renderOverrides: selectedModel.renderOverrides ?? DEFAULT_MODEL_RENDER_OVERRIDES,
    materialOverrides: selectedModel.materialOverrides ?? DEFAULT_MODEL_MATERIAL_OVERRIDES,
    animationController
  };
}
