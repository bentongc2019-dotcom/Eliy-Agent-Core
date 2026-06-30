import { createRuntimeError } from "../errors/index.js";
import { OTUnitStatusSchema, type OTUnitStatus } from "../schemas/index.js";

const activeStatuses = new Set<OTUnitStatus>([
  "accepted",
  "in_progress",
  "checking",
  "adjusting"
]);

const transitionRules: Record<OTUnitStatus, OTUnitStatus[]> = {
  proposed: ["accepted"],
  accepted: ["in_progress", "deferred", "cancelled"],
  in_progress: ["checking", "blocked", "deferred", "cancelled"],
  checking: ["adjusting"],
  adjusting: ["in_progress", "completed"],
  completed: ["closed"],
  closed: [],
  blocked: ["adjusting", "deferred", "cancelled"],
  cancelled: [],
  deferred: []
};

export type OtunitTransitionResult =
  | {
      ok: true;
      status: OTUnitStatus;
      requires_confirmation: boolean;
    }
  | {
      ok: false;
      error: ReturnType<typeof createRuntimeError>;
    };

export function transitionOtUnitStatus(from: OTUnitStatus, to: OTUnitStatus): OtunitTransitionResult {
  const current = OTUnitStatusSchema.parse(from);
  const next = OTUnitStatusSchema.parse(to);
  const allowed = transitionRules[current];

  if (!allowed.includes(next)) {
    return {
      ok: false,
      error: createRuntimeError(
        "INVALID_TRANSITION",
        `Illegal OTUnit transition from ${current} to ${next}`,
        { from: current, to: next }
      )
    };
  }

  const requires_confirmation =
    (current === "proposed" && next === "accepted") ||
    (activeStatuses.has(current) && (next === "deferred" || next === "cancelled")) ||
    (current === "completed" && next === "closed");

  return {
    ok: true,
    status: next,
    requires_confirmation
  };
}

export function isActiveOtUnitStatus(status: OTUnitStatus): boolean {
  return activeStatuses.has(status);
}
