import {
  createInvalidResult,
  createValidResult,
  isNonEmptyString,
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
  evidenceRefs: EvidenceRef[];
  requiresConfirmation: boolean;
  createdAt: string;
};

export type EvidenceRef = string;

export type OTUnitReviewInput = {
  otunitId: string;
  reviewNote: string;
  difference: string;
  action: string;
};

export type OTUnitReviewIntent = {
  otunitId: string;
  reviewNote: string;
  difference: string;
  action: string;
};

export type OTUnitReviewResult =
  | {
      valid: true;
      review: OTUnitReviewIntent;
      errors: [];
    }
  | {
      valid: false;
      review: null;
      errors: DomainValidationError[];
    };

export type OTUnitRevisionInput = {
  otunitId: string;
  title: string;
  owner: string;
  dueDate: string;
  evidenceRefs: EvidenceRef[];
  requiresConfirmation: boolean;
};

export type OTUnitRevisionResult =
  | {
      valid: true;
      otunit: OTUnit;
      errors: [];
    }
  | {
      valid: false;
      otunit: null;
      errors: DomainValidationError[];
    };

const INVALID_EVIDENCE_REFS_ERROR: DomainValidationError = {
  field: "evidenceRefs",
  message: "evidenceRefs must be an array of non-empty string ids."
};

const DUPLICATE_EVIDENCE_REFS_ERROR: DomainValidationError = {
  field: "evidenceRefs",
  message: "evidenceRefs must not contain duplicate refs."
};

