import { RuntimeErrorSchema, type RuntimeError } from "../schemas/index.js";

export function createRuntimeError(
  code: RuntimeError["code"],
  message: string,
  details?: unknown
): RuntimeError {
  return RuntimeErrorSchema.parse({
    code,
    message,
    details
  });
}
