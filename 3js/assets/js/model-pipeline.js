import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import concertoModelUrl from "../3d/concerto.glb?url";

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
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const scale = targetSize / maxDim;

  model.position.sub(center);
  model.scale.setScalar(scale);
}

function enableShadowCasting(model) {
  model.traverse((node) => {
    if (node.isMesh) {
      node.castShadow = true;
      node.receiveShadow = true;
    }
  });
}

function frameModelInView(model, camera, controls, padding = 1.22) {
  const box = new THREE.Box3().setFromObject(model);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const target = sphere.center.clone();
  const radius = Math.max(0.35, sphere.radius);
  const fovRadians = THREE.MathUtils.degToRad(camera.fov);
  const distance = (radius * padding) / Math.tan(fovRadians / 2);
  const viewDirection = new THREE.Vector3(-0.58, 0.3, -0.75).normalize();
  const cameraPosition = target.clone().add(viewDirection.multiplyScalar(distance));

  camera.position.copy(cameraPosition);
  controls.target.copy(target);
  controls.update();

  return { cameraPosition, target, radius };
}

export async function loadModelAndFrame({ modelRoot, camera, controls, modelStatus }) {
  const loader = new GLTFLoader();
  const setStatus = (text) => {
    if (modelStatus) {
      modelStatus.textContent = text;
    }
  };

  setStatus("Loading showcase model...");

  let model;
  try {
    const gltf = await loader.loadAsync(concertoModelUrl);
    model = gltf.scene;
    setStatus("Showcase model loaded: Concerto");
  } catch (error) {
    model = createFallbackModel();
    setStatus("Using fallback model (concerto.glb unavailable)");
    console.warn("Could not load concerto.glb, using fallback geometry.", error);
  }

  modelRoot.clear();
  normalizeModel(model);
  enableShadowCasting(model);
  modelRoot.add(model);

  return frameModelInView(model, camera, controls);
}
