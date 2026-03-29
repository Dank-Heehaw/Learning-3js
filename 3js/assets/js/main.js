import "./scss/style.scss";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const sceneRoot = document.querySelector("#scene-root");
const resetViewBtn = document.querySelector("#reset-view-btn");

if (!sceneRoot) {
  throw new Error("Scene root element '#scene-root' was not found.");
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0f172a);

const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
camera.position.set(1.8, 1.4, 3.4);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
sceneRoot.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 1.5;
controls.maxDistance = 8;
controls.target.set(0, 0.2, 0);
const initialCameraPosition = new THREE.Vector3(1.8, 1.4, 3.4);
const initialControlTarget = new THREE.Vector3(0, 0.2, 0);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 1.15);
keyLight.position.set(3, 4, 2);
keyLight.castShadow = true;
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0x60a5fa, 0.8);
rimLight.position.set(-3, 2, -3);
scene.add(rimLight);

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(5, 48),
  new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.95,
    metalness: 0.05
  })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.8;
ground.receiveShadow = true;
scene.add(ground);

const objectMaterial = new THREE.MeshStandardMaterial({
  color: 0x22d3ee,
  roughness: 0.25,
  metalness: 0.6,
  emissive: 0x0b1f3b,
  emissiveIntensity: 0.45
});

const objectMesh = new THREE.Mesh(
  new THREE.IcosahedronGeometry(0.8, 1),
  objectMaterial
);
objectMesh.castShadow = true;
objectMesh.position.y = 0.15;
scene.add(objectMesh);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let pulseUntil = 0;
let toggledColor = false;
const defaultScale = new THREE.Vector3(1, 1, 1);
const pulseScale = new THREE.Vector3(1.22, 1.22, 1.22);

function updateSize() {
  const width = sceneRoot.clientWidth;
  const height = sceneRoot.clientHeight;

  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function onPointerDown(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const intersections = raycaster.intersectObject(objectMesh, false);

  if (intersections.length > 0) {
    toggledColor = !toggledColor;
    objectMaterial.color.setHex(toggledColor ? 0xfb7185 : 0x22d3ee);
    pulseUntil = performance.now() + 220;
  }
}

function resetView() {
  camera.position.copy(initialCameraPosition);
  controls.target.copy(initialControlTarget);
  controls.update();
}

window.addEventListener("resize", updateSize);
renderer.domElement.addEventListener("pointerdown", onPointerDown);
resetViewBtn?.addEventListener("click", resetView);
updateSize();

const clock = new THREE.Clock();

function animate() {
  const elapsed = clock.getElapsedTime();
  const now = performance.now();

  objectMesh.rotation.x = elapsed * 0.48;
  objectMesh.rotation.y = elapsed * 0.76;
  objectMesh.position.y = 0.15 + Math.sin(elapsed * 1.3) * 0.08;

  if (now < pulseUntil) {
    objectMesh.scale.lerp(pulseScale, 0.24);
  } else {
    objectMesh.scale.lerp(defaultScale, 0.16);
  }

  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();
