import "../../../src/scss/style.scss";
import { createControls, deriveZoomLimitsFromRadius } from "./controls.js";
import { MODEL_CATALOG, loadModelAndFrame } from "./model-pipeline.js";
import { createSceneCore } from "./scene-core.js";
import { DEFAULT_MODEL_LIGHTING, DEFAULT_MODEL_RENDER_OVERRIDES } from "./model-overrides.js";

const sceneRoot = document.querySelector("#scene-root");
const resetViewBtn = document.querySelector("#reset-view-btn");
const turntableBtn = document.querySelector("#turntable-btn");
const modelStatus = document.querySelector("#model-status");
const displayedModelName = document.querySelector("#displayed-model-name");
const modelPickerBtn = document.querySelector("#model-picker-btn");
const modelPickerList = document.querySelector("#model-picker-list");
const sceneLoader = document.querySelector("#scene-loader");
const sceneLoaderText = document.querySelector("#scene-loader-text");
const controlsOverview = document.querySelector("#controls-overview");

if (!sceneRoot) {
  throw new Error("Scene root element '#scene-root' was not found.");
}

if (!modelPickerBtn || !modelPickerList) {
  throw new Error("Model picker controls were not found.");
}

const core = createSceneCore(sceneRoot);
const controlsApi = createControls(core.camera, core.renderer.domElement);
let activeLoadId = 0;
const FALLBACK_SELECTION = {
  id: "__fallback__",
  label: "Fallback Primitive",
  backgroundColor: "#7a818c",
  lighting: DEFAULT_MODEL_LIGHTING,
  renderOverrides: DEFAULT_MODEL_RENDER_OVERRIDES
};
let currentModelId = MODEL_CATALOG[0]?.id ?? FALLBACK_SELECTION.id;
let currentAnimationController = {
  update() {},
  stop() {}
};
let previousFrameTimeMs = performance.now();

function parseHexColor(hex) {
  const normalized = hex.replace("#", "").trim();
  if (normalized.length === 3) {
    const r = parseInt(normalized[0] + normalized[0], 16);
    const g = parseInt(normalized[1] + normalized[1], 16);
    const b = parseInt(normalized[2] + normalized[2], 16);
    return { r, g, b };
  }
  if (normalized.length === 6) {
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    return { r, g, b };
  }
  return null;
}

function toLinearSrgb(channel) {
  const c = channel / 255;
  if (c <= 0.04045) {
    return c / 12.92;
  }
  return Math.pow((c + 0.055) / 1.055, 2.4);
}

function getRelativeLuminance({ r, g, b }) {
  return 0.2126 * toLinearSrgb(r) + 0.7152 * toLinearSrgb(g) + 0.0722 * toLinearSrgb(b);
}

function setHudTitleContrastColor(backgroundColor) {
  const parsed = parseHexColor(backgroundColor ?? "");
  if (!parsed) {
    document.documentElement.style.setProperty("--hud-title-color", "#ffffff");
    return;
  }
  const luminance = getRelativeLuminance(parsed);
  const titleColor = luminance > 0.35 ? "#0b1220" : "#ffffff";
  document.documentElement.style.setProperty("--hud-title-color", titleColor);
}

function bindResetButton() {
  resetViewBtn?.addEventListener("click", () => {
    controlsApi.resetToBaseline({ animated: true, durationMs: 900 });
  });
}

function bindTurntableButton() {
  if (!turntableBtn) {
    return;
  }

  turntableBtn.addEventListener("click", () => {
    const nextState = !controlsApi.isTurntableEnabled();
    controlsApi.setTurntableEnabled(nextState);
    turntableBtn.classList.toggle("is-active", nextState);
    turntableBtn.setAttribute("aria-pressed", String(nextState));
    turntableBtn.textContent = nextState ? "Turntable On" : "Turntable";
  });
}

function getModelById(modelId) {
  return MODEL_CATALOG.find((entry) => entry.id === modelId) ?? MODEL_CATALOG[0] ?? FALLBACK_SELECTION;
}

function closeModelPicker() {
  modelPickerList.classList.add("is-hidden");
  modelPickerBtn.setAttribute("aria-expanded", "false");
}

function openModelPicker() {
  modelPickerList.classList.remove("is-hidden");
  modelPickerBtn.setAttribute("aria-expanded", "true");
}

function syncPickerSelection() {
  const buttons = modelPickerList.querySelectorAll("button[data-model-id]");
  buttons.forEach((button) => {
    const isSelected = button.dataset.modelId === currentModelId;
    button.classList.toggle("is-selected", isSelected);
    button.setAttribute("aria-selected", String(isSelected));
  });
}

function setBarModelText(modelName) {
  if (displayedModelName) {
    displayedModelName.textContent = modelName;
  }
  modelPickerBtn.textContent = modelName;
}

