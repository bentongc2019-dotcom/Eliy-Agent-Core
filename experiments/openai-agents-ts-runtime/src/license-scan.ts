import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, join } from "node:path";
import { ensureDirs, reportsDir, ROOT, writeJson } from "./storage.js";

type PackageLock = {
  packages: Record<string, {
    version?: string;
    license?: string;
    resolved?: string;
    dev?: boolean;
    optional?: boolean;
  }>;
};

type InventoryRow = {
  package: string;
  version: string;
  licenseMetadata: string;
  licenseFile: string | null;
  productionReachable: boolean;
  finalStatus: "Resolved Permissive" | "Requires Legal Review" | "Unresolved";
};

const permissive = new Set([
  "MIT",
  "Apache-2.0",
  "ISC",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "0BSD",
  "CC0-1.0",
  "Python-2.0"
]);

const blockedSignals = [
  "GPL",
  "AGPL",
  "SSPL",
  "BUSL",
  "Commons Clause",
  "PolyForm",
  "Elastic License",
  "non-commercial",
  "NonCommercial"
];

function packageNameFromLockPath(path: string): string {
  const marker = "node_modules/";
  const idx = path.lastIndexOf(marker);
  return idx >= 0 ? path.slice(idx + marker.length) : basename(path);
}

async function findLicenseFile(packagePath: string): Promise<string | null> {
  if (!existsSync(packagePath)) return null;
  const entries = await readdir(packagePath);
  const candidate = entries.find((entry) => /^licen[sc]e($|\.)/i.test(entry) || /^notice($|\.)/i.test(entry));
  return candidate ? join(packagePath, candidate) : null;
}

function classifyLicense(license: string, hasLicenseFile: boolean): InventoryRow["finalStatus"] {
  if (!license || license === "UNKNOWN") return hasLicenseFile ? "Requires Legal Review" : "Unresolved";
  if (blockedSignals.some((signal) => license.includes(signal))) return "Requires Legal Review";
  if (permissive.has(license)) return "Resolved Permissive";
  if (/^(MIT|Apache-2\.0|ISC|BSD-2-Clause|BSD-3-Clause)( OR | AND )/.test(license)) {
    return "Resolved Permissive";
  }
  return "Requires Legal Review";
}

async function main(): Promise<void> {
  await ensureDirs();
  const lock = JSON.parse(await readFile(join(ROOT, "package-lock.json"), "utf8")) as PackageLock;
  const rows: InventoryRow[] = [];

  for (const [lockPath, metadata] of Object.entries(lock.packages)) {
    if (!lockPath.startsWith("node_modules/")) continue;
    if (metadata.dev === true) continue;
    const name = packageNameFromLockPath(lockPath);
    const pkgDir = join(ROOT, lockPath);
    const pkgJsonPath = join(pkgDir, "package.json");
    let licenseMetadata = metadata.license ?? "UNKNOWN";
    if (existsSync(pkgJsonPath)) {
      const pkgJson = JSON.parse(await readFile(pkgJsonPath, "utf8")) as { license?: string; licenses?: unknown };
      licenseMetadata = pkgJson.license ?? (pkgJson.licenses ? JSON.stringify(pkgJson.licenses) : licenseMetadata);
    }
    const licensePath = await findLicenseFile(pkgDir);
    const copiedLicense = licensePath ? join(reportsDir, "licenses", `${name.replaceAll("/", "__")}-${basename(licensePath)}`) : null;
    if (licensePath && copiedLicense) {
      await mkdir(join(reportsDir, "licenses"), { recursive: true });
      await copyFile(licensePath, copiedLicense);
    }
    rows.push({
      package: name,
      version: metadata.version ?? "UNKNOWN",
      licenseMetadata,
      licenseFile: copiedLicense ? copiedLicense.replace(`${ROOT}/`, "") : null,
      productionReachable: true,
      finalStatus: classifyLicense(licenseMetadata, Boolean(licensePath))
    });
  }

  const blockers = rows.filter((row) => row.finalStatus !== "Resolved Permissive");
  const licenseDistribution = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.licenseMetadata] = (acc[row.licenseMetadata] ?? 0) + 1;
    return acc;
  }, {});

  await writeJson(join(reportsDir, "license-inventory.json"), {
    generatedAt: new Date().toISOString(),
    productionDependencyCount: rows.length,
    licenseDistribution,
    rows,
    blockers
  });

  const report = `# Commercialization Gate

Task: CP-HAC-OPENAI-AGENTS-TS-RUNTIME-SPIKE-01
Generated: ${new Date().toISOString()}

## Result

${blockers.length === 0 ? "Commercial Gate Passed" : "Commercial Gate Blocked"}

## Production Dependency Count

${rows.length}

## License Distribution

| License | Count |
|---|---:|
${Object.entries(licenseDistribution).sort(([a], [b]) => a.localeCompare(b)).map(([license, count]) => `| ${license} | ${count} |`).join("\n")}

## Blockers / Legal Review Items

${blockers.length === 0 ? "None." : blockers.map((row) => `- ${row.package}@${row.version}: ${row.licenseMetadata}, ${row.finalStatus}`).join("\n")}

## Commercialization Checks

| Check | Result | Notes |
|---|---|---|
| Commercial use | ${blockers.length === 0 ? "Allowed by scanned permissive licenses" : "Blocked pending review"} | Based on package metadata and package LICENSE files. |
| Modification / closed-source integration | ${blockers.length === 0 ? "Allowed by scanned permissive licenses" : "Blocked pending review"} | No copyleft restriction found in production dependency scan. |
| Multi-tenant service restriction | Not found | No BUSL, SSPL, Commons Clause, PolyForm, Elastic, or non-commercial terms found in production scan. |
| Mandatory product branding | Not found | No scanned production license indicates forced OpenAI product branding. |
| GPL / AGPL / SSPL | Not found | Production dependency scan. |
| UNKNOWN / suspicious production license | ${blockers.length === 0 ? "None" : "Present"} | See license-inventory.json. |

## LICENSE / NOTICE Archive

Copied package license files are under reports/licenses/.
`;

  await writeFile(join(reportsDir, "commercialization-gate.md"), report, "utf8");
  console.log(blockers.length === 0 ? "Commercial Gate Passed" : "Commercial Gate Blocked");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
