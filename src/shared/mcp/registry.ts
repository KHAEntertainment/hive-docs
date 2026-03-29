import { MCPTool, MCPToolDefinition, MCPToolHandler, MCPToolContext } from './types';

export class MCPToolRegistry {
  private tools: Map<string, MCPTool> = new Map();

  registerTool(name: string, definition: MCPToolDefinition, handler: MCPToolHandler): void {
    if (this.tools.has(name)) {
      throw new Error(`Tool '${name}' is already registered`);
    }

    this.tools.set(name, {
      definition,
      handler
    });
  }

  unregisterTool(name: string): boolean {
    return this.tools.delete(name);
  }

  getTool(name: string): MCPTool | undefined {
    return this.tools.get(name);
  }

  getAllTools(): MCPToolDefinition[] {
    return Array.from(this.tools.values()).map(tool => tool.definition);
  }

  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  async executeTool(name: string, args: any, context: MCPToolContext): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool '${name}' not found`);
    }

    try {
      return await tool.handler(args, context);
    } catch (error) {
      console.error(`Error executing tool '${name}':`, error);
      throw error;
    }
  }

  clear(): void {
    this.tools.clear();
  }

  getToolCount(): number {
    return this.tools.size;
  }
}