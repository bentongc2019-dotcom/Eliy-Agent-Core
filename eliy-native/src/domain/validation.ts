export type DomainValidationError = {
  field: string;
  message: string;
};

export type DomainValidationResult =
  | {
      valid: true;
      errors: [];
    }
  | {
      valid: false;
      errors: DomainValidationError[];
    };

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isNonEmptyString);
}

export function createValidResult(): DomainValidationResult {
  return { valid: true, errors: [] };
}

export function createInvalidResult(errors: DomainValidationError[]): DomainValidationResult {
  return { valid: false, errors };
}
