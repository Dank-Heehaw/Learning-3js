import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as THREE from "three";

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
  const resetAnimation = {
    active: false,
    startTimeMs: 0,
    durationMs: 900,
    fromCameraPosition: camera.position.clone(),
    fromTarget: controls.target.clone(),
    toCameraPosition: baseline.cameraPosition.clone(),
    toTarget: baseline.target.clone()
  };
  let turntableEnabled = false;

  function setBaseline(cameraPosition, target) {
    baseline.cameraPosition.copy(cameraPosition);
    baseline.target.copy(target);
  }

  function cancelResetAnimation() {
    resetAnimation.active = false;
  }

  function resetToBaseline({ animated = true, durationMs = 900 } = {}) {
    if (!animated) {
      cancelResetAnimation();
      camera.position.copy(baseline.cameraPosition);
      controls.target.copy(baseline.target);
      controls.update();
      return;
    }

    resetAnimation.active = true;
    resetAnimation.startTimeMs = performance.now();
    resetAnimation.durationMs = Math.max(100, durationMs);
    resetAnimation.fromCameraPosition.copy(camera.position);
    resetAnimation.fromTarget.copy(controls.target);
    resetAnimation.toCameraPosition.copy(baseline.cameraPosition);
    resetAnimation.toTarget.copy(baseline.target);
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function update() {
    if (resetAnimation.active) {
      const elapsed = performance.now() - resetAnimation.startTimeMs;
      const progress = THREE.MathUtils.clamp(elapsed / resetAnimation.durationMs, 0, 1);
      const easedProgress = easeOutCubic(progress);

      camera.position.lerpVectors(
        resetAnimation.fromCameraPosition,
        resetAnimation.toCameraPosition,
        easedProgress
      );
      controls.target.lerpVectors(resetAnimation.fromTarget, resetAnimation.toTarget, easedProgress);

      if (progress >= 1) {
        resetAnimation.active = false;
      }
    }

    controls.autoRotate = turntableEnabled;
    controls.update();
  }

  function setTurntableEnabled(enabled) {
    turntableEnabled = Boolean(enabled);
  }

  function isTurntableEnabled() {
    return turntableEnabled;
  }

  function setZoomLimits(minDistance, maxDistance) {
    controls.minDistance = Math.max(0.01, minDistance);
    controls.maxDistance = Math.max(controls.minDistance + 0.01, maxDistance);
  }

  controls.addEventListener("start", () => {
    cancelResetAnimation();
  });

  return {
    controls,
    update,
    setBaseline,
    resetToBaseline,
    setZoomLimits,
    setTurntableEnabled,
    isTurntableEnabled
  };
}

export function deriveZoomLimitsFromRadius(radius) {
  const safeRadius = Math.max(0.35, radius);
  return {
    minDistance: safeRadius * 0.12,
    maxDistance: safeRadius * 30
  };
}
