import {
  ConfirmationActionSchema,
  RuntimeResultSchema,
  type ConfirmationAction,
  type RuntimeError,
  type RuntimeResult
} from "../schemas/index.js";

type RuntimeResultInit<T> = {
  command: string;
  workspace_id?: string;
  data?: T;
  candidates?: unknown[];
  warnings?: string[];
  errors?: RuntimeError[];
  requires_confirmation?: boolean;
  confirmation_action?: ConfirmationAction;
  audit_ids?: string[];
  used_hac_governance?: boolean;
  used_hlamt_context?: boolean;
  created_at?: string;
};

export function createRuntimeResult<T>(init: RuntimeResultInit<T>): RuntimeResult<T> {
  return RuntimeResultSchema.parse({
    ok: !init.errors?.length,
    command: init.command,
    workspace_id: init.workspace_id,
    data: init.data,
    candidates: init.candidates,
    warnings: init.warnings ?? [],
    errors: init.errors,
    requires_confirmation: init.requires_confirmation ?? false,
    confirmation_action: init.confirmation_action
      ? ConfirmationActionSchema.parse(init.confirmation_action)
      : undefined,
    audit_ids: init.audit_ids ?? [],
    used_hac_governance: init.used_hac_governance ?? true,
    used_hlamt_context: init.used_hlamt_context ?? true,
    created_at: init.created_at ?? new Date().toISOString()
  }) as RuntimeResult<T>;
}
