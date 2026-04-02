import { defineConfig } from "vite";

export default defineConfig({
  base: "/Learning-3js/",
  build: {
    outDir: "3js",
    assetsDir: "assets",
    emptyOutDir: false,
    rollupOptions: {
      output: {
        entryFileNames: "assets/js/[name]-[hash].js",
        chunkFileNames: "assets/js/[name]-[hash].js",
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith(".css")) {
            return "assets/css/[name]-[hash][extname]";
          }

          return "assets/[name]-[hash][extname]";
        }
      }
    }
  }
});
