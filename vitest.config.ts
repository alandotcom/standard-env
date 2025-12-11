// oxlint-disable-next-line eslint-plugin-import(extensions)
import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    environment: "node",
    exclude: ["dist/**", "node_modules/**"],
  },
});
