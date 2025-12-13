# Standard Env

![NPM Version](https://img.shields.io/npm/v/standardenv)

Type-safe, structured environment variable parsing using [Standard Schema](https://standardschema.dev/) compatible validation libraries.

## Features

- 🔒 **Type-safe** - Full TypeScript support with automatic type inference
- 🏗️ **Structured config** - Organize environment variables into nested objects
- 🚀 **Declarative API** - Define your config structure in a single object
- 🔄 **Library agnostic** - Works with any Standard Schema compatible library (arktype, zod, valibot, etc.)
- 🎯 **Default values & optional properties** - Flexible configuration with type safety
- 📦 **Zero runtime dependencies** - Lightweight and focused

## Installation

```bash
bun add standardenv

# Also install your preferred validation library
bun add arktype  # or zod, valibot, etc.
```

## Quick Start

```typescript
import { envParse } from "standardenv";
import { type } from "arktype";

const config = envParse(process.env, {
  server: {
    port: {
      format: type('string.numeric.parse'),
      default: 3000,
      env: 'PORT'
    },
    nodeEnv: {
      format: type('"development" | "production" | "test"'),
      default: 'development',
      env: 'NODE_ENV'
    }
  },
  db: {
    url: {
      format: type('string'),
      env: 'DATABASE_URL'
    }
  }
});

// config.server.port is number (3000)
// config.server.nodeEnv is string ('development' | 'production' | 'test')
// config.db.url is string
// All fully typed with zero additional type definitions needed! ✨
```

## Core Concepts

### Declarative Configuration

Instead of separate schemas and defaults, define everything in one place:

```typescript
const config = envParse(process.env, {
  // Nested structure for organization
  db: {
    url: {
      format: type('string'),           // Validation schema
      env: 'DATABASE_URL',             // Environment variable name
      // Required by default (no default provided)
    },
    maxConnections: {
      format: type('string.numeric.parse'),
      default: 10,                   // Default value
      env: 'DB_MAX_CONNECTIONS',
    }
  },

  server: {
    port: {
      format: type('string.numeric.parse'),
      default: 3000,
      env: 'PORT',
    },
    debug: {
      format: type('string').pipe(s => s === 'true'),
      default: false,
      env: 'DEBUG',
    }
  }
});
```

### Property Configuration

Each property has these fields:

- **`format`**: StandardSchema validator (required)
- **`env`**: Environment variable name (required)
- **`default`**: Default value (optional)
- **`optional`**: If true, property can be undefined (optional)

## Optional Properties

Mark properties as optional when they might not be set:

```typescript
const config = envParse(process.env, {
  db: {
    url: {
      format: type('string'),
      env: 'DATABASE_URL', // Required - will throw if missing
    },
    redis: {
      url: {
        format: type('string'),
        env: 'REDIS_URL',
        optional: true, // Optional - will be undefined if not set
      }
    }
  },
  features: {
    analytics: {
      format: type('string').pipe(s => s === 'true'),
      env: 'ENABLE_ANALYTICS',
      optional: true, // Optional - will be undefined if not set
    }
  }
});

// TypeScript knows:
// config.db.url: string (required)
// config.db.redis.url: string | undefined (optional)
// config.features.analytics: boolean | undefined (optional)
```

## Type Transformations

Environment variables are strings, but you often need other types:

### Common Transformations with arktype

```typescript
import { envParse } from "standardenv";
import { type } from "arktype";

const config = envParse(process.env, {
  server: {
    // String to number
    port: {
      format: type('string.numeric.parse'),
      default: 3000,
      env: 'PORT',
    },

    // String to boolean
    debug: {
      format: type('string').pipe(s => s === 'true' || s === '1'),
      default: false,
      env: 'DEBUG',
    },

    // String to array
    allowedOrigins: {
      format: type('string').pipe(s => s.split(',').map(origin => origin.trim())),
      default: ['http://localhost:3000'],
      env: 'ALLOWED_ORIGINS',
    },

    // String to JSON object
    featureFlags: {
      format: type('string').pipe((s): Record<string, boolean> => {
        try {
          return JSON.parse(s);
        } catch {
          return {};
        }
      }),
      default: {},
      env: 'FEATURE_FLAGS',
    }
  }
});

// Result types:
// config.server.port: number
// config.server.debug: boolean
// config.server.allowedOrigins: string[]
// config.server.featureFlags: Record<string, boolean>
```

## Deeply Nested Configuration

Organize complex applications with deep nesting:

```typescript
const config = envParse(process.env, {
  database: {
    primary: {
      url: {
        format: type('string'),
        env: 'DATABASE_URL',
      },
      maxConnections: {
        format: type('string.numeric.parse'),
        default: 20,
        env: 'DB_MAX_CONNECTIONS',
      }
    },
    cache: {
      redis: {
        url: {
          format: type('string'),
          env: 'REDIS_URL',
          optional: true,
        },
        ttl: {
          format: type('string.numeric.parse'),
          default: 3600,
          env: 'CACHE_TTL',
        }
      }
    }
  },

  auth: {
    jwt: {
      secret: {
        format: type('string'),
        env: 'JWT_SECRET',
      },
      expiresIn: {
        format: type('string'),
        default: '7d',
        env: 'JWT_EXPIRES_IN',
      }
    },
    oauth: {
      providers: {
        format: type('string').pipe(s => s.split(',')),
        default: ['google', 'github'],
        env: 'OAUTH_PROVIDERS',
      }
    }
  },

  logging: {
    level: {
      format: type('"debug" | "info" | "warn" | "error"'),
      default: 'info',
      env: 'LOG_LEVEL',
    },
    destination: {
      format: type('string'),
      default: 'console',
      env: 'LOG_DESTINATION',
      optional: true,
    }
  }
});

// Access with clean, organized structure:
// config.database.primary.url
// config.database.cache.redis.url
// config.auth.jwt.secret
// config.auth.oauth.providers
// config.logging.level
```

## Library Compatibility

Works with any [Standard Schema](https://standardschema.dev/) compatible library:

### Arktype

```typescript
import { type } from "arktype";

const config = envParse(process.env, {
  port: {
    format: type('string.numeric.parse'),
    env: 'PORT',
  }
});
```

### Zod

```typescript
import { z } from "zod";

const config = envParse(process.env, {
  port: {
    format: z.string().transform(Number),
    env: 'PORT',
  }
});
```

### Valibot

```typescript
import * as v from "valibot";

const config = envParse(process.env, {
  port: {
    format: v.pipe(v.string(), v.transform(Number)),
    env: 'PORT',
  }
});
```

## Error Handling

Get clear error messages for validation failures:

```typescript
import { EnvValidationError } from "standardenv";

try {
  const config = envParse(process.env, {
    port: {
      format: type('string.numeric.parse'),
      env: 'PORT', // Required, no default
    }
  });
} catch (error) {
  if (error instanceof EnvValidationError) {
    console.error("Environment validation failed:", error.message);
    console.error("Issues:", error.issues);
    console.error("Validator:", error.vendor);
  }
}
```

## API Reference

### `envParse(env, config)`

- **env**: `Record<string, string | undefined>` - Environment variables (typically `process.env`)
- **config**: `ConfigDefinition` - Declarative configuration structure

Returns the validated and typed configuration object with inferred types.

### Configuration Properties

Each property in your config can have:

- **`format`** (required): StandardSchema validator for the environment variable
- **`env`** (required): Environment variable name to read from
- **`default`** (optional): Default value (must be string - will be validated by format)
- **`optional`** (optional): If true, property will be `T | undefined` instead of `T`

### Error Classes

- **`EnvValidationError`** - Thrown when environment variables fail validation
- **`AsyncValidationError`** - Thrown when async validation is attempted (not supported)

## Best Practices

### ✅ Do

```typescript
// Organize related config into nested objects
const config = envParse(process.env, {
  database: {
    url: { format: type('string'), env: 'DATABASE_URL' },
    poolSize: { format: type('string.numeric.parse'), default: 10, env: 'DB_POOL_SIZE' }
  }
});

// Use meaningful default values
const config = envParse(process.env, {
  server: {
    port: { format: type('string.numeric.parse'), default: 3000, env: 'PORT' }
  }
});

// Mark truly optional config as optional
const config = envParse(process.env, {
  monitoring: {
    sentryDsn: { format: type('string'), env: 'SENTRY_DSN', optional: true }
  }
});
```

### ❌ Don't

```typescript
// Don't use non-string types in format without transformation
const config = envParse(process.env, {
  port: { format: type('number'), env: 'PORT' } // ❌ Will fail - env vars are strings
});

// Don't put defaults that don't match the expected format
const config = envParse(process.env, {
  port: { format: type('string.numeric.parse'), default: '3000', env: 'PORT' } // ❌ Default should be number
});
```

## Complete Example

```typescript
import { envParse } from "standardenv";
import { type } from "arktype";

export const config = envParse(process.env, {
  app: {
    name: {
      format: type('string'),
      default: 'my-app',
      env: 'APP_NAME',
    },
    version: {
      format: type('string'),
      default: '1.0.0',
      env: 'APP_VERSION',
    }
  },

  server: {
    port: {
      format: type('string.numeric.parse'),
      default: 3000,
      env: 'PORT',
    },
    host: {
      format: type('string'),
      default: '0.0.0.0',
      env: 'HOST',
    },
    cors: {
      origins: {
        format: type('string').pipe(s => s.split(',').map(o => o.trim())),
        default: ['http://localhost:3000'],
        env: 'CORS_ORIGINS',
      }
    }
  },

  database: {
    url: {
      format: type('string'),
      env: 'DATABASE_URL',
    },
    ssl: {
      format: type('string').pipe(s => s === 'true'),
      default: false,
      env: 'DATABASE_SSL',
    }
  },

  auth: {
    clerk: {
      secretKey: {
        format: type('string'),
        env: 'CLERK_SECRET_KEY',
      },
      publishableKey: {
        format: type('string'),
        env: 'CLERK_PUBLISHABLE_KEY',
      }
    }
  },

  features: {
    analytics: {
      format: type('string').pipe(s => s === 'true'),
      default: false,
      env: 'ENABLE_ANALYTICS',
    },
    monitoring: {
      format: type('string').pipe(s => s === 'true'),
      default: false,
      env: 'ENABLE_MONITORING',
      optional: true,
    }
  }
});

// config is fully typed as:
// {
//   app: { name: string; version: string };
//   server: { port: number; host: string; cors: { origins: string[] } };
//   database: { url: string; ssl: boolean };
//   auth: { clerk: { secretKey: string; publishableKey: string } };
//   features: { analytics: boolean; monitoring?: boolean };
// }
```
