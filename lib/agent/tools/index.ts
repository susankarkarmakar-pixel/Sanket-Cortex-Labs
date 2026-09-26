import { createToolRegistry } from "@/lib/agent/tool-registry";
import { calculatorTool } from "@/lib/agent/tools/calculator";
import { fileAnalysisTool } from "@/lib/agent/tools/file-analysis";

export { calculatorTool } from "@/lib/agent/tools/calculator";
export { fileAnalysisTool } from "@/lib/agent/tools/file-analysis";

export function createDefaultToolRegistry() {
  return createToolRegistry([calculatorTool, fileAnalysisTool]);
}
