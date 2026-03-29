import { DocumentManager } from '../documents/manager';

export interface MCPServerConfig {
  name: string;
  version: string;
  port?: number;
  host?: string;
  enabled: boolean;
  autoStart: boolean;
}

export interface MCPServerInfo {
  name: string;
  version: string;
  url: string;
  status: 'running' | 'stopped' | 'error';
  port?: number;
  pid?: number;
}

export interface MCPToolContext {
  documentManager: DocumentManager;
}

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: any;
}

export interface MCPToolHandler {
  (args: any, context: MCPToolContext): Promise<any>;
}

export interface MCPTool {
  definition: MCPToolDefinition;
  handler: MCPToolHandler;
}

export interface MCPErrorResponse {
  error: {
    code: number;
    message: string;
    data?: any;
  };
}

export enum MCPErrorCode {
  PARSE_ERROR = -32700,
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,
  DOCUMENT_NOT_FOUND = -32001,
  DATABASE_ERROR = -32002,
  VALIDATION_ERROR = -32003
}