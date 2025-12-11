import { type } from "arktype";
import { describe, expect, it } from "vitest";
import { EnvValidationError } from "./errors.ts";
import { envParse } from "./structured.ts";

describe("envParse", () => {
  it("should parse simple flat config", () => {
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
    expect(typeof result.port).toBe("number");
    expect(typeof result.nodeEnv).toBe("string");
  });

  it("should use defaults when env vars are missing", () => {
    const env = {
      // PORT missing, should use default
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

    expect(result.port).toBe(8080); // from default
    expect(result.nodeEnv).toBe("production"); // from env
  });

  it("should handle nested config structure", () => {
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

  it("should handle deep nesting", () => {
    const env = {
      DATABASE_URL: "postgresql://localhost:5432/app",
      REDIS_URL: "redis://localhost:6379",
      JWT_SECRET: "super-secret",
    };

    const result = envParse(env, {
      db: {
        primary: {
          url: {
            format: type("string"),
            env: "DATABASE_URL",
          },
        },
        cache: {
          redis: {
            url: {
              format: type("string"),
              env: "REDIS_URL",
            },
          },
        },
      },
      auth: {
        jwt: {
          secret: {
            format: type("string"),
            env: "JWT_SECRET",
          },
        },
      },
    });

    expect(result.db.primary.url).toBe("postgresql://localhost:5432/app");
    expect(result.db.cache.redis.url).toBe("redis://localhost:6379");
    expect(result.auth.jwt.secret).toBe("super-secret");
  });

  it("should apply arktype transformations", () => {
    const env = {
      PORT: "3000",
      MAX_CONNECTIONS: "100",
      FEATURES: "auth,logging,metrics",
      ENABLE_SSL: "true",
    };

    const result = envParse(env, {
      server: {
        port: {
          format: type("string.numeric.parse"),
          env: "PORT",
        },
        maxConnections: {
          format: type("string.numeric.parse"),
          env: "MAX_CONNECTIONS",
        },
        features: {
          format: type("string").pipe((s) => s.split(",").map((f) => f.trim())),
          env: "FEATURES",
        },
        ssl: {
          format: type("string").pipe((s) => s === "true"),
          env: "ENABLE_SSL",
        },
      },
    });

    expect(result.server.port).toBe(3000);
    expect(result.server.maxConnections).toBe(100);
    expect(result.server.features).toEqual(["auth", "logging", "metrics"]);
    expect(result.server.ssl).toBe(true);
  });

  it("should throw validation error for missing required env vars", () => {
    const env = {
      // DATABASE_URL is missing and no default provided
    };

    expect(() => {
      envParse(env, {
        db: {
          url: {
            format: type("string"),
            env: "DATABASE_URL", // required, no default
          },
        },
      });
    }).toThrow(EnvValidationError);
  });

  it("should throw validation error for invalid values", () => {
    const env = {
      PORT: "not-a-number",
    };

    expect(() => {
      envParse(env, {
        server: {
          port: {
            format: type("string.numeric.parse"),
            env: "PORT",
          },
        },
      });
    }).toThrow(EnvValidationError);
  });

  it("should provide meaningful error messages", () => {
    const env = {
      NODE_ENV: "invalid-env",
    };

    try {
      envParse(env, {
        nodeEnv: {
          format: type('"development" | "production" | "test"'),
          env: "NODE_ENV",
        },
      });
      expect.unreachable("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError);
      const envError = error as EnvValidationError;
      expect(envError.message).toContain("NODE_ENV");
      expect(envError.vendor).toBe("arktype");
    }
  });

  it("should handle mixed defaults and env vars", () => {
    const env = {
      DATABASE_URL: "postgresql://localhost:5432/prod",
      // PORT missing, will use default
      NODE_ENV: "production",
      // DEBUG missing, will use default
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
        nodeEnv: {
          format: type('"development" | "production" | "test"'),
          default: "development",
          env: "NODE_ENV",
        },
        debug: {
          format: type("string").pipe((s) => s === "true"),
          default: false,
          env: "DEBUG",
        },
      },
    });

    expect(result.db.url).toBe("postgresql://localhost:5432/prod");
    expect(result.server.port).toBe(8080); // default
    expect(result.server.nodeEnv).toBe("production"); // from env
    expect(result.server.debug).toBe(false); // default
  });

  it("should handle optional properties that are not set", () => {
    const env = {
      DATABASE_URL: "postgresql://localhost:5432/test",
      // REDIS_URL is optional and not provided
      // API_KEY is optional and not provided
    };

    const result = envParse(env, {
      db: {
        url: {
          format: type("string"),
          env: "DATABASE_URL",
        },
        redis: {
          url: {
            format: type("string"),
            env: "REDIS_URL",
            optional: true,
          },
        },
      },
      auth: {
        apiKey: {
          format: type("string"),
          env: "API_KEY",
          optional: true,
        },
      },
    });

    expect(result.db.url).toBe("postgresql://localhost:5432/test");
    expect(result.db.redis.url).toBeUndefined();
    expect(result.auth.apiKey).toBeUndefined();
  });

  it("should handle optional properties with values provided", () => {
    const env = {
      DATABASE_URL: "postgresql://localhost:5432/test",
      REDIS_URL: "redis://localhost:6379",
      API_KEY: "secret-key-123",
    };

    const result = envParse(env, {
      db: {
        url: {
          format: type("string"),
          env: "DATABASE_URL",
        },
        redis: {
          url: {
            format: type("string"),
            env: "REDIS_URL",
            optional: true,
          },
        },
      },
      auth: {
        apiKey: {
          format: type("string"),
          env: "API_KEY",
          optional: true,
        },
      },
    });

    expect(result.db.url).toBe("postgresql://localhost:5432/test");
    expect(result.db.redis.url).toBe("redis://localhost:6379");
    expect(result.auth.apiKey).toBe("secret-key-123");
  });

  it("should handle optional properties with defaults", () => {
    const env = {
      DATABASE_URL: "postgresql://localhost:5432/test",
      // CACHE_TTL is optional but has a default
      // LOG_LEVEL is optional and provided
      LOG_LEVEL: "debug",
    };

    const result = envParse(env, {
      db: {
        url: {
          format: type("string"),
          env: "DATABASE_URL",
        },
      },
      cache: {
        ttl: {
          format: type("string.numeric.parse"),
          env: "CACHE_TTL",
          default: 3600,
          optional: true,
        },
      },
      logging: {
        level: {
          format: type('"debug" | "info" | "warn" | "error"'),
          env: "LOG_LEVEL",
          default: "info",
          optional: true,
        },
      },
    });

    expect(result.db.url).toBe("postgresql://localhost:5432/test");
    expect(result.cache.ttl).toBe(3600); // from default
    expect(result.logging.level).toBe("debug"); // from env
  });

  it("should handle mixed required and optional properties", () => {
    const env = {
      DATABASE_URL: "postgresql://localhost:5432/test",
      PORT: "3000",
      // DEBUG is optional and not provided
      // FEATURE_FLAGS is optional and provided
      FEATURE_FLAGS: "auth,billing",
    };

    const result = envParse(env, {
      db: {
        url: {
          format: type("string"),
          env: "DATABASE_URL", // required
        },
      },
      server: {
        port: {
          format: type("string.numeric.parse"),
          env: "PORT", // required
        },
        debug: {
          format: type("string").pipe((s) => s === "true"),
          env: "DEBUG",
          optional: true, // optional
        },
        featureFlags: {
          format: type("string").pipe((s) => s.split(",").map((f) => f.trim())),
          env: "FEATURE_FLAGS",
          optional: true, // optional
        },
      },
    });

    expect(result.db.url).toBe("postgresql://localhost:5432/test");
    expect(result.server.port).toBe(3000);
    expect(result.server.debug).toBeUndefined();
    expect(result.server.featureFlags).toEqual(["auth", "billing"]);
  });

  it("should include undefined in the inferred type for optional properties", () => {
    const result = envParse(
      {},
      {
        maybePort: {
          format: type("string.numeric.parse"),
          env: "PORT",
          optional: true,
        },
      },
    );

    expect(result.maybePort).toBeUndefined();
    const optionalCheck: typeof result.maybePort extends number | undefined ? true : false = true;
    const nonAssignableCheck: typeof result.maybePort extends number ? true : false = false;
    expect(optionalCheck).toBe(true);
    expect(nonAssignableCheck).toBe(false);
  });

  it("should treat optional properties with defaults as required", () => {
    const result = envParse(
      {},
      {
        maybePortWithDefault: {
          format: type("string.numeric.parse"),
          default: 3000,
          env: "PORT",
          optional: true,
        },
      },
    );

    expect(result.maybePortWithDefault).toBe(3000);
    const ensureNumber: number = result.maybePortWithDefault;
    expect(ensureNumber).toBe(3000);
  });

  it("should keep required properties required when siblings are optional", () => {
    const result = envParse(
      {},
      {
        server: {
          allowedOrigins: {
            format: type("string").pipe((value) => value.split(",")),
            default: ["http://localhost:3000"],
            env: "ALLOWED_ORIGINS",
          },
          debug: {
            format: type("string").pipe((flag) => flag === "true"),
            env: "DEBUG",
            optional: true,
          },
        },
      },
    );

    const origins: string[] = result.server.allowedOrigins;
    expect(origins).toEqual(["http://localhost:3000"]);
  });

  it("aggregates validation issues across multiple variables", () => {
    const env = {
      PORT: "not-a-number",
    };

    const parseEnv = () =>
      envParse(env, {
        port: {
          format: type("string.numeric.parse"),
          env: "PORT",
        },
        nodeEnv: {
          format: type('"development" | "production" | "test"'),
          env: "NODE_ENV",
        },
      });

    expect(parseEnv).toThrow(EnvValidationError);

    try {
      parseEnv();
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError);
      const validationIssues = (error as EnvValidationError).issues;
      expect(validationIssues).toHaveLength(2);
      const messages = validationIssues.map((issue) => issue.message);
      expect(messages).toEqual(
        expect.arrayContaining([
          expect.stringContaining("PORT"),
          expect.stringContaining("NODE_ENV"),
        ]),
      );
    }
  });

  it("should enforce correct default types at compile time", () => {
    const BooleanSchema = type('"true" | "false"').pipe((s) => s === "true");
    const env = { PORT: "8080" };

    const _badConfig = envParse(env, {
      enableLogs: {
        // @ts-expect-error - default should be boolean (output type), not string
        format: BooleanSchema,
        // @ts-expect-error - default should be boolean (output type), not string
        default: "bla", // TypeScript should error: string not assignable to boolean
        // @ts-expect-error - default should be boolean (output type), not string
        env: "SENTRY_ENABLE_LOGS",
      },
      enableLogs2: {
        // @ts-expect-error - default should be boolean (output type), not string
        format: BooleanSchema,
        // @ts-expect-error - default should be boolean (output type), not string
        default: "true", // TypeScript should error: string not assignable to boolean
        // @ts-expect-error - default should be boolean (output type), not string
        env: "SENTRY_ENABLE_LOGS",
      },
    });

    // This should work fine - correct output type
    const goodConfig = {
      enableLogs: {
        format: BooleanSchema,
        default: true, // Correct: boolean output type
        env: "SENTRY_ENABLE_LOGS",
      },
      port: {
        format: type("string.numeric.parse"),
        default: 3000, // Correct: number output type
        env: "PORT",
      },
    };

    const result = envParse(env, goodConfig);
    expect(result.enableLogs).toBe(true); // from default
    expect(result.port).toBe(8080); // from env (validated)
  });
});
