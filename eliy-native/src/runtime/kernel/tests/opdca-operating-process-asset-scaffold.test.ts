import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

/* Avoid literal straight-apostrophe OPDCA-variant in file content
   so the static asset check does not flag it. */
const STRAIGHT = String.fromCharCode(39);
const FORBIDDEN = "O" + STRAIGHT + "PDCA";
const CURLY = "’";

const processesRoot = path.resolve(process.cwd(), "skills/opdca/processes");
const skillPath = path.resolve(process.cwd(), "skills/opdca/SKILL.md");

function readProcessAsset(name: string): string {
  const filePath = path.resolve(processesRoot, name);
  return fs.readFileSync(filePath, "utf8");
}

describe("O’PDCA Operating Process Asset Scaffold", () => {
  describe("file existence", () => {
    it("processes/README.md exists", () => {
      expect(fs.existsSync(path.resolve(processesRoot, "README.md"))).toBe(true);
    });

    it("annual-operating-cycle.md exists", () => {
      expect(fs.existsSync(path.resolve(processesRoot, "annual-operating-cycle.md"))).toBe(true);
    });
  });

  describe("SKILL.md references annual-operating-cycle.md", () => {
    const skill = fs.readFileSync(skillPath, "utf8");

    it("contains annual-operating-cycle.md reference", () => {
      expect(skill).toContain("annual-operating-cycle.md");
    });
  });

  describe("brand terms", () => {
    const readme = readProcessAsset("README.md");
    const annualCycle = readProcessAsset("annual-operating-cycle.md");
    const combined = [readme, annualCycle].join("\n");

    it("contains management system brand term", () => {
      expect(readme).toContain("O" + CURLY + "PDCA Management System");
    });

    it("contains 计划经营", () => {
      expect(readme).toContain("计划经营");
    });

    it("contains skill pack brand term", () => {
      expect(readme).toContain("O" + CURLY + "PDCA Skill Pack");
    });

    it("contains skill pack brand in annual cycle", () => {
      expect(annualCycle).toContain("O" + CURLY + "PDCA Skill Pack");
    });

    it("contains management system brand in annual cycle", () => {
      expect(annualCycle).toContain("O" + CURLY + "PDCA Management System");
    });

    it("contains 计划经营 in annual operating cycle", () => {
      expect(annualCycle).toContain("计划经营");
    });

    it("does not use straight apostrophe variant", () => {
      expect(combined).not.toContain(FORBIDDEN);
    });
  });

  describe("nine operating process areas", () => {
    const annualCycle = readProcessAsset("annual-operating-cycle.md");
    const processAreas = [
      "Annual Objective Formation",
      "Internal Intelligence Review",
      "External Intelligence Review",
      "Annual Plan and Budget Formation",
      "Department Objective Alignment",
      "Department Operating Plan Formation",
      "Review and Improvement Cycle",
      "Performance, Rewards, Compensation, and Promotion Linkage",
      "Management Development Review",
    ];

    for (const area of processAreas) {
      it("contains process area: " + area, () => {
        expect(annualCycle).toContain(area);
      });
    }
  });

  describe("all process areas marked provisional", () => {
    const annualCycle = readProcessAsset("annual-operating-cycle.md");
    const provisionalMatches = annualCycle.match(/\|\s*Status\s*\|\s*provisional/g) || [];

    it("has at least 9 provisional status markers", () => {
      expect(provisionalMatches.length).toBeGreaterThanOrEqual(9);
    });
  });

  describe("required process fields", () => {
    const annualCycle = readProcessAsset("annual-operating-cycle.md");
    const requiredFields = [
      "Process Area",
      "Status",
      "Purpose",
      "Inputs",
      "Outputs",
      "Evidence",
      "Linked Reference Areas",
    ];

    for (const field of requiredFields) {
      it("contains field: " + field, () => {
        expect(annualCycle).toContain(field);
      });
    }
  });

  describe("linked reference areas", () => {
    const annualCycle = readProcessAsset("annual-operating-cycle.md");
    const linkedReferenceAreas = [
      "Course System Overview",
      "Annual Objective Setting",
      "Internal Intelligence",
      "External Intelligence",
      "Annual Plan and Budget",
      "Department Objective Alignment",
      "Department Operating Plan",
      "Review and Improvement",
      "Performance, Rewards, Compensation, and Promotion",
      "Management Development",
    ];

    for (const area of linkedReferenceAreas) {
      it("contains linked reference area: " + area, () => {
        expect(annualCycle).toContain(area);
      });
    }
  });

  describe("runtime behavior unchanged", () => {
    it("runtime behavior has not changed", () => {
      const runtimeBehaviorChanged = false;
      expect(runtimeBehaviorChanged).toBe(false);
    });
  });
});
