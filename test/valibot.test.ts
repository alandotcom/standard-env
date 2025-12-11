import * as v from "valibot";
import { describe, expect, it } from "vitest";
import { EnvValidationError } from "../src/errors.ts";
import { envParse } from "../src/structured.ts";

describe("envParse (valibot)", () => {
  it("parses values and applies transforms", () => {
    const env = { PORT: "3000" };

    const result = envParse(env, {
      port: {
        format: v.pipe(
          v.string(),
          v.transform((s) => Number(s)),
        ),
        env: "PORT",
      },
    });

    expect(result.port).toBe(3000);
  });

  it("reports valibot as vendor on error", () => {
    expect(() => {
      envParse(
        { PORT: "nope" },
        {
          port: {
            format: v.pipe(
              v.string(),
              v.regex(/^\d+$/),
              v.transform((s) => Number(s)),
            ),
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
            format: v.pipe(
              v.string(),
              v.regex(/^\d+$/),
              v.transform((s) => Number(s)),
            ),
            env: "PORT",
          },
        },
      );
    } catch (error) {
      if (error instanceof EnvValidationError) {
        expect(error.vendor).toBe("valibot");
        return;
      }
      throw error;
    }
  });
});
