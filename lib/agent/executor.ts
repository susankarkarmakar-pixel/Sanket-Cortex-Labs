import { calculatorTool } from "@/lib/agent/tools/calculator";
import { fileAnalysisTool } from "@/lib/agent/tools/file-analysis";
import { CsvTableSummary, FileAnalysisOutput, SheetTableSummary } from "@/lib/agent/tools/file-analysis";
import { AgentError, AgentTask, ToolExecutionContext } from "@/lib/agent/types";
import { transitionTask, updateStepStatus } from "@/lib/agent/agent-state";

export interface AgentExecutionOutcome { task: AgentTask; message: string; output?: string; table?: CsvTableSummary; sheetTables?: SheetTableSummary[]; error?: AgentError; ok: boolean; }

export async function executeFirstToolStep(task: AgentTask): Promise<AgentExecutionOutcome> {
  const step = task.steps.find((candidate) => candidate.status === "pending" && candidate.toolId);
  if (!step || !step.toolId) return failure(task, "NO_EXECUTABLE_STEP", "No executable tool step is available yet. The remaining steps need the next orchestration phase.", false, "Create a new task or wait for the next orchestration phase.");

  const context: ToolExecutionContext = { taskId: task.id, stepId: step.id, signal: new AbortController().signal, requestApproval: async () => false };
  let runningTask = transitionTask(task, "running");
  runningTask = updateStepStatus(runningTask, step.id, "running");

  if (step.toolId === "file-analysis") {
    const attachment = task.attachments[0];
    if (!attachment) {
      const failedTask = updateStepStatus(runningTask, step.id, "failed");
      return failure({ ...failedTask, status: "failed", updatedAt: new Date().toISOString() }, "MISSING_ATTACHMENT", "File Analysis needs an attached TXT, Markdown, CSV, JSON, PDF, DOCX, or XLSX file.", true, "Attach a supported file and retry the failed step.");
    }
    if (!attachment.dataUrl) {
      const failedTask = updateStepStatus(runningTask, step.id, "failed");
      return failure({ ...failedTask, status: "failed", updatedAt: new Date().toISOString() }, "RESTORED_ATTACHMENT", `${attachment.filename} was restored as metadata only. Re-attach the file before running File Analysis.`, true, "Re-attach the file, create a fresh task, and retry analysis.");
    }
    try {
      const result = await fileAnalysisTool.execute({ filename: attachment.filename, mediaType: attachment.mediaType, dataUrl: attachment.dataUrl }, context);
      const completedTask = updateStepStatus(runningTask, step.id, "completed");
      return { task: finalizeAfterTool(completedTask), ok: true, message: "File Analysis completed successfully.", output: formatFileOutput(result), table: result.table, sheetTables: result.sheetTables };
    } catch (error) {
      const failedTask = updateStepStatus(runningTask, step.id, "failed");
      return failure({ ...failedTask, status: "failed", updatedAt: new Date().toISOString() }, "FILE_ANALYSIS_FAILED", error instanceof Error ? error.message : "File Analysis could not complete.", true, "Check the file format and size, then retry the failed step.");
    }
  }

  if (step.toolId !== "calculator") {
    const failedTask = updateStepStatus(runningTask, step.id, "failed");
    return failure({ ...failedTask, status: "failed", updatedAt: new Date().toISOString() }, "TOOL_NOT_EXECUTABLE", `The tool '${step.toolId}' is not executable in this MVP.`, false, "Choose a task that uses a registered tool.");
  }

  try {
    const result = await calculatorTool.execute({ expression: extractExpression(task.goal) }, context);
    const completedTask = updateStepStatus(runningTask, step.id, "completed");
    return { task: finalizeAfterTool(completedTask), ok: true, message: "Calculator completed successfully.", output: `${result.expression} = ${result.value}` };
  } catch (error) {
    const failedTask = updateStepStatus(runningTask, step.id, "failed");
    return failure({ ...failedTask, status: "failed", updatedAt: new Date().toISOString() }, "CALCULATION_FAILED", error instanceof Error ? error.message : "Calculator could not complete the expression.", true, "Check the arithmetic expression and retry the failed step.");
  }
}

function failure(task: AgentTask, code: AgentError["code"], message: string, retryable: boolean, recoveryHint: string): AgentExecutionOutcome {
  return { task, ok: false, message, error: { code, message, retryable, recoveryHint } };
}

function finalizeAfterTool(task: AgentTask): AgentTask {
  const steps = task.steps.map((step) => step.status === "pending" && !step.toolId && !step.requiresApproval ? { ...step, status: "completed" as const } : step);
  const hasPendingAction = steps.some((step) => step.status === "pending" && (Boolean(step.toolId) || step.requiresApproval));
  return { ...task, steps, status: hasPendingAction ? "running" : "completed", updatedAt: new Date().toISOString() };
}

function formatFileOutput(result: FileAnalysisOutput): string {
  const summary = [`File: ${result.filename}`, `Characters: ${result.characterCount ?? "n/a"}`, `Lines: ${result.lineCount ?? "n/a"}`];
  if (typeof result.paragraphCount === "number") summary.push(`Paragraphs: ${result.paragraphCount}`);
  if (typeof result.tableCount === "number") summary.push(`DOCX tables: ${result.tableCount}`);
  if (result.ocrUsed) summary.push(`OCR: ${result.ocrPageCount || 0} page${result.ocrPageCount === 1 ? "" : "s"}`);
  if (typeof result.sheetCount === "number") summary.push(`Sheets: ${result.sheetCount}${result.sheetNames?.length ? ` (${result.sheetNames.join(", ")})` : ""}`);
  if (result.sheetTables?.length) summary.push(`Sheet previews: ${result.sheetTables.map((sheet) => `${sheet.name} (${sheet.table.rowCount} rows)`).join(", ")}`);
  if (result.table) summary.push(`Rows: ${result.table.rowCount}`, `Columns: ${result.table.columns.length}`, `Missing values: ${result.table.missingValueCount}`, `Duplicate rows: ${result.table.duplicateRowCount}`, `Outlier rows: ${result.table.outlierCount}`);
  if (result.table?.numericStats.length) summary.push(`Numeric columns: ${result.table.numericStats.map((stat) => `${stat.column} avg=${stat.average.toFixed(2)}, median=${stat.median.toFixed(2)}, sd=${stat.standardDeviation.toFixed(2)}`).join(", ")}`);
  if (typeof result.jsonValid === "boolean") summary.push(`JSON valid: ${result.jsonValid ? "yes" : "no"}`);
  if (result.note) summary.push(result.note);
  if (result.preview) summary.push(`Preview:\n${result.preview}`);
  return summary.join("\n");
}

function extractExpression(goal: string): string {
  const explicitExpression = goal.match(/(?:calculate|compute|what is|সমাধান করুন|হিসাব করুন)\s*[:：]?\s*(.+)$/i)?.[1]?.trim();
  if (explicitExpression) return explicitExpression.replace(/[?。]+$/, "").trim();
  const expression = goal.match(/[0-9][0-9\s().+\-*/]*[0-9)]/i)?.[0]?.trim();
  if (expression) return expression;
  throw new Error("Could not find a basic arithmetic expression in the task goal. Try: Calculate 125 * 4.");
}
