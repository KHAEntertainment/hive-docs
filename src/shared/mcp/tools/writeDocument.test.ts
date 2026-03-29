import { describe, it, expect, vi, beforeEach } from 'vitest';
import { writeDocumentTool } from './writeDocument.js';
import { MCPToolContext } from '../types.js';
import { Document } from '../../documents/types.js';

describe('writeDocument MCP Tool', () => {
  let mockDocumentManager: any;
  let context: MCPToolContext;

  beforeEach(() => {
    mockDocumentManager = {
      createDocument: vi.fn(),
      updateDocument: vi.fn()
    };
    context = { documentManager: mockDocumentManager };
  });

  it('should have correct tool definition', () => {
    expect(writeDocumentTool.definition.name).toBe('writeDocument');
    expect(writeDocumentTool.definition.description).toContain('Create a new document or update an existing one');
    expect(writeDocumentTool.definition.inputSchema.required).toContain('title');
    expect(writeDocumentTool.definition.inputSchema.required).toContain('content');
  });

  it('should create a new document when no id is provided', async () => {
    const mockDocument: Document = {
      id: 'new-id',
      title: 'New Document',
      content: 'New content',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      tags: ['new'],
      metadata: { createdBy: 'mcp-agent' }
    };

    mockDocumentManager.createDocument.mockResolvedValue(mockDocument);

    const result = await writeDocumentTool.handler({
      title: 'New Document',
      content: 'New content',
      tags: ['new']
    }, context);

    expect(result.success).toBe(true);
    expect(result.action).toBe('created');
    expect(result.document.id).toBe('new-id');
    expect(mockDocumentManager.createDocument).toHaveBeenCalledWith({
      title: 'New Document',
      content: 'New content',
      tags: ['new'],
      metadata: { createdBy: 'mcp-agent' }
    });
  });

  it('should update an existing document when id is provided', async () => {
    const mockDocument: Document = {
      id: 'existing-id',
      title: 'Updated Document',
      content: 'Updated content',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-02T00:00:00Z'),
      tags: ['updated'],
      metadata: { updatedBy: 'mcp-agent' }
    };

    mockDocumentManager.updateDocument.mockResolvedValue(mockDocument);

    const result = await writeDocumentTool.handler({
      id: 'existing-id',
      title: 'Updated Document',
      content: 'Updated content',
      tags: ['updated']
    }, context);

    expect(result.success).toBe(true);
    expect(result.action).toBe('updated');
    expect(result.document.id).toBe('existing-id');
    expect(mockDocumentManager.updateDocument).toHaveBeenCalledWith('existing-id', {
      title: 'Updated Document',
      content: 'Updated content',
      tags: ['updated'],
      metadata: { updatedBy: 'mcp-agent' }
    });
  });

  it('should throw error when title is missing', async () => {
    await expect(
      writeDocumentTool.handler({ content: 'Content' } as any, context)
    ).rejects.toThrow('Document title is required and must be a string');
  });

  it('should throw error when content is missing', async () => {
    await expect(
      writeDocumentTool.handler({ title: 'Title' } as any, context)
    ).rejects.toThrow('Document content is required and must be a string');
  });

  it('should throw error when tags is not an array', async () => {
    await expect(
      writeDocumentTool.handler({
        title: 'Title',
        content: 'Content',
        tags: 'invalid'
      } as any, context)
    ).rejects.toThrow('Tags must be an array of strings');
  });

  it('should throw error when metadata is not an object', async () => {
    await expect(
      writeDocumentTool.handler({
        title: 'Title',
        content: 'Content',
        metadata: 'invalid'
      } as any, context)
    ).rejects.toThrow('Metadata must be an object');
  });

  it('should handle creation without optional fields', async () => {
    const mockDocument: Document = {
      id: 'new-id',
      title: 'Simple Document',
      content: 'Simple content',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      metadata: { createdBy: 'mcp-agent' }
    };

    mockDocumentManager.createDocument.mockResolvedValue(mockDocument);

    const result = await writeDocumentTool.handler({
      title: 'Simple Document',
      content: 'Simple content'
    }, context);

    expect(result.success).toBe(true);
    expect(result.action).toBe('created');
    expect(mockDocumentManager.createDocument).toHaveBeenCalledWith({
      title: 'Simple Document',
      content: 'Simple content',
      tags: undefined,
      metadata: { createdBy: 'mcp-agent' }
    });
  });

  it('should merge custom metadata with agent attribution', async () => {
    const mockDocument: Document = {
      id: 'new-id',
      title: 'Document with Metadata',
      content: 'Content',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      metadata: { author: 'user', createdBy: 'mcp-agent' }
    };

    mockDocumentManager.createDocument.mockResolvedValue(mockDocument);

    const result = await writeDocumentTool.handler({
      title: 'Document with Metadata',
      content: 'Content',
      metadata: { author: 'user' }
    }, context);

    expect(result.success).toBe(true);
    expect(mockDocumentManager.createDocument).toHaveBeenCalledWith({
      title: 'Document with Metadata',
      content: 'Content',
      tags: undefined,
      metadata: { author: 'user', createdBy: 'mcp-agent' }
    });
  });

  it('should handle database errors gracefully', async () => {
    mockDocumentManager.createDocument.mockRejectedValue(new Error('Database error'));

    await expect(
      writeDocumentTool.handler({
        title: 'Title',
        content: 'Content'
      }, context)
    ).rejects.toThrow('Failed to write document: Database error');
  });
});