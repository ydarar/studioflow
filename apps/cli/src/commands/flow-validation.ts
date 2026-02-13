import type { FlowDefinition, FlowStep } from "@studioflow/contracts";

export interface FlowValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function validateStep(step: FlowStep, index: number) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const at = `step[${index}] (${step.id})`;

  if (["click", "type", "assert_visible"].includes(step.action) && !step.target) {
    errors.push(`${at}: action ${step.action} requires target`);
  }

  if (["assert_text"].includes(step.action) && !step.value) {
    errors.push(`${at}: action ${step.action} requires value`);
  }

  if (step.action === "wait_for" && !step.target && !step.value) {
    errors.push(`${at}: action wait_for requires target or value`);
  }

  const pacingFields: Array<keyof FlowStep> = ["preDelayMs", "postDelayMs", "mouseMoveMs", "highlightMs", "dwellMs"];
  for (const field of pacingFields) {
    const value = step[field];
    if (typeof value === "number" && value > 20_000) {
      warnings.push(`${at}: ${field} is very high (${value}ms)`);
    }
  }

  return { errors, warnings };
}

export function validateFlowDefinition(flow: FlowDefinition): FlowValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (flow.steps.length === 0) {
    errors.push("flow has no steps");
  }

  flow.steps.forEach((step, index) => {
    const result = validateStep(step, index);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
