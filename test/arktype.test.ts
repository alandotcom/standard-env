import { type } from "arktype";
import { describe, expect, it } from "vitest";
import { EnvValidationError } from "../src/errors.ts";
import { envParse } from "../src/structured.ts";

describe("envParse (arktype)", () => {
  it("parses simple flat config", () => {
    const env = {
      PORT: "3000",
      NODE_ENV: "development",
    };

    const result = envParse(env, {
      port: {
        format: type("string.numeric.parse"),
        default: 8080,
        env: "PORT",
      },
      nodeEnv: {
        format: type('"development" | "production" | "test"'),
        default: "development",
        env: "NODE_ENV",
      },
    });

    expect(result.port).toBe(3000);
    expect(result.nodeEnv).toBe("development");
  });

  it("uses defaults when env vars are missing", () => {
    const env = {
      NODE_ENV: "production",
    };

    const result = envParse(env, {
      port: {
        format: type("string.numeric.parse"),
        default: 8080,
        env: "PORT",
      },
      nodeEnv: {
        format: type('"development" | "production" | "test"'),
        default: "development",
        env: "NODE_ENV",
      },
    });

    expect(result.port).toBe(8080);
    expect(result.nodeEnv).toBe("production");
  });

  it("handles nested config structure", () => {
    const env = {
      DATABASE_URL: "postgresql://localhost:5432/test",
      PORT: "3000",
      CLERK_SECRET_KEY: "sk_test_123",
      DEBUG: "true",
    };

    const result = envParse(env, {
      db: {
        url: {
          format: type("string"),
          env: "DATABASE_URL",
        },
      },
      server: {
        port: {
          format: type("string.numeric.parse"),
          default: 8080,
          env: "PORT",
        },
        debug: {
          format: type("string").pipe((s) => s === "true"),
          default: false,
          env: "DEBUG",
        },
      },
      auth: {
        clerk: {
          secretKey: {
            format: type("string"),
            env: "CLERK_SECRET_KEY",
          },
        },
      },
    });

    expect(result.db.url).toBe("postgresql://localhost:5432/test");
    expect(result.server.port).toBe(3000);
    expect(result.server.debug).toBe(true);
    expect(result.auth.clerk.secretKey).toBe("sk_test_123");
  });

  it("throws validation error for missing required env vars", () => {
    expect(() => {
      envParse(
        {},
        {
          db: {
            url: {
              format: type("string"),
              env: "DATABASE_URL",
            },
          },
        },
      );
    }).toThrow(EnvValidationError);
  });

  it("provides vendor in error", () => {
    try {
      envParse(
        { NODE_ENV: "invalid-env" },
        {
          nodeEnv: {
            format: type('"development" | "production" | "test"'),
            env: "NODE_ENV",
          },
        },
      );
      expect.unreachable("Should have thrown");
    } catch (error) {
      if (error instanceof EnvValidationError) {
        expect(error.vendor).toBe("arktype");
        return;
      }
      throw error;
    }
  });
});
