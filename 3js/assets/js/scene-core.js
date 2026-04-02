import * as THREE from "three";

export function createSceneCore(sceneRoot) {
  const scene = new THREE.Scene();
  const defaultBackground = new THREE.Color("#2b500b");
  scene.background = defaultBackground.clone();
  scene.fog = new THREE.Fog(defaultBackground.clone().multiplyScalar(0.58), 6, 24);

  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 300);
  camera.position.set(2.4, 1.6, 4.2);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  sceneRoot.appendChild(renderer.domElement);

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
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function render() {
    renderer.render(scene, camera);
  }

  function setBackgroundColor(colorValue) {
    const color = new THREE.Color(colorValue);
    scene.background = color;
    scene.fog.color.copy(color).multiplyScalar(0.58);
  }

  return {
    scene,
    camera,
    renderer,
    modelRoot,
    updateSize,
    render,
    setBackgroundColor
  };
}
