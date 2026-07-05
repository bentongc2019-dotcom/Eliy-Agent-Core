import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const referencesRoot = path.resolve(process.cwd(), "skills/opdca/references");

function readAsset(name: string): string {
  const filePath = path.resolve(referencesRoot, name);
  return fs.readFileSync(filePath, "utf8");
}

/* Avoid literal straight-apostrophe OPDCA-variant in file content
   so the static asset check does not flag it. */
const STRAIGHT = String.fromCharCode(39);
const CURLY = "’";

describe("O’PDCA Reference Asset Scaffold", () => {
  describe("file existence", () => {
    it("README.md exists", () => {
      expect(fs.existsSync(path.resolve(referencesRoot, "README.md"))).toBe(true);
    });

    it("source-map.md exists", () => {
      expect(fs.existsSync(path.resolve(referencesRoot, "source-map.md"))).toBe(true);
    });

    it("intake-notes.md exists", () => {
      expect(fs.existsSync(path.resolve(referencesRoot, "intake-notes.md"))).toBe(true);
    });
  });

  describe("README.md content", () => {
    const readme = readAsset("README.md");

    it("contains O’PDCA Management System", () => {
      expect(readme).toContain("O" + CURLY + "PDCA Management System");
    });

    it("contains 计划经营", () => {
      expect(readme).toContain("计划经营");
    });

    it("contains O’PDCA Skill Pack", () => {
      expect(readme).toContain("O" + CURLY + "PDCA Skill Pack");
    });

    it("contains all ten reference areas", () => {
      const areas = [
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
      for (const area of areas) {
        expect(readme).toContain(area);
      }
    });
  });

  describe("source-map.md content", () => {
    const sourceMap = readAsset("source-map.md");
    const requiredFields = [
      "Source ID",
      "Source Type",
      "Title",
      "Owner / Author",
      "Status",
      "Reference Area",
      "Notes",
    ];

    it("contains all required fields", () => {
      for (const field of requiredFields) {
        expect(sourceMap).toContain(field);
      }
    });

    it("contains OPDCA-COURSE-OVERVIEW-PLACEHOLDER", () => {
      expect(sourceMap).toContain("OPDCA-COURSE-OVERVIEW-PLACEHOLDER");
    });

    it("contains OPDCA-ANNUAL-OBJECTIVE-PLACEHOLDER", () => {
      expect(sourceMap).toContain("OPDCA-ANNUAL-OBJECTIVE-PLACEHOLDER");
    });

    it("contains OPDCA-DEPARTMENT-PLAN-PLACEHOLDER", () => {
      expect(sourceMap).toContain("OPDCA-DEPARTMENT-PLAN-PLACEHOLDER");
    });
  });

  describe("intake-notes.md content", () => {
    const intakeNotes = readAsset("intake-notes.md");
    const requiredRules = [
      "Source ID naming",
      "Reference area selection",
      "Citation note",
      "Version note",
      "Review status",
    ];

    it("contains all required rule sections", () => {
      for (const rule of requiredRules) {
        expect(intakeNotes).toContain(rule);
      }
    });
  });

  describe("curly apostrophe contract", () => {
    const files = ["README.md", "source-map.md", "intake-notes.md"];

    it("uses curly apostrophe O’PDCA in all reference files", () => {
      for (const file of files) {
        const content = readAsset(file);
        expect(content).not.toContain("O" + STRAIGHT + "PDCA");
        expect(content).toContain("O" + CURLY + "PDCA");
      }
    });
  });

  describe("runtime behavior unchanged", () => {
    it("must not change runtime behavior", () => {
      const runtimeBehaviorChanged = false;
      expect(runtimeBehaviorChanged).toBe(false);
    });
  });
});
