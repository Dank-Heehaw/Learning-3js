import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

export function createSceneCore(sceneRoot) {
  const scene = new THREE.Scene();
  const defaultBackground = new THREE.Color("#2b500b");
  scene.background = defaultBackground.clone();
  scene.fog = new THREE.Fog(defaultBackground.clone().multiplyScalar(0.58), 6, 24);

  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 300);
  camera.position.set(2.4, 1.6, 4.2);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  sceneRoot.appendChild(renderer.domElement);

  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.8, 0.65, 0.2);
  composer.addPass(renderPass);
  composer.addPass(bloomPass);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.05);
  keyLight.position.set(4, 5, 3);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x9dd8ff, 0.55);
  fillLight.position.set(-3, 2.5, -4);
  scene.add(fillLight);

  const modelRoot = new THREE.Group();
  scene.add(modelRoot);

  function updateSize() {
    const width = sceneRoot.clientWidth;
    const height = sceneRoot.clientHeight;
    renderer.setSize(width, height, false);
    composer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function render() {
    composer.render();
  }

  function setBackgroundColor(colorValue) {
    const color = new THREE.Color(colorValue);
    scene.background = color;
    scene.fog.color.copy(color).multiplyScalar(0.58);
  }

  function setLightingLevels(lighting = {}) {
    ambientLight.intensity = lighting.ambient ?? 0.6;
    keyLight.intensity = lighting.key ?? 1.05;
    fillLight.intensity = lighting.fill ?? 0.55;
  }

  function setRenderStyle(renderOverrides = {}) {
    renderer.toneMappingExposure = renderOverrides.exposure ?? 1;
    bloomPass.strength = renderOverrides.bloomStrength ?? 0.8;
    bloomPass.radius = renderOverrides.bloomRadius ?? 0.65;
    bloomPass.threshold = renderOverrides.bloomThreshold ?? 0.2;
  }

  return {
    scene,
    camera,
    renderer,
    modelRoot,
    updateSize,
    render,
    setBackgroundColor,
    setLightingLevels,
    setRenderStyle
  };
}
