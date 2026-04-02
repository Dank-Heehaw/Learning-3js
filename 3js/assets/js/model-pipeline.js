import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import cheModelUrl from "../3d/che.glb?url";
import concertoModelUrl from "../3d/concerto.glb?url";
import forestLonerModelUrl from "../3d/dae_diorama_-_forest_loner__racing.glb?url";
import grandmasHouseModelUrl from "../3d/dae_diorama_-_grandmas_house.glb?url";
import seaKeepModelUrl from "../3d/sea_keep_lonely_watcher.glb?url";
import shipCloudsModelUrl from "../3d/ship_in_clouds.glb?url";
import teremModelUrl from "../3d/terem.glb?url";

export const MODEL_CATALOG = [
  { id: "concerto", label: "Concerto", url: concertoModelUrl, backgroundColor: "#2b500b" },
  { id: "che", label: "Che", url: cheModelUrl, backgroundColor: "#c9ccd5" },
  { id: "forest-loner", label: "Forest Loner Racing", url: forestLonerModelUrl, backgroundColor: "#7a818c" },
  { id: "grandmas-house", label: "Grandma's House", url: grandmasHouseModelUrl, backgroundColor: "#7a818c" },
  { id: "sea-keep", label: "Sea Keep Lonely Watcher", url: seaKeepModelUrl, backgroundColor: "#0f6ab4" },
  {
    id: "ship-clouds",
    label: "Ship In Clouds",
    url: shipCloudsModelUrl,
    backgroundColor: "#faece4",
    frame: { padding: 1.02, viewDirection: [-0.2, 0.18, -0.96] }
  },
  { id: "terem", label: "Terem", url: teremModelUrl, backgroundColor: "#7a818c" },
  { id: "fallback", label: "Fallback Primitive", url: null, backgroundColor: "#7a818c" }
];

function createFallbackModel() {
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

function normalizeModel(model, targetSize = 3.2) {
  const initialBox = new THREE.Box3().setFromObject(model);
  const size = initialBox.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const scale = targetSize / maxDim;

  model.scale.setScalar(scale);

  const centeredBox = new THREE.Box3().setFromObject(model);
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

function frameModelInView(model, camera, controls, options = {}) {
  const box = new THREE.Box3().setFromObject(model);
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

export async function loadModelAndFrame({ modelRoot, camera, controls, modelStatus, modelId }) {
  const loader = new GLTFLoader();
  const setStatus = (text) => {
    if (modelStatus) {
      modelStatus.textContent = text;
    }
  };

  const selectedModel = MODEL_CATALOG.find((entry) => entry.id === modelId) ?? MODEL_CATALOG[0];
  setStatus(`Loading ${selectedModel.label}...`);

  let model = createFallbackModel();

  if (selectedModel.url) {
    try {
      const gltf = await new Promise((resolve, reject) => {
        loader.load(
          selectedModel.url,
          (loadedModel) => resolve(loadedModel),
          (event) => {
            if (!event.lengthComputable || event.total === 0) {
              setStatus(`Loading ${selectedModel.label}...`);
              return;
            }

            const percent = Math.round((event.loaded / event.total) * 100);
            setStatus(`Loading ${selectedModel.label}... ${percent}%`);
          },
          reject
        );
      });
      model = gltf.scene;
      setStatus(`${selectedModel.label} loaded`);
    } catch (error) {
      setStatus(`Could not load ${selectedModel.label}. Using fallback model.`);
      console.warn(`Could not load ${selectedModel.label}, using fallback geometry.`, error);
    }
  } else {
    setStatus("Fallback model loaded");
  }

  modelRoot.clear();
  normalizeModel(model);
  enableShadowCasting(model);
  modelRoot.add(model);

  return {
    ...frameModelInView(model, camera, controls, selectedModel.frame),
    modelName: selectedModel.label,
    backgroundColor: selectedModel.backgroundColor
  };
}
