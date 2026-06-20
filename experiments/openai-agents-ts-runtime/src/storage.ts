import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export const ROOT = process.cwd();
export const runtimeDataDir = process.env.ELIY_RUNTIME_DATA_DIR?.trim() || "";
export const reportsDir = process.env.ELIY_REPORTS_DIR?.trim() || (runtimeDataDir ? join(runtimeDataDir, "reports") : join(ROOT, "reports"));
export const logsDir = process.env.ELIY_LOGS_DIR?.trim() || (runtimeDataDir ? join(runtimeDataDir, "logs") : join(ROOT, "logs"));
export const stateDir = process.env.ELIY_STATE_DIR?.trim() || (runtimeDataDir ? join(runtimeDataDir, "state") : join(ROOT, "state"));

export async function ensureDirs(): Promise<void> {
  await mkdir(reportsDir, { recursive: true });
  await mkdir(join(reportsDir, "licenses"), { recursive: true });
  await mkdir(logsDir, { recursive: true });
  await mkdir(stateDir, { recursive: true });
}

export async function writeJson(path: string, data: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

export async function appendJsonl(path: string, data: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const current = await readFile(path, "utf8").catch(() => "");
  await writeFile(path, `${current}${JSON.stringify(data)}\n`, "utf8");
}

export function nowIso(): string {
  return new Date().toISOString();
}
