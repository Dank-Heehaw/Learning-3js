import "../../../src/scss/style.scss";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const sceneRoot = document.querySelector("#scene-root");
const resetViewBtn = document.querySelector("#reset-view-btn");
const modelStatus = document.querySelector("#model-status");
const tooltip = document.querySelector("#hotspot-tooltip");
const tooltipTitle = document.querySelector("#hotspot-title");
const tooltipDescription = document.querySelector("#hotspot-description");

if (!sceneRoot) {
  throw new Error("Scene root element '#scene-root' was not found.");
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0f172a);
scene.fog = new THREE.Fog(0x0b1220, 6, 14);

const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
camera.position.set(2.2, 1.35, 3.6);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
sceneRoot.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 1.5;
controls.maxDistance = 8;
controls.target.set(0, 0.2, 0);
const initialCameraPosition = new THREE.Vector3(2.2, 1.35, 3.6);
const initialControlTarget = new THREE.Vector3(0, 0.2, 0);
const desiredCameraPosition = initialCameraPosition.clone();
const desiredControlTarget = initialControlTarget.clone();

const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
keyLight.position.set(3, 4, 2);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0x60a5fa, 0.8);
rimLight.position.set(-3, 2, -3);
scene.add(rimLight);

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(6.5, 64),
  new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.95,
    metalness: 0.05
  })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -1;
ground.receiveShadow = true;
scene.add(ground);

const showcaseRoot = new THREE.Group();
showcaseRoot.position.y = -0.05;
scene.add(showcaseRoot);

const hoverScale = new THREE.Vector3(1.26, 1.26, 1.26);
const activeScale = new THREE.Vector3(1.38, 1.38, 1.38);
const defaultScale = new THREE.Vector3(1, 1, 1);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const scratchWorldPosition = new THREE.Vector3();

let productModel = null;
let hoveredHotspot = null;
let activeHotspot = null;
let hotspotMeshes = [];

const hotspotDefinitions = [
  {
    id: "visor",
    title: "Front Visor",
    description: "Hardened glass section that protects sensitive components while preserving a wide field of view.",
    markerPosition: new THREE.Vector3(0.06, 0.35, 0.5),
    cameraPosition: new THREE.Vector3(1.1, 1.1, 1.95),
    targetPosition: new THREE.Vector3(0.05, 0.34, 0.1)
  },
  {
    id: "module",
    title: "Sensor Module",
    description: "Precision side module that handles directional tracking and environment scanning.",
    markerPosition: new THREE.Vector3(0.78, 0.3, 0.05),
    cameraPosition: new THREE.Vector3(2.15, 1.2, 0.95),
    targetPosition: new THREE.Vector3(0.45, 0.24, 0.02)
  },
  {
    id: "rear",
    title: "Rear Frame",
    description: "Reinforced back housing for balance, cable routing, and thermal stability.",
    markerPosition: new THREE.Vector3(-0.62, 0.22, -0.38),
    cameraPosition: new THREE.Vector3(-1.9, 1.1, -1.55),
    targetPosition: new THREE.Vector3(-0.34, 0.2, -0.16)
  }
];

function createFallbackProduct() {
  const product = new THREE.Group();
  const shellMaterial = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.3,
    metalness: 0.62
  });
  const darkMaterial = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.5,
    metalness: 0.25
  });

  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.7, 48, 32), shellMaterial);
  shell.scale.set(1.2, 0.8, 1);
  shell.castShadow = true;
  product.add(shell);

  const visor = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 40, 24, 0, Math.PI),
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.42,
      roughness: 0.05,
      metalness: 0.3
    })
  );
  visor.rotation.y = Math.PI / 2;
  visor.position.set(0.44, 0.05, 0);
  visor.castShadow = true;
  product.add(visor);

  const sideModule = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.6, 24), darkMaterial);
  sideModule.rotation.z = Math.PI / 2;
  sideModule.position.set(0.78, 0.18, 0.05);
  sideModule.castShadow = true;
  product.add(sideModule);

  const rearCap = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.12, 24, 36), darkMaterial);
  rearCap.rotation.y = Math.PI / 2;
  rearCap.position.set(-0.62, 0.08, -0.05);
  rearCap.castShadow = true;
  product.add(rearCap);

  return product;
}

function normalizeModel(model, targetSize = 1.8) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const scalar = targetSize / maxDim;

  model.position.sub(center);
  model.scale.setScalar(scalar);
}

function createHotspots() {
  const geometry = new THREE.SphereGeometry(0.06, 20, 20);
  hotspotMeshes = hotspotDefinitions.map((definition, index) => {
    const material = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.7,
      roughness: 0.25,
      metalness: 0.15
    });
    const marker = new THREE.Mesh(geometry, material);
    marker.position.copy(definition.markerPosition);
    marker.userData = {
      ...definition,
      phaseOffset: index * 0.75
    };
    marker.castShadow = false;
    showcaseRoot.add(marker);
    return marker;
  });
}

