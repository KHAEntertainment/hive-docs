import { MCPErrorCode, MCPErrorResponse } from './types';

export class MCPError extends Error {
  public readonly code: MCPErrorCode;
  public readonly data?: any;

  constructor(code: MCPErrorCode, message: string, data?: any) {
    super(message);
    this.name = 'MCPError';
    this.code = code;
    this.data = data;
  }

  toResponse(): MCPErrorResponse {
    return {
      error: {
        code: this.code,
        message: this.message,
        data: this.data
      }
    };
  }

  static fromError(error: unknown): MCPError {
    if (error instanceof MCPError) {
      return error;
    }

    if (error instanceof Error) {
      // Map common error types to MCP error codes
      if (error.message.includes('not found')) {
        return new MCPError(MCPErrorCode.DOCUMENT_NOT_FOUND, error.message);
      }
      
      if (error.message.includes('validation') || error.message.includes('invalid')) {
        return new MCPError(MCPErrorCode.VALIDATION_ERROR, error.message);
      }
      
      if (error.message.includes('database') || error.message.includes('sqlite')) {
        return new MCPError(MCPErrorCode.DATABASE_ERROR, error.message);
      }
      
      return new MCPError(MCPErrorCode.INTERNAL_ERROR, error.message);
    }

    return new MCPError(
      MCPErrorCode.INTERNAL_ERROR, 
      'An unknown error occurred',
      { originalError: String(error) }
    );
  }
}

export function createValidationError(message: string, field?: string): MCPError {
  return new MCPError(
    MCPErrorCode.VALIDATION_ERROR,
    message,
    field ? { field } : undefined
  );
}

export function createDocumentNotFoundError(id: string): MCPError {
  return new MCPError(
    MCPErrorCode.DOCUMENT_NOT_FOUND,
    `Document with ID '${id}' not found`,
    { documentId: id }
  );
}

export function createDatabaseError(message: string, operation?: string): MCPError {
  return new MCPError(
    MCPErrorCode.DATABASE_ERROR,
    message,
    operation ? { operation } : undefined
  );
}

export function handleMCPError(error: unknown): MCPErrorResponse {
  const mcpError = MCPError.fromError(error);
  
  // Log error for debugging
  console.error('MCP Error:', {
    code: mcpError.code,
    message: mcpError.message,
    data: mcpError.data,
    stack: mcpError.stack
  });
  
  return mcpError.toResponse();
}

export function isRetryableError(error: MCPError): boolean {
  // Database errors might be retryable (connection issues, locks, etc.)
  if (error.code === MCPErrorCode.DATABASE_ERROR) {
    return error.message.includes('busy') || 
           error.message.includes('locked') ||
           error.message.includes('connection');
  }
  
  // Internal errors might be retryable
  if (error.code === MCPErrorCode.INTERNAL_ERROR) {
    return !error.message.includes('not implemented') &&
           !error.message.includes('unsupported');
  }
  
  return false;
}

export function sanitizeErrorForClient(error: MCPError): MCPError {
  // Remove sensitive information from error messages before sending to client
  let sanitizedMessage = error.message;
  
  // Remove file paths
  sanitizedMessage = sanitizedMessage.replace(/\/[^\s]+/g, '[path]');
  
  // Remove potential connection strings or credentials
  sanitizedMessage = sanitizedMessage.replace(/password=[^\s]+/gi, 'password=[redacted]');
  sanitizedMessage = sanitizedMessage.replace(/token=[^\s]+/gi, 'token=[redacted]');
  
  return new MCPError(error.code, sanitizedMessage, error.data);
}