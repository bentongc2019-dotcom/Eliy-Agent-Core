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

// Core OTUnit domain shape.
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

// Contract surface: evidence refs are ids/references only.
export type EvidenceRef = string;

// Contract surface: review intent is deterministic and in-memory only.
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

// Contract surface: revision produces a copy without changing the domain model shape.
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

// Deterministic evidence ref validation helpers.
// Contract surface: validation helpers stay pure and deterministic.
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
// Chat-to-OTUnit Draft Intent Boundary.
// Detects whether chat or session text expresses intent to create an OTUnit draft.
// Returns intent metadata only; never creates an OTUnit or OTUnitDraftInput.

export type ChatToOTUnitDraftIntentInput = {
  sessionId: string;
  userText: string;
  assistantText: string;
};

export type OTUnitDraftIntentType = "otunit_draft";

export type OTUnitDraftIntentConfidenceLevel = "none" | "high";

export type ChatToOTUnitDraftIntentResult =
  | {
      valid: true;
      intentDetected: true;
      intentType: OTUnitDraftIntentType;
      confidenceLevel: "high";
      reason: string;
      requiresUserConfirmation: true;
      errors: [];
    }
  | {
      valid: true;
      intentDetected: false;
      intentType: null;
      confidenceLevel: "none";
      reason: string;
      requiresUserConfirmation: false;
      errors: [];
    }
  | {
      valid: false;
      intentDetected: false;
      intentType: null;
      confidenceLevel: "none";
      reason: string;
      requiresUserConfirmation: false;
      errors: DomainValidationError[];
    };

const OTUNIT_DRAFT_INTENT_PHRASES: readonly string[] = [
  "create otunit draft",
  "create an otunit draft",
  "make otunit draft",
  "draft an otunit",
  "turn this into an otunit draft",
  "convert this session into an otunit draft",
  "prepare otunit draft",
  "otunit draft",
  "行动单元草稿",
  "建立行动单元草稿",
  "创建行动单元草稿",
  "產生行動單元草稿",
  "建立 otunit 草稿"
];

function normalizeIntentText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function detectIntentPhrase(text: string): boolean {
  const normalized = normalizeIntentText(text);
  return OTUNIT_DRAFT_INTENT_PHRASES.some(
    (phrase) => normalized.includes(phrase)
  );
}

export function detectOTUnitDraftIntent(
  input: unknown
): ChatToOTUnitDraftIntentResult {
  if (typeof input !== "object" || input === null) {
    return {
      valid: false,
      intentDetected: false,
      intentType: null,
      confidenceLevel: "none",
      reason: "Invalid chat-to-OTUnit draft intent input.",
      requiresUserConfirmation: false,
      errors: [
        {
          field: "sessionId",
          message: "Chat-to-OTUnit draft intent sessionId must be a non-empty string."
        }
      ]
    };
  }

  const record = input as Record<string, unknown>;

  if (!isNonEmptyString(record.sessionId)) {
    return {
      valid: false,
      intentDetected: false,
      intentType: null,
      confidenceLevel: "none",
      reason: "Invalid chat-to-OTUnit draft intent input.",
      requiresUserConfirmation: false,
      errors: [
        {
          field: "sessionId",
          message: "Chat-to-OTUnit draft intent sessionId must be a non-empty string."
        }
      ]
    };
  }

  if (!isNonEmptyString(record.userText)) {
    return {
      valid: false,
      intentDetected: false,
      intentType: null,
      confidenceLevel: "none",
      reason: "Invalid chat-to-OTUnit draft intent input.",
      requiresUserConfirmation: false,
      errors: [
        {
          field: "userText",
          message: "Chat-to-OTUnit draft intent userText must be a non-empty string."
        }
      ]
    };
  }

  if (typeof record.assistantText !== "string") {
    return {
      valid: false,
      intentDetected: false,
      intentType: null,
      confidenceLevel: "none",
      reason: "Invalid chat-to-OTUnit draft intent input.",
      requiresUserConfirmation: false,
      errors: [
        {
          field: "assistantText",
          message: "Chat-to-OTUnit draft intent assistantText must be a string."
        }
      ]
    };
  }

  const userText = record.userText as string;
  const assistantText = record.assistantText as string;

  const hasIntent = detectIntentPhrase(userText) || detectIntentPhrase(assistantText);

  if (hasIntent) {
    return {
      valid: true,
      intentDetected: true,
      intentType: "otunit_draft",
      confidenceLevel: "high",
      reason: "Detected deterministic OTUnit draft intent phrase.",
      requiresUserConfirmation: true,
      errors: []
    };
  }

  return {
    valid: true,
    intentDetected: false,
    intentType: null,
    confidenceLevel: "none",
    reason: "No deterministic OTUnit draft intent phrase detected.",
    requiresUserConfirmation: false,
    errors: []
  };
}

