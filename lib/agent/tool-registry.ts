import { ToolDefinition } from "@/lib/agent/types";

export class ToolRegistry {
  private readonly tools = new Map<string, ToolDefinition>();

  register(tool: ToolDefinition): void {
    const id = tool.id.trim();
    if (!/^[a-z][a-z0-9._-]{1,63}$/.test(id)) {
      throw new Error("Tool id must be 2-64 characters and use lowercase letters, numbers, dots, hyphens, or underscores.");
    }
    if (this.tools.has(id)) throw new Error(`Tool already registered: ${id}`);
    this.tools.set(id, { ...tool, id });
  }

  unregister(id: string): boolean {
    return this.tools.delete(id);
  }

  get(id: string): ToolDefinition | undefined {
    return this.tools.get(id);
  }

  list(): ToolDefinition[] {
    return [...this.tools.values()].map((tool) => ({ ...tool }));
  }

  has(id: string): boolean {
    return this.tools.has(id);
  }
}

export function createToolRegistry(tools: ToolDefinition[] = []): ToolRegistry {
  const registry = new ToolRegistry();
  for (const tool of tools) registry.register(tool);
  return registry;
}
