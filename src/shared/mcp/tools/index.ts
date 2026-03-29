import { MCPToolRegistry } from '../registry.js';
import { readDocumentTool } from './readDocument.js';
import { writeDocumentTool } from './writeDocument.js';
import { searchDocumentsTool } from './searchDocuments.js';
import { listDocumentsTool } from './listDocuments.js';

export function registerDocumentTools(registry: MCPToolRegistry): void {
  // Register all document tools
  registry.registerTool('readDocument', readDocumentTool.definition, readDocumentTool.handler);
  registry.registerTool('writeDocument', writeDocumentTool.definition, writeDocumentTool.handler);
  registry.registerTool('searchDocuments', searchDocumentsTool.definition, searchDocumentsTool.handler);
  registry.registerTool('listDocuments', listDocumentsTool.definition, listDocumentsTool.handler);
}

export { readDocumentTool } from './readDocument.js';
export { writeDocumentTool } from './writeDocument.js';
export { searchDocumentsTool } from './searchDocuments.js';
export { listDocumentsTool } from './listDocuments.js';