export function validateEvidenceRefs(value: unknown): DomainValidationResult {
  if (!Array.isArray(value)) {
    return createInvalidResult([INVALID_EVIDENCE_REFS_ERROR]);
  }

  const seen = new Set<string>();

  for (const evidenceRef of value) {
    if (typeof evidenceRef !== "string" || evidenceRef.trim().length === 0) {
      return createInvalidResult([INVALID_EVIDENCE_REFS_ERROR]);
    }

    if (seen.has(evidenceRef)) {
      return createInvalidResult([DUPLICATE_EVIDENCE_REFS_ERROR]);
    }

    seen.add(evidenceRef);
  }

  return createValidResult();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function createOTUnitReviewFieldError(field: keyof OTUnitReviewInput): DomainValidationError {
  return {
    field,
    message: `OTUnit review ${field} must be a non-empty string.`
  };
}

function createOTUnitRevisionFieldError(field: keyof OTUnitRevisionInput | "id" | "objectiveId" | "status" | "createdAt"): DomainValidationError {
  return {
    field,
    message: `OTUnit revision cannot set ${field}.`
  };
}

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

export function createOTUnitReviewIntent(input: unknown): OTUnitReviewResult {
  if (!isRecord(input)) {
    return {
      valid: false,
      review: null,
      errors: [createOTUnitReviewFieldError("otunitId")]
    };
  }

  const fields: (keyof OTUnitReviewInput)[] = ["otunitId", "reviewNote", "difference", "action"];

  for (const field of fields) {
    if (!isNonEmptyString(input[field])) {
      return {
        valid: false,
        review: null,
        errors: [createOTUnitReviewFieldError(field)]
      };
    }
  }

  const review: OTUnitReviewIntent = {
    otunitId: input.otunitId as string,
    reviewNote: input.reviewNote as string,
    difference: input.difference as string,
    action: input.action as string
  };

  return {
    valid: true,
    review,
    errors: []
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
  const evidenceRefsValidation = validateEvidenceRefs(otunit.evidenceRefs);
  if (!evidenceRefsValidation.valid) {
    errors.push(...evidenceRefsValidation.errors);
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

export type OTUnitDraftInput = {
  id: string;
  objectiveId: string;
  title: string;
  owner: string;
  dueDate: string;
  evidenceRefs: EvidenceRef[];
};

export type OTUnitDraftBuildResult =
  | {
      valid: true;
      otunit: OTUnit;
      errors: [];
    }
  | {
      valid: false;
      otunit: null;
      errors: DomainValidationError[];
    };

const OTUNIT_DRAFT_CREATED_AT = "draft-created-at";

export function createProposedOTUnitFromDraft(input: unknown): OTUnitDraftBuildResult {
  if (typeof input !== "object" || input === null) {
    return {
      valid: false,
      otunit: null,
      errors: [
        { field: "draft", message: "OTUnit draft input must be an object." }
      ]
    };
  }

  const draft = input as Record<string, unknown>;
  const errors: DomainValidationError[] = [];

  if ("status" in draft) {
    errors.push({ field: "status", message: "OTUnit draft input cannot set status." });
  }
  if ("requiresConfirmation" in draft) {
    errors.push({ field: "requiresConfirmation", message: "OTUnit draft input cannot set requiresConfirmation." });
  }
  if (!isNonEmptyString(draft.id)) {
    errors.push({ field: "id", message: "OTUnit draft id is required." });
  }
  if (!isNonEmptyString(draft.objectiveId)) {
    errors.push({ field: "objectiveId", message: "OTUnit draft objectiveId is required." });
  }
  if (!isNonEmptyString(draft.title)) {
    errors.push({ field: "title", message: "OTUnit draft title is required." });
  }
  if (!isNonEmptyString(draft.owner)) {
    errors.push({ field: "owner", message: "OTUnit draft owner is required." });
  }
  if (!isNonEmptyString(draft.dueDate)) {
    errors.push({ field: "dueDate", message: "OTUnit draft dueDate is required." });
  }
  const evidenceRefsValidation = validateEvidenceRefs(draft.evidenceRefs);
  if (!evidenceRefsValidation.valid) {
    errors.push(...evidenceRefsValidation.errors);
  }

  if (errors.length > 0) {
    return { valid: false, otunit: null, errors };
  }

  const otunit: OTUnit = {
    id: draft.id as string,
    objectiveId: draft.objectiveId as string,
    title: draft.title as string,
    owner: draft.owner as string,
    dueDate: draft.dueDate as string,
    status: "proposed",
    evidenceRefs: draft.evidenceRefs as EvidenceRef[],
    requiresConfirmation: true,
    createdAt: OTUNIT_DRAFT_CREATED_AT
  };

  return { valid: true, otunit, errors: [] };
}

export function reviseOTUnit(otunit: OTUnit, input: unknown): OTUnitRevisionResult {
  const otunitValidation = validateOTUnit(otunit);
  if (!otunitValidation.valid) {
    return {
      valid: false,
      otunit: null,
      errors: otunitValidation.errors
    };
  }

  if (!isRecord(input)) {
    return {
      valid: false,
      otunit: null,
      errors: [
        {
          field: "otunit",
          message: "OTUnit revision input must be an object."
        }
      ]
    };
  }

  for (const field of ["id", "objectiveId", "status", "createdAt"] as const) {
    if (Object.prototype.hasOwnProperty.call(input, field)) {
      return {
        valid: false,
        otunit: null,
        errors: [createOTUnitRevisionFieldError(field)]
      };
    }
  }

  if (!isNonEmptyString(input.otunitId)) {
    return {
      valid: false,
      otunit: null,
      errors: [
        {
          field: "otunitId",
          message: "OTUnit revision otunitId must be a non-empty string."
        }
      ]
    };
  }

  if (input.otunitId !== otunit.id) {
    return {
      valid: false,
      otunit: null,
      errors: [
        {
          field: "otunitId",
          message: "OTUnit revision otunitId must match the target OTUnit id."
        }
      ]
    };
  }

  for (const field of ["title", "owner", "dueDate"] as const) {
    if (!isNonEmptyString(input[field])) {
      return {
        valid: false,
        otunit: null,
        errors: [
          {
            field,
            message: `OTUnit revision ${field} must be a non-empty string.`
          }
        ]
      };
    }
  }

  const evidenceRefsValidation = validateEvidenceRefs(input.evidenceRefs);
  if (!evidenceRefsValidation.valid) {
    return {
      valid: false,
      otunit: null,
      errors: evidenceRefsValidation.errors
    };
  }

  if (input.requiresConfirmation !== true) {
    return {
      valid: false,
      otunit: null,
      errors: [
        {
          field: "requiresConfirmation",
          message: "OTUnit revision requiresConfirmation must be true."
        }
      ]
    };
  }

  return {
    valid: true,
    otunit: {
      ...otunit,
      title: input.title as string,
      owner: input.owner as string,
      dueDate: input.dueDate as string,
      evidenceRefs: [...(input.evidenceRefs as EvidenceRef[])],
      status: "proposed",
      requiresConfirmation: true
    },
    errors: []
  };
}
