import type { HlamtRuntimeProjection } from "../runtime/agent/hlamt-runtime-projection";

export function createEliyRuntimeSystemMessage(
  projection: Readonly<HlamtRuntimeProjection>,
): string {
  return [
    `[ELIY STABLE CONTEXT version=${projection.version}]`,
    projection.content,
    "[/ELIY STABLE CONTEXT]",
  ].join("\n");
}
