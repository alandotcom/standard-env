import { defineProject } from "vitest/config";

export default defineProject({
  name: "@fountain/env",
  test: {
    // Inherits globals from root config
    environment: "node",
  },
});
