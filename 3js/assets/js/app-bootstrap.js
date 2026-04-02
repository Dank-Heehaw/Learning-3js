import "../../../src/scss/style.scss";
import { createControls, deriveZoomLimitsFromRadius } from "./controls.js";
import { loadModelAndFrame } from "./model-pipeline.js";
import { createSceneCore } from "./scene-core.js";

const sceneRoot = document.querySelector("#scene-root");
const resetViewBtn = document.querySelector("#reset-view-btn");
const modelStatus = document.querySelector("#model-status");

if (!sceneRoot) {
  throw new Error("Scene root element '#scene-root' was not found.");
}

const core = createSceneCore(sceneRoot);
const controlsApi = createControls(core.camera, core.renderer.domElement);

function bindResetButton() {
  resetViewBtn?.addEventListener("click", () => {
    controlsApi.resetToBaseline();
  });
}

function setupResizeHandling() {
  const handleResize = () => {
    core.updateSize();
  };
  window.addEventListener("resize", handleResize);
  handleResize();
}

async function initModel() {
  const frame = await loadModelAndFrame({
    modelRoot: core.modelRoot,
    camera: core.camera,
    controls: controlsApi.controls,
    modelStatus
  });

  controlsApi.setBaseline(frame.cameraPosition, frame.target);
  const zoomLimits = deriveZoomLimitsFromRadius(frame.radius);
  controlsApi.setZoomLimits(zoomLimits.minDistance, zoomLimits.maxDistance);
}

function animate() {
  controlsApi.controls.update();
  core.render();
  requestAnimationFrame(animate);
}

bindResetButton();
setupResizeHandling();
initModel();
animate();
