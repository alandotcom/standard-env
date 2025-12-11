import { z } from "zod";
import { describe, expect, it } from "vitest";
import { EnvValidationError } from "../src/errors.ts";
import { envParse } from "../src/structured.ts";

describe("envParse (zod)", () => {
  it("parses values and applies transforms", () => {
    const env = { PORT: "3000", DEBUG: "true" };

    const result = envParse(env, {
      port: {
        format: z.string().transform(Number),
        env: "PORT",
      },
      debug: {
        format: z.string().transform((s) => s === "true"),
        default: false,
        env: "DEBUG",
      },
    });

    expect(result.port).toBe(3000);
    expect(result.debug).toBe(true);
  });

  it("reports zod as vendor on error", () => {
    expect(() => {
      envParse(
        { PORT: "nope" },
        {
          port: {
            format: z.string().regex(/^\d+$/).transform(Number),
            env: "PORT",
          },
        },
      );
    }).toThrow(EnvValidationError);

    try {
      envParse(
        { PORT: "nope" },
        {
          port: {
            format: z.string().regex(/^\d+$/).transform(Number),
            env: "PORT",
          },
        },
      );
    } catch (error) {
      if (error instanceof EnvValidationError) {
        expect(error.vendor).toBe("zod");
        return;
      }
      throw error;
    }
  });
});
