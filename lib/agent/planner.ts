import { AgentPlanStep, AgentTask } from "@/lib/agent/types";

export function planAgentTask(task: AgentTask, now = new Date().toISOString()): AgentTask {
  if (task.status !== "draft") throw new Error(`Only draft tasks can be planned. Current status: ${task.status}`);
  const steps = createPlanSteps(task.goal);
  return { ...task, status: "planning", steps, updatedAt: now };
}

export function createPlanSteps(goal: string): AgentPlanStep[] {
  const normalized = goal.toLowerCase();
  const needsApproval = /(report|export|publish|send|share|generate)/i.test(normalized);
  const stepTitles = normalized.includes("calculat") || /[0-9]\s*[+\-*/]/.test(goal)
    ? [
        ["Understand the calculation", "Validate the requested arithmetic expression."],
        ["Calculate the result", "Use the safe calculator tool.", "calculator"],
        ["Present the result", "Explain the result clearly and include the expression used."],
      ]
    : normalized.includes("file") || normalized.includes("csv") || normalized.includes("excel") || normalized.includes("xlsx") || normalized.includes("document") || normalized.includes("docx") || normalized.includes("pdf")
      ? [
          ["Understand the file and requirements", "Identify the requested output and available file context."],
          ["Analyze the file", "Inspect supported file metadata and bounded content preview.", "file-analysis"],
          ["Summarize the findings", "Organize the important observations and limitations."],
          ["Prepare the result", "Return a clear answer and identify any follow-up action."],
        ]
      : normalized.includes("study") || normalized.includes("research") || normalized.includes("plan")
        ? [
            ["Understand the objective", "Identify the topic, audience, scope, and desired format."],
            ["Break the work into topics", "Organize the goal into manageable sections."],
            ["Prepare a structured response", "Draft the study or research output with clear next steps."],
          ]
        : [
            ["Understand the objective", "Identify the requested outcome and constraints."],
            ["Select the safest approach", "Choose an available read-only tool or response strategy."],
            ["Prepare the result", "Return a clear answer and note any limitations."],
          ];

  return stepTitles.map(([title, description, toolId], index) => ({
    id: `step-${index + 1}`,
    title,
    description,
    ...(toolId ? { toolId } : {}),
    status: "pending",
    requiresApproval: needsApproval && /prepare|present|return|share|publish|export/i.test(title),
  }));
}