async function loadShowcaseModel() {
  const loader = new GLTFLoader();
  const modelUrl = "https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@main/2.0/DamagedHelmet/glTF-Binary/DamagedHelmet.glb";

  try {
    const gltf = await loader.loadAsync(modelUrl);
    productModel = gltf.scene;
    normalizeModel(productModel);
    productModel.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    showcaseRoot.add(productModel);
    if (modelStatus) {
      modelStatus.textContent = "Showcase model loaded: Damaged Helmet";
    }
  } catch (error) {
    productModel = createFallbackProduct();
    showcaseRoot.add(productModel);
    if (modelStatus) {
      modelStatus.textContent = "Using fallback model (network unavailable)";
    }
    console.warn("GLTF model could not be loaded. Falling back to procedural product.", error);
  }
}

function updateSize() {
  const width = sceneRoot.clientWidth;
  const height = sceneRoot.clientHeight;

  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function updatePointerFromEvent(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function pickHotspot() {
  raycaster.setFromCamera(pointer, camera);
  const intersections = raycaster.intersectObjects(hotspotMeshes, false);
  return intersections.length > 0 ? intersections[0].object : null;
}

function updateTooltipScreenPosition() {
  if (!activeHotspot || !tooltip) {
    return;
  }

  const rect = renderer.domElement.getBoundingClientRect();
  activeHotspot.getWorldPosition(scratchWorldPosition);
  scratchWorldPosition.project(camera);
  const x = rect.left + ((scratchWorldPosition.x + 1) / 2) * rect.width;
  const y = rect.top + ((-scratchWorldPosition.y + 1) / 2) * rect.height;

  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
  tooltip.classList.toggle("is-hidden", scratchWorldPosition.z > 1);
}

function showTooltip(marker) {
  if (!tooltip || !tooltipTitle || !tooltipDescription) {
    return;
  }

  tooltipTitle.textContent = marker.userData.title;
  tooltipDescription.textContent = marker.userData.description;
  tooltip.classList.remove("is-hidden");
}

function hideTooltip() {
  tooltip?.classList.add("is-hidden");
}

function focusHotspot(marker) {
  activeHotspot = marker;
  desiredCameraPosition.copy(marker.userData.cameraPosition);
  desiredControlTarget.copy(marker.userData.targetPosition);
  showTooltip(marker);
}

function onPointerMove(event) {
  updatePointerFromEvent(event);
  hoveredHotspot = pickHotspot();
  renderer.domElement.style.cursor = hoveredHotspot ? "pointer" : "grab";
}

function onPointerDown(event) {
  updatePointerFromEvent(event);
  const clickedHotspot = pickHotspot();
  if (clickedHotspot) {
    focusHotspot(clickedHotspot);
  }
}

function resetView() {
  activeHotspot = null;
  hoveredHotspot = null;
  desiredCameraPosition.copy(initialCameraPosition);
  desiredControlTarget.copy(initialControlTarget);
  camera.position.copy(initialCameraPosition);
  controls.target.copy(initialControlTarget);
  controls.update();
  hideTooltip();
}

window.addEventListener("resize", updateSize);
renderer.domElement.addEventListener("pointermove", onPointerMove);
renderer.domElement.addEventListener("pointerdown", onPointerDown);
renderer.domElement.addEventListener("pointerleave", () => {
  hoveredHotspot = null;
  renderer.domElement.style.cursor = "grab";
});
resetViewBtn?.addEventListener("click", resetView);
updateSize();

createHotspots();
loadShowcaseModel();

const clock = new THREE.Clock();

function animate() {
  const elapsed = clock.getElapsedTime();
  showcaseRoot.rotation.y = Math.sin(elapsed * 0.2) * 0.18;
  showcaseRoot.position.y = -0.05 + Math.sin(elapsed * 1.1) * 0.03;

  for (const marker of hotspotMeshes) {
    const isHovered = marker === hoveredHotspot;
    const isActive = marker === activeHotspot;
    const targetScale = isActive ? activeScale : isHovered ? hoverScale : defaultScale;
    marker.scale.lerp(targetScale, 0.24);

    const baseIntensity = isActive ? 1.45 : isHovered ? 1.15 : 0.62;
    marker.material.emissiveIntensity =
      baseIntensity + Math.sin(elapsed * 4.4 + marker.userData.phaseOffset) * 0.16;
  }

  camera.position.lerp(desiredCameraPosition, 0.07);
  controls.target.lerp(desiredControlTarget, 0.09);

  controls.update();
  updateTooltipScreenPosition();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();