function setLoadingState(isLoading) {
  if (resetViewBtn) {
    resetViewBtn.disabled = isLoading;
  }
  if (turntableBtn) {
    turntableBtn.disabled = isLoading;
  }
  modelPickerBtn.disabled = isLoading || MODEL_CATALOG.length === 0;
  modelPickerBtn.classList.toggle("is-loading", isLoading);
  modelStatus?.classList.toggle("is-loading", isLoading);
  sceneLoader?.classList.toggle("is-hidden", !isLoading);
}

function buildModelPicker() {
  if (MODEL_CATALOG.length === 0) {
    modelPickerList.innerHTML = "";
    modelPickerBtn.textContent = "No Models";
    modelPickerBtn.disabled = true;
    return;
  }

  const optionsMarkup = MODEL_CATALOG.map(
    (model) => `
      <li role="presentation">
        <button
          type="button"
          role="option"
          aria-selected="false"
          data-model-id="${model.id}"
          class="model-picker-option"
        >
          ${model.label}
        </button>
      </li>
    `
  ).join("");

  modelPickerList.innerHTML = optionsMarkup;
  syncPickerSelection();

  modelPickerList.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }
    const option = event.target.closest("button[data-model-id]");
    if (!option) {
      return;
    }

    const selectedModelId = option.dataset.modelId;
    if (!selectedModelId || selectedModelId === currentModelId) {
      closeModelPicker();
      return;
    }

    closeModelPicker();
    loadSelectedModel(selectedModelId);
  });

  modelPickerBtn.addEventListener("click", () => {
    if (modelPickerList.classList.contains("is-hidden")) {
      openModelPicker();
      return;
    }
    closeModelPicker();
  });

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }
    const pickerContainer = event.target.closest(".model-picker");
    if (!pickerContainer) {
      closeModelPicker();
    }
  });
}

function setupResizeHandling() {
  const handleResize = () => {
    core.updateSize();
  };
  window.addEventListener("resize", handleResize);
  handleResize();
}

function showControlsOverview(durationMs = 4200) {
  if (!controlsOverview) {
    return;
  }
  controlsOverview.classList.remove("is-hidden");
  window.setTimeout(() => {
    controlsOverview.classList.add("is-hidden");
  }, durationMs);
}

async function loadSelectedModel(modelId) {
  const selectedModel = getModelById(modelId);
  const loadId = ++activeLoadId;
  currentAnimationController.stop();
  currentAnimationController = { update() {}, stop() {} };
  currentModelId = selectedModel.id;
  core.setBackgroundColor(selectedModel.backgroundColor ?? "#7a818c");
  setHudTitleContrastColor(selectedModel.backgroundColor ?? "#7a818c");
  core.setLightingLevels(selectedModel.lighting ?? DEFAULT_MODEL_LIGHTING);
  core.setRenderStyle(selectedModel.renderOverrides ?? DEFAULT_MODEL_RENDER_OVERRIDES);
  syncPickerSelection();
  setLoadingState(true);
  setBarModelText(selectedModel.label);
  if (sceneLoaderText) {
    sceneLoaderText.textContent = `Loading ${selectedModel.label}...`;
  }
  try {
    const frame = await loadModelAndFrame({
      modelRoot: core.modelRoot,
      camera: core.camera,
      controls: controlsApi.controls,
      modelStatus,
      modelId: selectedModel.id
    });

    if (loadId !== activeLoadId) {
      frame.animationController?.stop?.();
      return;
    }

    currentAnimationController = frame.animationController ?? currentAnimationController;
    controlsApi.setBaseline(frame.cameraPosition, frame.target);
    const zoomLimits = deriveZoomLimitsFromRadius(frame.radius);
    controlsApi.setZoomLimits(zoomLimits.minDistance, zoomLimits.maxDistance);
    setBarModelText(frame.modelName ?? selectedModel.label);
    core.setBackgroundColor(frame.backgroundColor ?? selectedModel.backgroundColor ?? "#7a818c");
    setHudTitleContrastColor(frame.backgroundColor ?? selectedModel.backgroundColor ?? "#7a818c");
    core.setLightingLevels(frame.lighting ?? selectedModel.lighting ?? DEFAULT_MODEL_LIGHTING);
    core.setRenderStyle(
      frame.renderOverrides ?? selectedModel.renderOverrides ?? DEFAULT_MODEL_RENDER_OVERRIDES
    );
  } catch (error) {
    console.error("Model load failed unexpectedly.", error);
    modelStatus.textContent = `Unable to load ${selectedModel.label}.`;
    if (sceneLoaderText) {
      sceneLoaderText.textContent = `Unable to load ${selectedModel.label}.`;
    }
  } finally {
    if (loadId === activeLoadId) {
      setLoadingState(false);
    }
  }
}

async function initModel() {
  await loadSelectedModel(currentModelId);
}

function animate() {
  const now = performance.now();
  const deltaSeconds = Math.min(0.1, (now - previousFrameTimeMs) / 1000);
  previousFrameTimeMs = now;
  currentAnimationController.update(deltaSeconds);
  controlsApi.update();
  core.render();
  requestAnimationFrame(animate);
}

bindResetButton();
bindTurntableButton();
buildModelPicker();
setupResizeHandling();
showControlsOverview();
initModel();
animate();
