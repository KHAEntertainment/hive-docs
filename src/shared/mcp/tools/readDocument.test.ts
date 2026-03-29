import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readDocumentTool } from './readDocument.js';
import { MCPToolContext } from '../types.js';
import { Document } from '../../documents/types.js';

describe('readDocument MCP Tool', () => {
  let mockDocumentManager: any;
  let context: MCPToolContext;

  beforeEach(() => {
    mockDocumentManager = {
      getDocumentById: vi.fn()
    };
    context = { documentManager: mockDocumentManager };
  });

  it('should have correct tool definition', () => {
    expect(readDocumentTool.definition.name).toBe('readDocument');
    expect(readDocumentTool.definition.description).toContain('Read a document by its ID');
    expect(readDocumentTool.definition.inputSchema.required).toContain('id');
  });

  it('should successfully read an existing document', async () => {
    const mockDocument: Document = {
      id: 'test-id',
      title: 'Test Document',
      content: 'This is test content',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-02T00:00:00Z'),
      tags: ['test', 'example'],
      metadata: { author: 'test-user' }
    };

    mockDocumentManager.getDocumentById.mockResolvedValue(mockDocument);

    const result = await readDocumentTool.handler({ id: 'test-id' }, context);

    expect(result.success).toBe(true);
    expect(result.document.id).toBe('test-id');
    expect(result.document.title).toBe('Test Document');
    expect(result.document.content).toBe('This is test content');
    expect(result.document.tags).toEqual(['test', 'example']);
    expect(result.document.metadata).toEqual({ author: 'test-user' });
    expect(mockDocumentManager.getDocumentById).toHaveBeenCalledWith('test-id');
  });

  it('should throw error when document is not found', async () => {
    mockDocumentManager.getDocumentById.mockResolvedValue(null);

    await expect(
      readDocumentTool.handler({ id: 'non-existent' }, context)
    ).rejects.toThrow("Document with ID 'non-existent' not found");
  });

  it('should throw error when id is missing', async () => {
    await expect(
      readDocumentTool.handler({} as any, context)
    ).rejects.toThrow('Document ID is required and must be a string');
  });

  it('should throw error when id is not a string', async () => {
    await expect(
      readDocumentTool.handler({ id: 123 } as any, context)
    ).rejects.toThrow('Document ID is required and must be a string');
  });

  it('should handle database errors gracefully', async () => {
    mockDocumentManager.getDocumentById.mockRejectedValue(new Error('Database connection failed'));

    await expect(
      readDocumentTool.handler({ id: 'test-id' }, context)
    ).rejects.toThrow('Failed to read document: Database connection failed');
  });

  it('should handle documents without optional fields', async () => {
    const mockDocument: Document = {
      id: 'test-id',
      title: 'Test Document',
      content: 'This is test content',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-02T00:00:00Z')
    };

    mockDocumentManager.getDocumentById.mockResolvedValue(mockDocument);

    const result = await readDocumentTool.handler({ id: 'test-id' }, context);

    expect(result.success).toBe(true);
    expect(result.document.tags).toEqual([]);
    expect(result.document.metadata).toEqual({});
  });
});