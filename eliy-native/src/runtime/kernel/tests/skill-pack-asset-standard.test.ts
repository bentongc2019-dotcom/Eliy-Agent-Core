import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "../../../../..");
const skillsDir = join(projectRoot, "eliy-native", "skills");

function readFile(path: string): string {
  return readFileSync(path, "utf8");
}

function fileExists(path: string): boolean {
  try {
    readFileSync(path, "utf8");
    return true;
  } catch {
    return false;
  }
}

const allModuleNames = [
  "Objective Framing Skill",
  "Plan Structuring Skill",
  "OTUnit Draft Skill",
  "Confirmation Skill",
  "Follow-up Capture Skill",
  "Review / Check Skill",
  "Adjust Action Skill",
  "Revision Intent Skill",
  "O'PDCA Summary Skill",
];

const skillPackFiles = [
  join(skillsDir, "README.md"),
  join(skillsDir, "opdca", "SKILL.md"),
  join(skillsDir, "opdca", "references", "README.md"),
];

describe("Eliy Skill Pack — asset standard", () => {
  it("skills/README.md exists", () => {
    expect(fileExists(skillPackFiles[0])).toBe(true);
  });

  it("skills/opdca/SKILL.md exists", () => {
    expect(fileExists(skillPackFiles[1])).toBe(true);
  });

  it("skills/opdca/references/README.md exists", () => {
    expect(fileExists(skillPackFiles[2])).toBe(true);
  });
});

describe("O'PDCA Skill Pack — content contract", () => {
  const skillPack = readFile(join(skillsDir, "opdca", "SKILL.md"));

  it("O'PDCA Skill Pack exists", () => {
    expect(skillPack).toContain("O'PDCA Skill Pack");
  });

  it("O'PDCA Management System exists", () => {
    expect(skillPack).toContain("O'PDCA Management System");
  });

  it("计划经营 exists", () => {
    expect(skillPack).toContain("计划经营");
  });

  it("Skill Pack, not one large Skill exists", () => {
    expect(skillPack).toContain("Skill Pack, not one large Skill");
  });

  it("contains all nine module names", () => {
    for (const name of allModuleNames) {
      expect(skillPack).toContain(name);
    }
  });

  it("explicit user confirmation appears", () => {
    expect(skillPack).toContain("explicit user confirmation");
  });

  it("must not directly mutate Runtime state appears", () => {
    expect(skillPack).toContain("directly mutate Runtime state");
  });

  it("Skill Registry / Loader / Capability Contract must be Eliy-wide appears in skills/README.md", () => {
    const readme = readFile(join(skillsDir, "README.md"));
    expect(readme).toContain("Registry / Loader / Capability Contract must be Eliy-wide");
  });
});

describe("O'PDCA Skill Pack — forbidden patterns", () => {
  const skillPack = readFile(join(skillsDir, "opdca", "SKILL.md"));

  it("skills/plan-management does not appear in the new Skill Pack files", () => {
    expect(skillPack).not.toContain("skills/plan-management");
    const readme = readFile(join(skillsDir, "README.md"));
    expect(readme).not.toContain("plan-management");
  });

  it("Plan Management does not appear as the formal Skill Pack name", () => {
    const lines = skillPack.split("\n");
    const headingLine = lines.find(
      (l) => l.startsWith("#") && l.includes("Plan Management")
    );
    if (headingLine) {
      expect(headingLine).not.toMatch(/^#\s+Plan Management\b/);
    }
    const formalNameRefs = skillPack.match(/\*\*Plan Management\*\*/g);
    expect(formalNameRefs).toBeNull();
  });
});
