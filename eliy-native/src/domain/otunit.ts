import {
  createInvalidResult,
  createValidResult,
  isNonEmptyString,
  isStringArray,
  type DomainValidationError,
  type DomainValidationResult
} from "./validation.js";

export const OTUNIT_STATUSES = ["proposed", "confirmed", "in_progress", "blocked", "closed"] as const;

export type OTUnitStatus = (typeof OTUNIT_STATUSES)[number];

export type OTUnitTransition = {
  from: OTUnitStatus;
  to: OTUnitStatus;
};

export const ALLOWED_OTUNIT_TRANSITIONS: readonly OTUnitTransition[] = [
  { from: "proposed", to: "confirmed" },
  { from: "confirmed", to: "in_progress" },
  { from: "in_progress", to: "blocked" },
  { from: "blocked", to: "in_progress" },
  { from: "in_progress", to: "closed" },
  { from: "confirmed", to: "closed" }
] as const;

export type OTUnitTransitionResult =
  | {
      valid: true;
      from: OTUnitStatus;
      to: OTUnitStatus;
      errors: [];
    }
  | {
      valid: false;
      from: OTUnitStatus;
      to: OTUnitStatus;
      errors: DomainValidationError[];
    };

export type OTUnitConfirmationResult =
  | {
      valid: true;
      otunit: OTUnit;
      errors: [];
    }
  | {
      valid: false;
      otunit: OTUnit;
      errors: DomainValidationError[];
    };

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

export function isOTUnitStatus(value: unknown): value is OTUnitStatus {
  return typeof value === "string" && (OTUNIT_STATUSES as readonly string[]).includes(value);
}

export function validateOTUnitTransition(
  from: OTUnitStatus,
  to: OTUnitStatus
): OTUnitTransitionResult {
  const allowed = ALLOWED_OTUNIT_TRANSITIONS.some(
    (transition) => transition.from === from && transition.to === to
  );

  if (allowed) {
    return {
      valid: true,
      from,
      to,
      errors: []
    };
  }

  return {
    valid: false,
    from,
    to,
    errors: [
      {
        field: "status",
        message: `OTUnit transition from ${from} to ${to} is not allowed.`
      }
    ]
  };
}

export function confirmOTUnit(otunit: OTUnit): OTUnitConfirmationResult {
  if (otunit.status === "confirmed" && otunit.requiresConfirmation === false) {
    return {
      valid: true,
      otunit,
      errors: []
    };
  }

  if (otunit.status === "proposed" && otunit.requiresConfirmation === true) {
    return {
      valid: true,
      otunit: {
        ...otunit,
        status: "confirmed",
        requiresConfirmation: false
      },
      errors: []
    };
  }

  return {
    valid: false,
    otunit,
    errors: [
      {
        field: "requiresConfirmation",
        message: `OTUnit confirmation is not allowed for status ${otunit.status} with requiresConfirmation ${String(otunit.requiresConfirmation)}.`
      }
    ]
  };
}

export function validateOTUnit(value: unknown): DomainValidationResult {
  if (typeof value !== "object" || value === null) {
    return createInvalidResult([{ field: "otunit", message: "OTUnit must be an object." }]);
  }

  const otunit = value as Record<string, unknown>;
  const errors: DomainValidationError[] = [];

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