// Chat-to-OTUnit Draft Preview Boundary.
// Uses the deterministic chat-to-OTUnit draft intent boundary to prepare preview metadata.
// Returns preview metadata only; never creates an OTUnit or OTUnitDraftInput.

export type ChatToOTUnitDraftPreviewInput = {
  sessionId: string;
  userText: string;
  assistantText: string;
};

// Plan-aware draft preview types.
// These are deterministic preview metadata only.
// They align with the Plan Management Semantic Contract.

export type PlanAwareDraftPreviewChecklistKey =
  | "objective"
  | "owner"
  | "due_date_or_check_time"
  | "judgment_criteria"
  | "plan_or_action_items"
  | "evidence_refs"
  | "user_confirmation_required";

export type PlanAwareDraftPreviewChecklistItem = {
  key: PlanAwareDraftPreviewChecklistKey;
  label: string;
  required: boolean;
  status: "present" | "missing" | "required";
  reason: string;
};

export type PlanAwareDraftPreview = {
  objective: string | null;
  owner: string | null;
  dueDateOrCheckTime: string | null;
  judgmentCriteria: string | null;
  planOrActionItems: string[];
  evidenceRefs: string[];
  missingInformation: PlanAwareDraftPreviewChecklistKey[];
  checklist: PlanAwareDraftPreviewChecklistItem[];
};

function buildPlanAwareChecklist(
  objective: string | null,
  owner: string | null,
  dueDateOrCheckTime: string | null,
  judgmentCriteria: string | null,
  planOrActionItems: string[],
  evidenceRefs: string[]
): PlanAwareDraftPreviewChecklistItem[] {
  return [
    {
      key: "objective",
      label: "Objective / 目标",
      required: true,
      status: objective !== null ? "present" : "missing",
      reason:
        objective !== null
          ? "Preview includes an objective field."
          : "Preview does not yet include an explicit objective."
    },
    {
      key: "owner",
      label: "负责人",
      required: true,
      status: owner !== null ? "present" : "missing",
      reason:
        owner !== null
          ? "Preview includes an owner field."
          : "Preview does not yet include an explicit owner."
    },
    {
      key: "due_date_or_check_time",
      label: "完成时间 / 检查时间",
      required: true,
      status: dueDateOrCheckTime !== null ? "present" : "missing",
      reason:
        dueDateOrCheckTime !== null
          ? "Preview includes a due date or check time."
          : "Preview does not yet include an explicit due date or check time."
    },
    {
      key: "judgment_criteria",
      label: "判断标准",
      required: true,
      status: judgmentCriteria !== null ? "present" : "missing",
      reason:
        judgmentCriteria !== null
          ? "Preview includes judgment criteria."
          : "Preview does not yet include explicit judgment criteria."
    },
    {
      key: "plan_or_action_items",
      label: "计划 / 行动项目",
      required: true,
      status: planOrActionItems.length > 0 ? "present" : "missing",
      reason:
        planOrActionItems.length > 0
          ? "Preview includes plan or action items."
          : "Preview does not yet include plan or action items."
    },
    {
      key: "evidence_refs",
      label: "依据 / 证据",
      required: true,
      status: evidenceRefs.length > 0 ? "present" : "missing",
      reason:
        evidenceRefs.length > 0
          ? "Preview includes evidence references."
          : "Preview does not yet include evidence references."
    },
    {
      key: "user_confirmation_required",
      label: "用户确认",
      required: true,
      status: "required",
      reason:
        "User confirmation is required before any later OTUnit draft or OTUnit creation work."
    }
  ];
}

