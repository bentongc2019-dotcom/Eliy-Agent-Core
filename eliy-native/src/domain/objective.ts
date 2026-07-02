import {
  createInvalidResult,
  createValidResult,
  isNonEmptyString,
  type DomainValidationResult
} from "./validation.js";

export const OBJECTIVE_STATUSES = ["draft", "active", "completed", "archived"] as const;

export type ObjectiveStatus = (typeof OBJECTIVE_STATUSES)[number];

export type Objective = {
  id: string;
  title: string;
  status: ObjectiveStatus;
  createdAt: string;
};

function isObjectiveStatus(value: unknown): value is ObjectiveStatus {
  return typeof value === "string" && (OBJECTIVE_STATUSES as readonly string[]).includes(value);
}

export function validateObjective(value: unknown): DomainValidationResult {
  if (typeof value !== "object" || value === null) {
    return createInvalidResult([
      { field: "objective", message: "Objective must be an object." }
    ]);
  }

  const objective = value as Record<string, unknown>;
  const errors = [];

  if (!isNonEmptyString(objective.id)) {
    errors.push({ field: "id", message: "Objective id is required." });
  }
  if (!isNonEmptyString(objective.title)) {
    errors.push({ field: "title", message: "Objective title is required." });
  }
  if (!isObjectiveStatus(objective.status)) {
    errors.push({ field: "status", message: "Objective status is invalid." });
  }
  if (!isNonEmptyString(objective.createdAt)) {
    errors.push({ field: "createdAt", message: "Objective createdAt is required." });
  }

  if (errors.length > 0) {
    return createInvalidResult(errors);
  }

  return createValidResult();
}
