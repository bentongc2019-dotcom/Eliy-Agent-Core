import {
  createInvalidResult,
  createValidResult,
  isNonEmptyString,
  isStringArray,
  type DomainValidationResult
} from "./validation.js";

export const OTUNIT_STATUSES = ["proposed", "confirmed", "in_progress", "blocked", "closed"] as const;

export type OTUnitStatus = (typeof OTUNIT_STATUSES)[number];

export type OTUnit = {
  id: string;
  objectiveId: string;
  title: string;
  owner: string;
  dueDate: string;
  status: OTUnitStatus;
  evidenceRefs: string[];
  requiresConfirmation: boolean;
  createdAt: string;
};

function isOTUnitStatus(value: unknown): value is OTUnitStatus {
  return typeof value === "string" && (OTUNIT_STATUSES as readonly string[]).includes(value);
}

export function validateOTUnit(value: unknown): DomainValidationResult {
  if (typeof value !== "object" || value === null) {
    return createInvalidResult([{ field: "otunit", message: "OTUnit must be an object." }]);
  }

  const otunit = value as Record<string, unknown>;
  const errors = [];

  if (!isNonEmptyString(otunit.id)) {
    errors.push({ field: "id", message: "OTUnit id is required." });
  }
  if (!isNonEmptyString(otunit.objectiveId)) {
    errors.push({ field: "objectiveId", message: "OTUnit objectiveId is required." });
  }
  if (!isNonEmptyString(otunit.title)) {
    errors.push({ field: "title", message: "OTUnit title is required." });
  }
  if (!isNonEmptyString(otunit.owner)) {
    errors.push({ field: "owner", message: "OTUnit owner is required." });
  }
  if (!isNonEmptyString(otunit.dueDate)) {
    errors.push({ field: "dueDate", message: "OTUnit dueDate is required." });
  }
  if (!isOTUnitStatus(otunit.status)) {
    errors.push({ field: "status", message: "OTUnit status is invalid." });
  }
  if (!isStringArray(otunit.evidenceRefs)) {
    errors.push({ field: "evidenceRefs", message: "OTUnit evidenceRefs must be a string id array." });
  }
  if (typeof otunit.requiresConfirmation !== "boolean") {
    errors.push({ field: "requiresConfirmation", message: "OTUnit requiresConfirmation is required." });
  }
  if (!isNonEmptyString(otunit.createdAt)) {
    errors.push({ field: "createdAt", message: "OTUnit createdAt is required." });
  }

  if (errors.length > 0) {
    return createInvalidResult(errors);
  }

  return createValidResult();
}