function buildPlanAwareDraftPreview(): PlanAwareDraftPreview {
  const objective = null;
  const owner = null;
  const dueDateOrCheckTime = null;
  const judgmentCriteria = null;
  const planOrActionItems: string[] = [];
  const evidenceRefs: string[] = [];

  const missingInformation: PlanAwareDraftPreviewChecklistKey[] = [];
  if (objective === null) missingInformation.push("objective");
  if (owner === null) missingInformation.push("owner");
  if (dueDateOrCheckTime === null) missingInformation.push("due_date_or_check_time");
  if (judgmentCriteria === null) missingInformation.push("judgment_criteria");
  if (planOrActionItems.length === 0) missingInformation.push("plan_or_action_items");
  if (evidenceRefs.length === 0) missingInformation.push("evidence_refs");

  return {
    objective,
    owner,
    dueDateOrCheckTime,
    judgmentCriteria,
    planOrActionItems,
    evidenceRefs,
    missingInformation,
    checklist: buildPlanAwareChecklist(
      objective,
      owner,
      dueDateOrCheckTime,
      judgmentCriteria,
      planOrActionItems,
      evidenceRefs
    )
  };
}

export type OTUnitDraftPreview = {
  title: string;
  sourceSessionId: string;
  source: "chat_session";
  status: "preview";
  planAware: PlanAwareDraftPreview;
  requiresUserConfirmation: true;
};

export type ChatToOTUnitDraftPreviewResult =
  | {
      valid: true;
      previewAvailable: true;
      intentDetected: true;
      intentType: OTUnitDraftIntentType;
      requiresUserConfirmation: true;
      draftPreview: OTUnitDraftPreview;
      reason: string;
      errors: [];
    }
  | {
      valid: true;
      previewAvailable: false;
      intentDetected: false;
      intentType: null;
      requiresUserConfirmation: false;
      draftPreview: null;
      reason: string;
      errors: [];
    }
  | {
      valid: false;
      previewAvailable: false;
      intentDetected: false;
      intentType: null;
      requiresUserConfirmation: false;
      draftPreview: null;
      reason: string;
      errors: DomainValidationError[];
    };

function firstNonEmptyPreviewLine(value: string): string {
  for (const line of value.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }

  return "";
}

function extractPreviewTitle(input: ChatToOTUnitDraftPreviewInput): string {
  const fromAssistant = firstNonEmptyPreviewLine(input.assistantText);
  if (fromAssistant.length > 0) {
    return fromAssistant.slice(0, 120);
  }

  const fromUser = firstNonEmptyPreviewLine(input.userText);
  if (fromUser.length > 0) {
    return fromUser.slice(0, 120);
  }

  return "OTUnit draft preview";
}

