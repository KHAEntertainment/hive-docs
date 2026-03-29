import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listDocumentsTool } from './listDocuments.js';
import { MCPToolContext } from '../types.js';
import { Document } from '../../documents/types.js';

describe('listDocuments MCP Tool', () => {
  let mockDocumentManager: any;
  let context: MCPToolContext;

  beforeEach(() => {
    mockDocumentManager = {
      listDocuments: vi.fn(),
      getDocumentCount: vi.fn()
    };
    context = { documentManager: mockDocumentManager };
  });

  it('should have correct tool definition', () => {
    expect(listDocumentsTool.definition.name).toBe('listDocuments');
    expect(listDocumentsTool.definition.description).toContain('List documents with optional filtering');
  });

  it('should list documents with default parameters', async () => {
    const mockDocuments: Document[] = [
      {
        id: 'doc1',
        title: 'Document 1',
        content: 'This is a long content that should be truncated in the preview because it exceeds the 200 character limit that we have set for document previews in the list view and continues beyond that limit with additional text to ensure truncation happens',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-02T00:00:00Z'),
        tags: ['tag1']
      },
      {
        id: 'doc2',
        title: 'Document 2',
        content: 'Short content',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-02T00:00:00Z')
      }
    ];

    mockDocumentManager.listDocuments.mockResolvedValue(mockDocuments);
    mockDocumentManager.getDocumentCount.mockResolvedValue(2);

    const result = await listDocumentsTool.handler({}, context);

    expect(result.success).toBe(true);
    expect(result.documents).toHaveLength(2);
    expect(result.pagination.total).toBe(2);
    expect(result.pagination.hasMore).toBe(false);
    expect(result.sorting.sortBy).toBe('updatedAt');
    expect(result.sorting.sortOrder).toBe('desc');

    // Check content truncation
    expect(result.documents[0].content).toContain('...');
    expect(result.documents[0].content.length).toBeLessThanOrEqual(203); // 200 + '...'
    expect(result.documents[1].content).toBe('Short content');

    expect(mockDocumentManager.listDocuments).toHaveBeenCalledWith({
      limit: 50,
      offset: 0,
      sortBy: 'updatedAt',
      sortOrder: 'desc',
      filter: undefined
    });
  });

  it('should list documents with custom parameters', async () => {
    mockDocumentManager.listDocuments.mockResolvedValue([]);
    mockDocumentManager.getDocumentCount.mockResolvedValue(0);

    await listDocumentsTool.handler({
      limit: 10,
      offset: 20,
      sortBy: 'title',
      sortOrder: 'asc'
    }, context);

    expect(mockDocumentManager.listDocuments).toHaveBeenCalledWith({
      limit: 10,
      offset: 20,
      sortBy: 'title',
      sortOrder: 'asc',
      filter: undefined
    });
  });

  it('should apply tag filters', async () => {
    mockDocumentManager.listDocuments.mockResolvedValue([]);
    mockDocumentManager.getDocumentCount.mockResolvedValue(0);

    await listDocumentsTool.handler({
      tags: ['important', 'draft']
    }, context);

    expect(mockDocumentManager.listDocuments).toHaveBeenCalledWith({
      limit: 50,
      offset: 0,
      sortBy: 'updatedAt',
      sortOrder: 'desc',
      filter: {
        tags: ['important', 'draft']
      }
    });
  });

  it('should apply date filters', async () => {
    mockDocumentManager.listDocuments.mockResolvedValue([]);
    mockDocumentManager.getDocumentCount.mockResolvedValue(0);

    await listDocumentsTool.handler({
      createdAfter: '2024-01-01T00:00:00Z',
      createdBefore: '2024-12-31T23:59:59Z',
      updatedAfter: '2024-06-01T00:00:00Z'
    }, context);

    expect(mockDocumentManager.listDocuments).toHaveBeenCalledWith({
      limit: 50,
      offset: 0,
      sortBy: 'updatedAt',
      sortOrder: 'desc',
      filter: {
        createdAfter: new Date('2024-01-01T00:00:00Z'),
        createdBefore: new Date('2024-12-31T23:59:59Z'),
        updatedAfter: new Date('2024-06-01T00:00:00Z')
      }
    });
  });

  it('should throw error for invalid limit', async () => {
    await expect(
      listDocumentsTool.handler({ limit: 0 }, context)
    ).rejects.toThrow('Limit must be a number between 1 and 100');

    await expect(
      listDocumentsTool.handler({ limit: 101 }, context)
    ).rejects.toThrow('Limit must be a number between 1 and 100');
  });

  it('should throw error for invalid offset', async () => {
    await expect(
      listDocumentsTool.handler({ offset: -1 }, context)
    ).rejects.toThrow('Offset must be a non-negative number');
  });

  it('should throw error for invalid tags', async () => {
    await expect(
      listDocumentsTool.handler({ tags: 'invalid' } as any, context)
    ).rejects.toThrow('Tags must be an array of strings');
  });

  it('should throw error for invalid date formats', async () => {
    await expect(
      listDocumentsTool.handler({ createdAfter: 'invalid-date' }, context)
    ).rejects.toThrow('Invalid date format');

    await expect(
      listDocumentsTool.handler({ updatedBefore: '2024-13-01' }, context)
    ).rejects.toThrow('Invalid date format');
  });

  it('should calculate pagination correctly', async () => {
    const mockDocuments: Document[] = Array.from({ length: 10 }, (_, i) => ({
      id: `doc${i}`,
      title: `Document ${i}`,
      content: `Content ${i}`,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-02T00:00:00Z')
    }));

    mockDocumentManager.listDocuments.mockResolvedValue(mockDocuments);
    mockDocumentManager.getDocumentCount.mockResolvedValue(100);

    const result = await listDocumentsTool.handler({
      limit: 10,
      offset: 20
    }, context);

    expect(result.pagination.limit).toBe(10);
    expect(result.pagination.offset).toBe(20);
    expect(result.pagination.total).toBe(100);
    expect(result.pagination.hasMore).toBe(true); // 20 + 10 < 100
  });

  it('should format document results correctly', async () => {
    const mockDocument: Document = {
      id: 'doc1',
      title: 'Test Document',
      content: 'This is test content',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-02T00:00:00Z'),
      tags: ['test', 'example'],
      metadata: { author: 'test-user' }
    };

    mockDocumentManager.listDocuments.mockResolvedValue([mockDocument]);
    mockDocumentManager.getDocumentCount.mockResolvedValue(1);

    const result = await listDocumentsTool.handler({}, context);

    const doc = result.documents[0];
    expect(doc.id).toBe('doc1');
    expect(doc.title).toBe('Test Document');
    expect(doc.content).toBe('This is test content');
    expect(doc.createdAt).toBe('2024-01-01T00:00:00.000Z');
    expect(doc.updatedAt).toBe('2024-01-02T00:00:00.000Z');
    expect(doc.tags).toEqual(['test', 'example']);
    expect(doc.metadata).toEqual({ author: 'test-user' });
  });

  it('should handle documents without optional fields', async () => {
    const mockDocument: Document = {
      id: 'doc1',
      title: 'Simple Document',
      content: 'Simple content',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-02T00:00:00Z')
    };

    mockDocumentManager.listDocuments.mockResolvedValue([mockDocument]);
    mockDocumentManager.getDocumentCount.mockResolvedValue(1);

    const result = await listDocumentsTool.handler({}, context);

    const doc = result.documents[0];
    expect(doc.tags).toEqual([]);
    expect(doc.metadata).toEqual({});
  });

  it('should handle database errors gracefully', async () => {
    mockDocumentManager.listDocuments.mockRejectedValue(new Error('Database connection failed'));

    await expect(
      listDocumentsTool.handler({}, context)
    ).rejects.toThrow('Failed to list documents: Database connection failed');
  });
});