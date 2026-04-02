import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export function createControls(camera, domElement) {
  const controls = new OrbitControls(camera, domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 0.2;
  controls.maxDistance = 200;
  controls.target.set(0, 0.2, 0);

  const baseline = {
    cameraPosition: camera.position.clone(),
    target: controls.target.clone()
  };

  function setBaseline(cameraPosition, target) {
    baseline.cameraPosition.copy(cameraPosition);
    baseline.target.copy(target);
  }

  function resetToBaseline() {
    camera.position.copy(baseline.cameraPosition);
    controls.target.copy(baseline.target);
    controls.update();
  }

  function setZoomLimits(minDistance, maxDistance) {
    controls.minDistance = Math.max(0.01, minDistance);
    controls.maxDistance = Math.max(controls.minDistance + 0.01, maxDistance);
  }

  return {
    controls,
    setBaseline,
    resetToBaseline,
    setZoomLimits
  };
}

export function deriveZoomLimitsFromRadius(radius) {
  const safeRadius = Math.max(0.35, radius);
  return {
    minDistance: safeRadius * 0.12,
    maxDistance: safeRadius * 30
  };
}
