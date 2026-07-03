import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const docPath = join(projectRoot, "docs", "plan-management-semantic-contract.md");

function readContractDoc(): string {
  return readFileSync(docPath, "utf8");
}

function allSectionsPresent(doc: string, ...sections: string[]): boolean {
  return sections.every((s) => doc.includes(s));
}

describe("Plan management semantic contract", () => {
  it("document exists and is readable", () => {
    const doc = readContractDoc();
    expect(doc.length).toBeGreaterThan(0);
  });

  it("contains document title", () => {
    const doc = readContractDoc();
    expect(doc).toContain("Plan Management Semantic Contract");
  });

  it("contains required major sections", () => {
    const doc = readContractDoc();
    const sections = [
      "File Positioning",
      "Stage Results",
      "Overall Judgment",
      "Core Naming Rules",
      "Core Definitions",
      "O'PDCA Semantics",
      "rc O'PDCA to Eliy O 单 Mapping",
      "U-Shaped Planning Flow",
      "O 单 Minimal Structure",
      "O 单 State Semantics",
      "Record-Layer Semantics",
      "Objective / O 单 Relationship",
      "Budget Semantics",
      "Support-Request Semantics",
      "Evidence / Trace Boundary",
      "User Confirmation Boundary",
      "Skill / Harness / Runtime Semantic Division",
      "User-Facing Language Rules",
      "Cross-Strait Terminology Conversion",
      "Validation Cases Semantic Range",
      "Engineering Handoff Boundary",
      "Closure Judgment",
      "Stage Conclusion"
    ];
    expect(allSectionsPresent(doc, ...sections)).toBe(true);
  });

  it("preserves rc / Richard Chen / 陈宗贤教授 naming rules", () => {
    const doc = readContractDoc();
    expect(doc).toContain("rc");
    expect(doc).toContain("Richard Chen");
    expect(doc).toContain("陈宗贤教授");
  });

  it("preserves O 单 and OTUnit naming boundaries", () => {
    const doc = readContractDoc();
    expect(doc).toContain("O 单");
    expect(doc).toContain("OTUnit");
    expect(doc).toContain("Objective Task Unit");
    expect(doc).toContain("不直接展示");
    expect(doc).toContain("user-facing term");
    expect(doc).toContain("engineering term");
  });

  it("preserves core definitions", () => {
    const doc = readContractDoc();
    expect(doc).toContain("基于经营情境与证据提出");
    expect(doc).toContain("说明事实依据");
    expect(doc).toContain("说明系统过程");
    expect(doc).toContain("明确确认的行为");
  });

  it("preserves O'PDCA mapping", () => {
    const doc = readContractDoc();
    // Doc uses a markdown table with pipes
    expect(doc).toContain("| O | Objective | 目标");
    expect(doc).toContain("| P | Plan | 计划");
    expect(doc).toContain("| D | Do | 执行");
    expect(doc).toContain("| C | Check | 检查");
    expect(doc).toContain("| A | Action | 改善行动");
  });

  it("preserves U-shaped planning flow terms", () => {
    const doc = readContractDoc();
    const flowTerms = [
      "公司总目标",
      "部门目标",
      "部门年度经营计划 + 部门预算",
      "部门计划发表研讨 / 确认",
      "汇总年度计划与总预算",
      "单位目标",
      "单位年度工作计划",
      "个员目标",
      "个员年度工作计划"
    ];
    expect(allSectionsPresent(doc, ...flowTerms)).toBe(true);
  });

  it("preserves user-facing language terms", () => {
    const doc = readContractDoc();
    const terms = [
      "目标",
      "O 单",
      "负责人",
      "完成时间",
      "检查时间",
      "判断标准",
      "跟进",
      "持续跟进",
      "追踪进度",
      "推进",
      "检讨",
      "差异",
      "改善行动",
      "修订",
      "结案",
      "依据 / 证据",
      "所需支援事项",
      "预算说明",
      "绩效证据"
    ];
    expect(allSectionsPresent(doc, ...terms)).toBe(true);
  });

  it("preserves Skill / Harness / Runtime semantic division", () => {
    const doc = readContractDoc();
    expect(doc).toContain("Skill");
    expect(doc).toContain("Harness");
    expect(doc).toContain("Runtime");
    expect(doc).toContain("只建议");
    expect(doc).toContain("校验字段");
    expect(doc).toContain("Performance Evidence");
  });

  it("preserves engineering handoff boundary non-goals", () => {
    const doc = readContractDoc();
    const nonGoals = [
      "不输出 Schema",
      "不输出 TypeScript",
      "不输出 API",
      "不输出 UI 实作方案",
      "不输出 数据库设计",
      "不继续进入 Schema、代码、测试、工程指令或实现计划"
    ];
    expect(allSectionsPresent(doc, ...nonGoals)).toBe(true);
  });

  it("does not execute runtime behavior", () => {
    const doc = readContractDoc();
    expect(typeof doc).toBe("string");
  });
});
