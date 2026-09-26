export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type ToolPermission = "read-only" | "external-read" | "user-approved-write" | "restricted-execution";

export type AgentTaskStatus =
  | "draft"
  | "planning"
  | "awaiting_approval"
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled";

export type PlanStepStatus = "pending" | "awaiting_approval" | "running" | "completed" | "failed" | "skipped";

export interface ToolExecutionContext {
  taskId: string;
  stepId: string;
  signal: AbortSignal;
  requestApproval: (reason: string) => Promise<boolean>;
}

export interface ToolDefinition<TInput = unknown, TOutput = unknown> {
  id: string;
  name: string;
  description: string;
  permission: ToolPermission;
  inputSchema: Record<string, unknown>;
  execute(input: TInput, context: ToolExecutionContext): Promise<TOutput>;
}

export interface ToolResult<TOutput extends JsonValue = JsonValue> {
  ok: boolean;
  output?: TOutput;
  error?: string;
  startedAt: string;
  completedAt: string;
}

export interface AgentPlanStep {
  id: string;
  title: string;
  description: string;
  toolId?: string;
  status: PlanStepStatus;
  requiresApproval: boolean;
}

export interface AgentAttachment {
  id: string;
  filename: string;
  mediaType: string;
  sizeBytes: number;
  dataUrl: string;
}

export interface AgentTask {
  id: string;
  goal: string;
  status: AgentTaskStatus;
  steps: AgentPlanStep[];
  attachments: AgentAttachment[];
  createdAt: string;
  updatedAt: string;
}

export type AgentErrorCode = "NO_EXECUTABLE_STEP" | "MISSING_ATTACHMENT" | "RESTORED_ATTACHMENT" | "TOOL_NOT_EXECUTABLE" | "FILE_ANALYSIS_FAILED" | "CALCULATION_FAILED" | "UNKNOWN_ERROR";
export interface AgentError {
  code: AgentErrorCode;
  message: string;
  retryable: boolean;
  recoveryHint: string;
}

export interface ExecutionEvent {
  id: string;
  taskId: string;
  stepId?: string;
  type: "task-created" | "plan-created" | "approval-requested" | "tool-started" | "tool-completed" | "tool-failed" | "task-completed" | "task-failed" | "task-cancelled" | "task-paused" | "task-resumed" | "task-retried" | "task-rolled-back";
  message: string;
  toolId?: string;
  timestamp: string;
}
