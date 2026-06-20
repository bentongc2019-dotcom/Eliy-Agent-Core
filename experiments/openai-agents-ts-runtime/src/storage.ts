import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export const ROOT = process.cwd();
export const reportsDir = join(ROOT, "reports");
export const logsDir = join(ROOT, "logs");
export const stateDir = join(ROOT, "state");

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
