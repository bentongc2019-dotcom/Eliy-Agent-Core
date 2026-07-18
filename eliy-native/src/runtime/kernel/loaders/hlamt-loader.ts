import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadHlamtRuntimeProjection } from "../../agent/hlamt-runtime-projection";

export interface HlamtContext {
  source_path: string;
  raw_text: string;
  hlamt_context_summary: string;
  used_hlamt_context: boolean;
}

export function loadHlamtContext(projectRoot: string): HlamtContext {
  const source_path = resolve(projectRoot, "HLAMT.md");
  const raw_text = readFileSync(source_path, "utf8");
  const hlamt_context_summary = raw_text.includes(
    "<!-- ELIY_STABLE_RUNTIME_PROJECTION_START -->",
  )
    ? loadHlamtRuntimeProjection(projectRoot).content.slice(0, 280)
    : raw_text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .filter((line) => !line.startsWith("#"))
        .slice(0, 4)
        .join(" ")
        .slice(0, 280);

  return {
    source_path,
    raw_text,
    hlamt_context_summary,
    used_hlamt_context: true
  };
}
