import { AgentAttachment, AgentTask, AgentTaskStatus, PlanStepStatus } from "@/lib/agent/types";

const allowedTransitions: Record<AgentTaskStatus, readonly AgentTaskStatus[]> = {
  draft: ["planning", "cancelled"],
  planning: ["awaiting_approval", "running", "failed", "cancelled"],
  awaiting_approval: ["running", "paused", "cancelled", "failed"],
  running: ["awaiting_approval", "paused", "completed", "failed", "cancelled"],
  paused: ["running", "cancelled", "failed"],
  completed: [],
  failed: ["planning", "cancelled"],
  cancelled: [],
};

export function canTransition(from: AgentTaskStatus, to: AgentTaskStatus): boolean {
  return allowedTransitions[from].includes(to);
}

export function transitionTask(task: AgentTask, nextStatus: AgentTaskStatus, now = new Date().toISOString()): AgentTask {
  if (task.status === nextStatus) return { ...task, updatedAt: now };
  if (!canTransition(task.status, nextStatus)) {
    throw new Error(`Invalid agent task transition: ${task.status} -> ${nextStatus}`);
  }
  return { ...task, status: nextStatus, updatedAt: now };
}

export function updateStepStatus(task: AgentTask, stepId: string, status: PlanStepStatus, now = new Date().toISOString()): AgentTask {
  let found = false;
  const steps = task.steps.map((step) => {
    if (step.id !== stepId) return step;
    found = true;
    return { ...step, status };
  });
  if (!found) throw new Error(`Unknown plan step: ${stepId}`);
  return { ...task, steps, updatedAt: now };
}

export function createAgentTask(goal: string, id = crypto.randomUUID(), now = new Date().toISOString(), attachments: AgentAttachment[] = []): AgentTask {
  const cleanGoal = goal.trim();
  if (!cleanGoal) throw new Error("Agent task goal cannot be empty.");
  return { id, goal: cleanGoal, status: "draft", steps: [], attachments, createdAt: now, updatedAt: now };
}