export function previewOTUnitDraftFromChat(
  input: unknown
): ChatToOTUnitDraftPreviewResult {
  const intentResult = detectOTUnitDraftIntent(input);

  if (!intentResult.valid) {
    return {
      valid: false,
      previewAvailable: false,
      intentDetected: false,
      intentType: null,
      requiresUserConfirmation: false,
      draftPreview: null,
      reason: "Invalid chat-to-OTUnit draft preview input.",
      errors: intentResult.errors
    };
  }

  if (!intentResult.intentDetected) {
    return {
      valid: true,
      previewAvailable: false,
      intentDetected: false,
      intentType: null,
      requiresUserConfirmation: false,
      draftPreview: null,
      reason: "No deterministic OTUnit draft intent phrase detected; preview not available.",
      errors: []
    };
  }

  const intentInput = input as ChatToOTUnitDraftPreviewInput;

  const draftPreview: OTUnitDraftPreview = {
    title: extractPreviewTitle(intentInput),
    sourceSessionId: intentInput.sessionId,
    source: "chat_session",
    status: "preview",
    planAware: buildPlanAwareDraftPreview(),
    requiresUserConfirmation: true
  };

  return {
    valid: true,
    previewAvailable: true,
    intentDetected: true,
    intentType: "otunit_draft",
    requiresUserConfirmation: true,
    draftPreview,
    reason: "Detected deterministic OTUnit draft intent and prepared preview metadata.",
    errors: []
  };
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

// Status and transition contract.
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

export type SessionToOTUnitDraftInput = {
  sessionId: string;
  objectiveId: string;
  userText: string;
  assistantText: string;
  owner: string;
  dueDate: string;
  evidenceRefs: EvidenceRef[];
};

export type SessionToOTUnitDraftResult =
  | {
      valid: true;
      draft: OTUnitDraftInput;
      errors: [];
    }
  | {
      valid: false;
      draft: null;
      errors: DomainValidationError[];
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

function firstNonEmptyLine(value: string): string {
  for (const line of value.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }

  return "";
}

function createSessionToOTUnitDraftFieldError(field: keyof SessionToOTUnitDraftInput): DomainValidationError {
  return {
    field,
    message: `Session-to-OTUnit draft ${field} must be a non-empty string.`
  };
}

export function createOTUnitDraftFromSession(input: unknown): SessionToOTUnitDraftResult {
  if (!isRecord(input)) {
    return {
      valid: false,
      draft: null,
      errors: [
        {
          field: "sessionId",
          message: "Session-to-OTUnit draft input must be an object."
        }
      ]
    };
  }

  const fields: (keyof Omit<SessionToOTUnitDraftInput, "evidenceRefs">)[] = [
    "sessionId",
    "objectiveId",
    "userText",
    "assistantText",
    "owner",
    "dueDate"
  ];

  for (const field of fields) {
    if (!isNonEmptyString(input[field])) {
      return {
        valid: false,
        draft: null,
        errors: [createSessionToOTUnitDraftFieldError(field)]
      };
    }
  }

  const evidenceRefsValidation = validateEvidenceRefs(input.evidenceRefs);
  if (!evidenceRefsValidation.valid) {
    return {
      valid: false,
      draft: null,
      errors: evidenceRefsValidation.errors
    };
  }

  const titleSource = firstNonEmptyLine(input.assistantText as string) || firstNonEmptyLine(input.userText as string);
  if (titleSource.length === 0) {
    return {
      valid: false,
      draft: null,
      errors: [
        {
          field: "assistantText",
          message: "Session-to-OTUnit draft assistantText must contain a non-empty line."
        }
      ]
    };
  }

  return {
    valid: true,
    draft: {
      id: `session-${input.sessionId as string}-otunit-draft`,
      objectiveId: input.objectiveId as string,
      title: titleSource.slice(0, 120),
      owner: input.owner as string,
      dueDate: input.dueDate as string,
      evidenceRefs: [...(input.evidenceRefs as EvidenceRef[])]
    },
    errors: []
  };
}

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

// User-Confirmed OTUnit Draft Creation Boundary.
// Creates a proposed OTUnit only after explicit user confirmation of a plan-aware draft preview.
// Does not confirm the OTUnit. Does not persist. Does not call provider or AI.

export type ConfirmedPreviewToProposedOTUnitInput = {
  draftPreview: OTUnitDraftPreview | null;
  userConfirmationSignal: string;
  objectiveId: string;
  owner: string;
  dueDate: string;
  createdAt: string;
};

export type ConfirmedPreviewToProposedOTUnitResult = {
  valid: boolean;
  otunit: OTUnit | null;
  errors: DomainValidationError[];
};

const ACCEPTED_CONFIRMATION_SIGNALS: readonly string[] = [
  "confirm",
  "confirmed",
  "user_confirmed",
  "确认",
  "我确认",
  "明确确认"
];

const AMBIGUOUS_CONFIRMATION_SIGNALS: readonly string[] = [
  "差不多",
  "应该可以",
  "你看着办",
  "大概这样",
  "之后再说",
  "maybe",
  "probably",
  "looks good"
];

function isAcceptedConfirmationSignal(signal: string): boolean {
  const normalized = signal.trim().toLowerCase();
  return ACCEPTED_CONFIRMATION_SIGNALS.some((s) => normalized === s.toLowerCase()) ||
    ACCEPTED_CONFIRMATION_SIGNALS.some((s) => normalized.includes(s.toLowerCase()));
}

function isAmbiguousConfirmationSignal(signal: string): boolean {
  const normalized = signal.trim().toLowerCase();
  return AMBIGUOUS_CONFIRMATION_SIGNALS.some(
    (s) => normalized.includes(s.toLowerCase())
  );
}

export function createProposedOTUnitFromConfirmedPreview(
  input: unknown
): ConfirmedPreviewToProposedOTUnitResult {
  if (typeof input !== "object" || input === null) {
    return {
      valid: false,
      otunit: null,
      errors: [
        {
          field: "draftPreview",
          message: "Confirmed preview to proposed OTUnit input must be an object."
        }
      ]
    };
  }

  const record = input as Record<string, unknown>;
  const errors: DomainValidationError[] = [];

  const draftPreview = record.draftPreview;
  if (!draftPreview || typeof draftPreview !== "object") {
    return {
      valid: false,
      otunit: null,
      errors: [
        {
          field: "draftPreview",
          message: "Confirmed preview to proposed OTUnit requires a non-null draftPreview."
        }
      ]
    };
  }

  const preview = draftPreview as Record<string, unknown>;

  if (preview.status !== "preview") {
    return {
      valid: false,
      otunit: null,
      errors: [
        {
          field: "draftPreview.status",
          message: "Confirmed preview draftPreview must have status 'preview'."
        }
      ]
    };
  }

  if (preview.source !== "chat_session") {
    return {
      valid: false,
      otunit: null,
      errors: [
        {
          field: "draftPreview.source",
          message: "Confirmed preview draftPreview must have source 'chat_session'."
        }
      ]
    };
  }

  if (preview.requiresUserConfirmation !== true) {
    return {
      valid: false,
      otunit: null,
      errors: [
        {
          field: "draftPreview.requiresUserConfirmation",
          message: "Confirmed preview draftPreview must have requiresUserConfirmation true."
        }
      ]
    };
  }

  if (!preview.planAware || typeof preview.planAware !== "object") {
    return {
      valid: false,
      otunit: null,
      errors: [
        {
          field: "draftPreview.planAware",
          message: "Confirmed preview draftPreview must have a planAware object."
        }
      ]
    };
  }

  if (!isNonEmptyString(record.userConfirmationSignal)) {
    errors.push({
      field: "userConfirmationSignal",
      message: "Confirmed preview to proposed OTUnit userConfirmationSignal must be a non-empty string."
    });
  }

  if (!isNonEmptyString(record.objectiveId)) {
    errors.push({
      field: "objectiveId",
      message: "Confirmed preview to proposed OTUnit objectiveId must be a non-empty string."
    });
  }

  if (!isNonEmptyString(record.owner)) {
    errors.push({
      field: "owner",
      message: "Confirmed preview to proposed OTUnit owner must be a non-empty string."
    });
  }

  if (!isNonEmptyString(record.dueDate)) {
    errors.push({
      field: "dueDate",
      message: "Confirmed preview to proposed OTUnit dueDate must be a non-empty string."
    });
  }

  if (!isNonEmptyString(record.createdAt)) {
    errors.push({
      field: "createdAt",
      message: "Confirmed preview to proposed OTUnit createdAt must be a non-empty string."
    });
  }

  if (errors.length > 0) {
    return {
      valid: false,
      otunit: null,
      errors
    };
  }

  const confirmationSignal = record.userConfirmationSignal as string;

  if (isAmbiguousConfirmationSignal(confirmationSignal)) {
    return {
      valid: false,
      otunit: null,
      errors: [
        {
          field: "userConfirmationSignal",
          message: "Confirmation signal is ambiguous. Explicit user confirmation is required."
        }
      ]
    };
  }

  if (!isAcceptedConfirmationSignal(confirmationSignal)) {
    return {
      valid: false,
      otunit: null,
      errors: [
        {
          field: "userConfirmationSignal",
          message: "Confirmation signal is not recognized. Explicit user confirmation is required."
        }
      ]
    };
  }

  const planAware = preview.planAware as Record<string, unknown>;
  const title = typeof preview.title === "string" ? preview.title : "OTUnit draft preview";
  const evidenceRefs = Array.isArray(planAware.evidenceRefs) ? planAware.evidenceRefs as string[] : [];

  const draft = {
    id: `session-confirmed-preview-otunit`,
    objectiveId: record.objectiveId as string,
    title: title.slice(0, 120),
    owner: record.owner as string,
    dueDate: record.dueDate as string,
    evidenceRefs
  };

  const proposed = createProposedOTUnitFromDraft(draft);

  if (!proposed.valid) {
    return {
      valid: false,
      otunit: null,
      errors: proposed.errors
    };
  }

  const otunit = proposed.otunit!;
  otunit.createdAt = record.createdAt as string;

  return {
    valid: true,
    otunit,
    errors: []
  };
}

