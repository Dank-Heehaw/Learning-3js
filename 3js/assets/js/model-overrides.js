export const DEFAULT_MODEL_BACKGROUND = "#7a818c";
export const DEFAULT_MODEL_LIGHTING = {
  ambient: 1,
  key: 1,
  fill: 1
};
export const DEFAULT_MODEL_RENDER_OVERRIDES = {
  exposure: 0.95,
  bloomStrength: 0.1,
  bloomRadius: 0.1,
  bloomThreshold: 0.1
};
export const DEFAULT_MODEL_MATERIAL_OVERRIDES = {
  // Multiplies emissive intensity for materials that have emissive channels.
  emissiveIntensityMultiplier: 1
};

// Edit this map to control per-model display settings.
// Keys can be either full file name (e.g. "ship_in_clouds.glb")
// or base name without extension (e.g. "ship_in_clouds").
export const MODEL_OVERRIDES_BY_FILE = {
  "concerto.glb": {
    label: "Concerto",
    backgroundColor: "#2b500b"
  },
  "che.glb": {
    label: "Drift Car",
    backgroundColor: "#c9ccd5"
  },
  "dae_diorama_-_grandmas_house.glb": {
    label: "Grandma's House",
    backgroundColor: "#7a818c"
  },
  "just_a_girl.glb": {
    label: "Just A Girl",
    backgroundColor: "#64506f"
  },
  "steelworks_factory_blast_furnace.glb": {
    label: "Steelworks Factory Blast Furnace",
    backgroundColor: "#857c6b"
  },
  "ship_in_clouds.glb": {
    label: "Ship In Clouds",
    backgroundColor: "#faece4",
    frame: { padding: 1.02, viewDirection: [-0.2, 0.18, -0.96] }
  },
  "terem.glb": {
    label: "Terem",
    backgroundColor: "#081a34",
    lighting: {
      ambient: 0.15,
      key: 0.35,
      fill: 0.18
    },
    renderOverrides: {
      bloomStrength: 0.5,
      bloomRadius: 0.1,
      bloomThreshold: 0.1
    },
    materialOverrides: {
      emissiveIntensityMultiplier: 1.5
    }
  }
};
