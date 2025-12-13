import { type } from "arktype";
import { z } from "zod";
import { describe, expect, it } from "vitest";
import { EnvValidationError } from "../src/errors.ts";
import { envParse } from "../src/structured.ts";

describe("envParse (mixed vendors)", () => {
  it("labels vendor as mixed when multiple validators used", () => {
    expect(() => {
      envParse(
        {},
        {
          port: {
            format: type("string.numeric.parse"),
            env: "PORT",
          },
          nodeEnv: {
            format: z.string(),
            env: "NODE_ENV",
          },
        },
      );
    }).toThrow(EnvValidationError);

    try {
      envParse(
        {},
        {
          port: {
            format: type("string.numeric.parse"),
            env: "PORT",
          },
          nodeEnv: {
            format: z.string(),
            env: "NODE_ENV",
          },
        },
      );
    } catch (error) {
      if (error instanceof EnvValidationError) {
        expect(error.vendor).toBe("mixed(arktype,zod)");
        return;
      }
      throw error;
    }
  });
});
