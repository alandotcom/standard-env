export type { StandardSchemaV1 } from "@standard-schema/spec";
export { AsyncValidationError, EnvValidationError } from "./errors.ts";
export {
  type ConfigDefinition,
  type ConfigProperty,
  envParse,
  type InferConfig,
} from "./structured.ts";
