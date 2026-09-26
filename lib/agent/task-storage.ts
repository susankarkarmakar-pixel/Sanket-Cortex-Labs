import { AgentTask, ExecutionEvent } from "@/lib/agent/types";

export interface AgentTaskRecord {
  task: AgentTask;
  events: ExecutionEvent[];
  savedAt: string;
}

const STORAGE_KEY = "susan_agent_tasks_v1";
const MAX_RECORDS = 30;

export function loadAgentTaskRecords(): AgentTaskRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isTaskRecord).slice(0, MAX_RECORDS);
  } catch {
    return [];
  }
}

export function saveAgentTaskRecord(record: AgentTaskRecord): AgentTaskRecord[] {
  const records = loadAgentTaskRecords().filter((candidate) => candidate.task.id !== record.task.id);
  const safeRecord: AgentTaskRecord = { ...record, task: { ...record.task, attachments: record.task.attachments.map((attachment) => ({ ...attachment, dataUrl: "" })) }, savedAt: new Date().toISOString() };
  const next = [safeRecord, ...records].slice(0, MAX_RECORDS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("agent-tasks-updated"));
  return next;
}

export function deleteAgentTaskRecord(taskId: string): AgentTaskRecord[] {
  const next = loadAgentTaskRecords().filter((record) => record.task.id !== taskId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("agent-tasks-updated"));
  return next;
}

export function clearAgentTaskRecords(): void {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("agent-tasks-updated"));
}

function isTaskRecord(value: unknown): value is AgentTaskRecord {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AgentTaskRecord>;
  const task = candidate.task as Partial<AgentTask> | undefined;
  return Boolean(task && typeof task.id === "string" && typeof task.goal === "string" && Array.isArray(task.steps) && Array.isArray(task.attachments) && Array.isArray(candidate.events));
}
