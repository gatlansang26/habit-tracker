import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/*.test.ts"],
    // worktrees live inside the repo; their tests must not run here
    exclude: [...configDefaults.exclude, ".worktrees/**"],
    alias: { "@/": new URL("./", import.meta.url).pathname },
  },
});
