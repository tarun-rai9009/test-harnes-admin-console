/**
 * Workflow definition contracts — tasks in business language, not API names.
 */

export type FieldValidationResult =
  | { ok: true; normalized: unknown }
  | { ok: false; error: string };

export type FieldValidator = (raw: unknown) => FieldValidationResult;

export type WorkflowFieldDefinition = {
  key: string;
  required: boolean;
  /** Shown to operators — full question, e.g. "What is the carrier code?" */
  businessPrompt: string;
  /** Short label for confirmations (e.g. "Carrier code") */
  summaryLabel?: string;
  validate: FieldValidator;
};

/**
 * Logical field bucket for larger workflows: ordering, headings, and conditional
 * visibility. When `fieldGroups` is set on the workflow, the engine uses groups
 * (and `isActive`) instead of the top-level `requiredFields` / `optionalFields` arrays.
 *
 * Legacy workflows omit `fieldGroups` and keep using flat `requiredFields` + `optionalFields`.
 *
 * @example
 * ```ts
 * fieldGroups: [
 *   { id: "basics", requiredFields: [...], optionalFields: [] },
 *   {
 *     id: "corporate",
 *     label: "Corporate details",
 *     isActive: (d) => String(d.entityType ?? "").toLowerCase() === "corporation",
 *     requiredFields: [...],
 *     optionalFields: [],
 *   },
 * ],
 * requiredFields: [],
 * optionalFields: [],
 * ```
 */
export type WorkflowFieldGroupDefinition = {
  id: string;
  /** Optional section title for future UI / docs */
  label?: string;
  /** When omitted, the group is always included. Use prior answers in `data` to branch. */
  isActive?: (data: Record<string, unknown>) => boolean;
  requiredFields: WorkflowFieldDefinition[];
  optionalFields: WorkflowFieldDefinition[];
};

export type WorkflowExecutionContext = {
  data: Record<string, unknown>;
};

export type WorkflowDefinition = {
  /** Stable id, e.g. create_carrier_draft */
  id: string;
  /** Shown in menus / confirmations */
  userFacingLabel: string;
  /**
   * Flat field lists — used when `fieldGroups` is absent or empty (all existing workflows).
   * For group-based workflows, set both arrays to `[]` and define `fieldGroups` instead.
   */
  requiredFields: WorkflowFieldDefinition[];
  optionalFields: WorkflowFieldDefinition[];
  /**
   * When non-empty, the workflow engine resolves required/optional fields only from these
   * groups (respecting `isActive`). Top-level `requiredFields` / `optionalFields` are ignored.
   */
  fieldGroups?: WorkflowFieldGroupDefinition[];
  /** If true, show confirmation card before execute() */
  requiresConfirmation: boolean;
  /**
   * Optional: short confirmation copy (yes/no). Defaults to `formatConfirmationCard` helper.
   */
  buildConfirmationMessage?: (data: Record<string, unknown>) => string;
  /**
   * Optional: structured rows for the confirmation UI (cleaner than question-style bullets).
   */
  getConfirmationSummaryRows?: (
    data: Record<string, unknown>,
  ) => { label: string; value: string }[];
  /** Build typed payload for the execution handler — only with complete valid data */
  buildPayload: (data: Record<string, unknown>) => unknown;
  execute: (payload: unknown) => Promise<unknown>;
  formatSuccess: (result: unknown) => {
    message: string;
    summaryLines?: string[];
    summaryFields?: { label: string; value: string }[];
    /** Business-friendly table (e.g. carrier list) — avoids shipping raw API arrays to the UI */
    summaryTable?: {
      columns: { id: string; label: string }[];
      rows: Record<string, string>[];
    };
  };
};
