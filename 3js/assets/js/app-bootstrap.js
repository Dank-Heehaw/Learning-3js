import "../../../src/scss/style.scss";
import { createControls, deriveZoomLimitsFromRadius } from "./controls.js";
import { MODEL_CATALOG, loadModelAndFrame } from "./model-pipeline.js";
import { createSceneCore } from "./scene-core.js";

const sceneRoot = document.querySelector("#scene-root");
const resetViewBtn = document.querySelector("#reset-view-btn");
const modelStatus = document.querySelector("#model-status");
const displayedModelName = document.querySelector("#displayed-model-name");
const modelPickerBtn = document.querySelector("#model-picker-btn");
const modelPickerList = document.querySelector("#model-picker-list");
const sceneLoader = document.querySelector("#scene-loader");
const sceneLoaderText = document.querySelector("#scene-loader-text");

if (!sceneRoot) {
  throw new Error("Scene root element '#scene-root' was not found.");
}

if (!modelPickerBtn || !modelPickerList) {
  throw new Error("Model picker controls were not found.");
}

const core = createSceneCore(sceneRoot);
const controlsApi = createControls(core.camera, core.renderer.domElement);
let activeLoadId = 0;
let currentModelId = MODEL_CATALOG[0]?.id ?? "fallback";

function bindResetButton() {
  resetViewBtn?.addEventListener("click", () => {
    controlsApi.resetToBaseline();
  });
}

function getModelById(modelId) {
  return MODEL_CATALOG.find((entry) => entry.id === modelId) ?? MODEL_CATALOG[0];
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
  modelPickerBtn.disabled = isLoading;
  modelPickerBtn.classList.toggle("is-loading", isLoading);
  modelStatus?.classList.toggle("is-loading", isLoading);
  sceneLoader?.classList.toggle("is-hidden", !isLoading);
}

function buildModelPicker() {
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

async function loadSelectedModel(modelId) {
  const selectedModel = getModelById(modelId);
  const loadId = ++activeLoadId;
  currentModelId = selectedModel.id;
  core.setBackgroundColor(selectedModel.backgroundColor ?? "#7a818c");
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
      return;
    }

    controlsApi.setBaseline(frame.cameraPosition, frame.target);
    const zoomLimits = deriveZoomLimitsFromRadius(frame.radius);
    controlsApi.setZoomLimits(zoomLimits.minDistance, zoomLimits.maxDistance);
    setBarModelText(frame.modelName ?? selectedModel.label);
    core.setBackgroundColor(frame.backgroundColor ?? selectedModel.backgroundColor ?? "#7a818c");
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
  controlsApi.controls.update();
  core.render();
  requestAnimationFrame(animate);
}

bindResetButton();
buildModelPicker();
setupResizeHandling();
initModel();
animate();
